/**
 * Gusty settings utilities — shared across all pages
 * Reads from localStorage: gusty_hair_mode, gusty_units, gusty_theme, gusty_default_model
 */
(function(global) {
  'use strict';

  var HAIR_KEY = 'gusty_hair_mode';
  var UNITS_KEY = 'gusty_units';
  var THEME_KEY = 'gusty_theme';
  var MODEL_KEY = 'gusty_default_model';

  function getHairMode() { return localStorage.getItem(HAIR_KEY) === 'true'; }
  function getUnits() { return localStorage.getItem(UNITS_KEY) || 'metric'; }
  function getTheme() { return localStorage.getItem(THEME_KEY) || 'dark'; }
  function getDefaultModel() { return localStorage.getItem(MODEL_KEY) || 'ECMWF'; }

  function applyTheme() {
    document.documentElement.classList.toggle('theme-light', getTheme() === 'light');
  }

  /** Wind speed (km/h) to hair descriptor when hair mode is on */
  function getHairLabel(kmh) {
    if (kmh == null) return '—';
    var v = Number(kmh);
    if (v <= 15) return 'Zero Drama';
    if (v <= 30) return 'Messy Bun Situation';
    if (v <= 50) return 'Full Chaos';
    if (v <= 74) return "Don't Even Bother";
    return 'Feral Creature';
  }

  /** Standard condition label (Favorable/Marginal/Unfavorable) from wind km/h */
  function getConditionLabel(kmh) {
    if (kmh == null) return '—';
    var v = Number(kmh);
    if (v < 30) return 'Favorable';
    if (v <= 60) return 'Marginal';
    return 'Unfavorable';
  }

  /** Get display label (hair or standard) based on wind km/h */
  function getConditionDisplayLabel(kmh) {
    return getHairMode() ? getHairLabel(kmh) : getConditionLabel(kmh);
  }

  function kmhToMph(kmh) { return kmh != null ? Math.round(kmh * 0.621371) : null; }
  function celsiusToFahrenheit(c) { return c != null ? Math.round(c * 9 / 5 + 32) : null; }

  function formatWindSpeed(kmh) {
    var units = getUnits();
    if (units === 'imperial') {
      var mph = kmhToMph(kmh);
      return { value: mph != null ? mph : '—', unit: 'mph' };
    }
    return { value: kmh != null ? Math.round(kmh) : '—', unit: 'km/h' };
  }

  function formatTemp(celsius) {
    var units = getUnits();
    if (units === 'imperial') {
      var f = celsiusToFahrenheit(celsius);
      return { value: f != null ? f : '—', unit: '°F' };
    }
    return { value: celsius != null ? Math.round(celsius) : '—', unit: '°C' };
  }

  function convertWindForDisplay(kmh) {
    var u = getUnits();
    return u === 'imperial' ? kmhToMph(kmh) : (kmh != null ? Math.round(kmh) : null);
  }

  function getWindUnit() { return getUnits() === 'imperial' ? 'mph' : 'km/h'; }
  function getTempUnit() { return getUnits() === 'imperial' ? '°F' : '°C'; }

  global.GustySettings = {
    getHairMode: getHairMode,
    getUnits: getUnits,
    getTheme: getTheme,
    getDefaultModel: getDefaultModel,
    applyTheme: applyTheme,
    getHairLabel: getHairLabel,
    getConditionLabel: getConditionLabel,
    getConditionDisplayLabel: getConditionDisplayLabel,
    formatWindSpeed: formatWindSpeed,
    formatTemp: formatTemp,
    convertWindForDisplay: convertWindForDisplay,
    kmhToMph: kmhToMph,
    getWindUnit: getWindUnit,
    getTempUnit: getTempUnit
  };
})(typeof window !== 'undefined' ? window : this);
