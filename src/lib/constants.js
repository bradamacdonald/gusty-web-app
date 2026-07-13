/** Application-wide constants and environment config */

export const DEFAULT_LAT = 49.3756;
export const DEFAULT_LON = -123.0378;
export const DEFAULT_TIMEZONE = 'America/Vancouver';

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
export const GEONAMES_USERNAME = import.meta.env.VITE_GEONAMES_USERNAME || '';

export const STORAGE_KEYS = {
  hairMode: 'gusty_hair_mode',
  units: 'gusty_units',
  theme: 'gusty_theme',
  defaultModel: 'gusty_default_model',
  savedSpots: 'gusty_saved_spots',
};

export const WEATHER_MODELS = [
  { name: 'HRDPS', api: 'gem_hrdps_continental' },
  { name: 'ECMWF', api: 'ecmwf_ifs025' },
  { name: 'GFS', api: 'gfs_seamless' },
  { name: 'GEM', api: 'gem_seamless' },
  { name: 'HRRR', api: 'ncep_hrrr_conus' },
];

export const MODEL_API_BY_NAME = Object.fromEntries(
  WEATHER_MODELS.map((m) => [m.name, m.api])
);

export const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
export const MAPBOX_GEOCODE_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
export const GEONAMES_SEARCH_BASE = 'https://secure.geonames.org/searchJSON';
export const AVCAN_DOCS_URL = 'https://avalanche.ca/api-docs';

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Barlow:ital,wght@1,700&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap';

export const FONT_URL_LANDING =
  'https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;1,700&family=DM+Mono:wght@400;500&family=Inter:wght@400;500&display=swap';
