# Dependencias reproducibles para compilación y herramientas.
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun run build

# Solo dependencias de producción en la imagen final.
FROM oven/bun:1 AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS serve
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json ./
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
# La misma imagen ejecuta la web, las migraciones y la importación explícita.
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/db ./db
COPY --from=build /app/app ./app
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/calidad/healthcheck').then((r) => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"
CMD ["bun", "run", "start"]
