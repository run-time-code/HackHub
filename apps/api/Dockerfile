# HackHub API image (production)
# Build context is the repository root (monorepo layout):
#   docker build -f apps/api/Dockerfile .
FROM node:20-alpine AS deps

WORKDIR /app
# npm validates every workspace declared in the root package.json, so all
# workspace manifests must be present before `npm ci`.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/backend-prototype/package.json apps/backend-prototype/
RUN npm ci --workspace @hackhub/api --include-workspace-root=false

FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY apps/api ./apps/api

USER app
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-5000}/health || exit 1

CMD ["node", "apps/api/src/server.js"]
