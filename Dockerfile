FROM node:22-alpine AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=8787
RUN corepack enable && addgroup -S chongxinzhi && adduser -S chongxinzhi -G chongxinzhi
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./package.json
COPY server ./server
USER chongxinzhi
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${API_PORT}/api/v1/health" >/dev/null || exit 1
CMD ["node", "server/index.mjs"]

