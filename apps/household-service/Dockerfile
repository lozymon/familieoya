FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx tsc --build libs/contracts/tsconfig.lib.json
RUN npx tsc --build libs/common/tsconfig.lib.json
RUN npx nx build household-service --configuration=production

FROM node:24-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/household-service/dist ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/contracts/package.json /app/libs/contracts/package.json
COPY --from=builder /app/libs/contracts/dist /app/libs/contracts/dist
COPY --from=builder /app/libs/common/package.json /app/libs/common/package.json
COPY --from=builder /app/libs/common/dist /app/libs/common/dist
EXPOSE 3002
CMD ["node", "main.js"]
