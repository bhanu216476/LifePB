#!/bin/sh
# Render production startup script

echo "==> Running Prisma DB push..."
npx prisma db push

echo "==> Seeding database..."
node dist/prisma/seed.js || echo "Seed already done or skipped."

echo "==> Starting LifeOS AI Backend..."
node dist/backend/src/index.js
