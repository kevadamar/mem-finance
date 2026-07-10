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

# Auth/API env vars (defaults for build — override at Dokploy runtime)
ARG FORCE_AUTH_DISABLED
ARG SUPABASE_SERVICE_ROLE_KEY
ARG GAS_SHARED_SECRET
ARG GAS_WEBAPP_URL
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG PUBLIC_TURNSTILE_SITE_KEY
ENV FORCE_AUTH_DISABLED=${FORCE_AUTH_DISABLED:-false}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}
ENV GAS_SHARED_SECRET=${GAS_SHARED_SECRET:-}
ENV GAS_WEBAPP_URL=${GAS_WEBAPP_URL:-}
ENV PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL:-}
ENV PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}
ENV PUBLIC_TURNSTILE_SITE_KEY=${PUBLIC_TURNSTILE_SITE_KEY:-}

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
