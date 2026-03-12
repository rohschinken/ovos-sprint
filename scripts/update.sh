#!/bin/sh
set -e

. ~/.nvm/nvm.sh
nvm use 20.19.6

cd "$(dirname "$0")/.."

git pull

# Backend
cd backend/
npm install
npm run build
pm2 restart ovos-sprint
npm prune --production
cd ..

# Frontend - clean install needed because lock file is generated on Windows
cd frontend/
rm -rf node_modules
npm install
npm run build
cd ..
