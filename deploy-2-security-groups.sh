#!/bin/bash
set -e

# Import environment variables
source ./env-vars.sh

echo "Creating security groups for $APP_NAME in $AWS_REGION..."

# Create security group for RDS
RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name "$APP_NAME-rds-sg" \
  --description "Security group for RDS database" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$APP_NAME-rds-sg}]" \
  --query 'GroupId' \
  --output text)

echo "RDS Security Group created: $RDS_SG_ID"

# Create security group for ECS service
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name "$APP_NAME-ecs-sg" \
  --description "Security group for ECS service" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$APP_NAME-ecs-sg}]" \
  --query 'GroupId' \
  --output text)

echo "ECS Security Group created: $ECS_SG_ID"

# Create security group for load balancer
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name "$APP_NAME-alb-sg" \
  --description "Security group for Application Load Balancer" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$APP_NAME-alb-sg}]" \
  --query 'GroupId' \
  --output text)

echo "ALB Security Group created: $ALB_SG_ID"

# Allow MySQL traffic from ECS to RDS
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 3306 \
  --source-group $ECS_SG_ID \
  --region $AWS_REGION

echo "Added rule: MySQL traffic from ECS to RDS"

# Allow MySQL traffic from public for RDS (since it's requested to be in public subnet)
# In production, this should be restricted to specific IPs
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 3306 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

echo "Added rule: MySQL traffic from public to RDS (for demo purposes)"

# Allow HTTP and HTTPS traffic to ALB from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

echo "Added rules: HTTP and HTTPS traffic to ALB"

# Allow traffic from ALB to ECS on the application port (3000)
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG_ID \
  --region $AWS_REGION

echo "Added rule: Traffic from ALB to ECS on port 3000"

# Update environment variables file with new resource IDs
cat >> env-vars.sh << EOF
# Security Groups
export RDS_SG_ID="$RDS_SG_ID"
export ECS_SG_ID="$ECS_SG_ID"
export ALB_SG_ID="$ALB_SG_ID"
EOF

echo "Security groups setup complete!" 