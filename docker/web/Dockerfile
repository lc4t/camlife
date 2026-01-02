# https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile.bun

# Use Bun's official image
FROM oven/bun:1 AS base

WORKDIR /app

# Install dependencies with bun
FROM base AS deps
COPY package.json ./
# Install dependencies and generate lockfile
RUN bun install --no-save

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

ENV SKIP_ENV_VALIDATION=true

RUN bun run build


# =============================================================================
# Production image, copy all the files and run next
# =============================================================================
FROM base AS runner
WORKDIR /app

# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migration files and scripts for database migration
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts/drizzle-migrate.ts ./scripts/drizzle-migrate.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Install migration dependencies (drizzle-orm, postgres)
# These are needed for running migrations but may not be in standalone output
# drizzle-orm/postgres-js is part of drizzle-orm package, not a separate package
RUN bun install --production --no-save drizzle-orm postgres

USER nextjs

EXPOSE 3000

CMD ["bun", "./server.js"]