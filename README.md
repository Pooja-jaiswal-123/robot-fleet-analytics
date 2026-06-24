# Fleet-Ops — Warehouse Robot Navigation Analytics

A full-stack analytics application over the 1,000,000-row robot navigation telemetry
dataset: ClickHouse → FastAPI analytics service → React ops-dashboard, plus a
natural-language query panel backed by Claude. See [`docs/FINDINGS.md`](docs/FINDINGS.md)
for the patterns this surfaced in the data.

## Architecture

```
┌─────────────┐      SQL       ┌──────────────┐      JSON       ┌───────────────┐
│ ClickHouse  │◄───────────────│  FastAPI     │◄────────────────│  React (Vite) │
│ navigation_ │  (read-only    │  analytics   │   REST          │  dashboard    │
│ spans       │   service acct)│  service     │                 │  (nginx)      │
└─────────────┘                └──────┬───────┘                 └───────────────┘
                                       │
                                       │ optional, only for
                                       │ the NL-query panel
                                       ▼
                                ┌──────────────┐
                                │ Claude API   │
                                │ (NL → SQL)   │
                                └──────────────┘
```

- **ClickHouse** — same schema/loader you were given, plus a few `MATERIALIZED`
  columns (`speed_mps`, `hour_of_day`, `day_bucket`) so the heavy aggregation happens
  in the database, not in application code. A dedicated `analytics_api` user has
  `SELECT`-only grants — the API can't write to the warehouse even if it tried.
- **Backend (`backend/`)** — FastAPI service. Each dashboard panel maps to one
  endpoint and one hand-written, indexed-by-design SQL query in `app/analytics.py`.
  `/api/nl-query` turns a plain-English question into SQL via the Claude API, then
  validates it's a single `SELECT` against the right table before running it.
- **Frontend (`frontend/`)** — React + Vite + Tailwind + Recharts, styled as a fleet
  ops console (dark graphite, amber/cyan telemetry accents, monospace data). The
  floor-density panel is rendered as a hand-built SVG grid rather than a generic
  chart-library heatmap, since the real signal here is the *absence* of fixed
  stations.

## Run it

One command, from the project root:

```bash
make up
```

(equivalent to `docker compose up -d --build`). First boot creates the ClickHouse
schema, loads the parquet file, and builds both app images — give it ~1–2 minutes.

- Dashboard:  http://localhost:8080
- API + docs: http://localhost:8000/docs
- ClickHouse: http://localhost:8123 (`intern` / `intern`, read-only, as before)

Other useful targets: `make logs`, `make down`, `make rebuild`, `make clean` (drops
the ClickHouse volume too).

### Enabling the natural-language query panel (optional)

The rest of the dashboard works without this. To turn it on:

```bash
cp .env.example .env
# put your Anthropic API key in .env
make rebuild
```

## Project layout

```
robot-fleet-analytics/
├── docker-compose.yml          # clickhouse + backend + frontend, one network
├── Makefile                    # make up / down / logs / rebuild / clean
├── .env.example
├── clickhouse/
│   └── init/
│       ├── 01-schema.sql       # table + materialized columns + DB users
│       └── 02-load.sh          # bulk-loads the parquet file on first boot
├── data/
│   └── navigation_spans.parquet
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI routes
│       ├── config.py           # env-driven settings
│       ├── db.py                # ClickHouse client wrapper
│       ├── analytics.py        # one function per dashboard panel, real SQL
│       └── nl2sql.py           # NL -> SQL, with a hard SELECT-only validator
├── frontend/
│   ├── Dockerfile / nginx.conf
│   ├── package.json / vite.config.js / tailwind.config.js
│   └── src/
│       ├── App.jsx, api.js
│       ├── pages/Dashboard.jsx
│       └── components/
│           ├── KpiCard.jsx
│           ├── HourlyVolumeChart.jsx
│           ├── RobotUtilizationChart.jsx
│           ├── SpeedHistogram.jsx
│           ├── FleetHeatmap.jsx        # signature panel
│           ├── AnomalyPanel.jsx
│           └── NlQueryBox.jsx
└── docs/
    ├── FINDINGS.md              # the actual analysis writeup
    └── navigation-model.svg
```

## Local frontend dev (without Docker)

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173, talks to http://localhost:8000
```

## Notes on the API design

- Every panel's SQL lives in one place (`backend/app/analytics.py`) and is
  parameterized, not string-interpolated from user input — the only
  free-text-to-SQL path is the explicitly sandboxed NL-query endpoint.
- `/api/robots/anomalies?z=1.5` is the same z-score logic described in the
  findings doc, exposed as a tunable threshold rather than a hardcoded list, so
  you can tighten/loosen it without a redeploy.
- The heatmap endpoint takes a `grid` size (meters) so you can trade resolution
  for cell-count live from the dashboard.
