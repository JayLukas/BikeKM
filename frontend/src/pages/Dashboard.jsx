import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Trash2, Bike } from "lucide-react";
import {
  DAYS,
  weekKey,
  shiftWeekKey,
  weekLabel,
  todayWeekKey,
  dayOfWeekDateForKey,
  fmtIsoDate,
} from "@/lib/week";
import AddRideForm from "@/components/AddRideForm";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WEEKLY_GOAL = 100;

export default function Dashboard() {
  const [currentKey, setCurrentKey] = useState(todayWeekKey());
  const [rides, setRides] = useState([]);
  const [summary, setSummary] = useState({
    all_time_km: 0,
    all_time_rides: 0,
    weeks: [],
    current_week_key: todayWeekKey(),
  });
  const [loading, setLoading] = useState(false);

  const fetchRides = useCallback(async (key) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/rides`, {
        params: { week_key: key },
      });
      setRides(data);
    } catch (e) {
      toast.error("Failed to load rides");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/summary`);
      setSummary(data);
    } catch (e) {
      toast.error("Failed to load totals");
    }
  }, []);

  useEffect(() => {
    fetchRides(currentKey);
  }, [currentKey, fetchRides]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const weekTotal = useMemo(
    () => rides.reduce((acc, r) => acc + r.km, 0),
    [rides]
  );

  const progressPct = Math.min(100, (weekTotal / WEEKLY_GOAL) * 100);
  const overGoal = weekTotal > WEEKLY_GOAL;
  const { year, week } = weekLabel(currentKey);
  const isCurrentWeek = currentKey === summary.current_week_key;

  const ridesByDay = useMemo(() => {
    const m = {};
    DAYS.forEach((d) => (m[d.idx] = []));
    rides.forEach((r) => {
      if (m[r.day_of_week]) m[r.day_of_week].push(r);
    });
    return m;
  }, [rides]);

  const handleAdd = async ({ title, km, dayIdx }) => {
    try {
      const date = dayOfWeekDateForKey(currentKey, dayIdx);
      const ride_date = fmtIsoDate(date);
      await axios.post(`${API}/rides`, {
        title,
        km: parseFloat(km),
        ride_date,
      });
      toast.success(`Logged ${km} km · ${title.toUpperCase()}`);
      await Promise.all([fetchRides(currentKey), fetchSummary()]);
    } catch (e) {
      toast.error("Could not save ride");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/rides/${id}`);
      toast("Ride removed", { description: "Tally updated." });
      await Promise.all([fetchRides(currentKey), fetchSummary()]);
    } catch (e) {
      toast.error("Could not delete ride");
    }
  };

  const goPrev = () => setCurrentKey((k) => shiftWeekKey(k, -1));
  const goNext = () => setCurrentKey((k) => shiftWeekKey(k, 1));
  const goToday = () => setCurrentKey(todayWeekKey());

  // visible weeks list for sidebar history (latest first)
  const recentWeeks = useMemo(
    () => [...summary.weeks].reverse().slice(0, 8),
    [summary.weeks]
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3" data-testid="app-logo">
            <div className="w-9 h-9 bg-[#CCFF00] flex items-center justify-center">
              <Bike className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-black text-lg tracking-tight uppercase leading-none">
                KM Ledger
              </div>
              <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase mt-1">
                Bike · Tracker · 01
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={goToday}
              data-testid="goto-today-btn"
              className="hidden sm:inline-flex font-mono text-xs uppercase tracking-widest px-4 py-2 border border-zinc-800 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
            >
              · Today
            </button>
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
              GOAL · {WEEKLY_GOAL} KM/WK
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Week Navigator */}
        <div
          className="flex items-center justify-between mb-8 fade-up"
          data-testid="week-navigator"
        >
          <button
            onClick={goPrev}
            data-testid="prev-week-btn"
            className="group p-3 hover:bg-[#18181B] border border-zinc-800 hover:border-[#CCFF00] transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-400 group-hover:text-[#CCFF00]" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
              {isCurrentWeek ? "This Week" : "Archive"}
            </div>
            <div
              className="font-display font-black text-2xl sm:text-3xl tracking-tight uppercase leading-none mt-1"
              data-testid="week-label"
            >
              Week {String(week).padStart(2, "0")}
              <span className="text-zinc-500"> · </span>
              <span className="text-zinc-500">{year}</span>
            </div>
          </div>

          <button
            onClick={goNext}
            data-testid="next-week-btn"
            className="group p-3 hover:bg-[#18181B] border border-zinc-800 hover:border-[#CCFF00] transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-[#CCFF00]" />
          </button>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          {/* Hero: weekly progress */}
          <section
            className="col-span-12 lg:col-span-8 bg-[#121214] border border-zinc-800 p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between min-h-[420px] fade-up delay-1"
            data-testid="weekly-progress-card"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
                  Weekly Distance
                </div>
                <div className="font-mono text-xs text-zinc-500 mt-2">
                  {currentKey}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
                  Goal
                </div>
                <div className="font-display text-xl font-bold mt-1">
                  {WEEKLY_GOAL}
                  <span className="text-zinc-600 text-sm ml-1">KM</span>
                </div>
              </div>
            </div>

            <div className="my-6">
              <div className="flex items-baseline gap-3 leading-none">
                <span
                  className="font-display font-black tracking-tighter text-[18vw] sm:text-[14vw] lg:text-[10rem] leading-[0.85]"
                  data-testid="week-total-km"
                >
                  {weekTotal.toFixed(1)}
                </span>
                <span className="font-display text-3xl sm:text-4xl text-zinc-600">
                  / {WEEKLY_GOAL} km
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs uppercase tracking-widest font-bold">
                <span
                  className={overGoal ? "text-[#CCFF00]" : "text-zinc-400"}
                >
                  {progressPct.toFixed(0)}%
                </span>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-500">
                  {rides.length} {rides.length === 1 ? "Ride" : "Rides"}
                </span>
                {overGoal && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span className="text-[#CCFF00]">
                      +{(weekTotal - WEEKLY_GOAL).toFixed(1)} km over
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="relative h-4 w-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-1000 ease-out ${
                    overGoal ? "stripes" : "bg-[#CCFF00]"
                  } relative shimmer`}
                  style={{ width: `${progressPct}%` }}
                  data-testid="progress-bar-fill"
                />
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {DAYS.map((d) => {
                  const dayKm = (ridesByDay[d.idx] || []).reduce(
                    (a, r) => a + r.km,
                    0
                  );
                  return (
                    <div key={d.idx} className="text-center">
                      <div
                        className={`h-1 ${
                          dayKm > 0 ? "bg-[#CCFF00]" : "bg-zinc-800"
                        }`}
                      />
                      <div className="mt-2 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                        {d.label}
                      </div>
                      <div className="font-mono text-xs text-zinc-300 mt-1">
                        {dayKm.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* All-Time Total widget */}
          <section
            className="col-span-12 lg:col-span-4 bg-zinc-950 border border-zinc-800 p-8 flex flex-col justify-end relative overflow-hidden min-h-[420px] fade-up delay-2"
            data-testid="all-time-card"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1548422392-679e1fc2eba4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200')",
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
            <div className="relative z-10">
              <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
                All-Time Distance
              </div>
              <div
                className="font-display font-black text-7xl sm:text-8xl tracking-tighter leading-[0.85] mt-2"
                data-testid="all-time-km"
              >
                {summary.all_time_km.toFixed(0)}
              </div>
              <div className="font-display text-2xl text-zinc-400 -mt-1">
                kilometers
              </div>
              <div className="mt-6 flex items-center gap-4 text-xs uppercase tracking-widest font-bold">
                <span className="text-[#CCFF00]">
                  {summary.all_time_rides} rides
                </span>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-400">
                  {summary.weeks.length} weeks
                </span>
              </div>
            </div>
          </section>

          {/* Add Ride Form */}
          <section
            className="col-span-12 lg:col-span-7 bg-[#121214] border border-zinc-800 p-6 sm:p-8 fade-up delay-3"
            data-testid="add-ride-section"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
                  Log Entry
                </div>
                <div className="font-display font-black text-2xl uppercase tracking-tight mt-1">
                  Add a Ride
                </div>
              </div>
            </div>
            <AddRideForm onSubmit={handleAdd} />
          </section>

          {/* Recent Weeks */}
          <section
            className="col-span-12 lg:col-span-5 bg-[#121214] border border-zinc-800 p-6 sm:p-8 fade-up delay-3"
            data-testid="recent-weeks-card"
          >
            <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
              Archive
            </div>
            <div className="font-display font-black text-2xl uppercase tracking-tight mt-1 mb-5">
              Recent Weeks
            </div>
            {recentWeeks.length === 0 ? (
              <div className="text-sm text-zinc-500">
                No rides logged yet. Start your tally below.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {recentWeeks.map((w) => {
                  const { week: ww, year: yy } = weekLabel(w.week_key);
                  const isActive = w.week_key === currentKey;
                  return (
                    <li key={w.week_key}>
                      <button
                        onClick={() => setCurrentKey(w.week_key)}
                        data-testid={`week-history-${w.week_key}`}
                        className={`w-full flex items-center justify-between py-3 text-left transition-colors hover:text-[#CCFF00] ${
                          isActive ? "text-[#CCFF00]" : "text-white"
                        }`}
                      >
                        <span className="font-mono text-xs tracking-widest uppercase">
                          W{String(ww).padStart(2, "0")} · {yy}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500">
                            {w.ride_count}
                            {w.ride_count === 1 ? " ride" : " rides"}
                          </span>
                          <span className="font-display font-bold text-lg">
                            {w.total_km.toFixed(1)}
                            <span className="text-zinc-600 text-xs ml-1">
                              KM
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Ride list */}
          <section
            className="col-span-12 bg-[#121214] border border-zinc-800 p-6 sm:p-8 fade-up delay-4"
            data-testid="ride-list-section"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
                  This Week
                </div>
                <div className="font-display font-black text-2xl uppercase tracking-tight mt-1">
                  Rides
                </div>
              </div>
              <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                {loading ? "Loading…" : `${rides.length} entries`}
              </div>
            </div>

            {rides.length === 0 ? (
              <div className="border border-dashed border-zinc-800 p-10 text-center">
                <div className="text-zinc-500 text-sm">
                  No rides this week. Log your first one above.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="w-full text-left border-collapse"
                  data-testid="rides-table"
                >
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase pb-3">
                        Day
                      </th>
                      <th className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase pb-3">
                        Title
                      </th>
                      <th className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase pb-3 text-right">
                        Distance
                      </th>
                      <th className="pb-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rides.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-zinc-800 hover:bg-[#18181B] transition-colors"
                        data-testid={`ride-row-${r.id}`}
                      >
                        <td className="py-4 font-mono text-xs uppercase tracking-widest text-zinc-400 w-32">
                          {DAYS[r.day_of_week].label}
                          <span className="text-zinc-700 ml-2">
                            {r.ride_date.slice(5)}
                          </span>
                        </td>
                        <td className="py-4 font-medium text-white uppercase tracking-wide">
                          {r.title}
                        </td>
                        <td className="py-4 font-display font-bold text-xl text-right">
                          {r.km.toFixed(1)}
                          <span className="text-zinc-600 text-xs ml-1">KM</span>
                        </td>
                        <td className="py-4 pl-4 w-12 text-right">
                          <button
                            onClick={() => handleDelete(r.id)}
                            data-testid={`delete-ride-${r.id}`}
                            className="text-zinc-600 hover:text-[#FF3B30] transition-colors p-2"
                            aria-label="Delete ride"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-black/40">
                      <td className="py-4 font-bold text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
                        Total
                      </td>
                      <td />
                      <td className="py-4 font-display font-black text-2xl text-[#CCFF00] text-right">
                        {weekTotal.toFixed(1)}
                        <span className="text-zinc-600 text-xs ml-1">KM</span>
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-zinc-600 uppercase">
            // Tally · Track · Repeat
          </div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-zinc-600 uppercase">
            Iso Week {currentKey}
          </div>
        </footer>
      </main>
    </div>
  );
}
