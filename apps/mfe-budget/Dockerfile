FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx vite-build mfe-budget --configuration=production

FROM nginx:alpine
COPY --from=builder /app/dist/apps/mfe-budget /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
