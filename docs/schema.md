# Schema Documentation

This database uses a compact star schema for a synthetic automotive final-assembly
analytics system. The physical schema is intentionally small enough to audit, but
wide enough to support OEE, loss analysis, crew/shift analysis, defect flow, and
replacement planning.

## Entity Relationship Diagram

```mermaid
erDiagram
    dim_asset ||--o{ fact_fault_events : asset_id
    dim_asset ||--o{ fact_maintenance_events : asset_id
    dim_shift_calendar ||--o{ fact_fault_events : shift_id
    dim_shift_calendar ||--o{ fact_production : shift_id
    dim_shift_calendar ||--o{ shift_logs : shift_id
    dim_events {
      text event_date
      text end_date
      text category
      text detail
    }
    dim_asset {
      text asset_id PK
      text asset_class
      text line
      text station
      text model
      int install_age_hrs
      int generation
    }
    dim_shift_calendar {
      text shift_id PK
      date shift_date
      text shift_type
      timestamp start_ts
      timestamp end_ts
      text crew
    }
    fact_fault_events {
      text fault_id PK
      text asset_id FK
      text shift_id FK
      text station
      text fault_code
      numeric downtime_min
      timestamp ts
    }
    fact_maintenance_events {
      text maint_id PK
      text asset_id FK
      text maint_type
      numeric downtime_min
      timestamp ts
    }
    fact_production {
      timestamp ts PK
      text line PK
      text shift_id FK
      int planned_units
      int produced_units
      int scrap_units
      numeric downtime_min
      numeric yield_pct
    }
    fact_defect_events {
      text defect_id PK
      timestamp ts
      text line
      text detected_station
      text root_cause_station
      text defect_type
    }
    shift_logs {
      text log_id PK
      text shift_id FK
      date shift_date
      text entry_text
    }
```

## Tables

### `dim_asset`

Purpose: asset dimension for robots and conveyor segments.

Primary key: `asset_id`

Important columns:

- `asset_class`: `robot` or `conveyor`
- `line`: assembly line
- `station`: station code, such as `ST03`
- `model`: synthetic equipment model
- `generation`: increments when replacement resets the asset clock

Relationships:

- Referenced by `fact_fault_events.asset_id`
- Referenced by `fact_maintenance_events.asset_id`

Indexes:

- primary-key index on `asset_id`

Dashboard sections:

- Robots to budget for replacement
- Worst-performing assets
- Loss by station
- Reliability decomposition

### `dim_shift_calendar`

Purpose: shift, crew, and time-window dimension.

Primary key: `shift_id`

Important columns:

- `shift_date`
- `shift_type`: day or night
- `start_ts`, `end_ts`
- `crew`

Relationships:

- Referenced by `fact_production.shift_id`
- Referenced by `fact_fault_events.shift_id`
- Referenced by `shift_logs.shift_id`

Dashboard sections:

- The invisible night shift
- Crew repair-time comparison
- Shift handoff penalty

### `dim_events`

Purpose: ground-truth operational event log used to validate whether the trend
layer can rediscover known synthetic events from the fact tables.

Primary key: none; this is a small event-log dimension.

Important columns:

- `event_date`
- `end_date`
- `category`
- `detail`

Dashboard sections:

- Quality trend rediscovers operational events
- Methodology and provenance

### `fact_production`

Purpose: hourly production by line.

Primary key: `(ts, line)`

Important columns:

- `planned_units`
- `produced_units`
- `scrap_units`
- `downtime_min`
- `yield_pct`

Relationships:

- `shift_id` references `dim_shift_calendar.shift_id`

Dashboard sections:

- KPI cards
- OEE
- Yield trend
- Validation reconciliation

### `fact_fault_events`

Purpose: every equipment fault event with asset, station, crew, and downtime.

Primary key: `fault_id`

Important columns:

- `asset_id`
- `shift_id`
- `fault_code`
- `fault_desc`
- `downtime_min`
- `ts`

Relationships:

- `asset_id` references `dim_asset.asset_id`
- `shift_id` references `dim_shift_calendar.shift_id`

Indexes:

- `idx_fault_asset`
- `idx_fault_ts`
- `idx_fault_code`

Dashboard sections:

- MTTR by crew
- Shift handoff
- Summer thermal faults
- Robot replacement candidates
- Loss by station

### `fact_maintenance_events`

Purpose: preventive maintenance and replacement history.

Primary key: `maint_id`

Important columns:

- `asset_id`
- `maint_type`: preventive or replacement
- `detail`
- `downtime_min`
- `ts`

Relationships:

- `asset_id` references `dim_asset.asset_id`

Indexes:

- `idx_maint_asset`

Dashboard sections:

- Replacement resets
- Reliability decomposition

### `fact_defect_events`

Purpose: full-fidelity defect events with origin and detection station.

Primary key: `defect_id`

Important columns:

- `detected_station`
- `root_cause_station`
- `crew`
- `shift_type`
- `defect_type`
- `ts`

Indexes:

- `idx_defect_root`
- `idx_defect_ts`
- `idx_defect_det`

Dashboard sections:

- Defect origin vs detection
- Defect propagation
- Loss by station
- Quality trend

### `shift_logs`

Purpose: messy synthetic technician log entries for context and future NLP-style
exploration. The current dashboard does not depend on these logs.

Primary key: `log_id`

Relationships:

- `shift_id` references `dim_shift_calendar.shift_id`

## Station, Quality, And Process Modeling Notes

The physical schema does not currently include separate `dim_station`,
`fact_quality_events`, or `fact_process_events` tables.

- Station is represented by station-code columns such as `station`,
  `detected_station`, and `root_cause_station`.
- Quality events are modeled as individual rows in `fact_defect_events`.
- Process events are modeled in `dim_events` and validated through analytical
  views such as `v_yield_by_quarter`, `v_defects_monthly`, and event-specific
  monthly defect views.

This keeps the demo schema direct while still supporting origin/detection,
event rediscovery, OEE, replacement planning, and validation checks.

## Analytical Views

The dashboard reads SQL views instead of raw tables. Important views include:

- `v_kpi_overall`
- `v_oee`
- `v_oee_by_line`
- `v_loss_by_station`
- `v_mttr_by_crew`
- `v_shift_handoff_effect`
- `v_rootcause_ranking`
- `v_propagation`
- `v_robot_candidates`
- `v_summer_thermal`
- `v_yield_by_quarter`
- `v_validation`
