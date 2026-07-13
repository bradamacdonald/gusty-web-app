import {
  GEONAMES_SEARCH_BASE,
  GEONAMES_USERNAME,
  MAPBOX_GEOCODE_BASE,
  MAPBOX_TOKEN,
} from '../../lib/constants.js';
import mountainSpots from '../../data/mountain-spots.json';

/** Western Canada (BC + AB) bbox for Mapbox: minLon,minLat,maxLon,maxLat */
export const WESTERN_CA_BBOX = '-139.06,48.3,-110.0,60.0';
export const DEFAULT_PROXIMITY = '-120.0,51.0';

const REGION_LABEL = {
  BC: 'British Columbia, Canada',
  AB: 'Alberta, Canada',
};

const WESTERN_ADMIN = new Set([
  'british columbia',
  'bc',
  'alberta',
  'ab',
]);

export function getRegionFromContext(context) {
  if (!context || !Array.isArray(context)) return '';
  const region = context.find((c) => c.id?.startsWith('region'));
  const country = context.find((c) => c.id?.startsWith('country'));
  const parts = [];
  if (region?.text) parts.push(region.text);
  if (country?.text) parts.push(country.text);
  return parts.join(', ');
}

export function normalizeSearchQuery(query) {
  return String(query || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreCuratedMatch(spot, normalizedQuery) {
  if (!normalizedQuery) return 0;
  const name = normalizeSearchQuery(spot.name);
  const aliases = (spot.aliases || []).map(normalizeSearchQuery);
  const candidates = [name, ...aliases];

  let best = 0;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate === normalizedQuery) best = Math.max(best, 100);
    else if (candidate.startsWith(normalizedQuery)) best = Math.max(best, 90);
    else if (normalizedQuery.startsWith(candidate) && candidate.length >= 3) {
      best = Math.max(best, 80);
    } else if (candidate.includes(normalizedQuery)) best = Math.max(best, 70);
    else if (normalizedQuery.includes(candidate) && candidate.length >= 4) {
      best = Math.max(best, 60);
    }
  }
  return best;
}

export function searchCuratedSpots(query, { limit = 8 } = {}) {
  const normalized = normalizeSearchQuery(query);
  if (normalized.length < 2) return [];

  return mountainSpots
    .map((spot) => {
      const score = scoreCuratedMatch(spot, normalized);
      if (score <= 0) return null;
      return {
        id: spot.id,
        name: spot.name,
        lat: spot.lat,
        lng: spot.lng,
        region: spot.region,
        regionLabel: REGION_LABEL[spot.region] || spot.region,
        kind: spot.kind,
        score,
        source: 'curated',
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function buildMapboxUrl(query, { proximity = DEFAULT_PROXIMITY, limit = 5 } = {}) {
  return (
    `${MAPBOX_GEOCODE_BASE}/${encodeURIComponent(query)}.json` +
    `?access_token=${MAPBOX_TOKEN}` +
    `&country=CA&bbox=${WESTERN_CA_BBOX}` +
    `&proximity=${encodeURIComponent(proximity)}` +
    `&types=poi,place,locality,region&language=en&limit=${limit}`
  );
}

function buildGeoNamesUrl(query, adminCode1) {
  return (
    `${GEONAMES_SEARCH_BASE}?name_startsWith=${encodeURIComponent(query)}` +
    `&featureClass=T&adminCode1=${adminCode1}&country=CA&maxRows=5` +
    `&username=${GEONAMES_USERNAME}`
  );
}

async function fetchJson(url, signal) {
  return fetch(url, { signal })
    .then((r) => r.json())
    .catch(() => ({}));
}

function looksRecreational(query) {
  const q = normalizeSearchQuery(query);
  return /\b(ski|resort|peak|mountain|mt|mount|pass|glacier|ridge|trail|lake|alpine|nordic)\b/.test(
    q
  ) || q.length >= 5;
}

function regionBoostFromText(text) {
  const lower = String(text || '').toLowerCase();
  if (WESTERN_ADMIN.has(lower) || /british columbia|\balberta\b|\bbc\b|\bab\b/.test(lower)) {
    return 25;
  }
  if (/\b(manitoba|ontario|quebec|saskatchewan|nova scotia|new brunswick|newfoundland)\b/.test(lower)) {
    return -40;
  }
  return 0;
}

function scoreMapboxFeature(feature, query) {
  const name = normalizeSearchQuery(feature.text || feature.place_name || '');
  const q = normalizeSearchQuery(query);
  let score = 40;

  if (name === q) score += 40;
  else if (name.startsWith(q)) score += 30;
  else if (name.includes(q)) score += 15;

  const types = feature.place_type || [];
  if (types.includes('poi')) score += looksRecreational(query) ? 20 : 10;
  if (types.includes('locality') || types.includes('place')) {
    score += looksRecreational(query) ? -5 : 5;
  }

  score += regionBoostFromText(getRegionFromContext(feature.context));
  score += regionBoostFromText(feature.place_name);
  return score;
}

function scoreGeoNamesFeature(g, query) {
  const name = normalizeSearchQuery(g.name || '');
  const q = normalizeSearchQuery(query);
  let score = 35;

  if (name === q) score += 35;
  else if (name.startsWith(q)) score += 25;
  else if (name.includes(q)) score += 10;

  const admin = String(g.adminName1 || g.adminCode1 || '');
  score += regionBoostFromText(admin);
  if (/british columbia|alberta|^bc$|^ab$/i.test(admin)) score += 15;
  return score;
}

function approxEqualCoords(aLat, aLng, bLat, bLng, epsilon = 0.03) {
  return Math.abs(aLat - bLat) < epsilon && Math.abs(aLng - bLng) < epsilon;
}

/**
 * Merge curated + Mapbox + GeoNames into a ranked, deduped suggestion list.
 * Returns { curated, features, geonames } in ranked display order (subset lists).
 */
export function rankSuggestions(query, { curated = [], features = [], geonames = [] } = {}) {
  const ranked = [];

  for (const spot of curated) {
    ranked.push({
      type: 'curated',
      score: (spot.score || 70) + 50,
      data: spot,
      lat: spot.lat,
      lng: spot.lng,
      nameKey: normalizeSearchQuery(spot.name),
    });
  }

  for (const feature of features) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    ranked.push({
      type: 'mapbox',
      score: scoreMapboxFeature(feature, query),
      data: feature,
      lat: coords[1],
      lng: coords[0],
      nameKey: normalizeSearchQuery(feature.text || feature.place_name || ''),
    });
  }

  for (const g of geonames) {
    const lat = parseFloat(g.lat);
    const lng = parseFloat(g.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    ranked.push({
      type: 'geonames',
      score: scoreGeoNamesFeature(g, query),
      data: g,
      lat,
      lng,
      nameKey: normalizeSearchQuery(g.name || ''),
    });
  }

  ranked.sort((a, b) => b.score - a.score);

  const seenCoords = [];
  const seenNames = new Set();
  const outCurated = [];
  const outFeatures = [];
  const outGeonames = [];

  for (const item of ranked) {
    if (item.nameKey && seenNames.has(item.nameKey)) continue;
    if (seenCoords.some((c) => approxEqualCoords(c.lat, c.lng, item.lat, item.lng))) {
      continue;
    }
    if (item.nameKey) seenNames.add(item.nameKey);
    seenCoords.push({ lat: item.lat, lng: item.lng });

    if (item.type === 'curated') outCurated.push(item.data);
    else if (item.type === 'mapbox') outFeatures.push(item.data);
    else outGeonames.push(item.data);
  }

  return {
    curated: outCurated,
    features: outFeatures,
    geonames: outGeonames,
    ordered: [
      ...outCurated.map((d) => ({ source: 'curated', data: d })),
      ...outFeatures.map((d) => ({ source: 'mapbox', data: d })),
      ...outGeonames.map((d) => ({ source: 'geonames', data: d })),
    ],
  };
}

export async function searchPlaces(query, { signal, proximity } = {}) {
  if (!query || query.trim().length < 3) {
    return { curated: [], features: [], geonames: [] };
  }

  const trimmed = query.trim();
  const curated = searchCuratedSpots(trimmed);
  const mapboxUrl = buildMapboxUrl(trimmed, {
    proximity: proximity || DEFAULT_PROXIMITY,
  });

  const fetchGeoNames = trimmed.length >= 4;
  const fetches = [fetchJson(mapboxUrl, signal)];

  if (fetchGeoNames) {
    fetches.push(
      fetchJson(buildGeoNamesUrl(trimmed, 'BC'), signal),
      fetchJson(buildGeoNamesUrl(trimmed, 'AB'), signal)
    );
  }

  const results = await Promise.all(fetches);
  const features = results[0]?.features ?? [];
  let geonames = [];
  if (fetchGeoNames) {
    const bc = results[1]?.geonames ?? [];
    const ab = results[2]?.geonames ?? [];
    geonames = [...bc, ...ab];
  }

  return rankSuggestions(trimmed, { curated, features, geonames });
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

export async function searchMapboxPlaces(query, { signal, proximity } = {}) {
  if (!query || !query.trim()) return [];
  const url = buildMapboxUrl(query.trim(), {
    proximity: proximity || DEFAULT_PROXIMITY,
  });
  const data = await fetchJson(url, signal);
  return data?.features ?? [];
}

export async function searchTerrainFeatures(query, { signal } = {}) {
  if (!query || query.trim().length < 4) return [];
  const trimmed = query.trim();
  const [bc, ab] = await Promise.all([
    fetchJson(buildGeoNamesUrl(trimmed, 'BC'), signal),
    fetchJson(buildGeoNamesUrl(trimmed, 'AB'), signal),
  ]);
  return [...(bc?.geonames ?? []), ...(ab?.geonames ?? [])];
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
