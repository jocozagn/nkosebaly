#!/bin/bash
# Sauvegarde quotidienne Karamo Sebaly sur VPS
# Usage: bash /var/www/NKO/scripts/vps-backup.sh
# Cron recommandé: 0 3 * * * /var/www/NKO/scripts/vps-backup.sh >> /var/log/nko-backup.log 2>&1

set -euo pipefail

APP_DIR="/var/www/NKO"
BACKUP_ROOT="/var/backups/nko"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET_DIR="${BACKUP_ROOT}/${STAMP}"

mkdir -p "${TARGET_DIR}"

echo "=== Backup NKO ${STAMP} ==="

# Données applicatives (JSON + vidéos + pièces jointes)
if [ -d "${APP_DIR}/data" ]; then
  tar -czf "${TARGET_DIR}/data.tar.gz" -C "${APP_DIR}" data
fi

# Configuration (sans exposer dans git)
if [ -f "${APP_DIR}/.env" ]; then
  cp "${APP_DIR}/.env" "${TARGET_DIR}/.env"
fi

# Métadonnées utiles pour restauration
{
  echo "date=${STAMP}"
  echo "hostname=$(hostname)"
  echo "node=$(node -v 2>/dev/null || echo unknown)"
  pm2 jlist 2>/dev/null | head -c 2000 || true
} > "${TARGET_DIR}/meta.txt"

# Rétention : garder 14 jours
find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +

echo "OK → ${TARGET_DIR}"
ls -lh "${TARGET_DIR}"
