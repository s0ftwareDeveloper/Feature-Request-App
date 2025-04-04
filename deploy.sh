#!/bin/bash
set -e

# Main deployment script for Feature Request App
echo "======================================================"
echo "      Deploying Feature Request App to AWS ECS"
echo "======================================================"
echo ""
echo "This script will set up a complete AWS infrastructure for your application"
echo "including VPC, RDS, ECS, ECR, Route 53, and ACM resources."
echo ""
echo "The deployment will take approximately 30-45 minutes to complete,"
echo "with most of the time spent waiting for resources like RDS and ACM to provision."
echo ""
echo "You have 10 seconds to cancel this script (Ctrl+C) if you wish..."
echo ""
sleep 10

# Make all scripts executable
chmod +x deploy-*.sh

# Execute each deployment script in sequence
echo "Step 0: Configuring AWS CLI..."
./deploy-0-aws-config.sh
echo ""

echo "Step 1: Setting up VPC, subnets, and networking..."
./deploy-1-vpc.sh
echo ""

echo "Step 2: Creating security groups..."
./deploy-2-security-groups.sh
echo ""

echo "Step 3: Setting up RDS MySQL database..."
./deploy-3-rds.sh
echo ""

echo "Step 3b: Setting up AWS Secrets Manager..."
./deploy-3b-secrets.sh
echo ""

echo "Step 4: Creating ECR repository and pushing Docker image..."
./deploy-4-ecr.sh
echo ""

echo "Step 5: Setting up ECS cluster and service..."
./deploy-5-ecs.sh
echo ""

echo "Step 6: Configuring Route 53 and ACM for HTTPS access..."
./deploy-6-route53-acm.sh
echo ""

echo "Step 7: Running Prisma migrations on the database..."
./deploy-7-update-prisma.sh
echo ""

echo "======================================================"
echo "      Deployment Complete!"
echo "======================================================"
echo ""
echo "Your Feature Request App is now deployed and accessible at:"
echo "  https://rem-note.com"
echo "  https://www.rem-note.com"
echo ""
echo "Infrastructure Management Commands:"
echo "  - To see all deployed resources and endpoints: cat env-vars.sh"
echo "  - To clean up all AWS resources: ./deploy-8-cleanup.sh"
echo ""
echo "Note: DNS propagation may take a few minutes to a few hours."
echo "      Your application will be fully accessible once propagation is complete."
