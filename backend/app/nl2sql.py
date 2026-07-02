"""
Natural-language -> SQL over warehouse.navigation_spans.
Uses Groq instead of Anthropic.

Two-step flow so the panel feels like a real assistant instead of a SQL dumper:
  1. Check if it's a greeting/small talk → respond directly
  2. ask Groq to turn the question into SQL (or REJECT if out of scope)
  3. run the SQL, then ask Groq again to phrase the result as a short,
     friendly sentence -- this is the bit that makes it feel like a chat
     reply instead of a raw table dump.
"""

import json
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
You are a ClickHouse SQL generator with NO general knowledge of your own.

Schema:

{SCHEMA_DESCRIPTION}

STRICT SCOPE RULE:
You can ONLY answer questions that translate directly into a SQL query against
warehouse.navigation_spans using ONLY the columns listed above. You have no
other knowledge, no opinions, no facts about the world, and no information
about anything outside this single table.

If the question is unrelated to this table, OR requires a column/fact that is
not in the schema above, OR is general knowledge / conversation / anything
else -- you MUST output exactly this line and nothing else:
REJECT: question is out of scope for navigation_spans.

Do not try to be helpful by guessing, approximating, or inventing a plausible
answer. Guessing is the wrong behavior here. Rejecting is correct behavior.

Rules when the question IS answerable from this table:
- Output ONLY the SQL statement. No prose, no markdown fences, no explanation,
  before or after the SQL.
- Must be a single SELECT query.
- Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE.
- Only query warehouse.navigation_spans. Never invent a column name that isn't
  in the schema above -- if you would need to, output REJECT instead.
- Use ClickHouse syntax.
- Add LIMIT 500 when returning many rows.

Examples:
Q: "which robot covers the most total distance?"
A: SELECT robot_id, sum(distance_m) AS total_distance FROM warehouse.navigation_spans GROUP BY robot_id ORDER BY total_distance DESC LIMIT 1

Q: "what's the weather like today?"
A: REJECT: question is out of scope for navigation_spans.

Q: "who is the president of India?"
A: REJECT: question is out of scope for navigation_spans.

Q: "how many tasks did robot_017 complete?"
A: SELECT uniqExact(trace_id) AS task_count FROM warehouse.navigation_spans WHERE robot_id = 'robot_017'
"""

EXPLAIN_PROMPT = """You are a warehouse fleet-ops assistant. You're given the
user's question and the JSON rows that answered it. Write ONE short, natural,
conversational sentence (max ~30 words) stating the answer directly -- like a
helpful colleague reading the result out loud. No SQL, no "based on the data",
no hedging, no markdown. If the rows are empty, say so plainly.
"""

GREETING_PROMPT = """You are a friendly warehouse fleet-ops assistant.
The user has sent a greeting or casual message (not a data question).
Reply warmly in 1-2 short sentences. Let them know you can answer questions
about robot navigation data — things like distance, speed, tasks, and spans.
No markdown, no bullet points.
"""

FALLBACK_PROMPT = """You are a friendly warehouse fleet-ops assistant.
The user asked something outside your database scope.
Politely reply in 1-2 sentences that you can only answer questions about
robot navigation data (distance, speed, tasks, spans, robots).
Be warm and helpful, not robotic. No markdown, no bullet points.
"""

_GREETING_PATTERN = re.compile(
    r"^\s*(hi|hello|hey|howdy|greetings|good\s*(morning|afternoon|evening|day)|"
    r"what'?s\s*up|sup|yo|hiya|how\s*are\s*you|how\s*r\s*u|thanks?|thank\s*you|"
    r"bye|goodbye|see\s*you|take\s*care|help|who\s*are\s*you|what\s*can\s*you\s*do)"
    r"[\s!?.]*$",
    re.IGNORECASE,
)

_SELECT_ONLY = re.compile(
    r"^\s*(WITH\s.+?\)\s*)?SELECT\b",
    re.IGNORECASE | re.DOTALL,
)

_FORBIDDEN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|ATTACH|DETACH|RENAME|OPTIMIZE)\b",
    re.IGNORECASE,
)

_REJECT = re.compile(r"^\s*REJECT\b", re.IGNORECASE)


class NlQueryError(Exception):
    pass


def _client() -> Groq:
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
    if _REJECT.match(sql):
        raise NlQueryError("REJECT")

    if not _SELECT_ONLY.match(sql):
        raise NlQueryError("Generated statement is not a SELECT query.")

    if _FORBIDDEN.search(sql):
        raise NlQueryError("Forbidden SQL detected.")

    if "navigation_spans" not in sql.lower():
        raise NlQueryError("Query must reference navigation_spans.")


def _explain(client: Groq, question: str, rows: list[dict]) -> str:
    try:
        payload = json.dumps(rows[:20], default=str)
        response = client.chat.completions.create(
            model=settings.nl2sql_model,
            temperature=0.3,
            max_tokens=120,
            messages=[
                {"role": "system", "content": EXPLAIN_PROMPT},
                {"role": "user", "content": f"Question: {question}\nRows: {payload}"},
            ],
        )
        return response.choices[0].message.content.strip()
    except Exception:
        if not rows:
            return "I ran the query but didn't find any matching rows."
        return f"Here's what I found ({len(rows)} row{'s' if len(rows) != 1 else ''})."


def _is_greeting(text: str) -> bool:
    return bool(_GREETING_PATTERN.match(text.strip()))


def _handle_greeting(client: Groq, message: str) -> dict:
    try:
        response = client.chat.completions.create(
            model=settings.nl2sql_model,
            temperature=0.7,
            max_tokens=80,
            messages=[
                {"role": "system", "content": GREETING_PROMPT},
                {"role": "user", "content": message},
            ],
        )
        answer = response.choices[0].message.content.strip()
    except Exception:
        answer = "Hey there! Ask me anything about robot navigation data — distances, speeds, tasks, you name it."

    return {
        "question": message,
        "answer": answer,
        "sql": None,
        "rows": [],
    }


def _handle_fallback(client: Groq, message: str) -> dict:
    """Called when SQL generation returns REJECT or any out-of-scope query."""
    try:
        response = client.chat.completions.create(
            model=settings.nl2sql_model,
            temperature=0.7,
            max_tokens=80,
            messages=[
                {"role": "system", "content": FALLBACK_PROMPT},
                {"role": "user", "content": message},
            ],
        )
        answer = response.choices[0].message.content.strip()
    except Exception:
        answer = "I can only answer questions about robot navigation data. Try asking about speed, distance, tasks, or robots!"

    return {
        "question": message,
        "answer": answer,
        "sql": None,
        "rows": [],
    }


def ask(question: str) -> dict:
    client = _client()

    # Step 1: greeting/small talk → friendly reply, skip SQL entirely
    if _is_greeting(question):
        return _handle_greeting(client, question)

    # Step 2: try NL → SQL
    response = client.chat.completions.create(
        model=settings.nl2sql_model,
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
    )

    sql = _extract_sql(response.choices[0].message.content)

    # Step 3: validate — if REJECT or invalid, return friendly fallback
    try:
        _validate_sql(sql)
    except NlQueryError:
        return _handle_fallback(client, question)

    # Step 4: run query and explain result
    rows = query_rows(sql)
    answer = _explain(client, question, rows)

    return {
        "question": question,
        "answer": answer,
        "sql": sql,
        "rows": rows,
    }