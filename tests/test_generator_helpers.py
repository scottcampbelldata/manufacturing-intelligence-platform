"""Fast unit tests for the generator's pure helper functions.

These need no database and no generated CSVs — they exercise the deterministic
seasonal/event math and the station dimension directly, so they run in the
fast CI job.
"""
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "generator"))

import generate_factory_data as g  # noqa: E402


def test_summer_signal_peaks_midsummer():
    assert g.summer_signal(datetime(2024, 7, 19)) > 0.99
    assert g.summer_signal(datetime(2024, 1, 19)) < -0.99


def test_season_severity_uses_summer_table():
    assert g.season_severity(datetime(2025, 7, 15)) == g.SUMMER_SEVERITY[2025]


def test_season_severity_uses_winter_table_keyed_by_january():
    # A December date belongs to the following January's winter key.
    assert g.season_severity(datetime(2024, 12, 15)) == g.WINTER_SEVERITY[2025]


def test_process_defect_mult_steps_down_after_change():
    before = g.process_defect_mult(datetime(2024, 4, 14), "ST03")
    after = g.process_defect_mult(datetime(2024, 4, 16), "ST03")
    assert before == 1.0
    assert after == 0.55


def test_process_defect_mult_unaffected_station_is_neutral():
    assert g.process_defect_mult(datetime(2024, 4, 16), "ST01") == 1.0


def test_new_product_defect_mult_decays_to_neutral():
    peak = g.new_product_defect_mult(g_datetime(g.NEW_PRODUCT_DATE), "ST05")
    assert peak > 1.0
    well_after = g.new_product_defect_mult(datetime(2025, 12, 31), "ST05")
    assert well_after == 1.0


def test_ci_factor_decreases_over_time():
    early = g.ci_factor(g.START)
    late = g.ci_factor(g.END)
    assert early > late  # continuous improvement: defects trend down


def test_build_stations_covers_all_eight_in_order():
    df = g.build_stations()
    assert list(df["station_id"]) == [f"ST0{i}" for i in range(1, 9)]
    assert set(df["station_type"]) == {"process", "inspection"}
    # ST07/ST08 are the inspection points.
    inspection = set(df.loc[df["station_type"] == "inspection", "station_id"])
    assert inspection == {"ST07", "ST08"}
    assert list(df["station_order"]) == list(range(8))


def g_datetime(d):
    """Coerce a date to a datetime at the START hour for helper calls."""
    return datetime(d.year, d.month, d.day, 6, 0, 0)
