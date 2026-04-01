# ── Stage 1: Build the React app ──
FROM node:22-alpine AS builder

WORKDIR /build

# Install root deps (for monitor)
COPY package.json package-lock.json ./
RUN npm ci --production

# Install app deps and build
COPY app/package.json app/package-lock.json ./app/
RUN cd app && npm ci
COPY app/ ./app/
RUN cd app && npx vite build

# ── Stage 2: Production image ──
FROM node:22-alpine

LABEL org.opencontainers.image.title="Bugout Monitor"
LABEL org.opencontainers.image.description="AI-powered disaster preparedness dashboard with OSINT threat monitoring"
LABEL org.opencontainers.image.source="https://github.com/turfptax/bugout-monitor"
LABEL org.opencontainers.image.version="1.0.0"

WORKDIR /app

# Install a lightweight HTTP server
RUN npm install -g http-server

# Copy built app
COPY --from=builder /build/app/dist ./dist/

# Copy monitor (for scheduled scans)
COPY --from=builder /build/node_modules ./node_modules/
COPY --from=builder /build/package.json ./
COPY monitor/ ./monitor/
COPY mcp-server/ ./mcp-server/
COPY setup.js ./
COPY user-config.json.example ./

# Copy static files to dist so they're served
COPY index.html ./dist/

# Create data directories
RUN mkdir -p /app/monitor/logs /app/data

# Environment
ENV NODE_ENV=production
ENV PORT=8080

# The app serves static files on PORT
# Monitor runs via: node monitor/index.js
# MCP server runs via: node mcp-server/index.js

EXPOSE 8080

# Serve the built React app
CMD ["http-server", "dist", "-p", "8080", "-a", "0.0.0.0", "-c-1", "--cors", "-s"]
