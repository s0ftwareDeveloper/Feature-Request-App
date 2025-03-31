#!/bin/bash
set -e

# Import environment variables
source ./env-vars.sh

# Check if AWS_REGION is set
if [ -z "$AWS_REGION" ]; then
  echo "ERROR: AWS_REGION is not set in env-vars.sh"
  echo "Please run deploy-0-aws-config.sh first"
  exit 1
fi

# Check if security group exists
if [ -z "$RDS_SG_ID" ]; then
  echo "ERROR: RDS_SG_ID is not set in env-vars.sh"
  echo "Please run deploy-2-security-groups.sh first"
  exit 1
fi

# Check if subnets exist
if [ -z "$PUBLIC_SUBNET_1_ID" ] || [ -z "$PUBLIC_SUBNET_2_ID" ]; then
  echo "ERROR: Public subnet IDs are not set in env-vars.sh"
  echo "Please run deploy-1-vpc.sh first"
  exit 1
fi

DB_NAME="feature_request"
DB_USERNAME="admin"
DB_PASSWORD="my-secret-password"
DB_INSTANCE_CLASS="db.t3.micro"  # Smallest instance type for minimal cost

echo "Creating RDS MySQL instance for $APP_NAME in $AWS_REGION..."

# Check if DB subnet group already exists
DB_SUBNET_GROUP_NAME="$APP_NAME-db-subnet-group"
if aws rds describe-db-subnet-groups --db-subnet-group-name "$DB_SUBNET_GROUP_NAME" --region "$AWS_REGION" 2>/dev/null; then
  echo "DB Subnet Group '$DB_SUBNET_GROUP_NAME' already exists, skipping creation"
else
  # Create a subnet group for RDS
  echo "Creating new DB Subnet Group: $DB_SUBNET_GROUP_NAME"
  aws rds create-db-subnet-group \
    --db-subnet-group-name "$DB_SUBNET_GROUP_NAME" \
    --db-subnet-group-description "Subnet group for $APP_NAME RDS instance" \
    --subnet-ids "$PUBLIC_SUBNET_1_ID" "$PUBLIC_SUBNET_2_ID" \
    --region "$AWS_REGION"
  
  echo "RDS Subnet Group created: $DB_SUBNET_GROUP_NAME"
fi

# Check if DB instance already exists
RDS_INSTANCE_IDENTIFIER="$APP_NAME-db"
if aws rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE_IDENTIFIER" --region "$AWS_REGION" 2>/dev/null; then
  echo "RDS instance '$RDS_INSTANCE_IDENTIFIER' already exists, skipping creation"
else
  # Create RDS MySQL instance
  echo "Creating new RDS instance: $RDS_INSTANCE_IDENTIFIER"
  aws rds create-db-instance \
    --db-instance-identifier "$RDS_INSTANCE_IDENTIFIER" \
    --db-instance-class "$DB_INSTANCE_CLASS" \
    --engine mysql \
    --engine-version "8.0" \
    --allocated-storage 20 \
    --db-name "$DB_NAME" \
    --master-username "$DB_USERNAME" \
    --master-user-password "$DB_PASSWORD" \
    --vpc-security-group-ids "$RDS_SG_ID" \
    --db-subnet-group-name "$DB_SUBNET_GROUP_NAME" \
    --publicly-accessible \
    --port 3306 \
    --storage-type gp2 \
    --backup-retention-period 7 \
    --no-multi-az \
    --no-auto-minor-version-upgrade \
    --region "$AWS_REGION"
    
  echo "RDS MySQL instance creation initiated: $RDS_INSTANCE_IDENTIFIER"
  echo "This will take several minutes to complete..."
fi

# Wait for the database to be available
echo "Waiting for RDS instance to be available..."
aws rds wait db-instance-available \
  --db-instance-identifier "$RDS_INSTANCE_IDENTIFIER" \
  --region "$AWS_REGION"

echo "RDS MySQL instance is now available"

# Get the RDS endpoint with proper error handling
echo "Retrieving RDS endpoint..."
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_INSTANCE_IDENTIFIER" \
  --region "$AWS_REGION" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

# Validate that we got a valid endpoint
if [ -z "$RDS_ENDPOINT" ] || [ "$RDS_ENDPOINT" == "None" ]; then
  echo "ERROR: Failed to retrieve RDS endpoint"
  echo "Trying with a different approach..."
  
  # Try a different approach to get the endpoint
  RDS_ENDPOINT=$(aws rds describe-db-instances \
    --region "$AWS_REGION" \
    --query "DBInstances[?DBInstanceIdentifier=='$RDS_INSTANCE_IDENTIFIER'].Endpoint.Address" \
    --output text)
    
  if [ -z "$RDS_ENDPOINT" ] || [ "$RDS_ENDPOINT" == "None" ]; then
    echo "ERROR: Still unable to retrieve RDS endpoint"
    echo "Please check the AWS console to verify the RDS instance was created correctly"
    exit 1
  fi
fi

echo "RDS Endpoint: $RDS_ENDPOINT"

# Clean up any duplicate entries in env-vars.sh
grep -v "RDS Configuration\|DB_SUBNET_GROUP_NAME\|RDS_INSTANCE_IDENTIFIER\|RDS_ENDPOINT\|DB_NAME\|DB_USERNAME\|DB_PASSWORD\|DATABASE_URL" env-vars.sh > env-vars.tmp
mv env-vars.tmp env-vars.sh
chmod +x env-vars.sh

# Update environment variables file with new resource IDs
cat >> env-vars.sh << EOF
# RDS Configuration
export DB_SUBNET_GROUP_NAME="$DB_SUBNET_GROUP_NAME"
export RDS_INSTANCE_IDENTIFIER="$RDS_INSTANCE_IDENTIFIER"
export RDS_ENDPOINT="$RDS_ENDPOINT"
export DB_NAME="$DB_NAME"
export DB_USERNAME="$DB_USERNAME"
export DB_PASSWORD="$DB_PASSWORD"
export DATABASE_URL="mysql://$DB_USERNAME:$DB_PASSWORD@$RDS_ENDPOINT:3306/$DB_NAME"
EOF

echo "RDS MySQL instance setup complete!" 