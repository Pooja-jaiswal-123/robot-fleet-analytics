import Dashboard from "./pages/Dashboard";

export default function App() {
  const now = new Date();
  return (
    <div className="min-h-screen bg-graphite">
      <header className="border-b border-hairline px-6 py-4 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span className="font-data text-lg font-semibold text-amber tracking-wide">
            FLEET&#8209;OPS
          </span>
          <span className="font-data text-xs text-muted uppercase tracking-widest">
            Navigation Analytics &middot; 200 units
          </span>
        </div>
        <div className="flex items-center gap-2 font-data text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-cyan inline-block" />
          live &middot; {now.toLocaleDateString()}
        </div>
      </header>
      <Dashboard />
    </div>
  );
}
