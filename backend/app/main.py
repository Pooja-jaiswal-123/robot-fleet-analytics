from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import analytics
from .config import settings
from .nl2sql import NlQueryError, ask as nl2sql_ask

app = FastAPI(title="Fleet Navigation Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/kpis")
def kpis():
    return analytics.fleet_kpis()


@app.get("/api/volume/hourly")
def volume_hourly():
    return analytics.hourly_volume()


@app.get("/api/volume/daily")
def volume_daily():
    return analytics.daily_volume()


@app.get("/api/robots/utilization")
def robots_utilization(limit: int = Query(200, ge=1, le=200)):
    return analytics.robot_utilization(limit=limit)


@app.get("/api/robots/anomalies")
def robots_anomalies(z: float = Query(1.5, ge=0.5, le=4.0)):
    return analytics.robot_anomalies(z_threshold=z)


@app.get("/api/speed/histogram")
def speed_histogram(bucket: float = Query(0.1, ge=0.01, le=1.0)):
    return analytics.speed_histogram(bucket_size=bucket)


@app.get("/api/speed/violations")
def speed_violations():
    return analytics.speed_spec_violations()


@app.get("/api/heatmap")
def heatmap(grid: int = Query(10, ge=2, le=50)):
    return analytics.floor_heatmap(grid_size=grid)


@app.get("/api/tasks/leg-distribution")
def leg_distribution():
    return analytics.leg_distribution()


class NlQueryRequest(BaseModel):
    question: str


@app.post("/api/nl-query")
def nl_query(req: NlQueryRequest):
    try:
        return nl2sql_ask(req.question)
    except NlQueryError as e:
        raise HTTPException(status_code=400, detail=str(e))
