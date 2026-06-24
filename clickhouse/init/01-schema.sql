CREATE DATABASE IF NOT EXISTS warehouse;

CREATE TABLE IF NOT EXISTS warehouse.navigation_spans
(
    span_id     UUID DEFAULT generateUUIDv4(),
    trace_id    UUID,
    task_id     UInt64,
    robot_id    LowCardinality(String),
    leg_index   UInt8,
    start_time  DateTime64(3),
    duration_s  Float32,
    start_x     Float32,
    start_y     Float32,
    end_x       Float32,
    end_y       Float32,
    distance_m  Float32 MATERIALIZED sqrt(pow(end_x - start_x, 2) + pow(end_y - start_y, 2)),
    end_time    DateTime64(3) MATERIALIZED start_time + toIntervalMillisecond(toUInt32(duration_s * 1000)),
    -- analytics-friendly derived columns, computed once at insert/merge time
    speed_mps   Float32 MATERIALIZED sqrt(pow(end_x - start_x, 2) + pow(end_y - start_y, 2)) / duration_s,
    hour_of_day UInt8   MATERIALIZED toHour(start_time),
    day_bucket  Date    MATERIALIZED toDate(start_time)
)
ENGINE = MergeTree
PARTITION BY toYYYYMMDD(start_time)
ORDER BY (robot_id, start_time);

CREATE USER IF NOT EXISTS intern IDENTIFIED WITH plaintext_password BY 'intern';
GRANT SELECT ON warehouse.* TO intern;

-- service account used by the analytics API: SELECT only, never writes
CREATE USER IF NOT EXISTS analytics_api IDENTIFIED WITH plaintext_password BY 'analytics_api_ro';
GRANT SELECT ON warehouse.* TO analytics_api;
