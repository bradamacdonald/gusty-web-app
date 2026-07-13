export function formatCoordinates(lat, lng) {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr} · ${lngStr}`;
}

export function isCoordinateLike(str) {
  if (!str || typeof str !== 'string') return true;
  return str.includes('°') || /^-?\d+\.?\d*\s*[,·]\s*-?\d+\.?\d*$/.test(str.trim());
}

export function spotKey(lat, lng) {
  return `${Math.round(lat * 10000) / 10000},${Math.round(lng * 10000) / 10000}`;
}

export function parseLocationFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  const lat = parseFloat(params.get('lat'));
  const lng = parseFloat(params.get('lng'));
  const nameParam = params.get('name');
  const decodedName = nameParam ? decodeURIComponent(nameParam) : null;

  return {
    lat,
    lng,
    name: decodedName,
    elevation: params.get('elevation') ? parseFloat(params.get('elevation')) : null,
    model: params.get('model'),
  };
}

export function resolveLocationName(lat, lng, name) {
  const decoded = name ? decodeURIComponent(name) : null;
  return decoded && decoded !== 'Location' ? decoded : formatCoordinates(lat, lng);
}
