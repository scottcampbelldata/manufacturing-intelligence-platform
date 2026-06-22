def scalar(conn, sql):
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchone()[0]


def test_no_orphan_fault_asset_ids(db_conn):
    assert scalar(
        db_conn,
        """
        SELECT COUNT(*)
        FROM fact_fault_events f
        LEFT JOIN dim_asset a USING (asset_id)
        WHERE a.asset_id IS NULL
        """,
    ) == 0


def test_no_orphan_shift_links(db_conn):
    checks = [
        """
        SELECT COUNT(*)
        FROM fact_production p
        LEFT JOIN dim_shift_calendar s USING (shift_id)
        WHERE s.shift_id IS NULL
        """,
        """
        SELECT COUNT(*)
        FROM fact_fault_events f
        LEFT JOIN dim_shift_calendar s USING (shift_id)
        WHERE s.shift_id IS NULL
        """,
        """
        SELECT COUNT(*)
        FROM shift_logs l
        LEFT JOIN dim_shift_calendar s USING (shift_id)
        WHERE s.shift_id IS NULL
        """,
    ]
    assert [scalar(db_conn, sql) for sql in checks] == [0, 0, 0]
