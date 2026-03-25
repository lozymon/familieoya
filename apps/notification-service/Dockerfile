FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx build notification-service --configuration=production

FROM node:24-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/notification-service ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3005
CMD ["node", "main.js"]
