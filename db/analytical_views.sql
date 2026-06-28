-- Manufacturing Intelligence Pipeline -- analytical views
-- Portable to PostgreSQL / TimescaleDB (date_trunc / window funcs standard).
-- Run after loading the star schema + data:
--   psql "$DATABASE_URL" -f db/analytical_views.sql
-- Every dashboard page is backed by one of these views.

-- Drop first so the script is idempotent even when a view's column set changes
-- (CREATE OR REPLACE cannot reorder or insert columns on an existing view).
DROP VIEW IF EXISTS
    v_kpi_overall, v_mttr_by_crew, v_shift_handoff_effect, v_yield_by_shift,
    v_rootcause_ranking, v_propagation, v_propagation_paths, v_detection_ranking,
    v_top_faulting_assets, v_faults_per_generation, v_faults_by_quarter,
    v_yield_by_quarter, v_st03_monthly, v_st06_monthly, v_summer_thermal,
    v_defects_monthly, v_oee, v_oee_by_line, v_loss_by_station,
    v_robot_candidates, v_validation CASCADE;

-- Executive KPIs -------------------------------------------------------------
CREATE OR REPLACE VIEW v_kpi_overall AS
SELECT
    COUNT(*)                                   AS line_hours,
    SUM(produced_units)                        AS total_produced,
    SUM(scrap_units)                           AS total_scrap,
    ROUND(100.0*(SUM(produced_units)-SUM(scrap_units))
          / NULLIF(SUM(produced_units),0), 2)  AS yield_pct,
    SUM(downtime_min)                          AS total_downtime_min,
    SUM(planned_units)                         AS total_planned,
    (SELECT COUNT(*) FROM fact_fault_events)   AS total_faults,
    (SELECT COUNT(DISTINCT ts) FROM fact_production) AS production_hours
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
SELECT d.root_cause_station, ds.station_name,
       COUNT(*) AS defects_caused,
       ROUND(100.0*COUNT(*)/SUM(COUNT(*)) OVER (),2) AS pct_of_all
FROM fact_defect_events d JOIN dim_station ds ON ds.station_id = d.root_cause_station
GROUP BY d.root_cause_station, ds.station_name;

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
SELECT d.detected_station, ds.station_name,
       COUNT(*) AS defects_detected,
       ROUND(100.0*COUNT(*)/SUM(COUNT(*)) OVER (),2) AS pct_of_all
FROM fact_defect_events d JOIN dim_station ds ON ds.station_id = d.detected_station
GROUP BY d.detected_station, ds.station_name;

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
-- ST03 = Robotic Spot Weld; surfaces the weld-cell retooling step change.

CREATE OR REPLACE VIEW v_st06_monthly AS
SELECT date_trunc('month', ts) AS mo, COUNT(*) AS st06_defects
FROM fact_defect_events WHERE detected_station='ST06'
GROUP BY 1 ORDER BY 1;
-- ST06 = Final Assembly; surfaces the fastener-torque supplier bad batch.

CREATE OR REPLACE VIEW v_summer_thermal AS
SELECT EXTRACT(year FROM ts) AS yr, COUNT(*) AS thermal_faults
FROM fact_fault_events
WHERE fault_code IN ('R-TEMP','R-SERVO','C-VFD','R-BELL')
  AND EXTRACT(month FROM ts) IN (6,7,8)
GROUP BY 1 ORDER BY 1;
-- Heat-sensitive faults (drives, servo guns, VFDs, paint bells) by summer.

CREATE OR REPLACE VIEW v_defects_monthly AS
SELECT date_trunc('month', ts) AS mo, detected_station, COUNT(*) AS defects
FROM fact_defect_events GROUP BY 1,2 ORDER BY 1,2;

-- ===========================================================================
-- EXECUTIVE: OEE (Availability x Performance x Quality) -- the metric auto
-- plant management lives by. Derived purely from fact_production.
--   Availability = (planned_time - downtime) / planned_time
--   Quality      = good_units / produced_units
--   Performance  = produced / (ideal_for_runtime) = produced / (planned * A)
--   OEE          = A x P x Q  ==  good_units / planned_units
-- ===========================================================================
CREATE OR REPLACE VIEW v_oee AS
WITH a AS (
  SELECT COUNT(*) lh, SUM(planned_units) planned, SUM(produced_units) produced,
         SUM(scrap_units) scrap, SUM(downtime_min) dt FROM fact_production)
SELECT ROUND(100.0*(lh*60-dt)/(lh*60),1)                              AS availability_pct,
       ROUND(100.0*produced/NULLIF(planned*((lh*60-dt)/(lh*60.0)),0),1) AS performance_pct,
       ROUND(100.0*(produced-scrap)/NULLIF(produced,0),1)             AS quality_pct,
       ROUND(100.0*(produced-scrap)/NULLIF(planned,0),1)              AS oee_pct,
       lh AS line_hours, planned AS planned_units, produced AS produced_units,
       scrap AS scrap_units, ROUND(dt/60.0,0) AS downtime_hours
FROM a;

CREATE OR REPLACE VIEW v_oee_by_line AS
WITH a AS (
  SELECT line, COUNT(*) lh, SUM(planned_units) planned, SUM(produced_units) produced,
         SUM(scrap_units) scrap, SUM(downtime_min) dt FROM fact_production GROUP BY line)
SELECT line,
       ROUND(100.0*(lh*60-dt)/(lh*60),1)                              AS availability_pct,
       ROUND(100.0*produced/NULLIF(planned*((lh*60-dt)/(lh*60.0)),0),1) AS performance_pct,
       ROUND(100.0*(produced-scrap)/NULLIF(produced,0),1)             AS quality_pct,
       ROUND(100.0*(produced-scrap)/NULLIF(planned,0),1)              AS oee_pct
FROM a ORDER BY line;

-- EXECUTIVE: where output is lost (no dollars -- downtime hours + scrap units).
-- Answers "which station do I fix first?" Combines equipment downtime (by the
-- faulting asset's station) with scrap originated (by root-cause station).
CREATE OR REPLACE VIEW v_loss_by_station AS
WITH dt AS (SELECT station, ROUND(SUM(downtime_min)/60,0) downtime_hrs, COUNT(*) faults
            FROM fact_fault_events GROUP BY station),
     sc AS (SELECT root_cause_station station, COUNT(*) scrap_units
            FROM fact_defect_events GROUP BY root_cause_station),
     j AS (SELECT COALESCE(dt.station,sc.station) station,
                  COALESCE(downtime_hrs,0) downtime_hrs, COALESCE(faults,0) faults,
                  COALESCE(scrap_units,0) scrap_units
           FROM dt FULL OUTER JOIN sc ON dt.station=sc.station)
SELECT j.station, ds.station_name, j.downtime_hrs, j.faults, j.scrap_units,
       ROUND(100.0*j.downtime_hrs/NULLIF(MAX(j.downtime_hrs) OVER(),0),0) AS downtime_idx,
       ROUND(100.0*j.scrap_units/NULLIF(MAX(j.scrap_units) OVER(),0),0)   AS scrap_idx
FROM j JOIN dim_station ds ON ds.station_id = j.station;

-- RELIABILITY: robot replacement candidates -- faults rising year over year.
CREATE OR REPLACE VIEW v_robot_candidates AS
WITH y AS (
  SELECT f.asset_id, a.station, a.model,
    COUNT(*) total_faults,
    SUM(CASE WHEN EXTRACT(year FROM ts)=2024 THEN 1 ELSE 0 END) faults_prior,
    SUM(CASE WHEN EXTRACT(year FROM ts)=2025 THEN 1 ELSE 0 END) faults_recent,
    ROUND(AVG(downtime_min),1) avg_repair_min,
    ROUND(SUM(downtime_min)/60,0) downtime_hrs
  FROM fact_fault_events f JOIN dim_asset a USING(asset_id)
  WHERE a.asset_class='robot' GROUP BY 1,2,3)
SELECT asset_id, station, model, total_faults, faults_prior, faults_recent,
       avg_repair_min, downtime_hrs,
       CASE WHEN faults_recent>faults_prior THEN 'rising' ELSE 'stable' END AS trend
FROM y;

-- METHODOLOGY: data-integrity + provenance checks (the 'is this right?' panel).
CREATE OR REPLACE VIEW v_validation AS
SELECT 1 ord, 'dim_asset rows'           AS check_name, (SELECT COUNT(*) FROM dim_asset)::text v, 'info' status
UNION ALL SELECT 2, 'fact_fault_events rows',   (SELECT COUNT(*) FROM fact_fault_events)::text, 'info'
UNION ALL SELECT 3, 'fact_defect_events rows',  (SELECT COUNT(*) FROM fact_defect_events)::text, 'info'
UNION ALL SELECT 4, 'fact_production rows',      (SELECT COUNT(*) FROM fact_production)::text, 'info'
UNION ALL SELECT 5, 'distinct production hours', (SELECT COUNT(DISTINCT ts) FROM fact_production)::text, 'info'
UNION ALL SELECT 6, 'orphan faults (asset FK)',
  (SELECT COUNT(*) FROM fact_fault_events f LEFT JOIN dim_asset a USING(asset_id) WHERE a.asset_id IS NULL)::text,
  CASE WHEN (SELECT COUNT(*) FROM fact_fault_events f LEFT JOIN dim_asset a USING(asset_id) WHERE a.asset_id IS NULL)=0 THEN 'pass' ELSE 'fail' END
UNION ALL SELECT 7, 'orphan production (shift FK)',
  (SELECT COUNT(*) FROM fact_production p LEFT JOIN dim_shift_calendar c USING(shift_id) WHERE c.shift_id IS NULL)::text,
  CASE WHEN (SELECT COUNT(*) FROM fact_production p LEFT JOIN dim_shift_calendar c USING(shift_id) WHERE c.shift_id IS NULL)=0 THEN 'pass' ELSE 'fail' END
UNION ALL SELECT 8, 'yield reconciliation mismatches',
  (SELECT COUNT(*) FROM fact_production WHERE ABS(yield_pct - 100.0*(produced_units-scrap_units)/NULLIF(produced_units,0))>0.5)::text,
  CASE WHEN (SELECT COUNT(*) FROM fact_production WHERE ABS(yield_pct - 100.0*(produced_units-scrap_units)/NULLIF(produced_units,0))>0.5)=0 THEN 'pass' ELSE 'fail' END
UNION ALL SELECT 9, 'null downtime on faults',
  (SELECT COUNT(*) FROM fact_fault_events WHERE downtime_min IS NULL)::text,
  CASE WHEN (SELECT COUNT(*) FROM fact_fault_events WHERE downtime_min IS NULL)=0 THEN 'pass' ELSE 'fail' END
UNION ALL SELECT 11, 'orphan defect root stations',
  (SELECT COUNT(*) FROM fact_defect_events d LEFT JOIN dim_station s ON s.station_id=d.root_cause_station WHERE s.station_id IS NULL)::text,
  CASE WHEN (SELECT COUNT(*) FROM fact_defect_events d LEFT JOIN dim_station s ON s.station_id=d.root_cause_station WHERE s.station_id IS NULL)=0 THEN 'pass' ELSE 'fail' END
UNION ALL SELECT 12, 'orphan defect detected stations',
  (SELECT COUNT(*) FROM fact_defect_events d LEFT JOIN dim_station s ON s.station_id=d.detected_station WHERE s.station_id IS NULL)::text,
  CASE WHEN (SELECT COUNT(*) FROM fact_defect_events d LEFT JOIN dim_station s ON s.station_id=d.detected_station WHERE s.station_id IS NULL)=0 THEN 'pass' ELSE 'fail' END
UNION ALL SELECT 10,'date range',
  (SELECT MIN(ts)::date || ' to ' || MAX(ts)::date FROM fact_production), 'info';
