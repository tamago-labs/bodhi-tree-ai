#!/bin/bash

# Migration Test Script for MCP Service to AWS App Runner
# This script validates that the migration setup is correct

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    log_test "Running: $test_name"
    
    if eval "$test_command" &> /dev/null; then
        log_info "✅ PASSED: $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        log_error "❌ FAILED: $test_name"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Check if we're in the right directory
check_directory() {
    log_info "Checking directory structure..."
    
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found. Please run this script from the mcp-server-app-runner directory."
        exit 1
    fi
    
    if [[ ! -f "apprunner.yaml" ]]; then
        log_error "apprunner.yaml not found. migration incomplete."
        exit 1
    fi
    
    log_info "Directory structure is correct."
}

# Test package.json configuration
test_package_json() {
    log_info "Testing package.json configuration..."
    
    # Check if Node.js version is 22+
    run_test "Node.js version is 22+" "node -e 'const pkg = require(\"./package.json\"); const version = pkg.engines.node.replace(/>=/, \"\"); console.log(version >= \"22.0.0\")'"
    
    # Check if Railway config is removed
    run_test "Railway configuration removed" "! grep -q 'railway' package.json"
    
    # Check if App Runner configuration exists
    run_test "App Runner configuration exists" "grep -q 'apprunner' package.json"
    
    # Check if start script exists
    run_test "Start script exists" "node -e 'const pkg = require(\"./package.json\"); console.log(pkg.scripts.start)'"
}

# Test apprunner.yaml configuration
test_apprunner_yaml() {
    log_info "Testing apprunner.yaml configuration..."
    
    # Check if runtime is nodejs22
    run_test "Runtime is Node.js 22" "grep -q 'runtime: nodejs22' apprunner.yaml"
    
    # Check if port is configured
    run_test "Port is configured" "grep -q 'port: 3001' apprunner.yaml"
    
    # Check if health check is configured
    run_test "Health check is configured" "grep -q 'path: /health' apprunner.yaml"
    
    # Check if build command is configured
    run_test "Build command is configured" "grep -q 'npm install --production' apprunner.yaml"
}

# Test server.js configuration
test_server_js() {
    log_info "Testing server.js configuration..."
    
    # Check if server listens on the right port
    run_test "Server uses environment port" "grep -q 'process.env.PORT' server.js"
    
    # Check if health endpoint exists
    run_test "Health endpoint exists" "grep -q '/health' server.js"
    
    # Check if server binds to 0.0.0.0
    run_test "Server binds to all interfaces" "grep -q '0.0.0.0' server.js"
}

# Test dependencies
test_dependencies() {
    log_info "Testing dependencies..."
    
    # Check if express is installed
    run_test "Express is installed" "node -e 'const pkg = require(\"./package.json\"); console.log(pkg.dependencies.express)'"
    
    # Check if cors is installed
    run_test "CORS is installed" "node -e 'const pkg = require(\"./package.json\"); console.log(pkg.dependencies.cors)'"
    
    # Check if helmet is installed
    run_test "Helmet is installed" "node -e 'const pkg = require(\"./package.json\"); console.log(pkg.dependencies.helmet)'"
}

# Test source files
test_source_files() {
    log_info "Testing source files..."
    
    # Check if main server file exists
    run_test "Server file exists" "test -f server.js"
    
    # Check if MCP manager exists
    run_test "MCP manager exists" "test -f src/mcp-manager.js"
    
    # Check if middleware exists
    run_test "Auth middleware exists" "test -f src/middleware/auth.js"
    run_test "Error handler middleware exists" "test -f src/middleware/error-handler.js"
    
    # Check if utilities exist
    run_test "Logger utility exists" "test -f src/utils/logger.js"
}

# Test configuration files
test_config_files() {
    log_info "Testing configuration files..."
    
    # Check if .env.example exists
    run_test "Environment example exists" "test -f .env.example"
    
    # Check if Railway config is removed
    run_test "Railway config removed" "! test -f railway.json"
    
    # Check if Dockerfile is removed (not needed for App Runner)
    run_test "Dockerfile removed" "! test -f Dockerfile"
}

# Test deployment script
test_deployment_script() {
    log_info "Testing deployment script..."
    
    # Check if deployment script exists
    run_test "Deployment script exists" "test -f scripts/deploy.sh"
    
    # Check if deployment script is executable
    run_test "Deployment script is executable" "test -x scripts/deploy.sh"
    
    # Check if deployment script has AWS CLI commands
    run_test "Deployment script has AWS CLI commands" "grep -q 'aws apprunner' scripts/deploy.sh"
}

# Test local functionality
test_local_functionality() {
    log_info "Testing local functionality..."
    
    # Check if npm install works
    run_test "npm install works" "npm install --dry-run"
    
    # Check if npm start script is valid
    run_test "npm start script is valid" "npm run start --if-present"
}

# Validate App Runner configuration syntax
validate_apprunner_config() {
    log_info "Validating App Runner configuration syntax..."
    
    # Basic YAML syntax check
    if command -v python3 &> /dev/null; then
        run_test "YAML syntax is valid" "python3 -c \"import yaml; yaml.safe_load(open('apprunner.yaml'))\""
    elif command -v yq &> /dev/null; then
        run_test "YAML syntax is valid" "yq eval '.' apprunner.yaml > /dev/null"
    else
        log_warn "YAML validator not found. Skipping syntax check."
    fi
}

# Generate migration report
generate_report() {
    log_info "Generating migration report..."
    
    echo ""
    echo "=========================================="
    echo "         MIGRATION TEST REPORT           "
    echo "=========================================="
    echo ""
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    echo "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"
    echo ""
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED! Migration is ready for deployment.${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Push your code to a Git repository"
        echo "2. Run: ./scripts/deploy.sh --repo-url <your-repo-url>"
        echo "3. Configure environment variables in AWS App Runner console"
        echo "4. Test the deployed service"
    else
        echo -e "${RED}❌ SOME TESTS FAILED! Please fix the issues before deploying.${NC}"
        echo ""
        echo "Please review the failed tests above and fix the issues."
        exit 1
    fi
    
    echo ""
    echo "=========================================="
}

# Main test function
main() {
    echo "🧪 Testing MCP Service Migration to AWS App Runner"
    echo "=================================================="
    echo ""
    
    check_directory
    
    test_package_json
    test_apprunner_yaml
    test_server_js
    test_dependencies
    test_source_files
    test_config_files
    test_deployment_script
    test_local_functionality
    validate_apprunner_config
    
    generate_report
}

# Run main function
main "$@"
