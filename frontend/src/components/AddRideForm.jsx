import { useState } from "react";
import { DAYS } from "./lib/week";
import { toast } from "sonner";

export default function AddRideForm({ onSubmit }) {
  const todayDow = (() => {
    const d = new Date().getDay(); // Sun=0..Sat=6 -> shift to Mon=0..Sun=6
    return (d + 6) % 7;
  })();

  const [title, setTitle] = useState("");
  const [km, setKm] = useState("");
  const [dayIdx, setDayIdx] = useState(todayDow);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    const num = parseFloat(km);
    if (!trimmed) {
      toast.error("Add a title (e.g., workride)");
      return;
    }
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid distance > 0");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ title: trimmed, km: num, dayIdx });
      setTitle("");
      setKm("");
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase =
    "bg-transparent border border-zinc-800 rounded-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] focus:outline-none text-white p-4 h-14 font-medium w-full uppercase tracking-wide transition-colors placeholder:text-zinc-600 placeholder:normal-case placeholder:tracking-normal";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      data-testid="add-ride-form"
    >
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        <div className="sm:col-span-7">
          <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="workride, weilanden, sunday loop…"
            data-testid="ride-title-input"
            className={inputBase}
            maxLength={80}
          />
        </div>
        <div className="sm:col-span-5">
          <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">
            Distance · KM
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="0.0"
            data-testid="ride-km-input"
            className={`${inputBase} font-mono text-2xl`}
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase block mb-2">
          Day of Week
        </label>
        <div
          className="grid grid-cols-7 gap-1 sm:gap-2"
          data-testid="day-selector"
        >
          {DAYS.map((d) => {
            const active = d.idx === dayIdx;
            return (
              <button
                key={d.idx}
                type="button"
                onClick={() => setDayIdx(d.idx)}
                data-testid={`day-${d.label}`}
                className={`h-12 border font-mono text-xs tracking-widest font-bold uppercase transition-all ${
                  active
                    ? "bg-[#CCFF00] text-black border-[#CCFF00]"
                    : "border-zinc-800 text-zinc-400 hover:border-[#CCFF00] hover:text-[#CCFF00]"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        data-testid="submit-ride-btn"
        className="bg-[#CCFF00] disabled:opacity-50 text-black font-bold uppercase tracking-[0.2em] rounded-none h-14 hover:bg-[#A3CC00] transition-colors w-full px-8 text-sm"
      >
        {submitting ? "Logging…" : "+ Log Ride"}
      </button>
    </form>
  );
}
