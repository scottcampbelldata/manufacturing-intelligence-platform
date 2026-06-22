import os
import subprocess
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
GENERATOR = ROOT / "generator"
OUTPUT = GENERATOR / "output"


def count_csv_rows(path: Path) -> int:
    with path.open("r", encoding="utf-8", newline="") as fh:
        return max(sum(1 for _ in fh) - 1, 0)


@pytest.fixture(scope="session")
def generated_data():
    subprocess.run(
        [sys.executable, "generate_factory_data.py"],
        cwd=GENERATOR,
        check=True,
    )
    return OUTPUT


@pytest.fixture(scope="session")
def database_url():
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL is required for database-backed tests")
    return url


def execute_sql_file(conn, path: Path) -> None:
    with path.open("r", encoding="utf-8") as fh:
        sql = fh.read()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()


@pytest.fixture(scope="session")
def loaded_db(generated_data, database_url):
    import psycopg2

    with psycopg2.connect(database_url) as conn:
        execute_sql_file(conn, ROOT / "db" / "schema.sql")

    env = os.environ.copy()
    env["DATABASE_URL"] = database_url
    subprocess.run(
        [sys.executable, str(ROOT / "db" / "load_data.py")],
        cwd=ROOT,
        check=True,
        env=env,
    )

    with psycopg2.connect(database_url) as conn:
        execute_sql_file(conn, ROOT / "db" / "analytical_views.sql")

    return database_url


@pytest.fixture()
def db_conn(loaded_db):
    import psycopg2

    conn = psycopg2.connect(loaded_db)
    try:
        yield conn
    finally:
        conn.close()
