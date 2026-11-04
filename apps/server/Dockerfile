# syntax=docker/dockerfile:1

# 1. Base image
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# 2. Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

# 3. Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.base.json ./
COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
RUN npm run build --workspace=@reset/shared && npm run build --workspace=@reset/server

# 4. Production Runner stage
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY package.json package-lock.json* ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist

USER nodejs

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_OPTIONS=--conditions=production

CMD ["node", "apps/server/dist/server.js"]

