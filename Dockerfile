# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# Only Prisma CLI and migrations are published in the migration image.
FROM base AS tools
RUN npm install --no-save --package-lock=false prisma@6.19.3 \
    && npm cache clean --force
COPY prisma ./prisma
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM base AS builder
COPY --from=oven/bun:1.4.3 /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
COPY patches ./patches
RUN bun install --frozen-lockfile
COPY . .
ENV DOCKER_BUILD=1
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
