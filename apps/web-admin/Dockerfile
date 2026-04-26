# ── Stage 1: Install dependencies ────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Shared packages
COPY shared/types ./shared/types
COPY shared/constants ./shared/constants
COPY shared/playbooks ./shared/playbooks

# The app
COPY apps/web-admin ./apps/web-admin

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY --from=deps /workspace ./

# Build shared packages first (web-admin transpiles them, but types must be built)
RUN pnpm --filter @scr-mesh/types build && \
    pnpm --filter @scr-mesh/constants build && \
    pnpm --filter @scr-mesh/playbooks build

# Build args for NEXT_PUBLIC_ vars (baked into the JS bundle at build time)
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

RUN pnpm --filter web-admin build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone bundle — contains server.js + all required node_modules
COPY --from=builder /workspace/apps/web-admin/.next/standalone ./
# Static assets served by the Next.js server
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web-admin/.next/static ./apps/web-admin/.next/static
# Public folder (images, icons, etc.)
COPY --from=builder /workspace/apps/web-admin/public ./apps/web-admin/public

USER nextjs
EXPOSE 8080

CMD ["node", "apps/web-admin/server.js"]
