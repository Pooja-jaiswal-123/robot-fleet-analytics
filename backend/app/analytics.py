"""
Each function returns JSON-safe rows. Queries are deliberately written against the
materialized columns (speed_mps, hour_of_day, day_bucket) defined in 01-schema.sql,
so ClickHouse does the heavy lifting instead of pulling raw rows into Python.
"""

from .db import query_rows

TABLE = "warehouse.navigation_spans"


def fleet_kpis() -> dict:
    rows = query_rows(f"""
        SELECT
            count()                         AS span_count,
            uniqExact(trace_id)              AS task_count,
            uniqExact(robot_id)               AS robot_count,
            round(avg(speed_mps), 3)          AS avg_speed_mps,
            round(sum(distance_m) / 1000, 1)  AS total_distance_km,
            round(avg(duration_s), 1)         AS avg_span_duration_s,
            min(start_time)                   AS window_start,
            max(end_time)                     AS window_end
        FROM {TABLE}
    """)
    return rows[0] if rows else {}


def hourly_volume() -> list[dict]:
    """Spans per hour-of-day, averaged across days in the dataset -- shows the
    06:00-22:00 operating window and the two intraday demand spikes."""
    return query_rows(f"""
        SELECT
            hour_of_day                                  AS hour,
            count()                                       AS span_count,
            round(count() / uniqExact(day_bucket), 0)     AS avg_spans_per_day,
            round(avg(speed_mps), 3)                      AS avg_speed_mps
        FROM {TABLE}
        GROUP BY hour_of_day
        ORDER BY hour_of_day
    """)


def daily_volume() -> list[dict]:
    return query_rows(f"""
        SELECT
            day_bucket                AS day,
            count()                   AS span_count,
            uniqExact(trace_id)       AS task_count,
            uniqExact(robot_id)       AS active_robots
        FROM {TABLE}
        GROUP BY day_bucket
        ORDER BY day_bucket
    """)


def robot_utilization(limit: int = 200) -> list[dict]:
    """Span/distance/active-time totals per robot, sorted busiest-first. This is
    where the ~2.9x utilization spread across the fleet shows up."""
    return query_rows(f"""
        SELECT
            robot_id,
            count()                              AS span_count,
            uniqExact(trace_id)                  AS task_count,
            round(sum(distance_m) / 1000, 2)      AS distance_km,
            round(sum(duration_s) / 3600, 2)      AS active_hours,
            round(avg(speed_mps), 3)              AS avg_speed_mps
        FROM {TABLE}
        GROUP BY robot_id
        ORDER BY span_count DESC
        LIMIT {{limit:UInt32}}
    """, {"limit": limit})


def speed_histogram(bucket_size: float = 0.1) -> list[dict]:
    """Speed distribution in fixed-width buckets, used to flag the spans that
    fall outside the nominal 0.5-1.5 m/s spec."""
    return query_rows(f"""
        SELECT
            floor(speed_mps / {{bucket:Float32}}) * {{bucket:Float32}}  AS bucket_start,
            count()                                                    AS span_count
        FROM {TABLE}
        WHERE isFinite(speed_mps)
        GROUP BY bucket_start
        ORDER BY bucket_start
    """, {"bucket": bucket_size})


def speed_spec_violations() -> dict:
    rows = query_rows(f"""
        SELECT
            countIf(speed_mps > 1.5)                       AS over_spec_count,
            countIf(speed_mps < 0.5)                        AS under_spec_count,
            count()                                          AS total,
            round(countIf(speed_mps > 1.5) / count() * 100, 2)  AS over_spec_pct,
            round(countIf(speed_mps < 0.5) / count() * 100, 2)  AS under_spec_pct
        FROM {TABLE}
        WHERE isFinite(speed_mps)
    """)
    return rows[0] if rows else {}


def floor_heatmap(grid_size: int = 10) -> list[dict]:
    """Bins every span's midpoint into a grid_size x grid_size meter cell.
    Reveals that this fleet has no discrete pick/pack/charge stations --
    density is a smooth gradient toward the center of the floor."""
    return query_rows(f"""
        SELECT
            floor((start_x + end_x) / 2 / {{gs:UInt32}}) * {{gs:UInt32}}  AS cell_x,
            floor((start_y + end_y) / 2 / {{gs:UInt32}}) * {{gs:UInt32}}  AS cell_y,
            count()                                                       AS span_count
        FROM {TABLE}
        GROUP BY cell_x, cell_y
        ORDER BY cell_x, cell_y
    """, {"gs": grid_size})


def leg_distribution() -> list[dict]:
    """Task-length distribution (1-5 legs). Shows the ~80% leg-to-leg
    continuation rate baked into the generator."""
    return query_rows(f"""
        SELECT leg_index, count() AS span_count
        FROM {TABLE}
        GROUP BY leg_index
        ORDER BY leg_index
    """)


def robot_anomalies(z_threshold: float = 1.5) -> list[dict]:
    """Robots whose total span count deviates from the fleet mean by more
    than z_threshold standard deviations -- the under/over-utilized outliers."""
    return query_rows(f"""
        WITH per_robot AS (
            SELECT robot_id, count() AS span_count
            FROM {TABLE}
            GROUP BY robot_id
        ),
        stats AS (
            SELECT avg(span_count) AS mean_count, stddevPop(span_count) AS sd
            FROM per_robot
        )
        SELECT
            p.robot_id                                       AS robot_id,
            p.span_count                                      AS span_count,
            round(s.mean_count, 1)                            AS fleet_mean,
            round((p.span_count - s.mean_count) / s.sd, 2)    AS z_score
        FROM per_robot p, stats s
        WHERE abs((p.span_count - s.mean_count) / s.sd) > {{z:Float32}}
        ORDER BY z_score ASC
    """, {"z": z_threshold})
