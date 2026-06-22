# Deployment Runbook — Manufacturing Intelligence Platform

End-to-end: generate data, load Postgres, run the API and dashboard behind nginx.
Assumes a Linux VPS with PostgreSQL (or TimescaleDB), Python 3.11+, Node 18+, and
nginx already installed. Replace `factory.scottcampbell.io` and the DB password.

---

## 0. Get the code onto the VPS
```bash
sudo mkdir -p /opt/manufacturing-intelligence-platform
sudo chown $USER /opt/manufacturing-intelligence-platform
# from your machine:
rsync -av --exclude node_modules --exclude .venv \
  C:/Dev/Projects/manufacturing-intelligence-platform/ \
  deploy@VPS:/opt/manufacturing-intelligence-platform/
```
(or push to a git remote and clone on the VPS.)

## 1. Generate the dataset
Runs the seeded generator → writes CSVs to `generator/output/` (~66 MB).
```bash
cd /opt/manufacturing-intelligence-platform/generator
python3 -m pip install numpy pandas
python3 generate_factory_data.py
```

## 2. Create the database + schema
```bash
sudo -u postgres psql -c "CREATE DATABASE manufacturing;"
sudo -u postgres psql -c "CREATE USER factory WITH PASSWORD 'CHANGEME';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE manufacturing TO factory;"

export DATABASE_URL="postgresql://factory:CHANGEME@localhost:5432/manufacturing"
cd /opt/manufacturing-intelligence-platform
psql "$DATABASE_URL" -f db/schema.sql
```

## 3. Load the data (fast COPY path)
```bash
cd /opt/manufacturing-intelligence-platform
python3 -m pip install psycopg2-binary
python3 db/load_data.py
psql "$DATABASE_URL" -f db/analytical_views.sql
```
Expect ~711k defect rows and the views created. Sanity check:
```bash
psql "$DATABASE_URL" -c "SELECT * FROM v_kpi_overall;"
psql "$DATABASE_URL" -c "SELECT * FROM v_mttr_by_crew ORDER BY mttr_min DESC;"
```

## 4. Backend (FastAPI)
```bash
cd /opt/manufacturing-intelligence-platform/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
# quick test:
DATABASE_URL="$DATABASE_URL" .venv/bin/uvicorn app.main:app --port 8000
# curl http://127.0.0.1:8000/api/kpi  -> JSON
```
Then install the service (edit DATABASE_URL/User/paths in the unit first):
```bash
sudo cp deploy/factory-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now factory-api
```

## 5. Frontend (Next.js)
```bash
cd /opt/manufacturing-intelligence-platform/frontend
npm ci
npm run build
sudo cp ../deploy/factory-web.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now factory-web
```

## 6. nginx + TLS
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/factory
sudo ln -s /etc/nginx/sites-available/factory /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d factory.scottcampbell.io
```

Open `https://factory.scottcampbell.io`. The dashboard loads, hits `/api/*`
on the same origin, nginx routes it to FastAPI. Done.

---

## Updating after code changes
```bash
cd /opt/manufacturing-intelligence-platform && git pull   # or rsync
# backend changed:
sudo systemctl restart factory-api
# frontend changed:
cd frontend && npm run build && sudo systemctl restart factory-web
```

## Troubleshooting
- `journalctl -u factory-api -f` / `journalctl -u factory-web -f` for logs.
- API 500s → check DATABASE_URL in the unit and that views exist.
- Dashboard "Failed to reach the API" → confirm nginx `/api/` block and that
  factory-api is listening on 127.0.0.1:8000.
- Reload data anytime: re-run `db/load_data.py` (it truncates + reloads).
