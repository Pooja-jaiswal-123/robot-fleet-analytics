#!/bin/bash
set -euo pipefail
clickhouse-client --query "
INSERT INTO warehouse.navigation_spans
  (span_id, trace_id, task_id, robot_id, leg_index, start_time,
   duration_s, start_x, start_y, end_x, end_y)
FORMAT Parquet" < /data/navigation_spans.parquet
echo "loaded navigation_spans"
