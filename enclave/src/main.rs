use serde::{Deserialize, Serialize};
use std::thread;
use std::time::Duration;
use anyhow::{Result, Context};

const MAX_RETRIES: usize = 5;

#[derive(Debug, Serialize, Deserialize)]
struct Request {
    method: String,
    params: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct Response {
    status: String,
    data: serde_json::Value,
}

#[cfg(feature = "local-test")]
mod local {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpStream;

    fn connect_to_parent(port: &str) -> Result<TcpStream> {
        let addr = format!("127.0.0.1:{}", port);
        
        for attempt in 0..MAX_RETRIES {
            match TcpStream::connect(&addr) {
                Ok(stream) => {
                    println!("[Enclave] Connected to parent on {}", addr);
                    return Ok(stream);
                }
                Err(e) => {
                    println!("[Enclave] Connection attempt {} failed: {}", attempt + 1, e);
                    if attempt < MAX_RETRIES - 1 {
                        thread::sleep(Duration::from_secs(1 << attempt));
                    }
                }
            }
        }
        
        Err(anyhow::anyhow!("Failed to connect after {} attempts", MAX_RETRIES))
    }

    pub fn run_client() -> Result<()> {
        let port = std::env::var("PORT").unwrap_or_else(|_| "5005".to_string());
        
        println!("[Enclave] Starting enclave client...");
        
        let mut stream = connect_to_parent(&port)?;
        
        // Send ping request
        let request = Request {
            method: "ping".to_string(),
            params: serde_json::json!({}),
        };
        
        let request_json = serde_json::to_string(&request)?;
        println!("[Enclave] Sending: {}", request_json);
        
        stream.write_all(request_json.as_bytes())
            .context("Failed to send message")?;
        
        // Receive response
        let mut buffer = vec![0u8; 8192];
        let n = stream.read(&mut buffer)
            .context("Failed to receive message")?;
        
        let response_msg = String::from_utf8(buffer[..n].to_vec())
            .context("Invalid UTF-8")?;
        
        println!("[Enclave] Received: {}", response_msg);
        
        let response: Response = serde_json::from_str(&response_msg)?;
        println!("[Enclave] Response: {:?}", response);
        
        Ok(())
    }
}

#[cfg(not(feature = "local-test"))]
mod vsock {
    use super::*;
    use nix::sys::socket::{connect, socket, AddressFamily, SockFlag, SockType, VsockAddr};
    use nix::unistd::close;
    use std::os::unix::io::{AsRawFd, RawFd};

    const PARENT_CID: u32 = 3;
    const BUF_SIZE: usize = 8192;

    fn connect_to_parent(port: u32) -> Result<RawFd> {
        let sockaddr = VsockAddr::new(PARENT_CID, port);
        
        for attempt in 0..MAX_RETRIES {
            let socket_fd = socket(
                AddressFamily::Vsock,
                SockType::Stream,
                SockFlag::empty(),
                None,
            )
            .context("Failed to create socket")?;
            
            match connect(socket_fd.as_raw_fd(), &sockaddr) {
                Ok(_) => {
                    println!("[Enclave] Connected to parent on port {}", port);
                    return Ok(socket_fd.as_raw_fd());
                }
                Err(e) => {
                    let _ = close(socket_fd.as_raw_fd());
                    println!("[Enclave] Connection attempt {} failed: {}", attempt + 1, e);
                    if attempt < MAX_RETRIES - 1 {
                        thread::sleep(Duration::from_secs(1 << attempt));
                    }
                }
            }
        }
        
        Err(anyhow::anyhow!("Failed to connect after {} attempts", MAX_RETRIES))
    }

    fn send_message(fd: RawFd, message: &str) -> Result<()> {
        nix::sys::socket::send(fd, message.as_bytes(), nix::sys::socket::MsgFlags::empty())
            .context("Failed to send message")?;
        Ok(())
    }

    fn recv_message(fd: RawFd) -> Result<String> {
        let mut buffer = vec![0u8; BUF_SIZE];
        let n = nix::sys::socket::recv(fd, &mut buffer, nix::sys::socket::MsgFlags::empty())
            .context("Failed to receive message")?;
        
        let message = String::from_utf8(buffer[..n].to_vec())
            .context("Invalid UTF-8")?;
        
        Ok(message)
    }

    pub fn run_client() -> Result<()> {
        let port: u32 = std::env::var("VSOCK_PORT")
            .unwrap_or_else(|_| "5005".to_string())
            .parse()
            .context("Invalid port")?;
        
        println!("[Enclave] Starting enclave client...");
        
        let socket_fd = connect_to_parent(port)?;
        
        // Send ping request
        let request = Request {
            method: "ping".to_string(),
            params: serde_json::json!({}),
        };
        
        let request_json = serde_json::to_string(&request)?;
        println!("[Enclave] Sending: {}", request_json);
        
        send_message(socket_fd, &request_json)?;
        
        // Receive response
        let response_msg = recv_message(socket_fd)?;
        println!("[Enclave] Received: {}", response_msg);
        
        let response: Response = serde_json::from_str(&response_msg)?;
        println!("[Enclave] Response: {:?}", response);
        
        close(socket_fd)?;
        
        Ok(())
    }
}

fn main() -> Result<()> {
    #[cfg(feature = "local-test")]
    {
        local::run_client()
    }
    
    #[cfg(not(feature = "local-test"))]
    {
        vsock::run_client()
    }
}
