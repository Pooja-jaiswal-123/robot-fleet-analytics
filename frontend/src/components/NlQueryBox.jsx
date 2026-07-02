import { useState, useRef, useEffect } from "react";
import { api } from "../api";

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-cyan inline-block"
          style={{
            animation: "fleetpulse 1.1s infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </span>
  );
}

function ResultTable({ rows }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="overflow-x-auto mt-2 rounded border border-hairline">
      <table className="w-full text-[11px] font-data">
        <thead>
          <tr className="text-muted border-b border-hairline bg-graphite">
            {Object.keys(rows[0]).map((k) => (
              <th key={k} className="text-left py-1.5 px-3 uppercase">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 25).map((row, i) => (
            <tr key={i} className="border-b border-hairline/40">
              {Object.values(row).map((v, j) => (
                <td key={j} className="py-1.5 px-3 text-ink">
                  {String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 25 && (
        <div className="text-[10px] text-muted px-3 py-1 bg-graphite">
          showing 25 of {rows.length} rows
        </div>
      )}
    </div>
  );
}

function AssistantBubble({ msg }) {
  const [showSql, setShowSql] = useState(false);
  return (
    <div className="flex gap-2.5 max-w-[85%]">
      <div className="w-6 h-6 rounded-full bg-amber/20 border border-amber flex items-center justify-center text-amber text-[10px] font-data font-bold shrink-0 mt-0.5">
        FB
      </div>
      <div className="bg-panel border border-hairline rounded-lg rounded-tl-none px-3.5 py-2.5 text-sm text-ink leading-relaxed">
        {msg.loading ? (
          <TypingDots />
        ) : (
          <>
            {/* ✅ Answer HAMESHA show hoga */}
            <p className={msg.isError ? "text-amber" : "text-ink"}>
              {msg.content}
            </p>
            {/* SQL sirf tab dikhega jab ho */}
            {msg.sql && (
              <>
                <button
                  onClick={() => setShowSql((s) => !s)}
                  className="mt-2 text-[10px] uppercase tracking-wide text-cyan hover:text-ink font-data flex items-center gap-1"
                >
                  {showSql ? "hide query" : "view query"}
                  <span>{showSql ? "▲" : "▼"}</span>
                </button>
                {showSql && (
                  <pre className="mt-1.5 text-[11px] font-data text-cyan bg-graphite border border-hairline rounded p-2.5 overflow-x-auto whitespace-pre-wrap">
                    {msg.sql}
                  </pre>
                )}
                <ResultTable rows={msg.rows} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UserBubble({ msg }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-amber/15 border border-amber/40 rounded-lg rounded-tr-none px-3.5 py-2.5 text-sm text-ink font-data">
        {msg.content}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "which robot covers the most distance?",
  "how many tasks happen between 10am and 11am?",
  "what's the average speed across the fleet?",
];

export default function NlQueryBox() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async (text) => {
    const q = (text ?? question).trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: "user", content: q }]);
    setQuestion("");
    setLoading(true);
    setMessages((m) => [...m, { role: "assistant", loading: true }]);

    try {
      const res = await api.nlQuery(q);
      const assistantContent =
        res?.answer?.trim() ||
        "I didn't receive a response from the assistant. Try asking about robot speed, distance, or tasks.";
      setMessages((m) => [
        ...m.slice(0, -1),
        {
          role: "assistant",
          content: assistantContent,
          sql: res?.sql,
          rows: res?.rows ?? [],
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: "assistant", content: e.message, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel p-5 flex flex-col">
      <style>{`@keyframes fleetpulse {0%,80%,100%{opacity:.25;transform:translateY(0)} 40%{opacity:1;transform:translateY(-2px)}}`}</style>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-data text-sm uppercase tracking-widest text-muted">
          Ask the fleet &middot; chat with your data
        </h3>
        <span className="flex items-center gap-1.5 text-[10px] font-data text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan" /> FleetBot online
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1 mb-3"
        style={{ minHeight: messages.length ? "120px" : "0px" }}
      >
        {messages.length === 0 && (
          <div className="text-sm text-muted">
            Ask me anything about the fleet &mdash; robots, spans, tasks, speed,
            distance, or time.
            <div className="flex flex-wrap gap-2 mt-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] font-data px-2.5 py-1.5 border border-hairline rounded text-cyan hover:border-cyan transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <UserBubble key={i} msg={m} />
          ) : (
            <AssistantBubble key={i} msg={m} />
          ),
        )}
      </div>

      <div className="flex gap-2 items-center font-data text-sm border-t border-hairline pt-3">
        <span className="text-amber">$</span>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="e.g. which robot covers the most distance on average per task?"
          className="flex-1 bg-transparent outline-none py-1.5 text-ink placeholder:text-muted"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !question.trim()}
          className="px-3 py-1.5 border border-amber text-amber text-xs uppercase tracking-wide hover:bg-amber hover:text-graphite transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-amber"
        >
          {loading ? "..." : "send"}
        </button>
      </div>
    </div>
  );
}
