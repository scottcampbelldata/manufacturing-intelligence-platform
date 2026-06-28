"""Pydantic response models for the analytics API.

Field names mirror the analytical SQL views and the frontend's `lib/api.ts`
types exactly, so attaching these as `response_model=` keeps the JSON contract
identical while making the OpenAPI schema fully typed (no empty `{}` bodies).

Numeric measures coming from `ROUND(...)`/`AVG(...)` arrive as floats (asyncpg
Decimals are coerced to float in `db._clean`); plain `COUNT`/`SUM` of integer
columns arrive as ints. Pydantic coerces integral floats where needed.
"""
from pydantic import BaseModel


class Kpi(BaseModel):
    line_hours: int
    total_produced: int
    total_scrap: int
    yield_pct: float
    total_downtime_min: float
    total_planned: int
    total_faults: int
    production_hours: int


class Oee(BaseModel):
    availability_pct: float
    performance_pct: float
    quality_pct: float
    oee_pct: float
    line_hours: int
    planned_units: int
    produced_units: int
    scrap_units: int
    downtime_hours: float


class OeeLine(BaseModel):
    line: str
    availability_pct: float
    performance_pct: float
    quality_pct: float
    oee_pct: float


class StationLoss(BaseModel):
    station: str
    station_name: str
    downtime_hrs: float
    faults: int
    scrap_units: int
    downtime_idx: float | None = None
    scrap_idx: float | None = None
    loss_index: float


class MttrCrew(BaseModel):
    crew: str
    faults: int
    mttr_min: float
    total_downtime_hrs: float


class Handoff(BaseModel):
    shift_type: str
    time_window: str
    faults: int
    mttr_min: float


class YieldShift(BaseModel):
    shift_type: str
    avg_yield: float
    avg_throughput: float


class RootCause(BaseModel):
    root_cause_station: str
    station_name: str
    defects_caused: int
    pct_of_all: float


class Detection(BaseModel):
    detected_station: str
    station_name: str
    defects_detected: int
    pct_of_all: float


class Propagation(BaseModel):
    pct_detected_downstream: float
    total_defects: int


class PropagationPath(BaseModel):
    root_cause_station: str
    detected_station: str
    n: int


class YieldQuarter(BaseModel):
    qtr: str
    avg_yield: float
    avg_planned: float


class DefectsMonthly(BaseModel):
    mo: str
    defects: int


class SummerThermal(BaseModel):
    yr: float
    thermal_faults: int


class TopAsset(BaseModel):
    asset_id: str
    asset_class: str
    station: str
    faults: int
    avg_repair_min: float


class FaultsPerGeneration(BaseModel):
    asset_id: str
    generation: int
    faults: int


class FaultsByQuarter(BaseModel):
    qtr: str
    faults: int


class ReplaceCandidate(BaseModel):
    asset_id: str
    station: str
    model: str
    total_faults: int
    faults_prior: int
    faults_recent: int
    avg_repair_min: float
    downtime_hrs: float
    trend: str


class FactoryEvent(BaseModel):
    event_date: str
    end_date: str | None = None
    category: str
    detail: str


class ValidationCheck(BaseModel):
    check_name: str
    value: str
    status: str


class Provenance(BaseModel):
    source: str
    no_proprietary_data: bool
    seed: int
    reproducible: str
    modeling: list[str]
    oee_definition: str


class ViewLogic(BaseModel):
    section: str
    logic: str


class Methodology(BaseModel):
    validation: list[ValidationCheck]
    provenance: Provenance
    views: list[ViewLogic]


class SystemStatus(BaseModel):
    status: str
    service: str
    database: str
    schema_version: str
    dataset_seed: int
    db: bool
    date_min: str | None = None
    date_max: str | None = None
    tables: dict[str, int | None]


class Health(BaseModel):
    status: str
    service: str
