/** Avalanche Canada public forecast API (see https://avalanche.ca/api-docs) */

export const AVCAN_FORECAST_BASE = 'https://avcan-services-api.prod.avalanche.ca/forecasts';

const DANGER_META = {
  low: { num: 1, label: 'Low', colour: '#28a745' },
  moderate: { num: 2, label: 'Moderate', colour: '#ffd100' },
  considerable: { num: 3, label: 'Considerable', colour: '#f7941d' },
  high: { num: 4, label: 'High', colour: '#ed1c24' },
  extreme: { num: 5, label: 'Extreme', colour: '#231f20' },
  offseason: { num: null, label: 'Summer Conditions', colour: '#8A9BB0' },
  norating: { num: null, label: 'No Rating', colour: '#8A9BB0' },
  noRating: { num: null, label: 'No Rating', colour: '#8A9BB0' },
  no_rating: { num: null, label: 'No Rating', colour: '#8A9BB0' },
};

export function dangerMeta(value) {
  if (!value) return DANGER_META.norating;
  return DANGER_META[value] || {
    num: null,
    label: String(value),
    colour: '#8A9BB0',
  };
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function bandFromReport(ratingsBlock, key) {
  const band = ratingsBlock?.ratings?.[key];
  const value = band?.rating?.value || 'norating';
  const meta = dangerMeta(value);
  return {
    key,
    label: band?.display || key.toUpperCase(),
    value,
    display: band?.rating?.display || meta.label,
    num: meta.num,
    colour: meta.colour,
  };
}

function highestBand(bands) {
  const ranked = bands
    .filter((b) => b.num != null)
    .sort((a, b) => b.num - a.num);
  return ranked[0] || bands[0] || null;
}

function isSeasonalValue(value) {
  return (
    value === 'offseason' ||
    value === 'norating' ||
    value === 'noRating' ||
    value === 'no_rating'
  );
}

function problemLabels(problems) {
  if (!Array.isArray(problems) || !problems.length) return [];
  return problems
    .map((p) => p?.type?.display || p?.display || p?.type?.value || null)
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Fetch Avalanche Canada forecast for a lat/lng point.
 * Returns null when outside coverage or on network/API failure.
 */
export async function fetchAvalancheForecast(lat, lng, { lang = 'en', signal } = {}) {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  const url =
    `${AVCAN_FORECAST_BASE}/${lang}/products/point` +
    `?lat=${encodeURIComponent(lat)}&long=${encodeURIComponent(lng)}`;

  try {
    const res = await fetch(url, { signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Avalanche Canada ${res.status}`);
    const data = await res.json();
    return normalizeAvalancheProduct(data);
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    console.warn('Avalanche Canada fetch failed:', err);
    return null;
  }
}

export function normalizeAvalancheProduct(data) {
  if (!data?.report) return null;

  const report = data.report;
  const today = report.dangerRatings?.[0] || null;
  const bands = today
    ? [
        bandFromReport(today, 'alp'),
        bandFromReport(today, 'tln'),
        bandFromReport(today, 'btl'),
      ]
    : [];
  const highest = highestBand(bands);
  const problems = problemLabels(report.problems);
  const highlights = stripHtml(report.highlights);
  const isOffseason =
    bands.length > 0 && bands.every((b) => isSeasonalValue(b.value));

  return {
    id: data.id || data.slug,
    url: data.url || 'https://avalanche.ca',
    title: report.title || data.area?.name || 'Avalanche forecast',
    areaName: report.title || '',
    forecaster: report.forecaster || data.owner?.display || 'Avalanche Canada',
    dateIssued: report.dateIssued || null,
    validUntil: report.validUntil || null,
    highlights,
    confidence: report.confidence?.rating?.display || null,
    bands,
    highest,
    problems,
    owner: data.owner?.display || 'Avalanche Canada',
    isOffseason,
  };
}
