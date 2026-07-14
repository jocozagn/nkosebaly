#!/bin/bash
# Déploiement sécurisé Karamoo Sêebaly / NKO sur VPS
# Usage sur le VPS : bash /var/www/NKO/scripts/deploy-nko-vps.sh

set -euo pipefail

APP_DIR="/var/www/NKO"
STORE_FILE="${APP_DIR}/data/admin/store.json"
ENV_FILE="${APP_DIR}/.env"
BACKUP_SCRIPT="${APP_DIR}/scripts/vps-backup.sh"
SMOKE_SCRIPT="${APP_DIR}/scripts/smoke-health.mjs"
PRE_DEPLOY_DIR="/tmp/nko-pre-deploy-$$"

cd "$APP_DIR"

echo "=== 0. Pré-déploiement : sauvegarde + protection données ==="
mkdir -p "$PRE_DEPLOY_DIR"

if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "${PRE_DEPLOY_DIR}/.env"
fi

if [ -f "$STORE_FILE" ]; then
  cp "$STORE_FILE" "${PRE_DEPLOY_DIR}/store.json"
  cp "$STORE_FILE" "${PRE_DEPLOY_DIR}/store.json.pre-deploy"
fi

if [ -x "$BACKUP_SCRIPT" ] || [ -f "$BACKUP_SCRIPT" ]; then
  bash "$BACKUP_SCRIPT" || echo "WARN: backup script a échoué — poursuite avec copie locale"
fi

echo "=== 1. Git pull ==="
git fetch origin main
git reset --hard origin/main

echo "=== 2. Restauration .env + store.json (jamais écrasés par git) ==="
if [ -f "${PRE_DEPLOY_DIR}/.env" ]; then
  cp "${PRE_DEPLOY_DIR}/.env" "$ENV_FILE"
fi

if [ -f "${PRE_DEPLOY_DIR}/store.json" ]; then
  mkdir -p "$(dirname "$STORE_FILE")"
  cp "${PRE_DEPLOY_DIR}/store.json" "$STORE_FILE"
fi

echo "=== 3. Vérifications sécurité .env ==="
if grep -q '^NEXT_PUBLIC_DEV_BYPASS=true' "$ENV_FILE" 2>/dev/null; then
  echo "ERREUR: NEXT_PUBLIC_DEV_BYPASS=true en production — corrigez .env avant deploy"
  exit 1
fi

if ! grep -q '^NEXT_PUBLIC_DEV_BYPASS=false' "$ENV_FILE" 2>/dev/null; then
  echo "WARN: NEXT_PUBLIC_DEV_BYPASS absent — ajout false recommandé"
fi

echo "=== 4. npm install + build ==="
export NODE_OPTIONS='--max-old-space-size=4096'
npm install
npm run build

echo "=== 5. Restart PM2 ==="
pm2 restart nko
sleep 4

echo "=== 6. Smoke test /api/health ==="
if [ -f "$SMOKE_SCRIPT" ]; then
  node "$SMOKE_SCRIPT" "http://127.0.0.1:3001"
else
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health)
  if [ "$HTTP_CODE" != "200" ]; then
    echo "Health check FAILED (HTTP $HTTP_CODE)"
    pm2 logs nko --lines 30 --nostream
    exit 1
  fi
fi

echo "=== 7. Test page d'accueil ==="
HTTP_HOME=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/)
echo "HTTP accueil: $HTTP_HOME"

if [ "$HTTP_HOME" = "200" ]; then
  echo "=== SUCCÈS : NKO opérationnel ==="
  rm -rf "$PRE_DEPLOY_DIR"
  exit 0
fi

echo "=== ÉCHEC : vérifiez pm2 logs nko ==="
pm2 logs nko --lines 30 --nostream
exit 1
