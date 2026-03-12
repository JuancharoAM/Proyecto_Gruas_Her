# =============================================================================
# Dockerfile - Frontend (Next.js)
# =============================================================================
# Multi-stage build para Next.js en modo standalone.
# =============================================================================

# --- Etapa 1: Dependencias ---
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- Etapa 2: Build ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Etapa 3: Producción ---
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3006

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3006

CMD ["node", "server.js"]
