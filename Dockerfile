FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/vite.config.js ./
COPY frontend/public ./public/
COPY src ./src/
COPY index.html ./
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=frontend-build /app/dist /app/frontend/dist
EXPOSE 3001
CMD ["node", "src/index.js"]
