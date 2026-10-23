FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && node src/index.js"]
