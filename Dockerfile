# Dockerfile for the Next.js application in development mode
FROM oven/bun:1

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy Prisma schema to generate the client
COPY prisma ./prisma

# Generate Prisma Client
RUN bunx prisma generate

# Copy the rest of the application
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run in development mode
CMD ["bun", "dev"]
