export default function KpiCard({ label, value, unit, accent = "amber" }) {
  const accentClass = accent === "cyan" ? "text-cyan" : "text-amber";
  return (
    <div className="panel px-5 py-4 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-widest text-muted font-data">
        {label}
      </span>
      <span className={`text-2xl font-semibold font-data ${accentClass}`}>
        {value}
        {unit && <span className="text-sm text-muted ml-1">{unit}</span>}
      </span>
    </div>
  );
}
