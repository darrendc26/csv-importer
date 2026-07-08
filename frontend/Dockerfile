# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configuration
COPY package*.json ./

# Install all dependencies (required for Next.js build)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Set the Next.js API environment variable at build-time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js project
RUN npm run build

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the build artifacts from the builder stage
COPY --from=builder /app/.next ./.next

# Expose the frontend port (Next.js is configured to start on 3001 in package.json)
EXPOSE 3001

# Set the same API URL env variable for runtime (server-side calls)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV PORT=3001

# Start Next.js
CMD ["npm", "start"]
