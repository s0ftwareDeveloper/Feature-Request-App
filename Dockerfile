# Dockerfile

# ---- Builder Stage ----
FROM node:18-alpine AS builder

# Install dependencies required for Prisma and potentially native addons
RUN apk add --no-cache openssl python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
# Or if using yarn:
# COPY package.json yarn.lock ./

# Clear npm cache
RUN npm cache clean --force

# Install all dependencies (including devDependencies for build)
RUN npm install
# Or if using yarn:
# RUN yarn install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# ---- Runner Stage ----
FROM node:18-alpine AS runner

# Install runtime dependencies (OpenSSL for Prisma)
RUN apk add --no-cache openssl

WORKDIR /app

# Create a non-root user and group
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy package files from the host (needed for production dependencies)
COPY package.json package-lock.json* ./
# Or if using yarn:
# COPY package.json yarn.lock ./

# Clear npm cache
RUN npm cache clean --force

# Install ONLY production dependencies using npm ci for consistency
RUN npm ci --omit=dev
# Or if using yarn:
# RUN yarn install --production --frozen-lockfile

# Copy Prisma schema and migrations from the builder stage
COPY --from=builder /app/prisma ./prisma/

# Generate Prisma Client again in the runner stage (ensures compatibility)
# This assumes @prisma/client is a production dependency
RUN npx prisma generate

# Copy built application files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
# Copy next.config.js if it exists
COPY --from=builder /app/next.config.js ./next.config.js

# Change ownership of necessary files to the non-root user
# Ensure node_modules and .next/standalone are owned by the user if using standalone output
# RUN chown -R nextjs:nextjs node_modules .next

# Switch to the non-root user
USER nextjs

# Expose the port the app runs on (default 3000 for Next.js)
EXPOSE 3000

# Set the command to start the application
# This assumes you have a "start" script in your package.json, e.g., "next start"
CMD ["npm", "start"] 