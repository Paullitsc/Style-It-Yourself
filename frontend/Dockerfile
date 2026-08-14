# Build context is the MONOREPO ROOT (see docker-compose.yml), not frontend/.
# The frontend imports @siy/ui from packages/ui, which lives outside frontend/
# and therefore cannot be reached from a frontend-scoped context.

# Stage 1: Install dependencies (workspace-aware)
FROM node:20-alpine AS deps
WORKDIR /app
# Copy the root manifest, lockfile, and EVERY workspace manifest before any
# source, so `npm ci` can resolve the workspace graph and create the
# node_modules/@siy/ui -> ../../packages/ui symlink. Keeping source out of this
# layer preserves dependency-install caching.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY packages/ui/package.json ./packages/ui/
RUN npm ci

# Stage 2: Dev (all source + deps, no build step)
FROM node:20-alpine AS dev
WORKDIR /app
# Bring the whole installed tree: npm keeps platform-specific packages in
# frontend/node_modules rather than hoisting them to the root.
COPY --from=deps /app ./
COPY . .
WORKDIR /app/frontend

# Stage 3: Build the application
FROM dev AS builder

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Stage 4: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# `outputFileTracingRoot` is the repo root (next.config.ts), so the standalone
# bundle mirrors the monorepo layout: server.js sits at frontend/server.js and
# the traced workspace packages come along with it.
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./frontend/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "frontend/server.js"]
