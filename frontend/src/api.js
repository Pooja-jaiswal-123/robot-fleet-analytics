const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `${path} failed: ${res.status}`);
  return data;
}

export const api = {
  kpis: () => get("/api/kpis"),
  hourlyVolume: () => get("/api/volume/hourly"),
  dailyVolume: () => get("/api/volume/daily"),
  robotUtilization: (limit = 200) => get(`/api/robots/utilization?limit=${limit}`),
  robotAnomalies: (z = 1.5) => get(`/api/robots/anomalies?z=${z}`),
  speedHistogram: (bucket = 0.1) => get(`/api/speed/histogram?bucket=${bucket}`),
  speedViolations: () => get("/api/speed/violations"),
  heatmap: (grid = 10) => get(`/api/heatmap?grid=${grid}`),
  legDistribution: () => get("/api/tasks/leg-distribution"),
  nlQuery: (question) => post("/api/nl-query", { question }),
};
