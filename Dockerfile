FROM node:20-alpine

WORKDIR /app

# Copy configuration files and dependencies
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install Node dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy backend source code
COPY backend ./backend/

EXPOSE 5000

# Push migration, seed database, and run ts-node server
CMD ["sh", "-c", "npx prisma db push && npm run prisma:seed && npm run dev"]
