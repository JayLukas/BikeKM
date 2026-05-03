import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { weekKey, shiftWeekKey, weekLabel } from "@/lib/week";

const WEEKLY_GOAL = 100;
const WEEKS_TO_SHOW = 12;

export default function TrendChart({
  weeks,
  currentWeekKey,
  onSelectWeek,
  selectedWeekKey,
}) {
  const data = useMemo(() => {
    const totals = Object.fromEntries(
      weeks.map((w) => [w.week_key, w.total_km])
    );
    const out = [];
    let key = currentWeekKey;
    for (let i = 0; i < WEEKS_TO_SHOW; i++) {
      const { week, year } = weekLabel(key);
      out.unshift({
        key,
        label: `W${String(week).padStart(2, "0")}`,
        sub: `${year}`,
        km: Math.round((totals[key] || 0) * 10) / 10,
        isSelected: key === selectedWeekKey,
      });
      key = shiftWeekKey(key, -1);
    }
    return out;
  }, [weeks, currentWeekKey, selectedWeekKey]);

  const peak = Math.max(WEEKLY_GOAL + 20, ...data.map((d) => d.km));

  const handleClick = (e) => {
    if (!e || !e.activeLabel) return;
    const point = data.find((d) => d.label === e.activeLabel);
    if (point && onSelectWeek) onSelectWeek(point.key);
  };

  return (
    <div className="w-full" data-testid="trend-chart">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
            onClick={handleClick}
          >
            <defs>
              <linearGradient id="kmFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#CCFF00" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#CCFF00" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#27272a"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="#52525b"
              tick={{
                fill: "#a1a1aa",
                fontSize: 10,
                fontFamily: "JetBrains Mono",
                letterSpacing: 1.5,
              }}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
            />
            <YAxis
              domain={[0, peak]}
              stroke="#52525b"
              tick={{
                fill: "#52525b",
                fontSize: 10,
                fontFamily: "JetBrains Mono",
              }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: "#CCFF00", strokeWidth: 1, strokeDasharray: "2 2" }}
              contentStyle={{
                background: "#09090B",
                border: "1px solid #27272a",
                borderRadius: 0,
                fontFamily: "JetBrains Mono",
                fontSize: 11,
              }}
              labelStyle={{
                color: "#a1a1aa",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
              itemStyle={{ color: "#CCFF00" }}
              formatter={(v) => [`${v} km`, "Distance"]}
              labelFormatter={(l, payload) => {
                const sub = payload && payload[0] ? payload[0].payload.sub : "";
                return `${l} · ${sub}`;
              }}
            />
            <ReferenceLine
              y={WEEKLY_GOAL}
              stroke="#CCFF00"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: "GOAL 100",
                fill: "#CCFF00",
                fontSize: 9,
                fontFamily: "JetBrains Mono",
                position: "right",
              }}
            />
            <Area
              type="monotone"
              dataKey="km"
              stroke="#CCFF00"
              strokeWidth={2}
              fill="url(#kmFill)"
              activeDot={{
                r: 5,
                fill: "#CCFF00",
                stroke: "#09090B",
                strokeWidth: 2,
              }}
              dot={{ r: 3, fill: "#CCFF00", stroke: "none" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
        // Click a point to jump to that week
      </div>
    </div>
  );
}
