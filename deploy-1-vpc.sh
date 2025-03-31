#!/bin/bash
set -e

# Import AWS region from env-vars.sh if it exists
if [ -f "./env-vars.sh" ]; then
  source ./env-vars.sh
fi

# Configuration variables
AWS_REGION="${AWS_REGION:-us-east-1}"
APP_NAME="feature-request"
VPC_CIDR="10.0.0.0/16"
PUBLIC_SUBNET_1_CIDR="10.0.1.0/24"
PUBLIC_SUBNET_2_CIDR="10.0.2.0/24"
PRIVATE_SUBNET_1_CIDR="10.0.3.0/24"
PRIVATE_SUBNET_2_CIDR="10.0.4.0/24"

echo "Creating VPC infrastructure for $APP_NAME in $AWS_REGION..."

# Create VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block $VPC_CIDR \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$APP_NAME-vpc}]" \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC created: $VPC_ID"

# Enable DNS hostnames for the VPC
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames "{\"Value\":true}" \
  --region $AWS_REGION

# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --region $AWS_REGION \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$APP_NAME-igw}]" \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

echo "Internet Gateway created: $IGW_ID"

# Attach Internet Gateway to VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID \
  --region $AWS_REGION

echo "Internet Gateway attached to VPC"

# Create public subnets
PUBLIC_SUBNET_1_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PUBLIC_SUBNET_1_CIDR \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-public-subnet-1}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Public Subnet 1 created: $PUBLIC_SUBNET_1_ID"

PUBLIC_SUBNET_2_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PUBLIC_SUBNET_2_CIDR \
  --availability-zone ${AWS_REGION}b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-public-subnet-2}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Public Subnet 2 created: $PUBLIC_SUBNET_2_ID"

# Enable auto-assign public IP for public subnets
aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_1_ID \
  --map-public-ip-on-launch \
  --region $AWS_REGION

aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_2_ID \
  --map-public-ip-on-launch \
  --region $AWS_REGION

# Create private subnets
PRIVATE_SUBNET_1_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PRIVATE_SUBNET_1_CIDR \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-private-subnet-1}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Private Subnet 1 created: $PRIVATE_SUBNET_1_ID"

PRIVATE_SUBNET_2_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PRIVATE_SUBNET_2_CIDR \
  --availability-zone ${AWS_REGION}b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$APP_NAME-private-subnet-2}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Private Subnet 2 created: $PRIVATE_SUBNET_2_ID"

# Create route table for public subnets
PUBLIC_ROUTE_TABLE_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$APP_NAME-public-rt}]" \
  --region $AWS_REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

echo "Public Route Table created: $PUBLIC_ROUTE_TABLE_ID"

# Create route to Internet Gateway
aws ec2 create-route \
  --route-table-id $PUBLIC_ROUTE_TABLE_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region $AWS_REGION

echo "Public route to Internet Gateway created"

# Associate public subnets with public route table
aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_1_ID \
  --route-table-id $PUBLIC_ROUTE_TABLE_ID \
  --region $AWS_REGION

aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_2_ID \
  --route-table-id $PUBLIC_ROUTE_TABLE_ID \
  --region $AWS_REGION

echo "Public subnets associated with public route table"

# Create route table for private subnets
PRIVATE_ROUTE_TABLE_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$APP_NAME-private-rt}]" \
  --region $AWS_REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

echo "Private Route Table created: $PRIVATE_ROUTE_TABLE_ID"

# Associate private subnets with private route table
aws ec2 associate-route-table \
  --subnet-id $PRIVATE_SUBNET_1_ID \
  --route-table-id $PRIVATE_ROUTE_TABLE_ID \
  --region $AWS_REGION

aws ec2 associate-route-table \
  --subnet-id $PRIVATE_SUBNET_2_ID \
  --route-table-id $PRIVATE_ROUTE_TABLE_ID \
  --region $AWS_REGION

echo "Private subnets associated with private route table"

# Output all resource IDs for reference in next scripts
echo "Exporting resource IDs to env-vars.sh for use in subsequent scripts"

cat > env-vars.sh << EOF
#!/bin/bash
# AWS Region
export AWS_REGION="$AWS_REGION"
# Application Name
export APP_NAME="$APP_NAME"
# VPC and Networking
export VPC_ID="$VPC_ID"
export IGW_ID="$IGW_ID"
export PUBLIC_SUBNET_1_ID="$PUBLIC_SUBNET_1_ID"
export PUBLIC_SUBNET_2_ID="$PUBLIC_SUBNET_2_ID"
export PRIVATE_SUBNET_1_ID="$PRIVATE_SUBNET_1_ID"
export PRIVATE_SUBNET_2_ID="$PRIVATE_SUBNET_2_ID"
export PUBLIC_ROUTE_TABLE_ID="$PUBLIC_ROUTE_TABLE_ID"
export PRIVATE_ROUTE_TABLE_ID="$PRIVATE_ROUTE_TABLE_ID"
EOF

chmod +x env-vars.sh

echo "VPC infrastructure setup complete!" 