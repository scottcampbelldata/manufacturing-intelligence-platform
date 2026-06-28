"""
Load the generated CSVs into PostgreSQL / TimescaleDB using COPY (fast path
for the ~700k-row defect table).

Usage:
    export DATABASE_URL=postgresql://user:pass@host:5432/manufacturing
    python db/load_data.py

Prereqs:
    - schema.sql already applied (psql "$DATABASE_URL" -f db/schema.sql)
    - CSVs present in generator/output/ (run generator/generate_factory_data.py)
"""
import os
import sys

import psycopg2

DB = os.environ.get("DATABASE_URL")
if not DB:
    sys.exit("Set DATABASE_URL, e.g. postgresql://user:pass@host:5432/manufacturing")

# directory holding the generated CSVs
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "generator", "output")

# (table, csv filename, explicit column list mapped positionally to the CSV)
# Only dim_shift_calendar needs a rename (start->start_ts, end->end_ts).
LOAD_ORDER = [
    ("dim_asset", "dim_asset.csv",
     "asset_id,asset_class,line,station,model,install_age_hrs,generation"),
    ("dim_shift_calendar", "dim_shift_calendar.csv",
     "shift_id,shift_date,shift_type,start_ts,end_ts,crew"),
    ("dim_events", "dim_events.csv",
     "event_date,end_date,category,detail"),
    ("fact_fault_events", "fact_fault_events.csv",
     "fault_id,asset_id,asset_class,line,station,fault_code,fault_desc,"
     "shift_id,crew,shift_type,generation,downtime_min,ts"),
    ("fact_maintenance_events", "fact_maintenance_events.csv",
     "maint_id,asset_id,ts,maint_type,detail,downtime_min"),
    ("fact_production", "fact_production.csv",
     "ts,line,shift_id,crew,shift_type,planned_units,produced_units,"
     "scrap_units,downtime_min,yield_pct"),
    ("fact_defect_events", "fact_defect_events.csv",
     "defect_id,ts,line,detected_station,root_cause_station,crew,"
     "shift_type,defect_type"),
    ("shift_logs", "shift_logs.csv",
     "log_id,shift_id,crew,shift_type,shift_date,entry_text"),
]


def main():
    conn = psycopg2.connect(DB)
    conn.autocommit = False
    cur = conn.cursor()
    try:
        # truncate in reverse dependency order so reloads are idempotent
        cur.execute("""
            TRUNCATE shift_logs, fact_defect_events, fact_production,
                     fact_fault_events, fact_maintenance_events, dim_events,
                     dim_shift_calendar, dim_asset RESTART IDENTITY CASCADE;
        """)
        for table, fname, cols in LOAD_ORDER:
            path = os.path.join(DATA, fname)
            if not os.path.exists(path):
                sys.exit(f"Missing {path} -- run the generator first.")
            sql = f"COPY {table} ({cols}) FROM STDIN WITH (FORMAT csv, HEADER true)"
            with open(path, encoding="utf-8") as fh:
                cur.copy_expert(sql, fh)
            cur.execute(f"SELECT count(*) FROM {table}")
            print(f"  loaded {table:28s} {cur.fetchone()[0]:>8,} rows")
        conn.commit()
        print("\nAll tables loaded. Now apply views:")
        print('  psql "$DATABASE_URL" -f db/analytical_views.sql')
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
