# Use Node.js LTS (20) as base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies like TypeScript)
# We use --include=dev to ensure TypeScript is installed even if NODE_ENV is production
RUN npm install --include=dev

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npx tsc

# Production stage
FROM node:20-alpine

# Install curl for health checks (optional)
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Set default port for MCP HTTP mode
ENV MCP_HTTP_PORT=9008

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (default for HTTP Streamable transport)
EXPOSE 9008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:9008/ || exit 1

# Command to run the server using the startup script
CMD ["./start.sh"]