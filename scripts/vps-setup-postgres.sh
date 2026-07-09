#!/bin/bash
# Installe PostgreSQL sur le VPS et prépare la migration depuis store.json
# Usage: bash /var/www/NKO/scripts/vps-setup-postgres.sh

set -euo pipefail

APP_DIR="/var/www/NKO"
DB_NAME="nko"
DB_USER="nko"
DB_PASS="${POSTGRES_PASSWORD:-nko_$(openssl rand -hex 8)}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq postgresql postgresql-contrib

systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -d "${DB_NAME}" -f "${APP_DIR}/scripts/postgres/schema.sql"

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
cd "${APP_DIR}"
node scripts/migrate-json-to-postgres.mjs

# Active PostgreSQL dans .env (sans écraser les autres variables)
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

echo "PostgreSQL prêt."
echo "DATABASE_URL=${DATABASE_URL}"
echo "Test: curl http://127.0.0.1:3001/api/health"
