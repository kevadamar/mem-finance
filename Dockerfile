# syntax=docker/dockerfile:1

# ==========================================
# Base
# ==========================================
FROM oven/bun:1-alpine AS base

WORKDIR /app


# ==========================================
# Full dependencies for build
# ==========================================
FROM base AS dependencies

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile


# ==========================================
# Build application
# ==========================================
FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY . .

RUN bun run build

RUN test -f /app/build/index.js


# ==========================================
# Production-only dependencies
# ==========================================
FROM base AS production-dependencies

ENV NODE_ENV=production

COPY package.json bun.lock ./

RUN bun install \
    --production \
    --frozen-lockfile


# ==========================================
# Runtime
# ==========================================
FROM base AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=production-dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /app/build ./build
COPY --from=builder --chown=bun:bun /app/package.json ./package.json

USER bun

EXPOSE 3000

CMD ["bun", "./build/index.js"]
