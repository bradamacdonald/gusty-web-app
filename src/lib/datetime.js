export function formatHour(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export function formatDay(iso) {
  const d = new Date(iso);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

export function getCurrentHourIndex(hourly) {
  const now = new Date();
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]);
    if (t > now) return Math.max(0, i - 1);
  }
  return hourly.time.length - 1;
}

export function formatElevation(elev) {
  if (elev == null || isNaN(elev)) return '—';
  return `${Math.round(elev).toLocaleString()} m`;
}
