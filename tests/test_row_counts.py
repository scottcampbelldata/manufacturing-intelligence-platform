EXPECTED_TABLE_COUNTS = {
    "dim_asset": 157,
    "dim_shift_calendar": 2192,
    "dim_events": 7,
    "fact_fault_events": 8040,
    "fact_maintenance_events": 3029,
    "fact_production": 78912,
    "fact_defect_events": 726793,
    "shift_logs": 6043,
}


def scalar(conn, sql):
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchone()[0]


def test_loaded_table_row_counts(db_conn):
    counts = {
        table: scalar(db_conn, f"SELECT COUNT(*) FROM {table}")
        for table in EXPECTED_TABLE_COUNTS
    }
    assert counts == EXPECTED_TABLE_COUNTS


def test_no_negative_production_or_yield_out_of_bounds(db_conn):
    bad_rows = scalar(
        db_conn,
        """
        SELECT COUNT(*)
        FROM fact_production
        WHERE planned_units < 0
           OR produced_units < 0
           OR scrap_units < 0
           OR downtime_min < 0
           OR yield_pct < 0
           OR yield_pct > 100
        """,
    )
    assert bad_rows == 0
