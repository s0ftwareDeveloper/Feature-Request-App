#!/bin/bash
set -e

# Import environment variables
source ./env-vars.sh

echo "WARNING: This script will delete all AWS resources created for $APP_NAME in $AWS_REGION"
echo "You have 10 seconds to cancel (Ctrl+C)..."
sleep 10

echo "Starting cleanup of AWS resources..."

# Delete Route 53 records and hosted zone
echo "Deleting Route 53 records and hosted zone..."
aws route53 list-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --region $AWS_REGION | jq -c '.ResourceRecordSets[] | select(.Type != "NS" and .Type != "SOA")' | while read -r record; do
    recordName=$(echo $record | jq -r '.Name')
    recordType=$(echo $record | jq -r '.Type')
    
    echo "Deleting record: $recordName ($recordType)"
    aws route53 change-resource-record-sets \
        --hosted-zone-id $HOSTED_ZONE_ID \
        --change-batch "{
            \"Changes\": [
                {
                    \"Action\": \"DELETE\",
                    \"ResourceRecordSet\": $record
                }
            ]
        }" \
        --region $AWS_REGION
done

# Wait a moment for records to be deleted
sleep 5

echo "Deleting Route 53 hosted zone..."
aws route53 delete-hosted-zone \
    --id $HOSTED_ZONE_ID \
    --region $AWS_REGION

# Delete ACM certificate
echo "Deleting ACM certificate..."
aws acm delete-certificate \
    --certificate-arn $CERTIFICATE_ARN \
    --region $AWS_REGION

# Delete ECS resources
echo "Deleting ECS service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER_NAME \
    --service $ECS_SERVICE_NAME \
    --desired-count 0 \
    --region $AWS_REGION

# Wait for service to scale down
echo "Waiting for ECS service to scale down..."
aws ecs wait services-inactive \
    --cluster $ECS_CLUSTER_NAME \
    --services $ECS_SERVICE_NAME \
    --region $AWS_REGION

echo "Deleting ECS service..."
aws ecs delete-service \
    --cluster $ECS_CLUSTER_NAME \
    --service $ECS_SERVICE_NAME \
    --region $AWS_REGION

echo "Deleting ECS task definition..."
aws ecs deregister-task-definition \
    --task-definition $ECS_TASK_DEFINITION_ARN \
    --region $AWS_REGION

echo "Deleting ECS cluster..."
aws ecs delete-cluster \
    --cluster $ECS_CLUSTER_NAME \
    --region $AWS_REGION

# Delete AWS Secrets Manager secret
if [ ! -z "$SECRET_ARN" ]; then
    echo "Deleting AWS Secrets Manager secret..."
    aws secretsmanager delete-secret \
        --secret-id $SECRET_ARN \
        --force-delete-without-recovery \
        --region $AWS_REGION
    
    echo "Secret deleted: $SECRET_NAME"
fi

# Delete IAM policies and roles
echo "Detaching policies from IAM roles..."
if [ ! -z "$SECRETS_POLICY_ARN" ]; then
    aws iam detach-role-policy \
        --role-name $ECS_EXECUTION_ROLE_NAME \
        --policy-arn $SECRETS_POLICY_ARN \
        --region $AWS_REGION
    
    aws iam detach-role-policy \
        --role-name $ECS_TASK_ROLE_NAME \
        --policy-arn $SECRETS_POLICY_ARN \
        --region $AWS_REGION
    
    echo "Deleting Secrets Manager access policy..."
    aws iam delete-policy \
        --policy-arn $SECRETS_POLICY_ARN \
        --region $AWS_REGION
fi

aws iam detach-role-policy \
    --role-name $ECS_EXECUTION_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
    --region $AWS_REGION

aws iam detach-role-policy \
    --role-name $ECS_EXECUTION_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/AmazonECR-FullAccess \
    --region $AWS_REGION

echo "Deleting IAM roles..."
aws iam delete-role \
    --role-name $ECS_EXECUTION_ROLE_NAME \
    --region $AWS_REGION

aws iam delete-role \
    --role-name $ECS_TASK_ROLE_NAME \
    --region $AWS_REGION

# Delete ALB resources
echo "Deleting ALB listeners..."
aws elbv2 delete-listener \
    --listener-arn $LISTENER_ARN \
    --region $AWS_REGION

aws elbv2 delete-listener \
    --listener-arn $HTTPS_LISTENER_ARN \
    --region $AWS_REGION

echo "Deleting target group..."
aws elbv2 delete-target-group \
    --target-group-arn $TG_ARN \
    --region $AWS_REGION

echo "Deleting Application Load Balancer..."
aws elbv2 delete-load-balancer \
    --load-balancer-arn $ALB_ARN \
    --region $AWS_REGION

# Wait for load balancer to be deleted
sleep 20

# Delete CloudWatch log group
echo "Deleting CloudWatch log group..."
aws logs delete-log-group \
    --log-group-name /ecs/$APP_NAME \
    --region $AWS_REGION

# Delete RDS instance
echo "Deleting RDS instance..."
aws rds delete-db-instance \
    --db-instance-identifier $RDS_INSTANCE_IDENTIFIER \
    --skip-final-snapshot \
    --delete-automated-backups \
    --region $AWS_REGION

echo "Waiting for RDS instance to be deleted..."
aws rds wait db-instance-deleted \
    --db-instance-identifier $RDS_INSTANCE_IDENTIFIER \
    --region $AWS_REGION

echo "Deleting RDS subnet group..."
aws rds delete-db-subnet-group \
    --db-subnet-group-name $DB_SUBNET_GROUP_NAME \
    --region $AWS_REGION

# Delete ECR repository
echo "Deleting ECR repository..."
aws ecr delete-repository \
    --repository-name $ECR_REPOSITORY_NAME \
    --force \
    --region $AWS_REGION

# Delete security groups
echo "Deleting security groups..."
aws ec2 delete-security-group \
    --group-id $ALB_SG_ID \
    --region $AWS_REGION

aws ec2 delete-security-group \
    --group-id $ECS_SG_ID \
    --region $AWS_REGION

aws ec2 delete-security-group \
    --group-id $RDS_SG_ID \
    --region $AWS_REGION

# Delete VPC resources
echo "Deleting VPC resources..."

# Delete route tables
aws ec2 disassociate-route-table \
    --association-id $(aws ec2 describe-route-tables --route-table-id $PUBLIC_ROUTE_TABLE_ID --region $AWS_REGION --query 'RouteTables[0].Associations[0].RouteTableAssociationId' --output text) \
    --region $AWS_REGION

aws ec2 disassociate-route-table \
    --association-id $(aws ec2 describe-route-tables --route-table-id $PUBLIC_ROUTE_TABLE_ID --region $AWS_REGION --query 'RouteTables[0].Associations[1].RouteTableAssociationId' --output text) \
    --region $AWS_REGION

aws ec2 disassociate-route-table \
    --association-id $(aws ec2 describe-route-tables --route-table-id $PRIVATE_ROUTE_TABLE_ID --region $AWS_REGION --query 'RouteTables[0].Associations[0].RouteTableAssociationId' --output text) \
    --region $AWS_REGION

aws ec2 disassociate-route-table \
    --association-id $(aws ec2 describe-route-tables --route-table-id $PRIVATE_ROUTE_TABLE_ID --region $AWS_REGION --query 'RouteTables[0].Associations[1].RouteTableAssociationId' --output text) \
    --region $AWS_REGION

aws ec2 delete-route \
    --route-table-id $PUBLIC_ROUTE_TABLE_ID \
    --destination-cidr-block 0.0.0.0/0 \
    --region $AWS_REGION

aws ec2 delete-route-table \
    --route-table-id $PUBLIC_ROUTE_TABLE_ID \
    --region $AWS_REGION

aws ec2 delete-route-table \
    --route-table-id $PRIVATE_ROUTE_TABLE_ID \
    --region $AWS_REGION

# Delete subnets
echo "Deleting subnets..."
aws ec2 delete-subnet \
    --subnet-id $PUBLIC_SUBNET_1_ID \
    --region $AWS_REGION

aws ec2 delete-subnet \
    --subnet-id $PUBLIC_SUBNET_2_ID \
    --region $AWS_REGION

aws ec2 delete-subnet \
    --subnet-id $PRIVATE_SUBNET_1_ID \
    --region $AWS_REGION

aws ec2 delete-subnet \
    --subnet-id $PRIVATE_SUBNET_2_ID \
    --region $AWS_REGION

# Detach Internet Gateway
echo "Detaching Internet Gateway..."
aws ec2 detach-internet-gateway \
    --internet-gateway-id $IGW_ID \
    --vpc-id $VPC_ID \
    --region $AWS_REGION

# Delete Internet Gateway
echo "Deleting Internet Gateway..."
aws ec2 delete-internet-gateway \
    --internet-gateway-id $IGW_ID \
    --region $AWS_REGION

# Delete VPC
echo "Deleting VPC..."
aws ec2 delete-vpc \
    --vpc-id $VPC_ID \
    --region $AWS_REGION

echo "Cleanup complete! All AWS resources for $APP_NAME have been deleted." 