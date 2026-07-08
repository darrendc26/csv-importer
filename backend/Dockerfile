# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configuration
COPY package*.json ./

# Install all dependencies including devDependencies (for typescript compilation)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the TypeScript project
RUN npm run build

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the compiled files from builder
COPY --from=builder /app/dist ./dist

# Expose port 3000
EXPOSE 3000

ENV PORT=3000

# Start the server
CMD ["node", "dist/server.js"]
