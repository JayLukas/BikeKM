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
