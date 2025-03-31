#!/bin/bash
set -e

# Disable MSYS path conversion for Git Bash on Windows
export MSYS_NO_PATHCONV=1

# Import environment variables
source ./env-vars.sh

# Check if SECRET_ARN is set (added by deploy-3b-secrets.sh)
if [ -z "$SECRET_ARN" ]; then
  echo "ERROR: SECRET_ARN is not set in env-vars.sh"
  echo "Please run deploy-3b-secrets.sh first"
  exit 1
fi

# ECS configuration
ECS_CLUSTER_NAME="$APP_NAME-cluster"
ECS_SERVICE_NAME="$APP_NAME-service"
ECS_TASK_FAMILY="$APP_NAME-task"
ECS_CONTAINER_NAME="$APP_NAME-container"
ECS_EXECUTION_ROLE_NAME="$APP_NAME-execution-role"
ECS_TASK_ROLE_NAME="$APP_NAME-task-role"
ECS_LOG_GROUP_NAME="/ecs/$APP_NAME"
APPLICATION_PORT=3000
DESIRED_COUNT=1

echo "Creating ECS resources for $APP_NAME in $AWS_REGION..."

# Create CloudWatch log group for ECS - Use POSIX path format
# Ensure we're using the variable directly without any path conversion
echo "Creating log group with name: $ECS_LOG_GROUP_NAME"

# Check if log group exists
LOG_GROUP_EXISTS=$(aws logs describe-log-groups --log-group-name-prefix "$ECS_LOG_GROUP_NAME" --region $AWS_REGION --query "logGroups[?logGroupName=='$ECS_LOG_GROUP_NAME'].logGroupName" --output text)

if [ -z "$LOG_GROUP_EXISTS" ]; then
  # Create log group if it doesn't exist
  aws logs create-log-group \
    --log-group-name "$ECS_LOG_GROUP_NAME" \
    --region $AWS_REGION
  echo "CloudWatch log group created: $ECS_LOG_GROUP_NAME"
else
  echo "CloudWatch log group already exists: $ECS_LOG_GROUP_NAME"
fi

# Create IAM execution role for ECS
echo "Checking for existing execution role: $ECS_EXECUTION_ROLE_NAME"
EXECUTION_ROLE_EXISTS=$(aws iam get-role --role-name $ECS_EXECUTION_ROLE_NAME --region $AWS_REGION --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$EXECUTION_ROLE_EXISTS" ]; then
  echo "Creating execution role..."
  ECS_EXECUTION_ROLE_ARN=$(aws iam create-role \
    --role-name $ECS_EXECUTION_ROLE_NAME \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "ecs-tasks.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    }' \
    --region $AWS_REGION \
    --query 'Role.Arn' \
    --output text)
  echo "ECS execution role created: $ECS_EXECUTION_ROLE_ARN"
else
  ECS_EXECUTION_ROLE_ARN=$EXECUTION_ROLE_EXISTS
  echo "Using existing execution role: $ECS_EXECUTION_ROLE_ARN"
fi

# Attach policies to execution role
echo "Attaching policies to execution role..."
aws iam attach-role-policy \
  --role-name $ECS_EXECUTION_ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
  --region $AWS_REGION 2>/dev/null || echo "AmazonECSTaskExecutionRolePolicy already attached"

aws iam attach-role-policy \
  --role-name $ECS_EXECUTION_ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonECRFullAccess \
  --region $AWS_REGION 2>/dev/null || echo "AmazonECRFullAccess already attached"

# Attach Secrets Manager policy to execution role
aws iam attach-role-policy \
  --role-name $ECS_EXECUTION_ROLE_NAME \
  --policy-arn $SECRETS_POLICY_ARN \
  --region $AWS_REGION 2>/dev/null || echo "Secrets Manager policy already attached"

echo "Policies attached to ECS execution role"

# Create IAM task role for ECS
echo "Checking for existing task role: $ECS_TASK_ROLE_NAME"
TASK_ROLE_EXISTS=$(aws iam get-role --role-name $ECS_TASK_ROLE_NAME --region $AWS_REGION --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$TASK_ROLE_EXISTS" ]; then
  echo "Creating task role..."
  ECS_TASK_ROLE_ARN=$(aws iam create-role \
    --role-name $ECS_TASK_ROLE_NAME \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "ecs-tasks.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    }' \
    --region $AWS_REGION \
    --query 'Role.Arn' \
    --output text)
  echo "ECS task role created: $ECS_TASK_ROLE_ARN"
else
  ECS_TASK_ROLE_ARN=$TASK_ROLE_EXISTS
  echo "Using existing task role: $ECS_TASK_ROLE_ARN"
fi

# Attach Secrets Manager policy to task role
echo "Attaching policy to task role..."
aws iam attach-role-policy \
  --role-name $ECS_TASK_ROLE_NAME \
  --policy-arn $SECRETS_POLICY_ARN \
  --region $AWS_REGION 2>/dev/null || echo "Secrets Manager policy already attached to task role"

echo "Secrets Manager policy attached to task role"

# Create ECS cluster
echo "Checking for existing ECS cluster: $ECS_CLUSTER_NAME"
CLUSTER_EXISTS=$(aws ecs describe-clusters --clusters $ECS_CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].clusterArn' --output text 2>/dev/null || echo "")

if [ -z "$CLUSTER_EXISTS" ] || [ "$CLUSTER_EXISTS" == "None" ]; then
  echo "Creating ECS cluster..."
  aws ecs create-cluster \
    --cluster-name $ECS_CLUSTER_NAME \
    --region $AWS_REGION
  echo "ECS cluster created: $ECS_CLUSTER_NAME"
else
  echo "Using existing ECS cluster: $ECS_CLUSTER_NAME"
fi

# Create task definition JSON file
cat > task-definition.json << EOF
{
  "family": "$ECS_TASK_FAMILY",
  "networkMode": "awsvpc",
  "executionRoleArn": "$ECS_EXECUTION_ROLE_ARN",
  "taskRoleArn": "$ECS_TASK_ROLE_ARN",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "$ECS_CONTAINER_NAME",
      "image": "$ECR_REPOSITORY_URI:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": $APPLICATION_PORT,
          "hostPort": $APPLICATION_PORT,
          "protocol": "tcp"
        }
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "$SECRET_ARN:DATABASE_URL::"},
        {"name": "NEXTAUTH_URL", "valueFrom": "$SECRET_ARN:NEXTAUTH_URL::"},
        {"name": "NEXTAUTH_SECRET", "valueFrom": "$SECRET_ARN:NEXTAUTH_SECRET::"},
        {"name": "GOOGLE_CLIENT_ID", "valueFrom": "$SECRET_ARN:GOOGLE_CLIENT_ID::"},
        {"name": "GOOGLE_CLIENT_SECRET", "valueFrom": "$SECRET_ARN:GOOGLE_CLIENT_SECRET::"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "$ECS_LOG_GROUP_NAME",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

echo "Task definition JSON created"

# Register task definition
ECS_TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "ECS task definition registered: $ECS_TASK_DEFINITION_ARN"

# Create Application Load Balancer
ALB_NAME="$APP_NAME-alb"

# Check if ALB already exists
echo "Checking for existing load balancer: $ALB_NAME"
ALB_ARN=$(aws elbv2 describe-load-balancers --names $ALB_NAME --region $AWS_REGION --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "")

if [ -z "$ALB_ARN" ] || [ "$ALB_ARN" == "None" ]; then
  echo "Creating Application Load Balancer..."
  # Create ALB
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name $ALB_NAME \
    --subnets $PUBLIC_SUBNET_1_ID $PUBLIC_SUBNET_2_ID \
    --security-groups $ALB_SG_ID \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)
  echo "Application Load Balancer created: $ALB_ARN"
else
  echo "Using existing load balancer: $ALB_ARN"
fi

# Get ALB DNS name
ALB_DNS_NAME=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS Name: $ALB_DNS_NAME"

# Create target group
TG_NAME="$APP_NAME-tg"

# Check if target group already exists
echo "Checking for existing target group: $TG_NAME"
TG_ARN=$(aws elbv2 describe-target-groups --names $TG_NAME --region $AWS_REGION --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "")

if [ -z "$TG_ARN" ] || [ "$TG_ARN" == "None" ]; then
  echo "Creating target group..."
  TG_ARN=$(aws elbv2 create-target-group \
    --name $TG_NAME \
    --protocol HTTP \
    --port $APPLICATION_PORT \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-path "/api/health" \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 2 \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
  echo "Target group created: $TG_ARN"
else
  echo "Using existing target group: $TG_ARN"
fi

# Create listener
echo "Checking for existing listener on load balancer"
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --region $AWS_REGION --query 'Listeners[?Port==`80`].ListenerArn' --output text 2>/dev/null || echo "")

if [ -z "$LISTENER_ARN" ] || [ "$LISTENER_ARN" == "None" ]; then
  echo "Creating HTTP listener..."
  LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN \
    --region $AWS_REGION \
    --query 'Listeners[0].ListenerArn' \
    --output text)
  echo "HTTP Listener created: $LISTENER_ARN"
else
  echo "Using existing HTTP listener: $LISTENER_ARN"
fi

# Wait a moment for the resources to be available
sleep 5

# Check if ECS service already exists
echo "Checking for existing ECS service: $ECS_SERVICE_NAME"
SERVICE_EXISTS=$(aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $AWS_REGION --query 'services[0].serviceArn' --output text 2>/dev/null || echo "")

if [ -z "$SERVICE_EXISTS" ] || [ "$SERVICE_EXISTS" == "None" ]; then
  echo "Creating ECS service..."
  # Create ECS service
  aws ecs create-service \
    --cluster $ECS_CLUSTER_NAME \
    --service-name $ECS_SERVICE_NAME \
    --task-definition $ECS_TASK_DEFINITION_ARN \
    --launch-type FARGATE \
    --desired-count $DESIRED_COUNT \
    --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_1_ID,$PRIVATE_SUBNET_2_ID],securityGroups=[$ECS_SG_ID],assignPublicIp=DISABLED}" \
    --load-balancers "targetGroupArn=$TG_ARN,containerName=$ECS_CONTAINER_NAME,containerPort=$APPLICATION_PORT" \
    --region $AWS_REGION \
    --health-check-grace-period-seconds 60
  echo "ECS service created: $ECS_SERVICE_NAME"
else
  echo "Using existing ECS service: $ECS_SERVICE_NAME"
fi

# Update environment variables file with new resource IDs
cat >> env-vars.sh << EOF
# ECS Configuration
export ECS_CLUSTER_NAME="$ECS_CLUSTER_NAME"
export ECS_SERVICE_NAME="$ECS_SERVICE_NAME"
export ECS_TASK_FAMILY="$ECS_TASK_FAMILY"
export ECS_CONTAINER_NAME="$ECS_CONTAINER_NAME"
export ECS_EXECUTION_ROLE_ARN="$ECS_EXECUTION_ROLE_ARN"
export ECS_TASK_ROLE_ARN="$ECS_TASK_ROLE_ARN"
export ECS_TASK_DEFINITION_ARN="$ECS_TASK_DEFINITION_ARN"
# ALB Configuration
export ALB_NAME="$ALB_NAME"
export ALB_ARN="$ALB_ARN"
export ALB_DNS_NAME="$ALB_DNS_NAME"
export TG_NAME="$TG_NAME"
export TG_ARN="$TG_ARN"
export LISTENER_ARN="$LISTENER_ARN"
EOF

echo "ECS and load balancer setup complete!" 