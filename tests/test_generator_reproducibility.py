from conftest import count_csv_rows


EXPECTED_ROW_COUNTS = {
    "dim_asset.csv": 157,
    "dim_shift_calendar.csv": 2192,
    "dim_events.csv": 7,
    "fact_fault_events.csv": 8040,
    "fact_maintenance_events.csv": 3029,
    "fact_production.csv": 78912,
    "fact_defect_events.csv": 726793,
    "shift_logs.csv": 6043,
}


def test_seeded_generator_reproduces_expected_row_counts(generated_data):
    counts = {
        filename: count_csv_rows(generated_data / filename)
        for filename in EXPECTED_ROW_COUNTS
    }
    assert counts == EXPECTED_ROW_COUNTS
