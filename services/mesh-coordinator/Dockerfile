# ── Stage 1: Build ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Shared packages (mesh-coordinator imports @scr-mesh/types, constants, playbooks)
COPY shared/types ./shared/types
COPY shared/constants ./shared/constants
COPY shared/playbooks ./shared/playbooks

# The service
COPY services/mesh-coordinator ./services/mesh-coordinator

RUN pnpm install --frozen-lockfile

# Build shared packages then the service
RUN pnpm --filter @scr-mesh/types build && \
    pnpm --filter @scr-mesh/constants build && \
    pnpm --filter @scr-mesh/playbooks build && \
    pnpm --filter mesh-coordinator build

# ── Stage 2: Prune to prod deps ──────────────────────────────────────────
FROM node:20-alpine AS pruner
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY --from=builder /workspace ./
RUN pnpm install --prod --frozen-lockfile

# ── Stage 3: Runtime ─────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=pruner /workspace/node_modules ./node_modules
COPY --from=pruner /workspace/shared ./shared
COPY --from=pruner /workspace/services/mesh-coordinator/package.json ./services/mesh-coordinator/
COPY --from=pruner /workspace/services/mesh-coordinator/dist ./services/mesh-coordinator/dist
COPY --from=pruner /workspace/services/mesh-coordinator/node_modules ./services/mesh-coordinator/node_modules

EXPOSE 8080

CMD ["node", "services/mesh-coordinator/dist/index.js"]
