# 🐴 Lightweight multi-stage Docker build
FROM oven/bun:alpine AS builder
ARG GAS_WEBAPP_URL
ARG GEMINI_API_KEY
ARG GROQ_API_KEY
ENV GAS_WEBAPP_URL=$GAS_WEBAPP_URL
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV GROQ_API_KEY=$GROQ_API_KEY
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:alpine AS runner
ARG GAS_WEBAPP_URL
ARG GEMINI_API_KEY
ARG GROQ_API_KEY
ENV GAS_WEBAPP_URL=$GAS_WEBAPP_URL
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV GROQ_API_KEY=$GROQ_API_KEY
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/ecosystem.config.cjs ./ecosystem.config.cjs 2>/dev/null || true

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["bun", "./build/index.js"]
