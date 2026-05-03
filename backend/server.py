from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date as date_cls, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Helpers ----------
def parse_iso_date(s: str) -> date_cls:
    return datetime.fromisoformat(s).date()


def week_key_from_date(d: date_cls) -> str:
    iso_year, iso_week, _ = d.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def day_of_week(d: date_cls) -> int:
    # Monday=0, Sunday=6
    return d.weekday()


# ---------- Models ----------
class RideCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=80)
    km: float = Field(..., gt=0, le=1000)
    ride_date: str  # ISO date YYYY-MM-DD


class Ride(BaseModel):
    id: str
    title: str
    km: float
    ride_date: str
    week_key: str
    day_of_week: int
    created_at: str


class WeekSummary(BaseModel):
    week_key: str
    total_km: float
    ride_count: int


class Summary(BaseModel):
    all_time_km: float
    all_time_rides: int
    weeks: List[WeekSummary]
    current_week_key: str
    current_streak: int
    best_streak: int


WEEKLY_GOAL_KM = 100.0


def _shift_week_key(key: str, delta: int) -> str:
    iso_year, iso_week = int(key.split("-W")[0]), int(key.split("-W")[1])
    # Build Monday of given ISO week, then shift days
    jan4 = date_cls(iso_year, 1, 4)
    week1_monday = jan4 - timedelta(days=jan4.isocalendar()[2] - 1)
    monday = week1_monday + timedelta(weeks=iso_week - 1, days=delta * 7)
    return week_key_from_date(monday)


def _compute_streaks(week_totals: dict, current_key: str) -> tuple[int, int]:
    if not week_totals:
        return 0, 0
    # current streak — walk back from current_key, including current week only if >= goal
    current = 0
    k = current_key
    # If current week not at goal yet, start from previous week
    if week_totals.get(k, 0) < WEEKLY_GOAL_KM:
        k = _shift_week_key(k, -1)
    while week_totals.get(k, 0) >= WEEKLY_GOAL_KM:
        current += 1
        k = _shift_week_key(k, -1)

    # best streak — walk through sorted weeks chronologically
    sorted_keys = sorted(week_totals.keys())
    best = 0
    run = 0
    prev_key = None
    for k in sorted_keys:
        if week_totals[k] < WEEKLY_GOAL_KM:
            run = 0
            prev_key = k
            continue
        if prev_key is None or _shift_week_key(prev_key, 1) == k:
            run += 1
        else:
            run = 1
        best = max(best, run)
        prev_key = k
    return current, best


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Bike Tracker API"}


@api_router.post("/rides", response_model=Ride)
async def create_ride(payload: RideCreate):
    try:
        d = parse_iso_date(payload.ride_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ride_date, expected YYYY-MM-DD")

    ride = {
        "id": str(uuid.uuid4()),
        "title": payload.title.strip(),
        "km": float(payload.km),
        "ride_date": d.isoformat(),
        "week_key": week_key_from_date(d),
        "day_of_week": day_of_week(d),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.rides.insert_one(ride.copy())
    return Ride(**ride)


@api_router.get("/rides", response_model=List[Ride])
async def list_rides(week_key: Optional[str] = None):
    query = {}
    if week_key:
        query["week_key"] = week_key
    cursor = db.rides.find(query, {"_id": 0}).sort("ride_date", 1)
    rides = await cursor.to_list(1000)
    return [Ride(**r) for r in rides]


@api_router.delete("/rides/{ride_id}")
async def delete_ride(ride_id: str):
    res = await db.rides.delete_one({"id": ride_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ride not found")
    return {"deleted": True, "id": ride_id}


@api_router.get("/summary", response_model=Summary)
async def get_summary():
    pipeline = [
        {
            "$group": {
                "_id": "$week_key",
                "total_km": {"$sum": "$km"},
                "ride_count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    weeks_raw = await db.rides.aggregate(pipeline).to_list(1000)
    weeks = [
        WeekSummary(week_key=w["_id"], total_km=round(w["total_km"], 2), ride_count=w["ride_count"])
        for w in weeks_raw
    ]
    all_time_km = round(sum(w.total_km for w in weeks), 2)
    all_time_rides = sum(w.ride_count for w in weeks)
    today = datetime.now(timezone.utc).date()
    current_key = week_key_from_date(today)
    week_totals = {w.week_key: w.total_km for w in weeks}
    current_streak, best_streak = _compute_streaks(week_totals, current_key)
    return Summary(
        all_time_km=all_time_km,
        all_time_rides=all_time_rides,
        weeks=weeks,
        current_week_key=current_key,
        current_streak=current_streak,
        best_streak=best_streak,
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
