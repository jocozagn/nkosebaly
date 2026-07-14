#!/bin/bash
# Vérifie et durcit la configuration production (.env)
# Usage: bash /var/www/NKO/scripts/secure-vps-env.sh

set -euo pipefail

APP_DIR="/var/www/NKO"
ENV_FILE="${APP_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERREUR: .env introuvable"
  exit 1
fi

echo "=== Sécurisation .env NKO ==="

# Désactive le bypass dev (critique)
if grep -q '^NEXT_PUBLIC_DEV_BYPASS=' "$ENV_FILE"; then
  sed -i 's|^NEXT_PUBLIC_DEV_BYPASS=.*|NEXT_PUBLIC_DEV_BYPASS=false|' "$ENV_FILE"
else
  echo "NEXT_PUBLIC_DEV_BYPASS=false" >> "$ENV_FILE"
fi

# Force NODE_ENV production
if grep -q '^NODE_ENV=' "$ENV_FILE"; then
  sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' "$ENV_FILE"
else
  echo "NODE_ENV=production" >> "$ENV_FILE"
fi

# Génère un nouveau mot de passe admin si demandé
if [ "${ROTATE_ADMIN_PASSWORD:-}" = "1" ]; then
  NEW_PASS="$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)"
  if grep -q '^ADMIN_PASSWORD=' "$ENV_FILE"; then
    sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${NEW_PASS}|" "$ENV_FILE"
  else
    echo "ADMIN_PASSWORD=${NEW_PASS}" >> "$ENV_FILE"
  fi
  echo "Nouveau ADMIN_PASSWORD généré (notez-le): ${NEW_PASS}"
fi

# Génère ADMIN_SESSION_SECRET si placeholder
if grep -qE '^ADMIN_SESSION_SECRET=(changez|generez|placeholder|)$' "$ENV_FILE" 2>/dev/null; then
  NEW_SECRET="$(openssl rand -hex 32)"
  sed -i "s|^ADMIN_SESSION_SECRET=.*|ADMIN_SESSION_SECRET=${NEW_SECRET}|" "$ENV_FILE"
  echo "ADMIN_SESSION_SECRET régénéré"
fi

echo "OK — NEXT_PUBLIC_DEV_BYPASS=false"
grep '^NEXT_PUBLIC_DEV_BYPASS=' "$ENV_FILE" || true
grep '^DATA_STORE=' "$ENV_FILE" || true

echo ""
echo "IMPORTANT: changez le mot de passe SSH root manuellement (passwd)"
echo "IMPORTANT: révoquez les tokens GitHub exposés si applicable"
