export default function AnomalyPanel({ anomalies }) {
  return (
    <div className="panel p-5 h-full flex flex-col overflow-hidden">
      <h3 className="font-data text-sm uppercase tracking-widest text-muted mb-3">
        Utilization outliers &middot; |z| &gt; 1.5
      </h3>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {anomalies.length === 0 && (
          <p className="text-sm text-muted">No outliers at this threshold.</p>
        )}
        {anomalies.map((a) => {
          const over = a.z_score > 0;
          return (
            <div
              key={a.robot_id}
              className="flex items-center justify-between text-xs font-data border-b border-hairline pb-1.5"
            >
              <span className="text-ink">{a.robot_id}</span>
              <span className="text-muted">{a.span_count} spans</span>
              <span className={over ? "text-cyan" : "text-danger"}>
                {over ? "+" : ""}
                {a.z_score}&sigma;
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
