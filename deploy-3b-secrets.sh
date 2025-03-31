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

# Check if RDS information is available
if [ -z "$RDS_ENDPOINT" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: RDS configuration is incomplete in env-vars.sh"
  echo "Please run deploy-3-rds.sh first"
  exit 1
fi

echo "Creating AWS Secrets Manager secret for $APP_NAME in $AWS_REGION..."

# Define secret name based on app name
SECRET_NAME="$APP_NAME-secrets"

# Create JSON string with sensitive configuration
SECRET_STRING=$(cat << EOF
{
  "DATABASE_URL": "mysql://$DB_USERNAME:$DB_PASSWORD@$RDS_ENDPOINT:3306/$DB_NAME",
  "NEXTAUTH_URL": "https://rem-note.com",
  "NEXTAUTH_SECRET": "dR6yh8jK9mN2pQ4sT7vX3zC5bE8wA1nJ4kL7mP9qR2tU5vX8",
  "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
  "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}",
  "DB_USERNAME": "$DB_USERNAME",
  "DB_PASSWORD": "$DB_PASSWORD",
  "DB_NAME": "$DB_NAME",
  "DB_HOST": "$RDS_ENDPOINT"
}
EOF
)

# Check if secret already exists
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" 2>/dev/null; then
  echo "Secret '$SECRET_NAME' already exists, updating it..."
  
  # Update existing secret
  aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_STRING" \
    --region "$AWS_REGION"
    
  # Get the ARN of the existing secret
  SECRET_ARN=$(aws secretsmanager describe-secret \
    --secret-id "$SECRET_NAME" \
    --region "$AWS_REGION" \
    --query 'ARN' \
    --output text)
else
  echo "Creating new secret: $SECRET_NAME"
  
  # Create new secret
  SECRET_ARN=$(aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "Configuration secrets for $APP_NAME application" \
    --secret-string "$SECRET_STRING" \
    --region "$AWS_REGION" \
    --query 'ARN' \
    --output text)
fi

echo "Secret created/updated: $SECRET_ARN"

# Create IAM policy for accessing the secret
POLICY_NAME="$APP_NAME-secrets-access-policy"
POLICY_ARN=$(aws iam create-policy \
  --policy-name "$POLICY_NAME" \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"secretsmanager:GetSecretValue\",
          \"secretsmanager:DescribeSecret\"
        ],
        \"Resource\": \"$SECRET_ARN\"
      }
    ]
  }" \
  --region "$AWS_REGION" \
  --query 'Policy.Arn' \
  --output text 2>/dev/null || \
aws iam get-policy \
  --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query 'Account' --output text):policy/$POLICY_NAME" \
  --query 'Policy.Arn' \
  --output text)

echo "IAM policy created/retrieved: $POLICY_ARN"

# Update environment variables file with new secret information
# First, remove any existing SECRET references
grep -v "SECRET_NAME\|SECRET_ARN\|POLICY_ARN" env-vars.sh > env-vars.tmp
mv env-vars.tmp env-vars.sh
chmod +x env-vars.sh

# Add secrets information to env-vars.sh
cat >> env-vars.sh << EOF
# AWS Secrets Manager Configuration
export SECRET_NAME="$SECRET_NAME"
export SECRET_ARN="$SECRET_ARN"
export SECRETS_POLICY_ARN="$POLICY_ARN"
EOF

echo "AWS Secrets Manager setup complete!"
echo "Secret ARN: $SECRET_ARN"
echo "Added to env-vars.sh for use in subsequent scripts." 