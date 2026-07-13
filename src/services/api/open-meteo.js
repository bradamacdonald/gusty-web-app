import { DEFAULT_TIMEZONE, OPEN_METEO_BASE } from '../../lib/constants.js';

export function buildForecastParams({
  lat,
  lng,
  models,
  hourly,
  daily,
  forecastDays = 5,
  elevation = null,
}) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    wind_speed_unit: 'kmh',
    timezone: DEFAULT_TIMEZONE,
    forecast_days: forecastDays,
  });

  if (hourly) params.set('hourly', hourly);
  if (daily) params.set('daily', daily);
  if (models) params.set('models', models);
  if (elevation != null && !Number.isNaN(Number(elevation))) {
    params.set('elevation', String(Math.round(Number(elevation))));
  }

  return params;
}

export async function fetchForecast(options) {
  const params = buildForecastParams(options);
  const url = `${OPEN_METEO_BASE}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  return res.json();
}

export async function fetchModelWind(lat, lng, model, forecastDays = 2, elevation = null) {
  return fetchForecast({
    lat,
    lng,
    models: model,
    hourly: 'windspeed_10m,windgusts_10m,winddirection_10m',
    forecastDays,
    elevation,
  });
}

export async function fetchWindPreview(lat, lng) {
  return fetchForecast({
    lat,
    lng,
    hourly: 'windspeed_10m',
    forecastDays: 1,
    models: 'ecmwf_ifs025',
  });
}

const FULL_HOURLY =
  'windspeed_10m,windgusts_10m,winddirection_10m,temperature_2m,dewpoint_2m,precipitation,cloudcover,snowfall,freezing_level_height';
const FULL_DAILY =
  'windspeed_10m_max,windgusts_10m_max,wind_direction_10m_dominant,precipitation_sum';

export async function fetchLocationForecast(lat, lng, elevation = null) {
  return fetchForecast({
    lat,
    lng,
    models: 'ecmwf_ifs025',
    hourly: FULL_HOURLY,
    daily: FULL_DAILY,
    forecastDays: 5,
    elevation,
  });
}

export async function fetchCurrentWeather(lat, lng) {
  return fetchForecast({
    lat,
    lng,
    hourly: 'windspeed_10m,winddirection_10m,temperature_2m',
    forecastDays: 2,
  });
}

export async function fetchDetailForecast(lat, lng, modelApi, elevation = null) {
  return fetchForecast({
    lat,
    lng,
    models: modelApi,
    hourly: FULL_HOURLY,
    forecastDays: 2,
    elevation,
  });
}
