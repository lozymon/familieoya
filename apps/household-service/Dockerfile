FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx build household-service --configuration=production

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/household-service ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "main.js"]
