import os
import requests
import pytest
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://distance-log-12.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    # cleanup TEST_ rides
    try:
        rides = s.get(f"{API}/rides").json()
        for r in rides:
            if isinstance(r, dict) and r.get("title", "").startswith("TEST_"):
                s.delete(f"{API}/rides/{r['id']}")
    except Exception:
        pass


def iso_today():
    return datetime.now(timezone.utc).date().isoformat()


def test_root(client):
    r = client.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_create_ride_and_get(client):
    payload = {"title": "TEST_workride", "km": 12.5, "ride_date": iso_today()}
    r = client.post(f"{API}/rides", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["title"] == "TEST_workride"
    assert data["km"] == 12.5
    assert "id" in data and "week_key" in data and "day_of_week" in data
    assert data["week_key"].startswith(str(datetime.now(timezone.utc).year)) or "W" in data["week_key"]
    rid = data["id"]
    wk = data["week_key"]

    # GET filter by week
    r2 = client.get(f"{API}/rides", params={"week_key": wk})
    assert r2.status_code == 200
    ids = [x["id"] for x in r2.json()]
    assert rid in ids
    for x in r2.json():
        assert x["week_key"] == wk

    # GET all
    r3 = client.get(f"{API}/rides")
    assert r3.status_code == 200
    assert any(x["id"] == rid for x in r3.json())


def test_validation_km_zero(client):
    r = client.post(f"{API}/rides", json={"title": "TEST_bad", "km": 0, "ride_date": iso_today()})
    assert r.status_code == 422


def test_validation_km_negative(client):
    r = client.post(f"{API}/rides", json={"title": "TEST_bad", "km": -5, "ride_date": iso_today()})
    assert r.status_code == 422


def test_validation_bad_date(client):
    r = client.post(f"{API}/rides", json={"title": "TEST_bad", "km": 5, "ride_date": "not-a-date"})
    assert r.status_code == 400


def test_summary(client):
    # ensure at least one ride
    client.post(f"{API}/rides", json={"title": "TEST_summary", "km": 7.5, "ride_date": iso_today()})
    r = client.get(f"{API}/summary")
    assert r.status_code == 200
    data = r.json()
    assert "all_time_km" in data
    assert "all_time_rides" in data
    assert "weeks" in data and isinstance(data["weeks"], list)
    assert "current_week_key" in data
    assert data["all_time_km"] >= 7.5
    assert data["all_time_rides"] >= 1


def test_delete_ride(client):
    r = client.post(f"{API}/rides", json={"title": "TEST_del", "km": 3, "ride_date": iso_today()})
    rid = r.json()["id"]
    d = client.delete(f"{API}/rides/{rid}")
    assert d.status_code == 200
    assert d.json().get("deleted") is True

    # 404 on second delete
    d2 = client.delete(f"{API}/rides/{rid}")
    assert d2.status_code == 404


def test_delete_nonexistent(client):
    r = client.delete(f"{API}/rides/nonexistent-id-xyz")
    assert r.status_code == 404


# ---- Streak tests ----
from datetime import date, timedelta


def _monday_of_iso_week(year, week):
    jan4 = date(year, 1, 4)
    week1_mon = jan4 - timedelta(days=jan4.isocalendar()[2] - 1)
    return week1_mon + timedelta(weeks=week - 1)


def _current_iso():
    today = datetime.now(timezone.utc).date()
    y, w, _ = today.isocalendar()
    return y, w


def _seed_week(client, year, week, km, title):
    mon = _monday_of_iso_week(year, week)
    r = client.post(f"{API}/rides", json={"title": title, "km": km, "ride_date": mon.isoformat()})
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _cleanup_test_rides(client):
    rides = client.get(f"{API}/rides").json()
    for r in rides:
        if isinstance(r, dict) and r.get("title", "").startswith("TEST_STREAK"):
            client.delete(f"{API}/rides/{r['id']}")


def test_summary_has_streak_fields(client):
    r = client.get(f"{API}/summary")
    assert r.status_code == 200
    data = r.json()
    assert "current_streak" in data
    assert "best_streak" in data
    assert isinstance(data["current_streak"], int)
    assert isinstance(data["best_streak"], int)
    assert data["current_streak"] >= 0
    assert data["best_streak"] >= 0


def test_streak_walk_back_skips_incomplete_current(client):
    """When current week < goal, walk back; if 3 prev weeks >=100, current_streak==3."""
    _cleanup_test_rides(client)
    # delete other test rides for clean baseline
    rides = client.get(f"{API}/rides").json()
    pre_existing_ids = [r["id"] for r in rides]
    y, w = _current_iso()
    # Seed prev 3 weeks with 100 each, current week with 0 (no rides)
    ids = []
    for offset in [1, 2, 3]:
        py, pw = (y, w - offset) if w - offset >= 1 else (y - 1, 52 + (w - offset))
        # Better: compute via Monday-shift
        cur_mon = _monday_of_iso_week(y, w)
        prev_mon = cur_mon - timedelta(weeks=offset)
        py2, pw2, _ = prev_mon.isocalendar()
        ids.append(_seed_week(client, py2, pw2, 100.0, f"TEST_STREAK_w{offset}"))
    try:
        data = client.get(f"{API}/summary").json()
        # current_streak should be >= 3 (walk-back). Could be more if user already had history
        assert data["current_streak"] >= 3, f"expected >=3, got {data['current_streak']}"
        assert data["best_streak"] >= 3
    finally:
        for rid in ids:
            client.delete(f"{API}/rides/{rid}")


def test_streak_gap_breaks(client):
    """3 weeks at goal, then gap week (no rides), current week empty → current_streak=0 from walk-back past gap."""
    _cleanup_test_rides(client)
    y, w = _current_iso()
    cur_mon = _monday_of_iso_week(y, w)
    # gap = 1 week ago (no rides), goal = 2,3,4 weeks ago
    ids = []
    # baseline: get current streak before
    baseline = client.get(f"{API}/summary").json()["current_streak"]
    for offset in [2, 3, 4]:
        prev_mon = cur_mon - timedelta(weeks=offset)
        py2, pw2, _ = prev_mon.isocalendar()
        ids.append(_seed_week(client, py2, pw2, 100.0, f"TEST_STREAK_gap{offset}"))
    try:
        data = client.get(f"{API}/summary").json()
        # Walk-back: current<100 → go to w-1 (no rides=0<100) → streak=0 from walk-back
        # But if baseline had already-existing rides in w-1, this could differ. Assert <= baseline + 0 logic:
        # The key: gap at w-1 must break the chain to those 3 weeks
        assert data["current_streak"] == 0 or data["current_streak"] == baseline, (
            f"gap should break streak; got {data['current_streak']} (baseline {baseline})"
        )
        # best_streak should still reflect the 3 consecutive
        assert data["best_streak"] >= 3
    finally:
        for rid in ids:
            client.delete(f"{API}/rides/{rid}")


def test_streak_under_goal_does_not_count(client):
    """Week with <100 km should not count toward streak."""
    _cleanup_test_rides(client)
    y, w = _current_iso()
    cur_mon = _monday_of_iso_week(y, w)
    prev_mon = cur_mon - timedelta(weeks=1)
    py, pw, _ = prev_mon.isocalendar()
    rid = _seed_week(client, py, pw, 50.0, "TEST_STREAK_under")
    try:
        data = client.get(f"{API}/summary").json()
        # 50km prev week shouldn't add to streak walk-back
        # current_streak from walk-back to 50 → 0
        assert data["current_streak"] == 0
    finally:
        client.delete(f"{API}/rides/{rid}")
