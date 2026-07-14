#!/bin/bash
# Finalise PostgreSQL si l'installation a partiellement échoué (droits tables)
set -euo pipefail

APP_DIR="/var/www/NKO"
DB_NAME="nko"
DB_USER="nko"
DB_PASS="${POSTGRES_PASSWORD:-$(openssl rand -hex 16)}"

cd "$APP_DIR"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOSQL
ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
ALTER TABLE IF EXISTS app_data OWNER TO ${DB_USER};
ALTER TABLE IF EXISTS web_sessions OWNER TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
EOSQL

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
node scripts/migrate-json-to-postgres.mjs

if grep -q '^DATA_STORE=' .env; then
  sed -i "s|^DATA_STORE=.*|DATA_STORE=postgres|" .env
else
  echo "DATA_STORE=postgres" >> .env
fi

if grep -q '^DATABASE_URL=' .env; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env
else
  echo "DATABASE_URL=${DATABASE_URL}" >> .env
fi

export NODE_OPTIONS='--max-old-space-size=4096'
npm run build
pm2 restart nko
sleep 3
node scripts/smoke-health.mjs http://127.0.0.1:3001

echo "PostgreSQL actif. DATABASE_URL=${DATABASE_URL}"
