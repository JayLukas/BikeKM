# KM Ledger — Bike Kilometer Tracker

## Original Problem Statement
> I need a basic app that let's me tally up total ridden kilometers on my bike. I want to add km per day of the week, and be able to give them a title. Like 'workride' or 'weilanden', whatever. And then make it fill up a progress bar for a total of 100km per week, and then a counter that keeps the total complete km ridden.

## User Choices Captured
- Persistent DB storage (MongoDB)
- Fixed weekly goal: 100 km
- Browse/click back through previous week numbers
- Single user (no auth)
- Design: Sporty/athletic + minimal/clean blend

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB). Single collection `rides`.
- **Frontend**: React + Tailwind + Shadcn (sonner). ISO-8601 week math client-side and server-side.
- **Theme**: "Performance Pro" — Obsidian #09090B / Volt #CCFF00 / Oswald display + Inter body.

## Data Model — `rides`
| field | type | notes |
|---|---|---|
| id | uuid string | primary key |
| title | string | e.g. "workride" |
| km | float | > 0 |
| ride_date | string | ISO date YYYY-MM-DD |
| week_key | string | YYYY-Www (ISO) |
| day_of_week | int | 0=Mon … 6=Sun |
| created_at | string | ISO datetime UTC |

## API
- `POST /api/rides` — create
- `GET /api/rides?week_key=YYYY-Www` — list (filter optional)
- `DELETE /api/rides/{id}` — remove
- `GET /api/summary` — all-time km + per-week totals + current_week_key

## What's Implemented (2026-05-03)
- Full CRUD for rides with ISO-week derivation server-side.
- Dashboard with bento layout: weekly hero (huge typographic km counter + thick neon progress bar), all-time card with cyclist background, add-ride form, archive list of recent weeks, ride table with delete.
- Week navigator: prev/next chevrons + "Today" jump + clickable archive list.
- Per-day micro-bars under weekly progress.
- Progress bar caps at 100% width; stripes pattern + over-goal counter when exceeded.
- Sonner toasts for feedback.
- Tested 100% backend + 100% frontend (iteration_1).

## Personas
- Solo cyclist tracking weekly mileage discipline.

## Backlog
- **P1**: Edit ride (currently delete-only).
- **P1**: Adjustable weekly goal setting.
- **P2**: Charts (km per day / per week) using recharts.
- **P2**: Export CSV / Strava import.
- **P2**: Streaks ("X consecutive weeks at goal").
- **P3**: PWA / offline mode.
