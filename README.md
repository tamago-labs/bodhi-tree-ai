# Bodhi Tree AI

Autonomous AI agent framework with AWS Nitro Enclaves for secure key management.

## Phase 1: Basic Infrastructure

Simple ping-pong communication between parent instance and enclave via vsock.

## Project Structure

```
bodhi-tree-ai/
├── parent/           # Parent instance (Rust)
│   ├── src/
│   │   └── main.rs   # Vsock server
│   └── Cargo.toml
├── enclave/          # Nitro Enclave (Rust)
│   ├── src/
│   │   └── main.rs   # Vsock client
│   ├── Dockerfile    # Enclave image
│   └── Cargo.toml
└── Makefile
```

## Prerequisites

1. Rust toolchain
2. musl target for static binary:
```bash
ARCH=$(uname -m)
rustup target add $ARCH-unknown-linux-musl
```

3. Docker
4. AWS Nitro CLI (for production)

## Quick Start

### Build Everything
```bash
make all
```

### Local Testing (without Nitro)

Terminal 1 - Run parent:
```bash
make run-parent
```

Terminal 2 - Run enclave:
```bash
make run-enclave
```

### AWS Nitro Testing (on EC2 with Nitro Enclaves)

Terminal 1 - Run parent:
```bash
make run-parent
```

Terminal 2 - Run enclave on Nitro:
```bash
make run-nitro
```

Terminal 3 - View enclave console:
```bash
make console
```

Stop enclave:
```bash
make terminate
```

## What Works

- Parent vsock server listening on port 5005
- Enclave vsock client connects to parent
- JSON-RPC protocol: enclave sends `{"method": "ping"}`, parent responds with `{"status": "success", "data": {"message": "pong"}}`

## Environment Variables

- `VSOCK_PORT`: Port for vsock communication (default: 5005)
- `RUST_LOG`: Logging level (default: info)

## Next Steps

**Phase 2:** Web interface + Multi-chain key generation

**Phase 3:** AI agent + MCP integration
