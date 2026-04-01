#!/bin/bash
set -e

echo "==> Instalando dependências do monorepo..."
npm install

echo "==> Build do frontend..."
cd apps/web
npx vite build

echo "==> Build concluído!"
