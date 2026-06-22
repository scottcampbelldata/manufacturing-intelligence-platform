# Deployment Runbook - Manufacturing Intelligence Platform

Backend/API deploy for the Hetzner VPS. The frontend is hosted elsewhere and
should call `https://factory-api.scottcampbell.io`.

Assumes the VPS has PostgreSQL 17, Python 3.14+, nginx, and systemd. Replace the
DB password before installing the service.

## 0. Get The Code Onto The VPS

```bash
cd /home/scott
git clone https://github.com/scottcampbelldata/manufacturing-intelligence-platform.git
cd manufacturing-intelligence-platform
```

## 1. Generate The Dataset

Runs the seeded generator and writes CSVs to `generator/output/`.

```bash
cd /home/scott/manufacturing-intelligence-platform
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt numpy pandas psycopg2-binary
cd generator
../backend/.venv/bin/python generate_factory_data.py
```

## 2. Create The Database And Schema

```bash
sudo -u postgres psql -c "CREATE DATABASE manufacturing;"
sudo -u postgres psql -c "CREATE USER factory WITH PASSWORD 'CHANGEME';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE manufacturing TO factory;"

export DATABASE_URL="postgresql://factory:CHANGEME@localhost:5432/manufacturing"
cd /home/scott/manufacturing-intelligence-platform
psql "$DATABASE_URL" -f db/schema.sql
```

## 3. Load The Data

```bash
cd /home/scott/manufacturing-intelligence-platform
backend/.venv/bin/python db/load_data.py
psql "$DATABASE_URL" -f db/analytical_views.sql
```

Sanity checks:

```bash
psql "$DATABASE_URL" -c "SELECT * FROM v_kpi_overall;"
psql "$DATABASE_URL" -c "SELECT * FROM v_mttr_by_crew ORDER BY mttr_min DESC;"
```

## 4. Start The API

Quick foreground test:

```bash
cd /home/scott/manufacturing-intelligence-platform/backend
DATABASE_URL="$DATABASE_URL" .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8002
curl http://127.0.0.1:8002/api/kpi
```

Install the service after editing `CHANGEME`:

```bash
cd /home/scott/manufacturing-intelligence-platform
sudo cp deploy/factory-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now factory-api
```

## 5. nginx And TLS

Point `factory-api.scottcampbell.io` at `37.27.255.215`, then:

```bash
cd /home/scott/manufacturing-intelligence-platform
sudo cp deploy/nginx.conf /etc/nginx/sites-available/factory-api.scottcampbell.io.conf
sudo ln -s /etc/nginx/sites-available/factory-api.scottcampbell.io.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d factory-api.scottcampbell.io
```

Verify:

```bash
curl https://factory-api.scottcampbell.io/health
curl https://factory-api.scottcampbell.io/api/kpi
```

## Updating

```bash
cd /home/scott/manufacturing-intelligence-platform
git pull
sudo systemctl restart factory-api
```

## Troubleshooting

- `journalctl -u factory-api -f` for logs.
- API 500s: check `DATABASE_URL` in the unit and confirm the views exist.
- Frontend CORS errors: confirm `CORS_ORIGINS` includes the hosted frontend origin.
- Reload data anytime: re-run `backend/.venv/bin/python db/load_data.py`.
