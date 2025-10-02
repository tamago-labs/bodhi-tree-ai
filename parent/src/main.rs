use serde::{Deserialize, Serialize};
use anyhow::{Result, Context};

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

fn handle_request(request: Request) -> Response {
    log::info!("Received request: {:?}", request);
    
    match request.method.as_str() {
        "ping" => Response {
            status: "success".to_string(),
            data: serde_json::json!({ "message": "pong" }),
        },
        _ => Response {
            status: "error".to_string(),
            data: serde_json::json!({ "message": "Unknown method" }),
        },
    }
}

#[cfg(feature = "local-test")]
mod local {
    use super::*;
    use tokio::net::TcpListener;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    pub async fn run_server() -> Result<()> {
        let port = std::env::var("PORT").unwrap_or_else(|_| "5005".to_string());
        let addr = format!("127.0.0.1:{}", port);
        
        log::info!("Starting parent TCP server on {}", addr);
        
        let listener = TcpListener::bind(&addr).await
            .context("Failed to bind TCP socket")?;
        
        log::info!("Parent listening for enclave connections...");
        
        loop {
            match listener.accept().await {
                Ok((mut socket, addr)) => {
                    log::info!("Client connected from: {}", addr);
                    
                    tokio::spawn(async move {
                        let mut buf = vec![0u8; 8192];
                        
                        match socket.read(&mut buf).await {
                            Ok(n) if n > 0 => {
                                let msg = String::from_utf8_lossy(&buf[..n]);
                                log::info!("Received: {}", msg);
                                
                                if let Ok(request) = serde_json::from_str::<Request>(&msg) {
                                    let response = handle_request(request);
                                    let response_json = serde_json::to_string(&response).unwrap();
                                    
                                    if let Err(e) = socket.write_all(response_json.as_bytes()).await {
                                        log::error!("Failed to send response: {}", e);
                                    }
                                }
                            }
                            Ok(_) => log::warn!("Empty message received"),
                            Err(e) => log::error!("Failed to read: {}", e),
                        }
                    });
                }
                Err(e) => {
                    log::error!("Accept failed: {}", e);
                }
            }
        }
    }
}

#[cfg(not(feature = "local-test"))]
mod vsock {
    use super::*;
    use nix::sys::socket::{
        accept, bind, listen, socket, AddressFamily, SockFlag, SockType, VsockAddr, Backlog,
    };
    use nix::unistd::close;
    use std::os::unix::io::{AsRawFd, RawFd};

    const VMADDR_CID_ANY: u32 = 0xFFFFFFFF;
    const BUF_SIZE: usize = 8192;

    fn recv_message(fd: RawFd) -> Result<String> {
        let mut buffer = vec![0u8; BUF_SIZE];
        let n = nix::sys::socket::recv(fd, &mut buffer, nix::sys::socket::MsgFlags::empty())
            .context("Failed to receive message")?;
        
        let message = String::from_utf8(buffer[..n].to_vec())
            .context("Invalid UTF-8")?;
        
        Ok(message)
    }

    fn send_message(fd: RawFd, message: &str) -> Result<()> {
        nix::sys::socket::send(fd, message.as_bytes(), nix::sys::socket::MsgFlags::empty())
            .context("Failed to send message")?;
        Ok(())
    }

    pub fn run_server() -> Result<()> {
        let port: u32 = std::env::var("VSOCK_PORT")
            .unwrap_or_else(|_| "5005".to_string())
            .parse()
            .context("Invalid port")?;
        
        log::info!("Starting parent vsock server on port {}", port);
        
        let socket_fd = socket(
            AddressFamily::Vsock,
            SockType::Stream,
            SockFlag::empty(),
            None,
        )
        .context("Failed to create socket")?;
        
        let sockaddr = VsockAddr::new(VMADDR_CID_ANY, port);
        
        bind(socket_fd.as_raw_fd(), &sockaddr).context("Failed to bind")?;
        listen(&socket_fd, Backlog::new(128).unwrap()).context("Failed to listen")?;
        
        log::info!("Parent listening for enclave connections...");
        
        loop {
            match accept(socket_fd.as_raw_fd()) {
                Ok(client_fd) => {
                    log::info!("Enclave connected!");
                    
                    match recv_message(client_fd) {
                        Ok(msg) => {
                            log::info!("Received: {}", msg);
                            
                            match serde_json::from_str::<Request>(&msg) {
                                Ok(request) => {
                                    let response = handle_request(request);
                                    let response_json = serde_json::to_string(&response).unwrap();
                                    
                                    if let Err(e) = send_message(client_fd, &response_json) {
                                        log::error!("Failed to send response: {}", e);
                                    }
                                }
                                Err(e) => {
                                    log::error!("Failed to parse request: {}", e);
                                }
                            }
                        }
                        Err(e) => {
                            log::error!("Failed to receive message: {}", e);
                        }
                    }
                    
                    let _ = close(client_fd);
                }
                Err(e) => {
                    log::error!("Accept failed: {}", e);
                }
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();
    
    #[cfg(feature = "local-test")]
    {
        local::run_server().await
    }
    
    #[cfg(not(feature = "local-test"))]
    {
        vsock::run_server()
    }
}
