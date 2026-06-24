import clickhouse_connect

from .config import settings


def query_rows(sql: str, parameters: dict | None = None) -> list[dict]:
    """Run a SQL query and return rows as a list of plain dicts (JSON-safe)."""

    client = clickhouse_connect.get_client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
        database=settings.clickhouse_database,
    )

    result = client.query(sql, parameters=parameters or {})
    cols = result.column_names

    return [dict(zip(cols, row)) for row in result.result_rows]