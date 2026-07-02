import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Cell,
} from "recharts";

export default function SpeedHistogram({ data, violations }) {
  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-data text-sm uppercase tracking-widest text-muted">
          Speed distribution (m/s)
        </h3>
        {violations && (
          <span className="text-xs text-danger font-data">
            {violations.over_spec_pct}% over spec &middot;{" "}
            {violations.under_spec_pct}% under spec
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
        >
          <XAxis
            dataKey="bucket_start"
            stroke="#8B959E"
            tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <YAxis
            stroke="#8B959E"
            tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
          />
          <ReferenceArea x1={0.5} x2={1.5} fill="#4FD1C5" fillOpacity={0.08} />
          <Tooltip
            contentStyle={{
              background: "#0B0E11",
              border: "1px solid #232A31",
              fontFamily: "IBM Plex Mono",
              fontSize: 12,
            }}
            labelFormatter={(v) => `${Number(v).toFixed(2)} m/s`}
          />
          <Bar dataKey="span_count" radius={[1, 1, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.bucket_start < 0.5 || d.bucket_start >= 1.5
                    ? "#FF5470"
                    : "#FF8A3D"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
