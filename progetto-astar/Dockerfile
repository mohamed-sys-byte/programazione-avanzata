# --- fase di build: compila il TypeScript in JavaScript ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npx tsc

# --- fase finale: immagine leggera con solo le dipendenze di produzione ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
# prima il seed (salta se il DB è già popolato), poi il server
CMD ["sh", "-c", "node dist/src/seeders/seed.js && node dist/src/server.js"]
