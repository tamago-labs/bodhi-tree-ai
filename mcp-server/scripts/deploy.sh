#!/bin/bash

# AWS App Runner Deployment Script for MCP Service
# This script helps deploy the MCP service to AWS App Runner

set -e

# Configuration
SERVICE_NAME="mcp-service"
REGION="us-east-1"
REPO_URL=""  # Set your repository URL here
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if jq is installed (for JSON parsing)
    if ! command -v jq &> /dev/null; then
        log_warn "jq is not installed. Some features may not work properly."
    fi
    
    log_info "Prerequisites check passed."
}

# Create IAM role for App Runner
create_iam_role() {
    log_info "Creating IAM role for App Runner..."
    
    ROLE_NAME="${SERVICE_NAME}-apprunner-role"
    TRUST_POLICY_FILE="trust-policy.json"
    PERMISSIONS_POLICY_FILE="permissions-policy.json"
    
    # Create trust policy
    cat > $TRUST_POLICY_FILE << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "build.apprunner.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        },
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "tasks.apprunner.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
    
    # Create permissions policy
    cat > $PERMISSIONS_POLICY_FILE << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::*",
                "arn:aws:s3:::*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters"
            ],
            "Resource": "arn:aws:ssm:*:*:parameter/*"
        }
    ]
}
EOF
    
    # Create the role
    if aws iam get-role --role-name $ROLE_NAME &> /dev/null; then
        log_warn "IAM role $ROLE_NAME already exists. Skipping creation."
    else
        aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document file://$TRUST_POLICY_FILE
        aws iam put-role-policy --role-name $ROLE_NAME --policy-name "${SERVICE_NAME}-permissions" --policy-document file://$PERMISSIONS_POLICY_FILE
        
        log_info "Waiting for role to be created..."
        sleep 10
    fi
    
    # Get role ARN
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
    log_info "IAM role created: $ROLE_ARN"
    
    # Cleanup
    rm -f $TRUST_POLICY_FILE $PERMISSIONS_POLICY_FILE
    
    echo $ROLE_ARN
}

# Create App Runner service
create_service() {
    local role_arn=$1
    log_info "Creating App Runner service..."
    
    # Check if service already exists
    if aws apprunner describe-service --service-arn "arn:aws:apprunner:$REGION:$(aws sts get-caller-identity --query Account --output text):service/$SERVICE_NAME" &> /dev/null; then
        log_warn "Service $SERVICE_NAME already exists. Updating instead..."
        update_service
        return
    fi
    
    # Create service
    aws apprunner create-service \
        --service-name $SERVICE_NAME \
        --source-configuration "{
            \"CodeRepository\": {
                \"RepositoryUrl\": \"$REPO_URL\",
                \"SourceCodeVersion\": {
                    \"Type\": \"BRANCH\",
                    \"Value\": \"$BRANCH\"
                },
                \"CodeConfiguration\": {
                    \"ConfigurationSource\": \"REPOSITORY\"
                }
            }
        }" \
        --instance-configuration "{
            \"Cpu\": \"1 vCPU\",
            \"Memory\": \"2 GB\"
        }" \
        --auto-scaling-configuration-arn "arn:aws:apprunner:$REGION:$(aws sts get-caller-identity --query Account --output text):autoscalingconfiguration/DefaultConfiguration/1/00000000000000000000000000000001" \
        --health-check-configuration "{
            \"Protocol\": \"HTTP\",
            \"Path\": \"/health\",
            \"Interval\": 30,
            \"Timeout\": 5,
            \"HealthyThreshold\": 1,
            \"UnhealthyThreshold\": 3
        }" \
        --access-configuration "{
            \"IsPubliclyAccessible\": true
        }" \
        --service-arn "arn:aws:apprunner:$REGION:$(aws sts get-caller-identity --query Account --output text):service/$SERVICE_NAME"
    
    log_info "Service creation initiated. This may take a few minutes..."
}

# Update existing service
update_service() {
    log_info "Updating existing service..."
    
    aws apprunner update-service \
        --service-arn "arn:aws:apprunner:$REGION:$(aws sts get-caller-identity --query Account --output text):service/$SERVICE_NAME" \
        --source-configuration "{
            \"CodeRepository\": {
                \"RepositoryUrl\": \"$REPO_URL\",
                \"SourceCodeVersion\": {
                    \"Type\": \"BRANCH\",
                    \"Value\": \"$BRANCH\"
                },
                \"CodeConfiguration\": {
                    \"ConfigurationSource\": \"REPOSITORY\"
                }
            }
        }"
    
    log_info "Service update initiated."
}

# Wait for deployment to complete
wait_for_deployment() {
    log_info "Waiting for deployment to complete..."
    
    while true; do
        STATUS=$(aws apprunner describe-service \
            --service-arn "arn:aws:apprunner:$REGION:$(aws sts get-caller-identity --query Account --output text):service/$SERVICE_NAME" \
            --query 'Service.Status' \
            --output text)
        
        log_info "Current status: $STATUS"
        
        if [[ "$STATUS" == "RUNNING" ]]; then
            log_info "Deployment completed successfully!"
            break
        elif [[ "$STATUS" == "CREATE_FAILED" || "$STATUS" == "UPDATE_FAILED" ]]; then
            log_error "Deployment failed!"
            exit 1
        fi
        
        sleep 30
    done
    
    # Get service URL
    SERVICE_URL=$(aws apprunner describe-service \
        --service-arn "arn:aws:apprunner:$REGION:$(aws sts get-caller-identity --query Account --output text):service/$SERVICE_NAME" \
        --query 'Service.ServiceUrl' \
        --output text)
    
    log_info "Service is available at: $SERVICE_URL"
}

# Main deployment function
deploy() {
    log_info "Starting deployment of MCP service to AWS App Runner..."
    
    # Check if repository URL is provided
    if [[ -z "$REPO_URL" ]]; then
        log_error "Repository URL is not set. Please set REPO_URL variable in the script."
        exit 1
    fi
    
    check_prerequisites
    
    # Create IAM role
    ROLE_ARN=$(create_iam_role)
    
    # Create or update service
    create_service $ROLE_ARN
    
    # Wait for deployment
    wait_for_deployment
    
    log_info "Deployment completed successfully!"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -r, --repo-url URL    Git repository URL"
    echo "  -b, --branch BRANCH   Git branch (default: main)"
    echo "  -s, --service-name    Service name (default: mcp-service)"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --repo-url https://github.com/your-org/mcp-server-app-runner"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--repo-url)
            REPO_URL="$2"
            shift 2
            ;;
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        -s|--service-name)
            SERVICE_NAME="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run deployment
deploy
