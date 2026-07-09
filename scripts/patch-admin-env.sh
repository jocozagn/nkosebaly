#!/bin/bash
# Configure les variables admin sur le VPS (identifiants + secret session HMAC)
set -e

ENV_FILE="${ENV_FILE:-/var/www/NKO/.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Fichier .env introuvable: $ENV_FILE"
  exit 1
fi

# Identifiants admin
if grep -q '^ADMIN_EMAIL=' "$ENV_FILE"; then
  sed -i 's/^ADMIN_EMAIL=.*/ADMIN_EMAIL="adminko@balandou.local"/' "$ENV_FILE"
else
  echo 'ADMIN_EMAIL="adminko@balandou.local"' >> "$ENV_FILE"
fi

if grep -q '^ADMIN_PASSWORD=' "$ENV_FILE"; then
  sed -i 's/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD="Satina2019"/' "$ENV_FILE"
else
  echo 'ADMIN_PASSWORD="Satina2019"' >> "$ENV_FILE"
fi

# Secret HMAC — généré une seule fois s'il est absent ou placeholder
CURRENT_SECRET=$(grep '^ADMIN_SESSION_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)
if [ -z "$CURRENT_SECRET" ] || [ "$CURRENT_SECRET" = "change-me-local-dev-only" ] || [ "$CURRENT_SECRET" = "generez-une-chaine-aleatoire-longue" ]; then
  NEW_SECRET=$(openssl rand -hex 32)
  if grep -q '^ADMIN_SESSION_SECRET=' "$ENV_FILE"; then
    sed -i "s/^ADMIN_SESSION_SECRET=.*/ADMIN_SESSION_SECRET=\"${NEW_SECRET}\"/" "$ENV_FILE"
  else
    echo "ADMIN_SESSION_SECRET=\"${NEW_SECRET}\"" >> "$ENV_FILE"
  fi
  echo "ADMIN_SESSION_SECRET généré et enregistré."
else
  echo "ADMIN_SESSION_SECRET déjà configuré (conservé)."
fi

echo "=== Variables admin ==="
grep '^ADMIN_' "$ENV_FILE" | sed 's/PASSWORD=.*/PASSWORD=***hidden***/' | sed 's/SESSION_SECRET=.*/SESSION_SECRET=***hidden***/'

pm2 restart nko --update-env
echo "PM2 nko redémarré."
