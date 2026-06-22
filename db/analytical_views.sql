-- Manufacturing Intelligence Pipeline -- analytical views
-- Portable to PostgreSQL / TimescaleDB (date_trunc / window funcs standard).
-- Run after loading the star schema + data:
--   psql "$DATABASE_URL" -f db/analytical_views.sql
-- Every dashboard page is backed by one of these views.

-- Executive KPIs -------------------------------------------------------------
CREATE OR REPLACE VIEW v_kpi_overall AS
SELECT
    COUNT(*)                                   AS line_hours,
    SUM(produced_units)                        AS total_produced,
    SUM(scrap_units)                           AS total_scrap,
    ROUND(100.0*(SUM(produced_units)-SUM(scrap_units))
          / NULLIF(SUM(produced_units),0), 2)  AS yield_pct,
    SUM(downtime_min)                          AS total_downtime_min
FROM fact_production;

-- The invisible night shift --------------------------------------------------
CREATE OR REPLACE VIEW v_mttr_by_crew AS
SELECT crew,
       COUNT(*)                       AS faults,
       ROUND(AVG(downtime_min),1)     AS mttr_min,
       ROUND(SUM(downtime_min)/60,0)  AS total_downtime_hrs
FROM fact_fault_events
GROUP BY crew;

CREATE OR REPLACE VIEW v_shift_handoff_effect AS
SELECT shift_type,
       CASE WHEN shift_type='night' AND EXTRACT(hour FROM ts) IN (4,5)
            THEN 'night_handoff_window' ELSE 'normal' END AS time_window,
       COUNT(*) AS faults,
       ROUND(AVG(downtime_min),1) AS mttr_min
FROM fact_fault_events
GROUP BY 1,2;

CREATE OR REPLACE VIEW v_yield_by_shift AS
SELECT shift_type,
       ROUND(AVG(yield_pct),2)      AS avg_yield,
       ROUND(AVG(produced_units),0) AS avg_throughput
FROM fact_production GROUP BY shift_type;

-- Root cause / propagation ---------------------------------------------------
CREATE OR REPLACE VIEW v_rootcause_ranking AS
SELECT root_cause_station,
       COUNT(*) AS defects_caused,
       ROUND(100.0*COUNT(*)/SUM(COUNT(*)) OVER (),2) AS pct_of_all
FROM fact_defect_events
GROUP BY root_cause_station;

CREATE OR REPLACE VIEW v_propagation AS
SELECT
    ROUND(100.0*SUM(CASE WHEN detected_station<>root_cause_station
                         THEN 1 ELSE 0 END)/COUNT(*),2) AS pct_detected_downstream,
    COUNT(*) AS total_defects
FROM fact_defect_events;

CREATE OR REPLACE VIEW v_propagation_paths AS
SELECT root_cause_station, detected_station, COUNT(*) AS n
FROM fact_defect_events
WHERE root_cause_station<>detected_station
GROUP BY 1,2;

CREATE OR REPLACE VIEW v_detection_ranking AS
SELECT detected_station,
       COUNT(*) AS defects_detected,
       ROUND(100.0*COUNT(*)/SUM(COUNT(*)) OVER (),2) AS pct_of_all
FROM fact_defect_events
GROUP BY detected_station;

-- Reliability / equipment lifecycle ------------------------------------------
CREATE OR REPLACE VIEW v_top_faulting_assets AS
SELECT f.asset_id, a.asset_class, a.station,
       COUNT(*) AS faults,
       ROUND(AVG(f.downtime_min),1) AS avg_repair_min
FROM fact_fault_events f JOIN dim_asset a USING (asset_id)
GROUP BY 1,2,3;

CREATE OR REPLACE VIEW v_faults_per_generation AS
SELECT asset_id, generation, COUNT(*) AS faults
FROM fact_fault_events
WHERE asset_id IN (SELECT asset_id FROM fact_maintenance_events
                   WHERE maint_type='replacement')
GROUP BY 1,2;

CREATE OR REPLACE VIEW v_faults_by_quarter AS
SELECT date_trunc('quarter', ts) AS qtr, COUNT(*) AS faults
FROM fact_fault_events GROUP BY 1 ORDER BY 1;

-- Trends & event rediscovery -------------------------------------------------
CREATE OR REPLACE VIEW v_yield_by_quarter AS
SELECT date_trunc('quarter', ts) AS qtr,
       ROUND(AVG(yield_pct),2)     AS avg_yield,
       ROUND(AVG(planned_units),0) AS avg_planned
FROM fact_production GROUP BY 1 ORDER BY 1;

CREATE OR REPLACE VIEW v_st03_monthly AS
SELECT date_trunc('month', ts) AS mo, COUNT(*) AS st03_defects
FROM fact_defect_events WHERE detected_station='ST03'
GROUP BY 1 ORDER BY 1;

CREATE OR REPLACE VIEW v_st06_monthly AS
SELECT date_trunc('month', ts) AS mo, COUNT(*) AS st06_defects
FROM fact_defect_events WHERE detected_station='ST06'
GROUP BY 1 ORDER BY 1;

CREATE OR REPLACE VIEW v_summer_thermal AS
SELECT EXTRACT(year FROM ts) AS yr, COUNT(*) AS thermal_faults
FROM fact_fault_events
WHERE fault_code IN ('R-TEMP','R-SERVO','C-MOTOR','C-VFD')
  AND EXTRACT(month FROM ts) IN (6,7,8)
GROUP BY 1 ORDER BY 1;

CREATE OR REPLACE VIEW v_defects_monthly AS
SELECT date_trunc('month', ts) AS mo, detected_station, COUNT(*) AS defects
FROM fact_defect_events GROUP BY 1,2 ORDER BY 1,2;
