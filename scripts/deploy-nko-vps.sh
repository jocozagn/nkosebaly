#!/bin/bash
# Déploiement / mise à jour Balandou NKO sur VPS
# Usage sur le VPS : bash /var/www/NKO/scripts/deploy-nko-vps.sh

set -e

APP_DIR="/var/www/NKO"
cd "$APP_DIR"

echo "=== 1. Git pull ==="
git pull origin main

echo "=== 2. npm install + build ==="
export NODE_OPTIONS='--max-old-space-size=4096'
npm install
npm run build

echo "=== 3. Restart PM2 ==="
pm2 restart nko

echo "=== 4. Test local ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/)
echo "HTTP $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "=== SUCCÈS : NKO opérationnel ==="
  exit 0
else
  echo "=== ÉCHEC : vérifiez pm2 logs nko ==="
  pm2 logs nko --lines 30 --nostream
  exit 1
fi
