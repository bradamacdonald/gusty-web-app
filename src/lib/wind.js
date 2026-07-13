export function windRampColor(kmh) {
  if (kmh <= 15) return 'var(--wind-calm)';
  if (kmh <= 30) return 'var(--wind-light)';
  if (kmh <= 50) return 'var(--wind-moderate)';
  if (kmh <= 74) return 'var(--wind-strong)';
  if (kmh <= 100) return 'var(--wind-severe)';
  return 'var(--wind-extreme)';
}

export function windClassFromSpeed(kmh) {
  if (kmh < 20) return 'wind-calm';
  if (kmh < 35) return 'wind-light';
  if (kmh < 50) return 'wind-moderate';
  if (kmh < 70) return 'wind-strong';
  if (kmh < 90) return 'wind-severe';
  return 'wind-extreme';
}

export function degreesToCompass(deg) {
  if (deg == null) return '—';
  const dirs = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const i = Math.round((deg % 360) / 22.5) % 16;
  return dirs[i];
}
