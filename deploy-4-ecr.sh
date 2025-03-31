#!/bin/bash
set -e

# Import environment variables
source ./env-vars.sh

# Check if SECRET_ARN is set (added by deploy-3b-secrets.sh)
if [ -z "$SECRET_ARN" ]; then
  echo "ERROR: SECRET_ARN is not set in env-vars.sh"
  echo "Please run deploy-3b-secrets.sh first"
  exit 1
fi

# ECR repository name
ECR_REPOSITORY_NAME="$APP_NAME"

echo "Creating ECR repository and pushing Docker image for $APP_NAME in $AWS_REGION..."

# Check if ECR repository already exists
if aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION 2>/dev/null; then
  echo "ECR repository '$ECR_REPOSITORY_NAME' already exists, skipping creation"
else
  # Create ECR repository
  echo "Creating new ECR repository: $ECR_REPOSITORY_NAME"
  aws ecr create-repository \
    --repository-name $ECR_REPOSITORY_NAME \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true
  
  echo "ECR repository created: $ECR_REPOSITORY_NAME"
fi

# Get ECR repository URI
ECR_REPOSITORY_URI=$(aws ecr describe-repositories \
  --repository-names $ECR_REPOSITORY_NAME \
  --region $AWS_REGION \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "ECR Repository URI: $ECR_REPOSITORY_URI"

# Get login token for ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI

echo "Logged in to ECR"

# Create temporary file with environment variables directly from env-vars.sh
# This avoids using jq which might not be installed
cat > .env.production << EOF
# Database connection string for MySQL
DATABASE_URL="mysql://$DB_USERNAME:$DB_PASSWORD@$RDS_ENDPOINT:3306/$DB_NAME"

NEXTAUTH_URL="https://rem-note.com"
NEXTAUTH_SECRET="dR6yh8jK9mN2pQ4sT7vX3zC5bE8wA1nJ4kL7mP9qR2tU5vX8"

# Google OAuth settings
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}"
EOF

echo "Created .env.production file for build process"

# Build Docker image
docker build -t $ECR_REPOSITORY_URI:latest .

echo "Docker image built"

# Push Docker image to ECR
docker push $ECR_REPOSITORY_URI:latest

echo "Docker image pushed to ECR"

# Remove the local .env.production file for security
rm .env.production
echo "Removed local .env.production file"

# Update environment variables file with new resource IDs
cat >> env-vars.sh << EOF
# ECR Configuration
export ECR_REPOSITORY_NAME="$ECR_REPOSITORY_NAME"
export ECR_REPOSITORY_URI="$ECR_REPOSITORY_URI"
EOF

echo "ECR setup and image push complete!" 