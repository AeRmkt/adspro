FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/
COPY packages/utils/package*.json ./packages/utils/

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run db:generate

EXPOSE 8080

# Run migrations and start server with tsx
CMD npm run db:migrate --workspace=apps/api && cd apps/api && npx tsx src/server.ts
