#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/scott/manufacturing-intelligence-platform"
API_DOMAIN="${API_DOMAIN:-factory-api.scottcampbell.io}"
FRONTEND_ORIGINS="${FRONTEND_ORIGINS:-https://factory.scottcampbell.io,https://manufacturing-intelligence-platform.pages.dev,http://localhost:3000}"
DB_NAME="manufacturing"
DB_USER="factory"
API_PORT="8002"

cd "$ROOT"

if [[ ! -d "$ROOT/.git" ]]; then
  echo "Run this on the VPS after cloning the repo to $ROOT" >&2
  exit 1
fi

sudo -v

if [[ ! -f backend/.env ]]; then
  DB_PASS="${FACTORY_DB_PASSWORD:-$(openssl rand -hex 24)}"
  umask 077
  cat > backend/.env <<EOF_ENV
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
CORS_ORIGINS=${FRONTEND_ORIGINS}
EOF_ENV
else
  DB_PASS="$(python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
for line in Path("backend/.env").read_text().splitlines():
    if line.startswith("DATABASE_URL="):
        print(urlparse(line.split("=", 1)[1]).password or "")
        break
PY
)"
fi

if [[ -z "$DB_PASS" ]]; then
  echo "Could not determine database password from backend/.env" >&2
  exit 1
fi

role_exists="$(sudo -u postgres psql -Atc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")"
if [[ "$role_exists" != "1" ]]; then
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
fi

db_exists="$(sudo -u postgres psql -Atc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")"
if [[ "$db_exists" != "1" ]]; then
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
fi

sudo -u postgres psql -d "$DB_NAME" -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

set -a
source backend/.env
set +a

psql "$DATABASE_URL" -f db/schema.sql
backend/.venv/bin/python db/load_data.py
psql "$DATABASE_URL" -f db/analytical_views.sql

sudo cp deploy/factory-api.service /etc/systemd/system/factory-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now factory-api

sudo cp deploy/nginx.conf "/etc/nginx/sites-available/${API_DOMAIN}.conf"
if [[ ! -e "/etc/nginx/sites-enabled/${API_DOMAIN}.conf" ]]; then
  sudo ln -s "/etc/nginx/sites-available/${API_DOMAIN}.conf" "/etc/nginx/sites-enabled/${API_DOMAIN}.conf"
fi
sudo nginx -t
sudo systemctl reload nginx

echo "API service installed on localhost:${API_PORT}."
echo "After DNS points ${API_DOMAIN} at this server, run:"
echo "  sudo certbot --nginx -d ${API_DOMAIN}"
echo "Then verify:"
echo "  curl https://${API_DOMAIN}/health"
