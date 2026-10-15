# syntax=docker/dockerfile:1
# Checquery: the Bun + Hono server, serving the built SolidJS client, with .checquery files kept in /data.
# The Bun version follows mise.toml.

FROM oven/bun:1.3-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN bun install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages packages
RUN bun run --cwd packages/client build

FROM oven/bun:1.3-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    CHECQUERY_HOST=0.0.0.0 \
    CHECQUERY_PORT=3000 \
    CHECQUERY_DATA_DIR=/data \
    CHECQUERY_STATIC_DIR=/app/public
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN bun install --frozen-lockfile --production --filter '@checquery/server'
COPY packages/shared/src packages/shared/src
COPY packages/server/src packages/server/src
COPY packages/server/scripts packages/server/scripts
COPY --from=build /app/packages/client/dist /app/public
RUN mkdir -p /data && chown bun:bun /data
USER bun
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD bun -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Exec form, so Bun is PID 1 and gets SIGTERM directly -- it closes and backs up the open file before exiting.
CMD ["bun", "packages/server/src/index.ts"]
