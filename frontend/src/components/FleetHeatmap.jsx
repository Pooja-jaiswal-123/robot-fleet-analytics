export default function FleetHeatmap({ data, gridSize = 10 }) {
  const maxCount = Math.max(...data.map((d) => d.span_count), 1);
  const floorW = 200;
  const floorH = 120;

  return (
    <div className="panel p-5 h-full flex flex-col min-h-0">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-data text-sm uppercase tracking-widest text-muted">
          Floor density &middot; 200m &times; 120m
        </h3>
        <span className="text-xs text-muted font-data">
          no discrete stations &mdash; density gradient toward center
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
        <svg
          viewBox={`0 0 ${floorW} ${floorH}`}
          className="w-full h-full max-h-full max-w-full"
          style={{ maxHeight: "100%", maxWidth: "100%" }}
        >
          <defs>
            <pattern
              id="grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="#1A2026"
                strokeWidth="0.3"
              />
            </pattern>
          </defs>
          <rect width={floorW} height={floorH} fill="url(#grid)" />
          <rect
            width={floorW}
            height={floorH}
            fill="none"
            stroke="#232A31"
            strokeWidth="0.6"
          />

          {data.map((cell, i) => {
            const intensity = cell.span_count / maxCount;
            return (
              <rect
                key={i}
                x={cell.cell_x}
                y={cell.cell_y}
                width={gridSize}
                height={gridSize}
                fill="#FF8A3D"
                opacity={intensity * 0.85}
              />
            );
          })}

          {data.map((cell, i) => {
            const intensity = cell.span_count / maxCount;
            if (intensity < 0.85) return null;
            return (
              <rect
                key={`glow-${i}`}
                x={cell.cell_x}
                y={cell.cell_y}
                width={gridSize}
                height={gridSize}
                fill="none"
                stroke="#FFC79A"
                strokeWidth="0.4"
                opacity={0.6}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
