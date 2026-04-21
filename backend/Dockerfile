# ── Builder Stage ──────────────────────────────────────────
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build


# ── Production Stage ────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl wget \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma

RUN npx prisma generate

# Fix permissions
RUN chown -R appuser:appgroup /app

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5001/health || exit 1

USER appuser

CMD ["node", "build/server.js"]