import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { X, Download, Bike } from "lucide-react";
import { weekLabel, DAYS } from "@/lib/week";
import { toast } from "sonner";

const WEEKLY_GOAL = 100;

export default function RecapShareModal({
  open,
  onClose,
  weekKey,
  weekTotal,
  rides,
  allTimeKm,
  currentStreak,
}) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!open) return null;

  const { week, year } = weekLabel(weekKey);
  const pct = Math.min(100, (weekTotal / WEEKLY_GOAL) * 100);
  const overGoal = weekTotal >= WEEKLY_GOAL;

  const ridesByDay = DAYS.map((d) => {
    const km = rides
      .filter((r) => r.day_of_week === d.idx)
      .reduce((a, r) => a + r.km, 0);
    return { ...d, km };
  });
  const maxDayKm = Math.max(1, ...ridesByDay.map((d) => d.km));
  const longest = [...rides].sort((a, b) => b.km - a.km)[0];

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#09090B",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `km-ledger-${weekKey}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Recap downloaded");
    } catch (e) {
      toast.error("Could not generate image");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-auto"
      data-testid="share-modal"
      onClick={onClose}
    >
      <div
        className="relative max-w-[560px] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
            Weekly Recap · Preview
          </div>
          <button
            onClick={onClose}
            data-testid="close-share-modal"
            className="p-2 hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-zinc-300" />
          </button>
        </div>

        {/* The card to be captured — square 1:1 */}
        <div
          ref={cardRef}
          className="relative aspect-square w-full bg-[#09090B] border border-zinc-800 overflow-hidden"
          data-testid="recap-card"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-7 pt-7">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#CCFF00] flex items-center justify-center">
                <Bike className="w-4 h-4 text-black" strokeWidth={2.5} />
              </div>
              <div className="font-display font-black text-base tracking-tight uppercase leading-none text-white">
                KM Ledger
              </div>
            </div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
              W{String(week).padStart(2, "0")} · {year}
            </div>
          </div>

          {/* Hero number */}
          <div className="px-7 mt-6">
            <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
              Distance Logged
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display font-black tracking-tighter text-[7rem] leading-[0.85] text-white">
                {weekTotal.toFixed(1)}
              </span>
              <span className="font-display text-2xl text-zinc-600">
                / {WEEKLY_GOAL} km
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] uppercase tracking-widest font-bold">
              <span className={overGoal ? "text-[#CCFF00]" : "text-zinc-300"}>
                {pct.toFixed(0)}% of goal
              </span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400">
                {rides.length} {rides.length === 1 ? "ride" : "rides"}
              </span>
              {currentStreak > 0 && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className="text-[#CCFF00]">
                    {currentStreak}w streak
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-7 mt-5">
            <div className="relative h-3 w-full bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div
                className="h-full bg-[#CCFF00]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Day bars */}
          <div className="px-7 mt-6">
            <div className="grid grid-cols-7 gap-2 items-end h-24">
              {ridesByDay.map((d) => (
                <div key={d.idx} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-full ${
                      d.km > 0 ? "bg-[#CCFF00]" : "bg-zinc-800"
                    }`}
                    style={{
                      height: `${Math.max(4, (d.km / maxDayKm) * 80)}px`,
                    }}
                  />
                  <div className="font-mono text-[9px] tracking-widest text-zinc-500 uppercase">
                    {d.label}
                  </div>
                  <div className="font-mono text-[10px] text-zinc-300">
                    {d.km > 0 ? d.km.toFixed(0) : "·"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer stats */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 px-7 py-4 grid grid-cols-3 gap-2 bg-zinc-950">
            <div>
              <div className="text-[9px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
                Longest
              </div>
              <div className="font-display font-bold text-lg text-white mt-1">
                {longest ? `${longest.km.toFixed(1)}` : "—"}
                <span className="text-zinc-600 text-[10px] ml-1">KM</span>
              </div>
              <div className="text-[9px] uppercase text-zinc-500 truncate">
                {longest ? longest.title : ""}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
                All-Time
              </div>
              <div className="font-display font-bold text-lg text-white mt-1">
                {allTimeKm.toFixed(0)}
                <span className="text-zinc-600 text-[10px] ml-1">KM</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
                Status
              </div>
              <div
                className={`font-display font-bold text-lg mt-1 ${
                  overGoal ? "text-[#CCFF00]" : "text-zinc-300"
                }`}
              >
                {overGoal ? "GOAL HIT" : "IN PROGRESS"}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          data-testid="download-recap-btn"
          className="mt-4 w-full bg-[#CCFF00] disabled:opacity-50 text-black font-bold uppercase tracking-[0.2em] h-14 hover:bg-[#A3CC00] transition-colors flex items-center justify-center gap-3 text-sm"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Rendering…" : "Download PNG"}
        </button>
      </div>
    </div>
  );
}
