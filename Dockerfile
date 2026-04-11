FROM node:22-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/
COPY packages/utils/package*.json ./packages/utils/

# Install all dependencies (including devDependencies for tsx)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run db:generate --workspace=apps/api

EXPOSE 8080

CMD sh -c "cd apps/api && npx tsx src/server.ts"
