.PHONY: all build-parent build-enclave build-eif run-parent clean local-test local-build

ARCH := $(shell uname -m)

all: build-parent build-enclave build-eif

# Local development without Nitro
local-test: local-build
	@echo ""
	@echo "✅ Local build complete!"
	@echo ""
	@echo "Run in two terminals:"
	@echo "  Terminal 1: make local-parent"
	@echo "  Terminal 2: make local-enclave"
	@echo ""

local-build:
	@echo "Building for local testing (TCP mode)..."
	cd parent && cargo build --release --features local-test
	cd enclave && cargo build --release --features local-test

local-parent:
	@echo "Running parent (TCP mode)..."
	RUST_LOG=info ./parent/target/release/parent

local-enclave:
	@echo "Running enclave (TCP mode)..."
	./enclave/target/release/enclave

# Build parent instance binary
build-parent:
	@echo "Building parent binary..."
	cd parent && cargo build --release
	@echo "Parent binary: parent/target/release/parent"

# Build enclave binary
build-enclave:
	@echo "Building enclave binary..."
	cd enclave && cargo build --target=$(ARCH)-unknown-linux-musl --release
	cp enclave/target/$(ARCH)-unknown-linux-musl/release/enclave enclave/enclave
	@echo "Enclave binary: enclave/enclave"

# Build Enclave Image File (requires AWS Nitro CLI)
build-eif: build-enclave
	@echo "Building Enclave Image File..."
	cd enclave && docker build -t bodhi-enclave .
	nitro-cli build-enclave --docker-uri bodhi-enclave --output-file bodhi-enclave.eif
	@echo "EIF created: enclave/bodhi-enclave.eif"

# Run parent instance (vsock mode)
run-parent:
	@echo "Running parent instance (vsock mode)..."
	RUST_LOG=info ./parent/target/release/parent

# Run enclave (vsock mode - for local testing without Nitro)
run-enclave:
	@echo "Running enclave (vsock mode)..."
	./enclave/target/$(ARCH)-unknown-linux-musl/release/enclave

# Run enclave on Nitro
run-nitro:
	@echo "Configuring Nitro Enclaves..."
	sudo nitro-cli-config -t 2 -m 512
	@echo "Running enclave on Nitro..."
	nitro-cli run-enclave --eif-path enclave/bodhi-enclave.eif --cpu-count 2 --memory 512 --debug-mode

# Show enclave console
console:
	@ENCLAVE_ID=$$(nitro-cli describe-enclaves | jq -r '.[0].EnclaveID') && \
	nitro-cli console --enclave-id $$ENCLAVE_ID

# Terminate enclave
terminate:
	@ENCLAVE_ID=$$(nitro-cli describe-enclaves | jq -r '.[0].EnclaveID') && \
	nitro-cli terminate-enclave --enclave-id $$ENCLAVE_ID

clean:
	cd parent && cargo clean
	cd enclave && cargo clean
	rm -f enclave/enclave
	rm -f enclave/bodhi-enclave.eif
