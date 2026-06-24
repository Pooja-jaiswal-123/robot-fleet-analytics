"""
Natural-language -> SQL over warehouse.navigation_spans.

Safety model (defense in depth, not just a prompt instruction):
  1. The DB role used here (analytics_api) only has SELECT granted -- it
     physically cannot mutate data even if a query slipped through.
  2. We additionally reject any generated statement that isn't a single
     SELECT before it ever reaches ClickHouse.
  3. The model is given the exact schema and told to use only this table,
     so it isn't guessing at column names.
"""

import re

from anthropic import Anthropic

from .config import settings
from .db import query_rows

SCHEMA_DESCRIPTION = """
Table: warehouse.navigation_spans
One row = one straight-line move ("span") by one warehouse robot.

Columns:
  span_id      UUID            unique id for this span
  trace_id     UUID            groups the 1-5 spans ("legs") of one task
  task_id      UInt64          human-readable task counter
  robot_id     String          'robot_001'..'robot_200'
  leg_index    UInt8           position of this leg within its task (1..5)
  start_time   DateTime64(3)
  duration_s   Float32         seconds
  start_x/y    Float32         meters, floor is 200m x 120m
  end_x/y      Float32         meters
  distance_m   Float32         straight-line distance (materialized)
  end_time     DateTime64(3)   start_time + duration_s (materialized)
  speed_mps    Float32         distance_m / duration_s (materialized)
  hour_of_day  UInt8           0-23, materialized from start_time
  day_bucket   Date            materialized from start_time

Notes for query writing:
  - Robots only operate 06:00-21:59 in this dataset; there are no rows outside that window.
  - "task" = group by trace_id. "leg"/"span" = one row.
  - Use ClickHouse SQL syntax (e.g. toHour(), uniqExact(), quantile(), countIf()).
"""

SYSTEM_PROMPT = f"""You translate a warehouse-operations question into exactly one
read-only ClickHouse SQL statement against this schema:

{SCHEMA_DESCRIPTION}

Rules:
- Output ONLY the SQL statement. No prose, no markdown fences, no explanation.
- Must be a single SELECT statement (or WITH ... SELECT). Never write, alter, drop,
  insert, or use any DDL/DML.
- Always include a LIMIT (max 500) unless the query is already an aggregate
  returning a small, fixed number of rows.
- Reference only warehouse.navigation_spans.
"""

_SELECT_ONLY = re.compile(r"^\s*(WITH\s.+?\)\s*)?SELECT\b", re.IGNORECASE | re.DOTALL)
_FORBIDDEN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|ATTACH|DETACH|RENAME|OPTIMIZE)\b",
    re.IGNORECASE,
)


class NlQueryError(Exception):
    pass


def _client() -> Anthropic:
    if not settings.anthropic_api_key:
        raise NlQueryError(
            "Natural-language queries are disabled: ANTHROPIC_API_KEY is not set."
        )
    return Anthropic(api_key=settings.anthropic_api_key)


def _extract_sql(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(sql)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    return cleaned


def _validate_sql(sql: str) -> None:
    if not _SELECT_ONLY.match(sql):
        raise NlQueryError("Generated statement is not a SELECT query. Rejected.")
    if _FORBIDDEN.search(sql):
        raise NlQueryError("Generated statement contains a forbidden keyword. Rejected.")
    if "navigation_spans" not in sql:
        raise NlQueryError("Generated statement doesn't reference the expected table. Rejected.")


def ask(question: str) -> dict:
    client = _client()
    response = client.messages.create(
        model=settings.nl2sql_model,
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": question}],
    )
    raw_text = "".join(b.text for b in response.content if b.type == "text")
    sql = _extract_sql(raw_text)
    _validate_sql(sql)

    rows = query_rows(sql)
    return {"question": question, "sql": sql, "rows": rows}
