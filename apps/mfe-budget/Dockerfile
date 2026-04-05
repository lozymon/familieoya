FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx sync && NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx vite-build mfe-budget --configuration=production

FROM nginx:alpine
COPY --from=builder /app/dist/apps/mfe-budget /usr/share/nginx/html
COPY apps/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
