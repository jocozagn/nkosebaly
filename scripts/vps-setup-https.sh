#!/bin/bash
# Active HTTPS Let's Encrypt pour Karamo Sebaly
# Prérequis: le domaine doit pointer vers ce VPS (enregistrement A → IP du serveur)
#
# Usage:
#   bash /var/www/NKO/scripts/vps-setup-https.sh votre-domaine.com

set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="/var/www/NKO"

if [ -z "${DOMAIN}" ]; then
  echo "Usage: bash vps-setup-https.sh exemple.com"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx

# Nginx : ajouter le domaine si absent
NGINX_CONF="/etc/nginx/sites-available/nko"
if ! grep -q "${DOMAIN}" "${NGINX_CONF}" 2>/dev/null; then
  sed -i "s/server_name .*/server_name ${DOMAIN} 173.212.205.140;/" "${NGINX_CONF}"
  nginx -t && systemctl reload nginx
fi

certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "admin@${DOMAIN}" --redirect

# Mettre à jour les URLs publiques dans .env
cd "${APP_DIR}"
sed -i "s|NEXT_PUBLIC_WEB_URL=.*|NEXT_PUBLIC_WEB_URL=https://${DOMAIN}|" .env
sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://${DOMAIN}|" .env

export NODE_OPTIONS='--max-old-space-size=4096'
npm run build
pm2 restart nko

echo "HTTPS actif sur https://${DOMAIN}"
