import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

export default function HourlyVolumeChart({ data }) {
  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-data text-sm uppercase tracking-widest text-muted">
          Spans by hour-of-day
        </h3>
        <span className="text-xs text-amber font-data">
          shift window 06:00&ndash;22:00 &middot; spikes @10:00 / @15:00
        </span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF8A3D" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#FF8A3D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#232A31" vertical={false} />
          <XAxis
            dataKey="hour"
            stroke="#8B959E"
            tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
            tickFormatter={(h) => `${String(h).padStart(2, "0")}:00`}
          />
          <YAxis stroke="#8B959E" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
          <ReferenceArea x1={9.5} x2={10.5} fill="#4FD1C5" fillOpacity={0.12} />
          <ReferenceArea x1={14.5} x2={15.5} fill="#4FD1C5" fillOpacity={0.12} />
          <Tooltip
            contentStyle={{
              background: "#0B0E11",
              border: "1px solid #232A31",
              fontFamily: "IBM Plex Mono",
              fontSize: 12,
            }}
            labelFormatter={(h) => `${String(h).padStart(2, "0")}:00`}
          />
          <Area
            type="monotone"
            dataKey="avg_spans_per_day"
            stroke="#FF8A3D"
            strokeWidth={2}
            fill="url(#volFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
