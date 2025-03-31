#!/bin/bash
set -e

# Disable MSYS path conversion for Git Bash on Windows
export MSYS_NO_PATHCONV=1

# Import environment variables
source ./env-vars.sh

# Domain configuration
DOMAIN_NAME="rem-note.com"
SUBDOMAIN="www"
FULL_DOMAIN="$DOMAIN_NAME"
WWW_DOMAIN="$SUBDOMAIN.$DOMAIN_NAME"

echo "Setting up SSL certificate and Cloudflare configuration for $DOMAIN_NAME in $AWS_REGION..."

# Create an SSL certificate in ACM
echo "Requesting SSL certificate..."
CERTIFICATE_ARN=$(aws acm request-certificate \
  --domain-name $DOMAIN_NAME \
  --subject-alternative-names "*.$DOMAIN_NAME" \
  --validation-method DNS \
  --region $AWS_REGION \
  --query 'CertificateArn' \
  --output text)

echo "ACM certificate requested: $CERTIFICATE_ARN"

# Get DNS validation records from ACM
echo "Getting validation records..."
sleep 5  # Wait a moment for the certificate to be created

# Get the main domain validation record
MAIN_DOMAIN_RECORD=$(aws acm describe-certificate \
  --certificate-arn $CERTIFICATE_ARN \
  --region $AWS_REGION \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output text)

# Get the wildcard domain validation record
WILDCARD_DOMAIN_RECORD=$(aws acm describe-certificate \
  --certificate-arn $CERTIFICATE_ARN \
  --region $AWS_REGION \
  --query 'Certificate.DomainValidationOptions[1].ResourceRecord' \
  --output text)

echo "============================================="
echo "Add these CNAME records in Cloudflare:"
echo "============================================="
echo "For main domain ($DOMAIN_NAME):"
echo "Type: CNAME"
echo "Name: $(echo $MAIN_DOMAIN_RECORD | cut -f1 -d$'\t')"
echo "Target: $(echo $MAIN_DOMAIN_RECORD | cut -f2 -d$'\t')"
echo "Proxy status: DNS only (gray cloud)"
echo "---------------------------------------------"
echo "For wildcard domain (*.$DOMAIN_NAME):"
echo "Type: CNAME"
echo "Name: $(echo $WILDCARD_DOMAIN_RECORD | cut -f1 -d$'\t')"
echo "Target: $(echo $WILDCARD_DOMAIN_RECORD | cut -f2 -d$'\t')"
echo "Proxy status: DNS only (gray cloud)"
echo "============================================="

# Get ALB DNS name and IP
ALB_DNS_NAME=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "============================================="
echo "Add these A records in Cloudflare:"
echo "============================================="
echo "For main domain ($DOMAIN_NAME):"
echo "Type: A"
echo "Name: @"
echo "IPv4 address: $ALB_DNS_NAME"
echo "Proxy status: Proxied (orange cloud)"
echo "---------------------------------------------"
echo "For www subdomain ($WWW_DOMAIN):"
echo "Type: A"
echo "Name: www"
echo "IPv4 address: $ALB_DNS_NAME"
echo "Proxy status: Proxied (orange cloud)"
echo "============================================="

echo "Waiting for certificate validation (this can take 5-30 minutes)..."
aws acm wait certificate-validated \
  --certificate-arn $CERTIFICATE_ARN \
  --region $AWS_REGION

echo "Certificate validated: $CERTIFICATE_ARN"

# Create HTTPS listener for ALB with SSL certificate
echo "Creating HTTPS listener..."
HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERTIFICATE_ARN \
  --ssl-policy ELBSecurityPolicy-2016-08 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "HTTPS Listener created: $HTTPS_LISTENER_ARN"

# Modify HTTP listener to redirect to HTTPS
echo "Modifying HTTP listener to redirect to HTTPS..."
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --port 80 \
  --protocol HTTP \
  --default-actions Type=redirect,RedirectConfig='{Protocol="HTTPS",Port="443",Host="#{host}",Path="/#{path}",Query="#{query}",StatusCode="HTTP_301"}' \
  --region $AWS_REGION

echo "HTTP listener modified to redirect to HTTPS"

# Update environment variables file with new resource IDs
cat >> env-vars.sh << EOF
# Domain Configuration
export DOMAIN_NAME="$DOMAIN_NAME"
export SUBDOMAIN="$SUBDOMAIN"
export FULL_DOMAIN="$FULL_DOMAIN"
export WWW_DOMAIN="$WWW_DOMAIN"
export CERTIFICATE_ARN="$CERTIFICATE_ARN"
export HTTPS_LISTENER_ARN="$HTTPS_LISTENER_ARN"
EOF

echo "SSL certificate and Cloudflare setup complete!"
echo "Your application should now be accessible at https://$DOMAIN_NAME and https://$WWW_DOMAIN"
echo "Note: DNS changes may take some time to propagate" 