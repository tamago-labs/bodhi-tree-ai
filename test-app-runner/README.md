# Test App Runner Service

A simple Hello World service for testing AWS App Runner deployment. This minimal Express.js application demonstrates the basic setup required for deploying a Node.js service to AWS App Runner.

## Overview

This test service includes:
- Simple Express.js server returning "Hello World"
- Health check endpoint for App Runner monitoring
- Basic API information endpoint
- AWS App Runner configuration
- Automated deployment script

## Features

- **Hello World Endpoint**: Returns a friendly JSON message
- **Health Check**: `/health` endpoint for App Runner health monitoring
- **API Info**: `/api/info` endpoint showing system information
- **Auto-scaling**: Configured for 1-2 instances based on CPU usage
- **Zero Downtime**: Supports rolling deployments

## Quick Start

### Prerequisites

- Node.js 22+ (for local development)
- AWS Account with App Runner access
- AWS CLI configured with credentials
- Git repository (GitHub, GitLab, or CodeCommit)

### Local Development

```bash
# Clone or navigate to the project directory
cd test-app-runner

# Install dependencies
npm install

# Run in development mode
npm run dev

# Or run in production mode
npm start
```

The service will be available at:
- Hello World: http://localhost:3000/
- Health Check: http://localhost:3000/health
- API Info: http://localhost:3000/api/info

## Deployment to AWS App Runner

### Method 1: Automated Script (Recommended)

```bash
# Make sure you have AWS CLI configured
aws configure

# Deploy using the automated script
./scripts/deploy.sh --repo-url https://github.com/your-username/test-app-runner
```

### Method 2: AWS Console

1. **Push to Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Create App Runner Service**
   - Go to AWS App Runner console
   - Click "Create service"
   - Select "Source code repository"
   - Choose your Git provider
   - Select your repository and branch
   - Configure deployment settings:
     - Runtime: Node.js 22
     - Build command: `npm install --production`
     - Start command: `npm start`
     - Port: 3000
   - Configure health check:
     - Path: `/health`
     - Interval: 30 seconds
     - Timeout: 5 seconds
   - Set environment variables (optional)
   - Create and deploy

### Method 3: AWS CLI

```bash
aws apprunner create-service \
  --service-name test-app-runner \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/your-username/test-app-runner",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "main"
      },
      "CodeConfiguration": {
        "ConfigurationSource": "REPOSITORY"
      }
    }
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "1 GB"
  }' \
  --health-check-configuration '{
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 30,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 3
  }'
```

## Configuration

### App Runner Configuration (`apprunner.yaml`)

The service is configured using `apprunner.yaml` with the following settings:

- **Runtime**: Node.js 22.14.0
- **Port**: 3000 (configurable via PORT env var)
- **Health Check**: `/health` endpoint
- **Auto-scaling**: 1-2 instances based on CPU usage
- **Instance Size**: 1 vCPU, 1 GB RAM

### Environment Variables

Optional environment variables you can set in the App Runner console:

- `NODE_ENV` - Environment (default: production)
- `PORT` - Port number (default: 3000)

## API Endpoints

### GET `/`
Returns a Hello World message with basic information.

**Response:**
```json
{
  "message": "Hello World from AWS App Runner!",
  "timestamp": "2025-10-20T11:30:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### GET `/health`
Health check endpoint for App Runner monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T11:30:00.000Z",
  "uptime": 123.456
}
```

### GET `/api/info`
Returns system and application information.

**Response:**
```json
{
  "service": "Test App Runner Service",
  "version": "1.0.0",
  "nodeVersion": "v22.14.0",
  "platform": "linux",
  "memory": {
    "rss": 50331648,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "uptime": 123.456
}
```

## Monitoring and Logging

### CloudWatch Integration

App Runner automatically integrates with CloudWatch:

- **Metrics**: CPU utilization, memory, requests, latency
- **Logs**: Application logs are sent to CloudWatch Logs
- **Alarms**: Set up CloudWatch alarms for monitoring

### Viewing Logs

```bash
# View recent logs
aws logs tail /aws/apprunner/test-app-runner --follow

# List log groups
aws logs describe-log-groups --log-group-name-prefix /aws/apprunner
```

## Cost Optimization

### App Runner Pricing

- **CPU**: $0.064 per vCPU-hour
- **Memory**: $0.014 per GB-hour
- **Requests**: $1.00 per million requests

### Cost Saving Tips

1. **Auto-scaling**: Configure appropriate min/max instances
2. **Instance Size**: This service uses minimal resources (1 vCPU, 1 GB)
3. **Monitoring**: Use CloudWatch to track costs

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check that your repository is public or has proper access tokens
   - Verify `apprunner.yaml` syntax is correct
   - Ensure all dependencies are in `package.json`

2. **Health Check Fails**
   - Verify `/health` endpoint returns 200 status
   - Check that the app listens on the correct port
   - Review CloudWatch logs for errors

3. **Service Not Accessible**
   - Check if the service status is "RUNNING"
   - Verify the service URL is correct
   - Check security group settings

### Debugging Commands

```bash
# Check service status
aws apprunner describe-service --service-arn <service-arn>

# View deployment logs
aws apprunner describe-operation --service-arn <service-arn> --operation-id <operation-id>

# View application logs
aws logs tail /aws/apprunner/test-app-runner --follow
```

## Cleanup

To delete the service and avoid charges:

```bash
# Delete the App Runner service
aws apprunner delete-service --service-arn <service-arn>

# Delete the IAM role (if created by script)
aws iam delete-role-policy --role-name test-app-runner-role --policy-name test-app-runner-permissions
aws iam delete-role --role-name test-app-runner-role
```

## Next Steps

Once you've successfully deployed this test service, you can:

1. **Modify the application** - Add your own business logic
2. **Add environment variables** - Configure database connections, API keys, etc.
3. **Set up custom domains** - Configure custom domain names
4. **Add monitoring** - Set up CloudWatch alarms and notifications
5. **Integrate with other AWS services** - Add databases, storage, etc.

## Support

- AWS App Runner Documentation: https://docs.aws.amazon.com/apprunner/
- AWS Support: Create a support ticket in AWS Console
- GitHub Issues: Report issues in this repository
