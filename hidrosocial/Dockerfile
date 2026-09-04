# Etapa 1: dependencias
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json ./
RUN bun install

# Etapa 2: build
FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Etapa 3: serve (solo artefactos + deps de producción)
FROM oven/bun:1 AS serve
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json ./
RUN bun install --production
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/healthcheck').then((r) => { if (!r.ok) process.exit(1) })"
CMD ["bun", "run", "start"]
