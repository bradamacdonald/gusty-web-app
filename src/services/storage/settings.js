import { STORAGE_KEYS } from '../../lib/constants.js';

export function getHairMode() {
  return localStorage.getItem(STORAGE_KEYS.hairMode) === 'true';
}

export function setHairMode(on) {
  localStorage.setItem(STORAGE_KEYS.hairMode, on ? 'true' : 'false');
}

export function getUnits() {
  return localStorage.getItem(STORAGE_KEYS.units) || 'metric';
}

export function setUnits(units) {
  localStorage.setItem(STORAGE_KEYS.units, units);
}

export function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

export function getDefaultModel() {
  return localStorage.getItem(STORAGE_KEYS.defaultModel) || 'ECMWF';
}

export function setDefaultModel(model) {
  localStorage.setItem(STORAGE_KEYS.defaultModel, model);
}

export function applyTheme() {
  document.documentElement.classList.toggle('theme-light', getTheme() === 'light');
}

export function getHairLabel(kmh) {
  if (kmh == null) return '—';
  const v = Number(kmh);
  if (v <= 15) return 'Zero Drama';
  if (v <= 30) return 'Messy Bun Situation';
  if (v <= 50) return 'Full Chaos';
  if (v <= 74) return "Don't Even Bother";
  return 'Feral Creature';
}

export function getConditionLabel(kmh) {
  if (kmh == null) return '—';
  const v = Number(kmh);
  if (v < 30) return 'Favorable';
  if (v <= 60) return 'Marginal';
  return 'Unfavorable';
}

export function getConditionDisplayLabel(kmh) {
  return getHairMode() ? getHairLabel(kmh) : getConditionLabel(kmh);
}

export function kmhToMph(kmh) {
  return kmh != null ? Math.round(kmh * 0.621371) : null;
}

export function celsiusToFahrenheit(c) {
  return c != null ? Math.round((c * 9) / 5 + 32) : null;
}

export function formatWindSpeed(kmh) {
  const units = getUnits();
  if (units === 'imperial') {
    const mph = kmhToMph(kmh);
    return { value: mph != null ? mph : '—', unit: 'mph' };
  }
  return { value: kmh != null ? Math.round(kmh) : '—', unit: 'km/h' };
}

export function formatTemp(celsius) {
  const units = getUnits();
  if (units === 'imperial') {
    const f = celsiusToFahrenheit(celsius);
    return { value: f != null ? f : '—', unit: '°F' };
  }
  return { value: celsius != null ? Math.round(celsius) : '—', unit: '°C' };
}

export function convertWindForDisplay(kmh) {
  const u = getUnits();
  return u === 'imperial' ? kmhToMph(kmh) : (kmh != null ? Math.round(kmh) : null);
}

export function getWindUnit() {
  return getUnits() === 'imperial' ? 'mph' : 'km/h';
}

export function getTempUnit() {
  return getUnits() === 'imperial' ? '°F' : '°C';
}

/** Backward-compatible global for gradual migration */
export function attachGlobal() {
  if (typeof window === 'undefined') return;
  window.GustySettings = {
    getHairMode,
    getUnits,
    getTheme,
    getDefaultModel,
    applyTheme,
    getHairLabel,
    getConditionLabel,
    getConditionDisplayLabel,
    formatWindSpeed,
    formatTemp,
    convertWindForDisplay,
    kmhToMph,
    getWindUnit,
    getTempUnit,
  };
}
