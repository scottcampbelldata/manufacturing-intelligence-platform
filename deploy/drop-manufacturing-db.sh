#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-manufacturing}"
DB_USER="${DB_USER:-factory}"

echo "This will permanently drop PostgreSQL database '${DB_NAME}' and role '${DB_USER}'."
read -r -p "Type DROP ${DB_NAME} to continue: " confirmation

if [[ "$confirmation" != "DROP ${DB_NAME}" ]]; then
  echo "Aborted."
  exit 1
fi

sudo -v

sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 <<SQL
REVOKE CONNECT ON DATABASE ${DB_NAME} FROM PUBLIC;
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${DB_NAME};
DROP ROLE IF EXISTS ${DB_USER};
SQL

echo "Dropped database '${DB_NAME}' and role '${DB_USER}'."
