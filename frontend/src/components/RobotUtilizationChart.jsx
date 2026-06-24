import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

export default function RobotUtilizationChart({ data }) {
  const sorted = [...data].sort((a, b) => b.span_count - a.span_count);
  const mean =
    sorted.reduce((s, r) => s + r.span_count, 0) / Math.max(sorted.length, 1);

  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-data text-sm uppercase tracking-widest text-muted">
          Robot utilization &middot; spans driven
        </h3>
        <span className="text-xs text-danger font-data">
          {sorted.length ? `range ${sorted[sorted.length - 1].span_count}–${sorted[0].span_count}` : ""}
        </span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <XAxis dataKey="robot_id" tick={false} stroke="#232A31" />
          <YAxis stroke="#8B959E" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
          <ReferenceLine y={mean} stroke="#4FD1C5" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{
              background: "#0B0E11",
              border: "1px solid #232A31",
              fontFamily: "IBM Plex Mono",
              fontSize: 12,
            }}
            formatter={(v, n) => [v, n === "span_count" ? "spans" : n]}
            labelFormatter={(id) => id}
          />
          <Bar dataKey="span_count" radius={[1, 1, 0, 0]}>
            {sorted.map((r, i) => {
              const z = Math.abs(r.span_count - mean) / (mean * 0.25);
              const color = z > 1 ? "#FF5470" : i % 2 === 0 ? "#FF8A3D" : "#E89060";
              return <Cell key={i} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
