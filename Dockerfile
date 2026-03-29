FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# 注入前端所需的環境變數（支援 Build-time 覆寫本地 .env）
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

ARG VITE_LIFF_ID
ENV VITE_LIFF_ID=$VITE_LIFF_ID

ARG VITE_MOCK_LIFF_TOKEN
ENV VITE_MOCK_LIFF_TOKEN=$VITE_MOCK_LIFF_TOKEN

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# 加入 SPA 路由 fallback，防止重新整理 404
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
