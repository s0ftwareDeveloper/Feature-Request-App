#!/bin/bash
set -e

# Import environment variables
source ./env-vars.sh

echo "Running Prisma migrations on the RDS instance..."

# Create temporary .env file with RDS connection details for Prisma
cat > .env.prisma << EOF
DATABASE_URL="mysql://${DB_USERNAME}:${DB_PASSWORD}@${RDS_ENDPOINT}:3306/${DB_NAME}?sslaccept=strict"
EOF

# Make sure Prisma CLI is installed
npm install -g prisma

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run Prisma migrations
echo "Running Prisma migrations to initialize database schema..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Verify database connection
echo "Verifying database connection and schema..."
npx prisma db pull --schema=./prisma/schema.prisma

echo "Prisma migrations completed successfully!"
echo "Your database schema has been set up on the RDS instance." 