"""
Natural-language -> SQL over warehouse.navigation_spans.
Uses Groq instead of Anthropic.
"""

import re

from groq import Groq

from .config import settings
from .db import query_rows

SCHEMA_DESCRIPTION = """
Table: warehouse.navigation_spans

Columns:
  span_id      UUID
  trace_id     UUID
  task_id      UInt64
  robot_id     String
  leg_index    UInt8
  start_time   DateTime64(3)
  duration_s   Float32
  start_x      Float32
  start_y      Float32
  end_x        Float32
  end_y        Float32
  distance_m   Float32
  end_time     DateTime64(3)
  speed_mps    Float32
  hour_of_day  UInt8
  day_bucket   Date
"""

SYSTEM_PROMPT = f"""
You are a ClickHouse SQL generator.

Schema:

{SCHEMA_DESCRIPTION}

Rules:
- Output ONLY SQL.
- Must be a single SELECT query.
- Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE.
- Only query warehouse.navigation_spans.
- Use ClickHouse syntax.
- Add LIMIT 500 when returning many rows.
"""

_SELECT_ONLY = re.compile(
    r"^\s*(WITH\s.+?\)\s*)?SELECT\b",
    re.IGNORECASE | re.DOTALL,
)

_FORBIDDEN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|ATTACH|DETACH|RENAME|OPTIMIZE)\b",
    re.IGNORECASE,
)


class NlQueryError(Exception):
    pass


def _client():
    if not settings.groq_api_key:
        raise NlQueryError(
            "Natural-language queries are disabled: GROQ_API_KEY is not set."
        )

    return Groq(api_key=settings.groq_api_key)


def _extract_sql(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```sql", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"^```", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return text


def _validate_sql(sql: str):
    if not _SELECT_ONLY.match(sql):
        raise NlQueryError("Generated statement is not a SELECT query.")

    if _FORBIDDEN.search(sql):
        raise NlQueryError("Forbidden SQL detected.")

    if "navigation_spans" not in sql.lower():
        raise NlQueryError("Query must reference navigation_spans.")


def ask(question: str) -> dict:
    client = _client()

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
    )

    sql = _extract_sql(response.choices[0].message.content)

    _validate_sql(sql)

    rows = query_rows(sql)

    return {
        "question": question,
        "sql": sql,
        "rows": rows,
    }