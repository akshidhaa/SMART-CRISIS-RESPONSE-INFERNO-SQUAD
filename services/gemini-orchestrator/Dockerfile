# ── Stage 1: Build ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy shared packages (needed at build time)
COPY shared/types ./shared/types
COPY shared/playbooks ./shared/playbooks
COPY shared/constants ./shared/constants

# Copy the service
COPY services/gemini-orchestrator ./services/gemini-orchestrator

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages first, then the service
RUN pnpm --filter @scr-mesh/types build && \
    pnpm --filter @scr-mesh/constants build && \
    pnpm --filter @scr-mesh/playbooks build && \
    pnpm --filter @scr-mesh/gemini-orchestrator build

# ── Stage 2: Prune dev dependencies ─────────────────────────────────────
FROM node:20-alpine AS pruner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY --from=builder /app ./
RUN pnpm install --prod --frozen-lockfile

# ── Stage 3: Runtime ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy only what's needed to run
COPY --from=pruner /app/node_modules ./node_modules
COPY --from=pruner /app/shared ./shared
COPY --from=pruner /app/services/gemini-orchestrator/package.json ./services/gemini-orchestrator/
COPY --from=pruner /app/services/gemini-orchestrator/dist ./services/gemini-orchestrator/dist
COPY --from=pruner /app/services/gemini-orchestrator/node_modules ./services/gemini-orchestrator/node_modules

EXPOSE 8080

CMD ["node", "services/gemini-orchestrator/dist/index.js"]
