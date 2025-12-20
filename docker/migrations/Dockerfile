# Use Bun's official image as the base image
FROM oven/bun:1 AS base

WORKDIR /app

# Install dependencies (including drizzle-kit for migrations)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy migration files and scripts
COPY drizzle ./drizzle
COPY scripts/drizzle-migrate.ts ./scripts/drizzle-migrate.ts

# Execute database migration script
CMD ["bun", "scripts/drizzle-migrate.ts"]