FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

WORKDIR /app

ARG VITE_BEO_API_MODE=http
ARG VITE_BEO_API_BASE_URL=http://localhost:47502
ENV VITE_BEO_API_MODE=${VITE_BEO_API_MODE}
ENV VITE_BEO_API_BASE_URL=${VITE_BEO_API_BASE_URL}

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
