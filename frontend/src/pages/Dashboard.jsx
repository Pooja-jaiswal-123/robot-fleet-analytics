import { useEffect, useState } from "react";
import { api } from "../api";
import KpiCard from "../components/KpiCard";
import HourlyVolumeChart from "../components/HourlyVolumeChart";
import RobotUtilizationChart from "../components/RobotUtilizationChart";
import SpeedHistogram from "../components/SpeedHistogram";
import FleetHeatmap from "../components/FleetHeatmap";
import AnomalyPanel from "../components/AnomalyPanel";
import NlQueryBox from "../components/NlQueryBox";

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [robots, setRobots] = useState([]);
  const [speedHist, setSpeedHist] = useState([]);
  const [speedViol, setSpeedViol] = useState(null);
  const [heat, setHeat] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([
      api.kpis(),
      api.hourlyVolume(),
      api.robotUtilization(),
      api.speedHistogram(0.1),
      api.speedViolations(),
      api.heatmap(10),
      api.robotAnomalies(1.5),
    ])
      .then(([k, h, r, sh, sv, hm, an]) => {
        setKpis(k);
        setHourly(h);
        setRobots(r);
        setSpeedHist(sh);
        setSpeedViol(sv);
        setHeat(hm);
        setAnomalies(an);
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <div className="p-8 text-danger font-data text-sm">
        Couldn&apos;t reach the analytics API: {err}
        <br />
        Check that the backend container is running and VITE_API_URL is correct.
      </div>
    );
  }

  if (!kpis) {
    return <div className="p-8 text-muted font-data text-sm">Loading fleet telemetry...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KpiCard label="Spans" value={kpis.span_count?.toLocaleString()} />
        <KpiCard label="Tasks" value={kpis.task_count?.toLocaleString()} accent="cyan" />
        <KpiCard label="Active robots" value={kpis.robot_count} />
        <KpiCard label="Avg speed" value={kpis.avg_speed_mps} unit="m/s" accent="cyan" />
        <KpiCard label="Distance covered" value={kpis.total_distance_km} unit="km" />
        <KpiCard label="Avg span time" value={kpis.avg_span_duration_s} unit="s" accent="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-80">
        <div className="lg:col-span-2">
          <HourlyVolumeChart data={hourly} />
        </div>
        <AnomalyPanel anomalies={anomalies} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-96">
        <FleetHeatmap data={heat} gridSize={10} />
        <RobotUtilizationChart data={robots} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-5 h-72">
        <SpeedHistogram data={speedHist} violations={speedViol} />
      </div>

      <NlQueryBox />
    </div>
  );
}
