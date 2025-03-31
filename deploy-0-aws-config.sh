#!/bin/bash
set -e

echo "======================================================"
echo "      AWS CLI Configuration for Feature Request App"
echo "======================================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed."
    echo "Please install AWS CLI first:"
    echo ""
    echo "# Linux/macOS installation:"
    echo "curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o \"awscliv2.zip\""
    echo "unzip awscliv2.zip"
    echo "sudo ./aws/install"
    echo ""
    echo "# Windows installation:"
    echo "Visit https://aws.amazon.com/cli/ to download the installer"
    echo ""
    exit 1
fi

echo "AWS CLI is installed. Let's configure it."
echo ""
echo "You'll need your AWS Access Key ID, Secret Access Key, default region, and output format."
echo "These can be obtained from the AWS IAM console: https://console.aws.amazon.com/iam"
echo ""
echo "NOTE: Your credentials will be stored in ~/.aws/credentials and ~/.aws/config"
echo ""

# Prompt for AWS credentials
read -p "Enter your AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -p "Enter your AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
read -p "Enter your default region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}
read -p "Enter your output format (default: json): " AWS_OUTPUT
AWS_OUTPUT=${AWS_OUTPUT:-json}

# Configure AWS CLI
echo ""
echo "Configuring AWS CLI..."
aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
aws configure set default.region "$AWS_REGION"
aws configure set default.output "$AWS_OUTPUT"

# Verify configuration
echo ""
echo "Verifying AWS CLI configuration..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
    AWS_USER=$(aws sts get-caller-identity --query "Arn" --output text)
    
    echo "✅ AWS CLI configuration successful!"
    echo "Account ID: $AWS_ACCOUNT_ID"
    echo "User: $AWS_USER"
    echo "Region: $AWS_REGION"
    echo ""
    echo "You're now ready to deploy the Feature Request App to AWS."
    echo "Next step: Run ./deploy.sh"
else
    echo "❌ AWS CLI configuration failed. Please check your credentials and try again."
    exit 1
fi

# Create initial env-vars.sh with the region
cat > env-vars.sh << EOF
#!/bin/bash
# AWS Region
export AWS_REGION="$AWS_REGION"
EOF

chmod +x env-vars.sh

echo ""
echo "AWS region saved to env-vars.sh for use in subsequent scripts." 