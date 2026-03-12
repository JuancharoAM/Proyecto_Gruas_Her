# =============================================================================
# Dockerfile - Backend API (Node.js + Express + TypeScript)
# =============================================================================
# Multi-stage build:
#   1. Etapa de build: compila TypeScript a JavaScript
#   2. Etapa de producción: ejecuta solo el código compilado
# =============================================================================

# --- Etapa 1: Compilación ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias primero (mejor cache de Docker)
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiar el código fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build

# --- Etapa 2: Producción ---
FROM node:20-alpine AS production

WORKDIR /app

# Copiar solo los archivos necesarios para producción
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar el código compilado desde la etapa de build
COPY --from=builder /app/dist ./dist

# Puerto expuesto
EXPOSE 4000

# Comando de inicio
CMD ["node", "dist/app.js"]
