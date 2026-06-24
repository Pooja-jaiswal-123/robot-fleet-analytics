import { useState } from "react";
import { api } from "../api";

export default function NlQueryBox() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.nlQuery(question);
      setResult(res);
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel p-5">
      <h3 className="font-data text-sm uppercase tracking-widest text-muted mb-3">
        Ask the fleet &middot; natural language &rarr; SQL
      </h3>
      <div className="flex gap-2 items-center font-data text-sm">
        <span className="text-amber">$</span>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="e.g. which robot covers the most distance on average per task?"
          className="flex-1 bg-transparent border-b border-hairline focus:border-cyan outline-none py-1.5 text-ink placeholder:text-muted"
        />
        <button
          onClick={run}
          disabled={loading}
          className="px-3 py-1.5 border border-amber text-amber text-xs uppercase tracking-wide hover:bg-amber hover:text-graphite transition-colors disabled:opacity-40"
        >
          {loading ? "running..." : "run"}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-danger font-data">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3">
          <pre className="text-xs font-data text-cyan bg-graphite border border-hairline p-3 overflow-x-auto whitespace-pre-wrap">
            {result.sql}
          </pre>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-data">
              <thead>
                <tr className="text-muted border-b border-hairline">
                  {result.rows[0] &&
                    Object.keys(result.rows[0]).map((k) => (
                      <th key={k} className="text-left py-1 pr-4 uppercase">
                        {k}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 25).map((row, i) => (
                  <tr key={i} className="border-b border-hairline/40">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="py-1 pr-4 text-ink">
                        {String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
