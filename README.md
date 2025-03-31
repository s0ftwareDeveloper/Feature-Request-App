# Feature Request App Deployment to AWS ECS

This repository contains a Feature Request application built with Next.js, Prisma, and MySQL. This README provides instructions for deploying the application to AWS ECS.

## Prerequisites

Before deploying, ensure you have the following prerequisites:

1. **AWS CLI installed and configured** with appropriate permissions
   ```bash
   # Install AWS CLI (Linux/macOS)
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Windows installation
   # Visit https://aws.amazon.com/cli/ to download the installer
   ```

2. **Docker installed** for building and pushing container images
   ```bash
   # Install Docker (Ubuntu example)
   sudo apt-get update
   sudo apt-get install docker-ce docker-ce-cli containerd.io
   ```

3. **Node.js and npm installed** for Prisma migrations
   ```bash
   # Install Node.js and npm
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **jq installed** for JSON processing in scripts
   ```bash
   # Install jq
   sudo apt-get install jq
   ```

5. **Domain registered** in Route 53 or ready to update nameservers
   - If you're using a domain not registered in Route 53, you'll need to update your domain's nameservers to point to the AWS Route 53 nameservers after the deployment.

## Deployment Scripts

The deployment is broken into several scripts that build the infrastructure in sequential order:

0. `deploy-0-aws-config.sh`: Sets up AWS CLI with your credentials
1. `deploy-1-vpc.sh`: Creates VPC, subnets, Internet Gateway, and route tables
2. `deploy-2-security-groups.sh`: Sets up security groups for RDS, ECS, and ALB
3. `deploy-3-rds.sh`: Creates an RDS MySQL 8.0 database instance
3b. `deploy-3b-secrets.sh`: Sets up AWS Secrets Manager for secure configuration storage
4. `deploy-4-ecr.sh`: Creates ECR repository and pushes Docker image
5. `deploy-5-ecs.sh`: Sets up ECS cluster, task definition, and service with ALB
6. `deploy-6-route53-acm.sh`: Configures Route 53 and ACM for SSL/HTTPS
7. `deploy-7-update-prisma.sh`: Runs Prisma migrations on the RDS instance
8. `deploy-8-cleanup.sh`: Cleans up all AWS resources (for teardown)

## Deployment Instructions

To deploy the application:

1. Clone this repository and navigate to the project directory
   ```bash
   git clone <repository-url>
   cd Feature-Request-App
   ```

2. Make the deployment scripts executable
   ```bash
   chmod +x deploy.sh deploy-*.sh
   ```

3. Run the main deployment script
   ```bash
   ./deploy.sh
   ```
   
   This will:
   - First configure AWS CLI with your credentials (you'll be prompted to enter them)
   - Execute all deployment steps in sequence
   - The entire deployment process takes approximately 30-45 minutes, mainly due to the time required for RDS provisioning and ACM certificate validation

4. Once deployment is complete, your application will be accessible at:
   - https://rem-note.com
   - https://www.rem-note.com

## AWS IAM Permissions

To run these scripts, your AWS user needs the following permissions:

- EC2 (VPC, subnets, security groups, etc.)
- RDS
- ECS
- ECR
- Route 53
- ACM
- IAM (for ECS task roles)
- CloudWatch Logs

For testing purposes, you can use the AWS managed policies:
- `AmazonEC2FullAccess`
- `AmazonRDSFullAccess`
- `AmazonECS-FullAccess`
- `AmazonECR-FullAccess`
- `AmazonRoute53FullAccess`
- `AWSCertificateManagerFullAccess`
- `IAMFullAccess`
- `CloudWatchLogsFullAccess`

For production, it's recommended to create a custom policy with least privilege permissions.

## Environment Variables and Secrets Management

The application uses the following environment variables, which are securely stored in AWS Secrets Manager:

- `DATABASE_URL`: MySQL connection string for Prisma
- `NEXTAUTH_URL`: URL for NextAuth.js (set to your domain)
- `NEXTAUTH_SECRET`: Secret for NextAuth.js encryption
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

The secrets are:
1. Created and stored in AWS Secrets Manager in `deploy-3b-secrets.sh`
2. Retrieved during Docker image build in `deploy-4-ecr.sh`
3. Securely injected into the container at runtime through ECS task definition in `deploy-5-ecs.sh`

This approach ensures that no secrets are hardcoded in the application code or stored in plain text files.

## Infrastructure Resources

The deployment creates the following AWS resources:

- **VPC** with public and private subnets across two availability zones
- **RDS MySQL** database (db.t3.micro) in public subnets
- **AWS Secrets Manager** secret for storing sensitive configuration
- **ECR** repository for Docker image storage
- **ECS Fargate** cluster with minimal resources (0.25 vCPU, 0.5GB RAM)
- **Application Load Balancer** for traffic distribution
- **Route 53** hosted zone with A records for the domain
- **ACM Certificate** for SSL/HTTPS support

## Cleanup

To remove all AWS resources created by the deployment:

```bash
./deploy-8-cleanup.sh
```

This script will delete all resources in reverse order to ensure proper dependency handling. **Warning**: This action is irreversible and will delete all application data.

## Troubleshooting

If you encounter issues during deployment:

1. Check the AWS CloudWatch logs for ECS tasks
2. Verify that your AWS CLI credentials have sufficient permissions
3. Ensure all prerequisite tools are properly installed
4. Check that the domain nameservers are correctly configured if using a custom domain

For RDS connection issues, ensure the security group rules are correctly configured to allow traffic from the ECS tasks to the RDS instance.

## Cost Optimization

The infrastructure is configured with minimal resource allocations to reduce costs. For further cost optimization:

1. Shut down resources when not in use
2. Use Reserved Instances for RDS if planning long-term usage
3. Monitor CloudWatch metrics to right-size resources based on actual usage 