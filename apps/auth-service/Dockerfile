FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx build auth-service --configuration=production

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/auth-service ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "main.js"]
