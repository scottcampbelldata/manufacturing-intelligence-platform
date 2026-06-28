-- =====================================================================
-- Manufacturing Intelligence Pipeline -- Star Schema (PostgreSQL / TimescaleDB)
-- 3-year synthetic dataset. No proprietary data. Load order respects FK deps.
-- Run: psql "$DATABASE_URL" -f db/schema.sql
-- =====================================================================
DROP TABLE IF EXISTS shift_logs, fact_defect_events, fact_production,
    fact_fault_events, fact_maintenance_events, dim_events,
    dim_shift_calendar, dim_asset, dim_station CASCADE;

-- Station dimension. The 8 assembly stations in physical process order. Process
-- stations create defects; inspection stations detect them. Referenced by the
-- asset, fault, and defect facts so station codes are guaranteed to resolve.
CREATE TABLE dim_station (
    station_id    TEXT PRIMARY KEY,
    station_name  TEXT NOT NULL,
    station_order INTEGER NOT NULL,
    station_type  TEXT NOT NULL CHECK (station_type IN ('process','inspection'))
);

CREATE TABLE dim_asset (
    asset_id        TEXT PRIMARY KEY,
    asset_class     TEXT NOT NULL CHECK (asset_class IN ('robot','conveyor')),
    line            TEXT NOT NULL,
    station         TEXT NOT NULL REFERENCES dim_station(station_id),
    model           TEXT,
    install_age_hrs INTEGER,
    generation      INTEGER   -- starts at 1; increments when asset is replaced
);

CREATE TABLE dim_shift_calendar (
    shift_id   TEXT PRIMARY KEY,
    shift_date DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day','night')),
    start_ts   TIMESTAMP NOT NULL,
    end_ts     TIMESTAMP NOT NULL,
    crew       TEXT NOT NULL
);

-- Ground-truth log of known operational events. The point of Project 1 is to
-- show the dashboard can *rediscover* these from the fact tables alone.
CREATE TABLE dim_events (
    event_date TEXT,
    end_date   TEXT,
    category   TEXT,   -- acute | process_change | new_product | reliability_program
    detail     TEXT
);

CREATE TABLE fact_fault_events (
    fault_id     TEXT PRIMARY KEY,
    asset_id     TEXT NOT NULL REFERENCES dim_asset(asset_id),
    asset_class  TEXT, line TEXT,
    station      TEXT REFERENCES dim_station(station_id),
    fault_code   TEXT NOT NULL, fault_desc TEXT,
    shift_id     TEXT REFERENCES dim_shift_calendar(shift_id),
    crew TEXT, shift_type TEXT,
    generation   INTEGER,         -- which generation of the asset faulted
    downtime_min NUMERIC(8,1),
    ts           TIMESTAMP NOT NULL
);
CREATE INDEX idx_fault_asset ON fact_fault_events(asset_id);
CREATE INDEX idx_fault_ts    ON fact_fault_events(ts);
CREATE INDEX idx_fault_code  ON fact_fault_events(fault_code);

CREATE TABLE fact_maintenance_events (
    maint_id     TEXT PRIMARY KEY,
    asset_id     TEXT NOT NULL REFERENCES dim_asset(asset_id),
    ts           TIMESTAMP NOT NULL,
    maint_type   TEXT,            -- preventive | replacement
    detail       TEXT,
    downtime_min NUMERIC(8,1)
);
CREATE INDEX idx_maint_asset ON fact_maintenance_events(asset_id);

CREATE TABLE fact_production (
    ts             TIMESTAMP NOT NULL,
    line           TEXT NOT NULL,
    shift_id       TEXT REFERENCES dim_shift_calendar(shift_id),
    crew TEXT, shift_type TEXT,
    planned_units  INTEGER, produced_units INTEGER, scrap_units INTEGER,
    downtime_min   NUMERIC(8,1), yield_pct NUMERIC(5,2),
    PRIMARY KEY (ts, line)
);

CREATE TABLE fact_defect_events (
    defect_id          TEXT PRIMARY KEY,
    ts                 TIMESTAMP NOT NULL,
    line               TEXT,
    detected_station   TEXT NOT NULL REFERENCES dim_station(station_id),
    root_cause_station TEXT NOT NULL REFERENCES dim_station(station_id),
    crew TEXT, shift_type TEXT, defect_type TEXT
);
CREATE INDEX idx_defect_root ON fact_defect_events(root_cause_station);
CREATE INDEX idx_defect_ts   ON fact_defect_events(ts);
CREATE INDEX idx_defect_det  ON fact_defect_events(detected_station);

CREATE TABLE shift_logs (
    log_id TEXT PRIMARY KEY,
    shift_id TEXT REFERENCES dim_shift_calendar(shift_id),
    crew TEXT, shift_type TEXT, shift_date DATE, entry_text TEXT
);

-- Optional TimescaleDB hypertables (uncomment if the timescaledb extension is
-- installed). The fact tables are time-series and benefit from chunking.
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
-- SELECT create_hypertable('fact_defect_events','ts', migrate_data => true);
-- SELECT create_hypertable('fact_production','ts', migrate_data => true);
-- SELECT create_hypertable('fact_fault_events','ts', migrate_data => true);
