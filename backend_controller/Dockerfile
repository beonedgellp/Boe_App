FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache postgresql-client

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=47502

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node db ./db

USER node

EXPOSE 47502

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 47502) + '/health').then(async r => { if (!r.ok) process.exit(1); const body = await r.json(); process.exit(body?.data?.database?.ok ? 0 : 1); }).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
