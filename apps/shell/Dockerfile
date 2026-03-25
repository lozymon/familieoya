FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx vite-build shell --configuration=production

FROM nginx:alpine
COPY --from=builder /app/dist/apps/shell /usr/share/nginx/html
COPY apps/shell/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
