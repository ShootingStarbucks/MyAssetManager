FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN mkdir -p /app/public
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# standalone 빌드 복사
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# prisma 마이그레이션용 파일 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]