// ISO 8601 week helpers.

export const DAYS = [
  { idx: 0, label: "MON", long: "Monday" },
  { idx: 1, label: "TUE", long: "Tuesday" },
  { idx: 2, label: "WED", long: "Wednesday" },
  { idx: 3, label: "THU", long: "Thursday" },
  { idx: 4, label: "FRI", long: "Friday" },
  { idx: 5, label: "SAT", long: "Saturday" },
  { idx: 6, label: "SUN", long: "Sunday" },
];

// Returns [isoYear, isoWeek] for a given Date (local).
export function getISOWeek(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return [d.getUTCFullYear(), weekNum];
}

export function weekKey(date) {
  const [y, w] = getISOWeek(date);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

export function parseWeekKey(key) {
  const [y, w] = key.split("-W");
  return [parseInt(y, 10), parseInt(w, 10)];
}

// Returns Date of Monday of given ISO year/week.
export function isoWeekStart(isoYear, isoWeek) {
  const simple = new Date(Date.UTC(isoYear, 0, 1 + (isoWeek - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4)
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  else ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  return ISOweekStart;
}

export function shiftWeekKey(key, delta) {
  const [y, w] = parseWeekKey(key);
  const monday = isoWeekStart(y, w);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return weekKey(monday);
}

export function dayOfWeekDateForKey(key, dayIdx) {
  const [y, w] = parseWeekKey(key);
  const monday = isoWeekStart(y, w);
  monday.setUTCDate(monday.getUTCDate() + dayIdx);
  return monday;
}

export function fmtIsoDate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function weekLabel(key) {
  const [y, w] = parseWeekKey(key);
  return { year: y, week: w };
}

export function todayWeekKey() {
  return weekKey(new Date());
}
