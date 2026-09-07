FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node scripts/gather-plugin-schemas.mjs
RUN npx prisma generate
ENV Next_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV Next_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create public dir in case it doesn't exist
RUN mkdir -p public

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma/schema ./schema-dist
COPY --from=builder /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "rm -rf prisma/schema && mkdir -p prisma/schema && cp -r schema-dist/* prisma/schema/ && node scripts/backfill-project-codes.cjs && node node_modules/prisma/build/index.js db push --schema=prisma/schema --accept-data-loss --skip-generate && exec node server.js"]
