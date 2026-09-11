# Railway: contexto = raíz del monorepo. Compose local sigue usando api/Dockerfile.
FROM node:20-alpine AS deps
WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY api/ .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]
