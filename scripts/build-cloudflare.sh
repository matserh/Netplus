#!/bin/bash
# Build script for Cloudflare Pages deployment
# Uses OpenNext adapter to make Next.js compatible with CF Workers

set -e

echo "[CF Build] Installing dependencies..."
npm install

echo "[CF Build] Generating Prisma client..."
npx prisma generate || true

echo "[CF Build] Building Next.js..."
npx next build

echo "[CF Build] OpenNext adapter for Cloudflare..."
npx @opennextjs/cloudflare || true

echo "[CF Build] Copying Pages proxy _worker.js..."
cp .pages-proxy/_worker.js .open-next/assets/_worker.js
echo '_worker.js' > .open-next/assets/.assetsignore

echo "[CF Build] Build complete!"
