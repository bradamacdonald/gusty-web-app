import {
  GEONAMES_SEARCH_BASE,
  GEONAMES_USERNAME,
  MAPBOX_GEOCODE_BASE,
  MAPBOX_TOKEN,
} from '../../lib/constants.js';

export function getRegionFromContext(context) {
  if (!context || !Array.isArray(context)) return '';
  const region = context.find((c) => c.id?.startsWith('region'));
  const country = context.find((c) => c.id?.startsWith('country'));
  const parts = [];
  if (region?.text) parts.push(region.text);
  if (country?.text) parts.push(country.text);
  return parts.join(', ');
}

export async function searchPlaces(query, { signal } = {}) {
  if (!query || query.trim().length < 3) {
    return { features: [], geonames: [] };
  }

  const trimmed = query.trim();
  const mapboxUrl =
    `${MAPBOX_GEOCODE_BASE}/${encodeURIComponent(trimmed)}.json` +
    `?access_token=${MAPBOX_TOKEN}` +
    '&country=CA&proximity=-123.0%2C49.9&types=poi,place,locality,region&language=en&limit=5';

  const fetchGeoNames = trimmed.length >= 4;
  const geoNamesUrl =
    `${GEONAMES_SEARCH_BASE}?name_startsWith=${encodeURIComponent(trimmed)}` +
    `&featureClass=T&adminCode1=BC&country=CA&maxRows=5&username=${GEONAMES_USERNAME}`;

  const fetches = [
    fetch(mapboxUrl, { signal })
      .then((r) => r.json())
      .catch(() => ({})),
  ];

  if (fetchGeoNames) {
    fetches.push(
      fetch(geoNamesUrl, { signal })
        .then((r) => r.json())
        .catch(() => ({}))
    );
  } else {
    fetches.push(Promise.resolve({}));
  }

  const results = await Promise.all(fetches);
  const features = results[0]?.features ?? [];
  const geonames = fetchGeoNames && results[1]?.geonames ? results[1].geonames : [];

  return { features, geonames };
}

export async function reverseGeocode(lng, lat, { signal } = {}) {
  const url =
    `${MAPBOX_GEOCODE_BASE}/${lng},${lat}.json` +
    `?access_token=${MAPBOX_TOKEN}&types=poi,place,locality,region&language=en&limit=5`;

  const data = await fetch(url, { signal })
    .then((r) => r.json())
    .catch(() => ({}));

  return data?.features ?? [];
}

export function buildForecastUrlFromCoords(lat, lng, name = 'Location') {
  return (
    `forecast.html?lat=${encodeURIComponent(lat)}` +
    `&lng=${encodeURIComponent(lng)}` +
    `&name=${encodeURIComponent(name)}`
  );
}

export async function searchMapboxPlaces(query, { signal } = {}) {
  const url =
    `${MAPBOX_GEOCODE_BASE}/${encodeURIComponent(query)}.json` +
    `?access_token=${MAPBOX_TOKEN}` +
    '&country=CA&proximity=-123.0%2C49.9&types=poi,place,locality,region&language=en&limit=5';

  const data = await fetch(url, { signal })
    .then((r) => r.json())
    .catch(() => ({}));
  return data?.features ?? [];
}

export async function searchTerrainFeatures(query, { signal } = {}) {
  if (!query || query.trim().length < 4) return [];
  const url =
    `${GEONAMES_SEARCH_BASE}?name_startsWith=${encodeURIComponent(query.trim())}` +
    `&featureClass=T&adminCode1=BC&country=CA&maxRows=5&username=${GEONAMES_USERNAME}`;

  const data = await fetch(url, { signal })
    .then((r) => r.json())
    .catch(() => ({}));
  return data?.geonames ?? [];
}

export async function searchNearbyTerrain(lat, lng, { signal } = {}) {
  const url =
    `https://secure.geonames.org/findNearbyJSON?lat=${lat}&lng=${lng}` +
    `&featureClass=T&maxRows=1&username=${GEONAMES_USERNAME}`;

  const data = await fetch(url, { signal })
    .then((r) => r.json())
    .catch(() => ({}));
  return data?.geonames?.[0]?.name ?? null;
}

function isRoadOrAddress(name) {
  if (!name || name.length < 2) return true;
  const roadRe =
    /^\d+\s|^\d+$|\b(street|st|ave|avenue|road|rd|blvd|drive|dr|lane|ln|way|court|ct|highway|hwy)\b/i;
  return roadRe.test(name);
}

function isNaturalFeature(name) {
  if (!name) return false;
  const words = [
    'Lake', 'Peak', 'Mountain', 'Creek', 'Ridge', 'Glacier',
    'Pass', 'River', 'Falls', 'Summit', 'Valley', 'Basin',
  ];
  return words.some((w) => name.includes(w));
}

function hasPlaceType(feature, type) {
  return (feature.place_type || []).includes(type);
}

export function pickBestReverseGeocodeName(features1, features2, fallback) {
  const all = [...(features1 || []), ...(features2 || [])];
  const seen = new Set();

  const getName = (f) => (f.text || f.place_name || '').trim();

  for (const f of all) {
    const name = getName(f);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    if (hasPlaceType(f, 'poi') && !isRoadOrAddress(name)) return name;
  }

  for (const f of all) {
    const name = getName(f);
    if (!name || seen.has(name)) continue;
    if (hasPlaceType(f, 'place')) return name;
  }

  const adminTypes = ['country', 'region', 'postcode', 'district'];
  let bestNatural = null;
  let bestOther = null;

  for (const f of features2 || []) {
    const name = getName(f);
    if (!name) continue;
    const isAdmin = (f.place_type || []).some((t) => adminTypes.includes(t));
    if (isAdmin) continue;
    if (isNaturalFeature(name)) bestNatural = name;
    else if (!bestOther) bestOther = name;
  }

  return bestNatural || bestOther || fallback;
}

export async function reverseGeocodeSmart(lng, lat, coordsFallback) {
  const features = await reverseGeocode(lng, lat);
  return pickBestReverseGeocodeName(features, features, coordsFallback);
}

export function onlyStreetOrAddress(features) {
  if (!features?.length) return true;
  return features.every((f) => {
    const pt = f.place_type || [];
    const isAddress = pt.includes('address');
    const name = (f.text || f.place_name || '').trim();
    return isAddress || isRoadOrAddress(name);
  });
}
