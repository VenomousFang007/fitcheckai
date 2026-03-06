export function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);

  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}