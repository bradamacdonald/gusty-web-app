import {
  isSpotSaved,
  toggleSavedSpot,
  updateSavedSpotWind,
  getSavedSpots,
  buildForecastUrl,
} from '../../services/storage/saved-spots.js';
import {
  readForecastCache,
  writeForecastCache,
} from '../../services/storage/forecast-cache.js';
import {
  getPlanElevations,
  setPlanElevations,
} from '../../services/storage/plan-elevations.js';
import { fetchAvalancheForecast } from '../../services/api/avalanche-canada.js';
import { fetchLocationForecast, fetchModelWind } from '../../services/api/open-meteo.js';
import { fetchTerrainAspect } from '../../services/api/terrain.js';
import {
  classifyWindExposure,
  formatAspectSummary,
} from '../../lib/terrain-aspect.js';
import {
  fetchSpotWindSnapshot,
  pickCompareCandidates,
  rankSnapshotsByCalm,
  MAX_COMPARE_ALTERNATES,
} from '../../services/compare-spots.js';
import { parseLocationFromUrl, formatCoordinates, spotKey } from '../../lib/coordinates.js';
import { formatDay, formatHour, getCurrentHourIndex } from '../../lib/datetime.js';
import {
  getHairTier,
  getStandardTierTooltip,
  isHairModeEnabled,
} from '../../lib/hair-mode.js';
import { getModelRunTimeAgo, modelKeyToName } from '../../lib/models.js';
import { degreesToCompass, windRampColor } from '../../lib/wind.js';
import {
  convertWindForDisplay,
  formatTemp,
  formatWindSpeed,
  getConditionDisplayLabel,
  getConditionLabel,
  getDefaultModel,
  getWindUnit,
  setDefaultModel,
} from '../../services/storage/settings.js';
import { DEFAULT_LAT, DEFAULT_LON } from '../../lib/constants.js';
import { bootstrap } from '../../app/bootstrap.js';
import { mountBottomNav } from '../../components/shell/bottom-nav.js';
import './styles.css';

bootstrap();
mountBottomNav('location');

(function() {
      'use strict';

      const parsed = parseLocationFromUrl(window.location.search);
      const lat = Number.isFinite(parsed.lat) ? parsed.lat : DEFAULT_LAT;
      const lng = Number.isFinite(parsed.lng) ? parsed.lng : DEFAULT_LON;
      const urlElevation = parsed.elevation != null && !isNaN(parsed.elevation)
        ? Math.round(parsed.elevation)
        : null;

      const decodedName = parsed.name ? parsed.name : null;
      const locationName = (decodedName && decodedName !== 'Location') ? decodedName : formatCoordinates(lat, lng);

      var apiElevation = null;
      var lastWindSnapshot = null;
      var _popoverCurrentWind = null;
      var _popoverMaxWind = null;

      function resolveElevation() {
        if (urlElevation != null) return urlElevation;
        if (apiElevation != null && !isNaN(apiElevation)) return Math.round(apiElevation);
        return null;
      }

      function showLoading() {
        document.getElementById('loading-overlay').classList.remove('hidden');
        document.getElementById('error-overlay').classList.add('hidden');
        document.getElementById('forecast-content').style.visibility = 'hidden';
      }

      function hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('forecast-content').style.visibility = '';
      }

      function showError(msg) {
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('error-overlay').classList.remove('hidden');
        document.getElementById('error-message').textContent = msg || 'Failed to load forecast.';
        document.getElementById('forecast-content').style.visibility = 'hidden';
      }

      function hideError() {
        document.getElementById('error-overlay').classList.add('hidden');
        document.getElementById('forecast-content').style.visibility = '';
      }

      function renderWindHero(data, idx, tempC) {
        const h = data.hourly;
        const speed = h.windspeed_10m[idx];
        _popoverCurrentWind = speed;
        const gust = h.windgusts_10m && h.windgusts_10m[idx];
        const dir = h.winddirection_10m && h.winddirection_10m[idx];

        const valEl = document.getElementById('wind-hero-value');
        const unitEl = document.querySelector('.wind-hero-unit');
        const compassWrap = document.getElementById('wind-hero-compass-wrap');
        const dirEl = document.getElementById('wind-hero-dir-text');
        const gustRow = document.getElementById('wind-hero-gust-row');
        const gustText = document.getElementById('wind-hero-gust-text');
        const tempRow = document.getElementById('wind-hero-temp-row');
        const tempText = document.getElementById('wind-hero-temp-text');

        var fmt = formatWindSpeed(speed);
        valEl.textContent = fmt.value;
        if (unitEl) unitEl.textContent = fmt.unit;
        valEl.style.color = windRampColor(speed || 0);

        if (compassWrap) compassWrap.style.transform = 'rotate(' + (dir != null ? dir : 0) + 'deg)';
        dirEl.textContent = degreesToCompass(dir) + (dir != null ? ' · ' + dir + '°' : '');

        if (gust != null && gust > 0) {
          var gFmt = formatWindSpeed(gust);
          gustText.textContent = 'Gusts to ' + gFmt.value + ' ' + gFmt.unit;
          gustRow.style.display = '';
        } else {
          gustRow.style.display = 'none';
        }

        if (tempC != null) {
          var tempFmt = formatTemp(tempC);
          tempText.textContent = tempFmt.value + tempFmt.unit;
          tempRow.style.display = '';
        } else {
          tempRow.style.display = 'none';
        }
      }

      function renderHourlyStrip(data, startIdx, count) {
        const h = data.hourly;
        const strip = document.getElementById('hourly-strip');
        const now = new Date();
        strip.innerHTML = '';

        const maxPrecip = Math.max(0.1, ...h.precipitation.slice(startIdx, startIdx + count).map(v => v || 0));

        for (let i = 0; i < count; i++) {
          const idx = startIdx + i;
          const time = h.time[idx];
          const speed = h.windspeed_10m[idx];
          const dir = h.winddirection_10m && h.winddirection_10m[idx];
          const precip = h.precipitation && h.precipitation[idx];

          const t = new Date(time);
          const isActive = t <= now && (idx + 1 >= h.time.length || new Date(h.time[idx + 1]) > now);

          const precipH = maxPrecip > 0 ? Math.max(2, (precip || 0) / maxPrecip * 16) : 0;
          const precipBg = precip > 2 ? 'var(--precip-heavy)' : precip > 0.5 ? 'var(--precip-light)' : precip > 0 ? 'var(--precip-trace)' : 'transparent';
          const precipStyle = precip > 0 ? 'height:' + precipH + 'px;background:' + precipBg : 'height:2px;background:transparent;border:1px solid var(--color-border)';

          const gust = h.windgusts_10m && h.windgusts_10m[idx];
          var dispSpeed = convertWindForDisplay(speed);
          var windUnit = getWindUnit();
          const tooltip = locationName + ': ' + (dispSpeed != null ? dispSpeed : '—') + ' ' + windUnit + (gust != null && gust > 0 ? ' (gusts ' + convertWindForDisplay(gust) + ')' : '');

          const cell = document.createElement('div');
          cell.className = 'hour-cell' + (isActive ? ' active' : '');
          cell.title = tooltip;
          cell.innerHTML = '<span class="hour-time">' + formatHour(time) + '</span>' +
            '<span class="hour-arrow" style="transform:rotate(' + (dir != null ? dir : 0) + 'deg)">↑</span>' +
            '<span class="hour-wind" style="color:' + windRampColor(speed || 0) + '">' + (dispSpeed != null ? dispSpeed : '—') + '</span>' +
            '<div class="hour-precip-wrap"><div class="hour-precip-bar" style="' + precipStyle + '"></div></div>';
          strip.appendChild(cell);
        }
      }

      function renderPrecipStrip(data, startIdx, count) {
        const h = data.hourly;
        const strip = document.getElementById('precip-strip');
        if (!strip) return;
        strip.innerHTML = '';
        const maxPrecip = Math.max(0.1, ...h.precipitation.slice(startIdx, startIdx + count).map(v => v || 0));
        const temps = h.temperature_2m || [];

        for (let i = 0; i < count; i++) {
          const idx = startIdx + i;
          const time = h.time[idx];
          const precip = h.precipitation && h.precipitation[idx] || 0;
          const temp = temps[idx] != null ? temps[idx] : 0;
          const rainMm = temp >= 0 ? precip : 0;
          const snowMm = temp < 0 ? (precip || 0) / 10 : 0;

          const rainH = maxPrecip > 0 ? Math.max(0, (rainMm / maxPrecip) * 20) : 0;
          const snowH = maxPrecip > 0 ? Math.max(0, (snowMm / maxPrecip) * 20) : 0;

          const bars = [];
          if (rainMm > 0) bars.push('<div class="precip-bar rain" style="height:' + Math.max(2, rainH) + 'px"></div>');
          if (snowMm > 0) bars.push('<div class="precip-bar snow" style="height:' + Math.max(2, snowH) + 'px"></div>');
          var amountStr = '—';
          if (precip > 0) {
            var amt = rainMm > 0 ? rainMm : snowMm;
            amountStr = amt < 0.05 ? '0' : amt.toFixed(1) + 'mm';
          }

          const cell = document.createElement('div');
          cell.className = 'precip-cell';
          cell.innerHTML = '<span class="precip-label">' + formatHour(time) + '</span>' +
            '<div class="precip-bars">' + (bars.length ? bars.join('') : '<div class="precip-bar" style="height:2px;background:transparent;border:1px solid var(--color-border)"></div>') + '</div>' +
            '<span class="precip-amount">' + amountStr + '</span>';
          strip.appendChild(cell);
        }
      }

      function renderDailyStrip(data) {
        const d = data.daily;
        const strip = document.getElementById('daily-strip');
        strip.innerHTML = '';

        for (let i = 0; i < d.time.length; i++) {
          const maxWind = d.windspeed_10m_max[i];
          const windDir = d.wind_direction_10m_dominant && d.wind_direction_10m_dominant[i];
          const precip = d.precipitation_sum && d.precipitation_sum[i];
          const precipClass = !precip || precip === 0 ? 'none' : precip < 2 ? 'trace' : precip < 5 ? 'light' : 'heavy';

          var dispWind = convertWindForDisplay(maxWind);
          var windUnit = getWindUnit();
          var condLabel = getConditionDisplayLabel(maxWind);
          var condClass = (maxWind != null && maxWind < 30) ? 'favorable' : (maxWind != null && maxWind <= 60) ? 'marginal' : 'unfavorable';

          const row = document.createElement('div');
          row.className = 'daily-row';
          row.innerHTML = '<span class="daily-day">' + formatDay(d.time[i]) + '</span>' +
            '<span class="daily-right">' +
            '<span class="daily-arrow" style="transform:rotate(' + (windDir != null ? windDir : 0) + 'deg)">↑</span>' +
            '<span class="daily-wind">' +
            '<span class="daily-wind-range" style="color:' + windRampColor(maxWind || 0) + '">' + (dispWind != null ? dispWind : '—') + '</span> ' +
            '<span class="unit">' + windUnit + '</span>' +
            '<span class="daily-precip-dot ' + precipClass + '"></span>' +
            '</span>' +
            '<span class="daily-condition-badge ' + condClass + '">' + condLabel + '</span>' +
            '</span>';
          strip.appendChild(row);
        }
      }

      function renderModelComparison(ecmwf, gfs, gem, hrdps, activeModelKey) {
        const idx = getCurrentHourIndex(ecmwf.hourly);
        function valAt(data) {
          if (!data?.hourly?.windspeed_10m?.length) return null;
          const i = Math.min(idx, data.hourly.windspeed_10m.length - 1);
          return data.hourly.windspeed_10m[i];
        }
        const eVal = valAt(ecmwf);
        const gVal = valAt(gfs);
        const mVal = valAt(gem);
        const hVal = valAt(hrdps);

        var windUnit = getWindUnit();
        function paint(id, raw) {
          var el = document.getElementById(id);
          if (!el) return;
          var disp = convertWindForDisplay(raw);
          el.textContent = (disp != null ? disp : '—') + ' ' + windUnit;
          el.style.color = windRampColor(raw || 0);
        }
        paint('model-ecmwf', eVal);
        paint('model-gfs', gVal);
        paint('model-gem', mVal);
        paint('model-hrdps', hVal);

        ['hrdps', 'gfs', 'ecmwf', 'gem'].forEach(function(key) {
          var row = document.querySelector('.model-row[data-model="' + key + '"]');
          var badge = document.getElementById('active-badge-' + key);
          var runEl = document.getElementById('model-run-' + key);
          if (row && badge) {
            row.classList.toggle('active', key === activeModelKey);
            badge.classList.toggle('hidden', key !== activeModelKey);
          }
          if (runEl) {
            runEl.textContent = getModelRunTimeAgo(key);
            runEl.title = 'Estimated from typical model cycle + dissemination lag (Open-Meteo does not expose run IDs)';
          }
        });

        const vals = [hVal, eVal, gVal, mVal].filter(v => v != null);
        const spread = vals.length >= 2 ? Math.round(Math.max(...vals) - Math.min(...vals)) : 0;
        var spreadDisp = convertWindForDisplay(spread);
        let conf = '—';
        if (spread <= 5) conf = 'Models agree within ' + spreadDisp + ' ' + windUnit + ' — high confidence.';
        else if (spread <= 15) conf = 'Models agree within ' + spreadDisp + ' ' + windUnit + ' — moderate confidence.';
        else conf = 'Models differ by ' + spreadDisp + ' ' + windUnit + ' — low confidence.';
        if (activeModelKey === 'hrdps') {
          conf += ' HRDPS is best for the next 24–48h; use ECMWF for day 3+.';
        } else if (activeModelKey === 'ecmwf') {
          conf += ' ECMWF anchors longer-range; check HRDPS for near-term wind.';
        }
        document.getElementById('model-confidence').textContent = conf;
      }

      function renderConditionVerdict(data, startIdx, count) {
        const h = data.hourly;
        let maxWind = 0;
        for (let i = startIdx; i < Math.min(startIdx + count, h.windspeed_10m.length); i++) {
          const v = h.windspeed_10m[i];
          if (v != null && v > maxWind) maxWind = v;
        }
        _popoverMaxWind = maxWind;

        const verdict = document.getElementById('wind-hero-verdict');
        const textEl = document.getElementById('verdict-text');
        if (!verdict || !textEl) return;
        verdict.classList.remove('favorable', 'marginal', 'unfavorable');

        var label = getConditionDisplayLabel(maxWind);
        textEl.textContent = label;

        if (maxWind < 30) verdict.classList.add('favorable');
        else if (maxWind <= 60) verdict.classList.add('marginal');
        else verdict.classList.add('unfavorable');
      }

      function meanDirection(dirs) {
        if (!dirs.length) return null;
        var sin = 0;
        var cos = 0;
        dirs.forEach(function(d) {
          var rad = (d * Math.PI) / 180;
          sin += Math.sin(rad);
          cos += Math.cos(rad);
        });
        var deg = (Math.atan2(sin / dirs.length, cos / dirs.length) * 180) / Math.PI;
        return (deg + 360) % 360;
      }

      function renderLoadingWatch(data, startIdx, hours) {
        var section = document.getElementById('loading-watch');
        if (!section || !data?.hourly) return;
        var h = data.hourly;
        var end = Math.min(startIdx + hours, h.time.length);
        var snowTotal = 0;
        var maxWind = 0;
        var dirs = [];
        var fzlVals = [];

        for (var i = startIdx; i < end; i++) {
          var snow = h.snowfall && h.snowfall[i];
          if (snow != null) snowTotal += snow;
          var wind = h.windspeed_10m && h.windspeed_10m[i];
          if (wind != null && wind > maxWind) maxWind = wind;
          var dir = h.winddirection_10m && h.winddirection_10m[i];
          if (dir != null) dirs.push(dir);
          var fzl = h.freezing_level_height && h.freezing_level_height[i];
          if (fzl != null && !isNaN(fzl)) fzlVals.push(fzl);
        }

        var snowCm = snowTotal; // Open-Meteo snowfall is cm
        var windFmt = formatWindSpeed(maxWind);
        var meanDir = meanDirection(dirs);
        var fzlAvg = fzlVals.length
          ? Math.round(fzlVals.reduce(function(a, b) { return a + b; }, 0) / fzlVals.length)
          : null;

        var snowEl = document.getElementById('watch-snow');
        var windEl = document.getElementById('watch-wind');
        var dirEl = document.getElementById('watch-dir');
        var fzlEl = document.getElementById('watch-fzl');
        if (snowEl) {
          snowEl.textContent = snowCm > 0.05 ? snowCm.toFixed(1) + ' cm' : '0 cm';
        }
        if (windEl) {
          windEl.textContent = (windFmt.value != null ? windFmt.value : '—') + ' ' + windFmt.unit;
          windEl.style.color = windRampColor(maxWind || 0);
        }
        if (dirEl) {
          dirEl.textContent = meanDir != null
            ? degreesToCompass(meanDir) + ' · ' + Math.round(meanDir) + '°'
            : '—';
        }
        if (fzlEl) {
          if (fzlAvg != null) {
            fzlEl.textContent = fzlAvg.toLocaleString() + ' m';
          } else {
            // Fallback: crude FZL from near-term temp when model omits freezing_level_height
            var temp = h.temperature_2m && h.temperature_2m[startIdx];
            var elev = resolveElevation();
            if (temp != null && elev != null) {
              var approx = Math.round(elev + Math.max(0, -temp * 120));
              fzlEl.textContent = '~' + approx.toLocaleString() + ' m';
            } else {
              fzlEl.textContent = '—';
            }
          }
        }
        section.hidden = false;
      }

      function formatIssued(iso) {
        if (!iso) return 'avalanche.ca';
        try {
          var d = new Date(iso);
          return 'Issued ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch (e) {
          return 'avalanche.ca';
        }
      }

      function renderAvalancheCard(forecast) {
        var card = document.getElementById('avalanche-card');
        if (!card) return;
        if (!forecast) {
          card.hidden = true;
          return;
        }

        var titleEl = card.querySelector('.avalanche-card-title');
        var bandsEl = document.getElementById('avalanche-bands');
        var indicator = document.getElementById('avalanche-indicator');
        var desc = document.getElementById('avalanche-desc');
        var link = document.getElementById('avalanche-link');
        var disclaimer = card.querySelector('.avalanche-disclaimer');

        card.classList.toggle('is-offseason', !!forecast.isOffseason);

        if (titleEl) {
          titleEl.textContent = forecast.isOffseason
            ? 'Seasonal Avalanche Notice'
            : 'Avalanche Conditions';
        }

        if (bandsEl) {
          bandsEl.innerHTML = '';
          if (forecast.isOffseason) {
            bandsEl.hidden = true;
          } else {
            bandsEl.hidden = false;
            (forecast.bands || []).forEach(function(band) {
              var cell = document.createElement('div');
              cell.className = 'avalanche-band';
              var short = band.key === 'alp' ? 'ALP' : band.key === 'tln' ? 'TLN' : 'BTL';
              var valueText = band.num != null ? String(band.num) : '—';
              cell.innerHTML =
                '<span class="avalanche-band-label">' + short + '</span>' +
                '<span class="avalanche-band-value">' +
                '<span class="avalanche-band-swatch" style="background:' + band.colour + '"></span>' +
                '<span style="color:' + band.colour + '">' + valueText + '</span>' +
                '</span>';
              bandsEl.appendChild(cell);
            });
          }
        }

        if (indicator) {
          if (forecast.isOffseason) {
            indicator.innerHTML =
              '<span class="avalanche-indicator-sq" style="background:#8A9BB0"></span>' +
              '<span>Summer Conditions · Regular ratings resume in winter</span>';
          } else {
            var highest = forecast.highest;
            var problems = (forecast.problems || []).join(', ');
            if (highest) {
              var numHtml = highest.num != null
                ? '<span class="avalanche-num" style="color:' + highest.colour + '">' + highest.num + '</span> '
                : '';
              indicator.innerHTML =
                '<span class="avalanche-indicator-sq" style="background:' + highest.colour + '"></span>' +
                numHtml +
                '<span>' + highest.display + (problems ? ' · ' + problems : '') + '</span>';
            } else {
              indicator.innerHTML = '';
            }
          }
        }

        if (desc) {
          if (forecast.highlights) {
            desc.textContent = forecast.highlights;
          } else if (forecast.isOffseason) {
            desc.textContent =
              'Regular avalanche forecasts have ended for the season. Isolated hazard may still exist at high elevations — check Avalanche Canada before travel.';
          } else {
            desc.textContent = forecast.areaName
              ? ('Forecast region: ' + forecast.areaName)
              : '';
          }
        }
        if (disclaimer) {
          disclaimer.textContent = forecast.isOffseason
            ? 'Seasonal notice from Avalanche Canada. Gusty does not assess avalanche risk.'
            : 'Hazard context from Avalanche Canada. Gusty does not assess avalanche risk.';
        }
        if (link) {
          link.href = forecast.url || 'https://avalanche.ca';
          link.textContent = formatIssued(forecast.dateIssued) + ' · View on avalanche.ca →';
        }
        card.hidden = false;
      }

      var planModelApi = 'ecmwf_ifs025';
      var planTimer = null;
      var planRequestId = 0;
      var planMainRef = null;

      function readPlanElevations() {
        var thInput = document.getElementById('plan-th-elev');
        var objInput = document.getElementById('plan-obj-elev');
        var th = thInput ? parseInt(thInput.value, 10) : NaN;
        var obj = objInput ? parseInt(objInput.value, 10) : NaN;
        return {
          th: Number.isFinite(th) ? th : null,
          obj: Number.isFinite(obj) ? obj : null,
        };
      }

      function paintPlanSide(prefix, data, elev) {
        var windEl = document.getElementById('plan-' + prefix + '-wind');
        var metaEl = document.getElementById('plan-' + prefix + '-meta');
        if (!windEl || !metaEl) return;
        if (!data?.hourly?.windspeed_10m?.length) {
          windEl.textContent = '—';
          metaEl.textContent = elev != null ? elev.toLocaleString() + ' m' : '—';
          return;
        }
        var idx = getCurrentHourIndex(data.hourly);
        idx = Math.min(idx, data.hourly.windspeed_10m.length - 1);
        var speed = data.hourly.windspeed_10m[idx];
        var gust = data.hourly.windgusts_10m && data.hourly.windgusts_10m[idx];
        var dir = data.hourly.winddirection_10m && data.hourly.winddirection_10m[idx];
        var fmt = formatWindSpeed(speed);
        windEl.textContent = (fmt.value != null ? fmt.value : '—') + ' ' + fmt.unit;
        windEl.style.color = windRampColor(speed || 0);
        var parts = [];
        if (dir != null) parts.push(degreesToCompass(dir));
        if (gust != null && gust > 0) {
          var gFmt = formatWindSpeed(gust);
          parts.push('gusts ' + gFmt.value);
        }
        if (elev != null) parts.push(elev.toLocaleString() + ' m');
        metaEl.textContent = parts.length ? parts.join(' · ') : '—';
      }

      function renderPlanFzl(mainData, objElev) {
        var el = document.getElementById('plan-fzl');
        if (!el) return;
        if (!mainData?.hourly) {
          el.textContent = '—';
          return;
        }
        var h = mainData.hourly;
        var idx = getCurrentHourIndex(h);
        var fzl = h.freezing_level_height && h.freezing_level_height[idx];
        if (fzl == null || isNaN(fzl)) {
          var temp = h.temperature_2m && h.temperature_2m[idx];
          var base = resolveElevation();
          if (temp != null && base != null) {
            fzl = Math.round(base + Math.max(0, -temp * 120));
          }
        }
        if (fzl == null || isNaN(fzl)) {
          el.textContent = 'Freezing level unavailable for this model hour.';
          return;
        }
        fzl = Math.round(fzl);
        var relation = '';
        if (objElev != null) {
          var delta = objElev - fzl;
          if (Math.abs(delta) < 75) relation = ' — near objective';
          else if (delta > 0) relation = ' — ' + Math.round(delta) + ' m below objective (colder at summit)';
          else relation = ' — ' + Math.round(-delta) + ' m above objective (warmer at summit)';
        }
        el.textContent = 'Freezing level ~' + fzl.toLocaleString() + ' m' + relation;
      }

      function windFromAt(data) {
        if (!data?.hourly?.winddirection_10m?.length) return null;
        var idx = Math.min(
          getCurrentHourIndex(data.hourly),
          data.hourly.winddirection_10m.length - 1
        );
        var dir = data.hourly.winddirection_10m[idx];
        return dir != null && !isNaN(dir) ? dir : null;
      }

      function renderPlanAspect(terrain, windFromDeg) {
        var el = document.getElementById('plan-aspect');
        if (!el) return;
        el.textContent = formatAspectSummary(terrain, windFromDeg);
        var exposure = terrain && !terrain.isFlat
          ? classifyWindExposure(terrain.aspectDeg, windFromDeg)
          : { kind: 'unknown' };
        el.dataset.exposure = exposure.kind || 'unknown';
      }

      async function refreshPlanCompare() {
        var elevs = readPlanElevations();
        var section = document.getElementById('plan-mode');
        if (!section || section.hidden) return;
        if (elevs.th == null || elevs.obj == null) return;

        var req = ++planRequestId;
        paintPlanSide('th', null, elevs.th);
        paintPlanSide('obj', null, elevs.obj);
        document.getElementById('plan-th-wind').textContent = '…';
        document.getElementById('plan-obj-wind').textContent = '…';
        var aspectEl = document.getElementById('plan-aspect');
        if (aspectEl) {
          aspectEl.textContent = 'Reading terrain…';
          aspectEl.dataset.exposure = 'unknown';
        }

        try {
          var results = await Promise.all([
            fetchModelWind(lat, lng, planModelApi, 2, elevs.th),
            fetchModelWind(lat, lng, planModelApi, 2, elevs.obj),
            fetchTerrainAspect(lat, lng).catch(function() { return null; }),
          ]);
          if (req !== planRequestId) return;
          paintPlanSide('th', results[0], elevs.th);
          paintPlanSide('obj', results[1], elevs.obj);
          renderPlanFzl(planMainRef || results[0], elevs.obj);
          renderPlanAspect(results[2], windFromAt(results[1]) || windFromAt(results[0]));
        } catch (err) {
          if (req !== planRequestId) return;
          console.warn('Plan compare failed:', err);
          document.getElementById('plan-th-wind').textContent = '—';
          document.getElementById('plan-obj-wind').textContent = '—';
          if (aspectEl) aspectEl.textContent = 'Aspect unavailable.';
        }
      }

      function schedulePlanRefresh() {
        persistPlanElevationsFromInputs();
        clearTimeout(planTimer);
        planTimer = setTimeout(refreshPlanCompare, 350);
      }

      function initPlanMode(baseElev, mainData, nearTermApi) {
        var section = document.getElementById('plan-mode');
        var thInput = document.getElementById('plan-th-elev');
        var objInput = document.getElementById('plan-obj-elev');
        if (!section || !thInput || !objInput) return;

        planMainRef = mainData;
        planModelApi = nearTermApi || 'ecmwf_ifs025';

        var params = new URLSearchParams(window.location.search);
        var thParam = params.get('th');
        var objParam = params.get('obj');
        var th = thParam != null && thParam !== '' ? parseInt(thParam, 10) : NaN;
        var obj = objParam != null && objParam !== '' ? parseInt(objParam, 10) : NaN;
        var savedPlan = getPlanElevations(lat, lng);
        if (!Number.isFinite(th) && savedPlan) th = savedPlan.th;
        if (!Number.isFinite(obj) && savedPlan) obj = savedPlan.obj;
        if (!Number.isFinite(th)) th = baseElev != null ? baseElev : 1200;
        if (!Number.isFinite(obj)) obj = Math.min(5000, th + 500);

        thInput.value = String(th);
        objInput.value = String(obj);
        setPlanElevations(lat, lng, th, obj);
        section.hidden = false;
        refreshPlanCompare();
      }

      function persistPlanElevationsFromInputs() {
        var elevs = readPlanElevations();
        if (elevs.th == null || elevs.obj == null) return;
        setPlanElevations(lat, lng, elevs.th, elevs.obj);
      }

      var compareSelectedKeys = new Set();
      var compareCandidates = [];
      var compareModelApi = 'ecmwf_ifs025';
      var compareRequestId = 0;

      function escapeHtml(str) {
        return String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function renderComparePicks() {
        var picks = document.getElementById('compare-picks');
        var empty = document.getElementById('compare-empty');
        var intro = document.getElementById('compare-intro');
        if (!picks) return;

        if (!compareCandidates.length) {
          picks.hidden = true;
          picks.innerHTML = '';
          if (empty) empty.hidden = false;
          if (intro) intro.textContent = 'Save alternate spots to compare wind against this location.';
          return;
        }

        if (empty) empty.hidden = true;
        if (intro) {
          intro.textContent =
            'Select up to ' + MAX_COMPARE_ALTERNATES + ' saved alternates. Calmest ranks first.';
        }
        picks.hidden = false;
        picks.innerHTML = '';
        compareCandidates.forEach(function(spot) {
          var key = spotKey(spot.lat, spot.lng);
          var selected = compareSelectedKeys.has(key);
          var atCap = !selected && compareSelectedKeys.size >= MAX_COMPARE_ALTERNATES;
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'compare-pick' + (selected ? ' selected' : '');
          btn.disabled = atCap;
          btn.dataset.key = key;
          var elevTxt = spot.elevation != null ? Math.round(spot.elevation).toLocaleString() + ' m' : '';
          btn.innerHTML =
            '<strong>' + escapeHtml(spot.name || 'Location') + '</strong>' +
            (elevTxt ? ' · ' + elevTxt : '');
          btn.addEventListener('click', function() {
            if (compareSelectedKeys.has(key)) compareSelectedKeys.delete(key);
            else if (compareSelectedKeys.size < MAX_COMPARE_ALTERNATES) compareSelectedKeys.add(key);
            renderComparePicks();
            refreshCompareResults();
          });
          picks.appendChild(btn);
        });
      }

      function renderCompareResults(snapshots) {
        var results = document.getElementById('compare-results');
        if (!results) return;
        results.innerHTML = '';
        if (!snapshots || !snapshots.length) return;

        rankSnapshotsByCalm(snapshots).forEach(function(snap, i) {
          var isHere = spotKey(snap.lat, snap.lng) === spotKey(lat, lng);
          var card = document.createElement(isHere ? 'div' : 'a');
          card.className = 'compare-card' + (isHere ? ' is-here' : '');
          if (!isHere) {
            card.href = buildForecastUrl({
              lat: snap.lat,
              lng: snap.lng,
              name: snap.name,
              elevation: snap.elevation,
            });
          }
          var windText = snap.windDisp != null && snap.windDisp !== '—'
            ? snap.windDisp + ' ' + snap.windUnit
            : '—';
          var metaParts = [];
          if (snap.dirLabel && snap.dirLabel !== '—') metaParts.push(snap.dirLabel);
          if (snap.elevation != null) metaParts.push(Math.round(snap.elevation).toLocaleString() + ' m');
          if (snap.conditionLabel && snap.conditionLabel !== '—') metaParts.push(snap.conditionLabel);
          card.innerHTML =
            '<div class="compare-card-name">' +
            '<span class="compare-card-rank">#' + (i + 1) + '</span>' +
            escapeHtml(snap.name || 'Location') +
            (isHere ? '<span class="compare-card-badge">Here</span>' : '') +
            '</div>' +
            '<div class="compare-card-wind" style="color:' + windRampColor(snap.speed || 0) + '">' +
            windText +
            '</div>' +
            '<div class="compare-card-meta">' + escapeHtml(metaParts.join(' · ') || '—') + '</div>';
          results.appendChild(card);
        });
      }

      async function refreshCompareResults() {
        var results = document.getElementById('compare-results');
        if (!results) return;
        var req = ++compareRequestId;
        var here = {
          id: 'here',
          name: locationName,
          lat: lat,
          lng: lng,
          elevation: resolveElevation(),
        };
        var alts = compareCandidates.filter(function(s) {
          return compareSelectedKeys.has(spotKey(s.lat, s.lng));
        });
        var targets = [here].concat(alts);
        results.innerHTML = '<div class="compare-card"><div class="compare-card-name">Loading…</div></div>';

        try {
          var snaps = await Promise.all(
            targets.map(function(t) {
              return fetchSpotWindSnapshot(t, { model: compareModelApi });
            })
          );
          if (req !== compareRequestId) return;
          renderCompareResults(snaps);
        } catch (err) {
          if (req !== compareRequestId) return;
          console.warn('Compare spots failed:', err);
          results.innerHTML =
            '<div class="compare-card"><div class="compare-card-name">Could not load comparison</div></div>';
        }
      }

      function initCompareSpots(elev, nearTermApi) {
        compareModelApi = nearTermApi || 'ecmwf_ifs025';
        compareCandidates = pickCompareCandidates(getSavedSpots(), lat, lng);
        compareSelectedKeys = new Set(
          compareCandidates.slice(0, Math.min(1, compareCandidates.length)).map(function(s) {
            return spotKey(s.lat, s.lng);
          })
        );
        renderComparePicks();
        refreshCompareResults();
      }

      async function loadForecast() {
        const elevHint = urlElevation;
        const cached = readForecastCache(lat, lng, elevHint);

        function applyBundle(main, gfs, gem, hrdps, avy) {
          apiElevation = main.elevation;
          var elev = resolveElevation();

          var preferred = getDefaultModel();
          var heroData = main;
          var activeKey = 'ecmwf';
          if (preferred === 'GFS') { heroData = gfs; activeKey = 'gfs'; }
          else if (preferred === 'GEM') { heroData = gem; activeKey = 'gem'; }
          else if (preferred === 'HRDPS' && hrdps) { heroData = hrdps; activeKey = 'hrdps'; }

          const idx = getCurrentHourIndex(main.hourly);
          var heroIdx = Math.min(idx, (heroData.hourly.windspeed_10m.length || 1) - 1);
          var tempC = main.hourly.temperature_2m && main.hourly.temperature_2m[idx];
          renderWindHero(heroData, heroIdx, tempC);
          renderHourlyStrip(main, idx, 24);
          renderPrecipStrip(main, idx, 24);
          renderDailyStrip(main);
          renderModelComparison(main, gfs, gem, hrdps, activeKey);
          renderConditionVerdict(heroData, idx, 12);
          renderLoadingWatch(main, idx, 24);
          renderAvalancheCard(avy);

          const elevText = document.getElementById('wind-hero-elev-text');
          if (elevText) {
            elevText.textContent = elev != null ? elev.toLocaleString() + ' m' : '—';
          }

          var nearTermApi = hrdps ? 'gem_hrdps_continental' : 'ecmwf_ifs025';
          initPlanMode(elev, main, nearTermApi);
          initCompareSpots(elev, nearTermApi);

          var speed = heroData.hourly.windspeed_10m[heroIdx];
          var dirDeg = heroData.hourly.winddirection_10m
            ? heroData.hourly.winddirection_10m[heroIdx]
            : null;
          lastWindSnapshot = {
            windSpeed: speed,
            windDirection: dirDeg != null ? degreesToCompass(dirDeg) : null,
            elevation: elev,
          };
          if (isSpotSaved(lat, lng)) {
            updateSavedSpotWind(lat, lng, lastWindSnapshot);
          }
        }

        async function fetchBundle() {
          const settled = await Promise.allSettled([
            fetchLocationForecast(lat, lng, elevHint),
            fetchModelWind(lat, lng, 'gfs_seamless', 2, elevHint),
            fetchModelWind(lat, lng, 'gem_seamless', 2, elevHint),
            fetchModelWind(lat, lng, 'gem_hrdps_continental', 2, elevHint),
            fetchAvalancheForecast(lat, lng),
          ]);

          const main = settled[0].status === 'fulfilled' ? settled[0].value : null;
          if (!main) {
            throw settled[0].reason || new Error('Failed to load forecast.');
          }
          return {
            main: main,
            gfs: settled[1].status === 'fulfilled' ? settled[1].value : main,
            gem: settled[2].status === 'fulfilled' ? settled[2].value : main,
            hrdps: settled[3].status === 'fulfilled' ? settled[3].value : null,
            avy: settled[4].status === 'fulfilled' ? settled[4].value : null,
          };
        }

        if (cached && cached.main) {
          hideError();
          applyBundle(
            cached.main,
            cached.gfs || cached.main,
            cached.gem || cached.main,
            cached.hrdps,
            cached.avy
          );
          hideLoading();
          fetchBundle()
            .then(function(bundle) {
              writeForecastCache(lat, lng, elevHint, bundle);
              applyBundle(bundle.main, bundle.gfs, bundle.gem, bundle.hrdps, bundle.avy);
            })
            .catch(function(err) {
              console.warn('Background forecast refresh failed:', err);
            });
          return;
        }

        showLoading();
        hideError();
        try {
          const bundle = await fetchBundle();
          writeForecastCache(lat, lng, elevHint, bundle);
          applyBundle(bundle.main, bundle.gfs, bundle.gem, bundle.hrdps, bundle.avy);
          hideLoading();
        } catch (err) {
          console.error('Forecast fetch error:', err);
          showError(err.message || 'Failed to load forecast.');
        }
      }

      document.getElementById('retry-btn').addEventListener('click', loadForecast);

      /* ----- Save / Bookmark ----- */
      function updateSaveButtonState() {
        var btn = document.getElementById('save-btn');
        var outline = document.getElementById('save-icon-outline');
        var filled = document.getElementById('save-icon-filled');
        if (!btn || !outline || !filled) return;
        var saved = isSpotSaved(lat, lng);
        btn.classList.toggle('saved', saved);
        outline.classList.toggle('hidden', saved);
        filled.classList.toggle('hidden', !saved);
        btn.setAttribute('aria-label', saved ? 'Unsave location' : 'Save location');
      }

      function toggleSave() {
        var nowSaved = toggleSavedSpot({
          lat,
          lng,
          name: locationName,
          elevation: resolveElevation(),
        });
        if (nowSaved && lastWindSnapshot) {
          updateSavedSpotWind(lat, lng, lastWindSnapshot);
        }
        updateSaveButtonState();
      }

      var saveBtn = document.getElementById('save-btn');
      if (saveBtn) saveBtn.addEventListener('click', toggleSave);
      updateSaveButtonState();

      var shareBtn = document.getElementById('share-btn');
      var shareIcon = document.getElementById('share-icon');
      var shareIconCheck = document.getElementById('share-icon-check');
      var shareCopiedTimer = null;
      if (shareBtn && shareIcon && shareIconCheck) {
        shareBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(window.location.href).then(function() {
            shareIcon.classList.add('hidden');
            shareIconCheck.classList.remove('hidden');
            shareBtn.classList.add('copied');
            shareBtn.setAttribute('aria-label', 'Copied!');
            if (shareCopiedTimer) clearTimeout(shareCopiedTimer);
            shareCopiedTimer = setTimeout(function() {
              shareIcon.classList.remove('hidden');
              shareIconCheck.classList.add('hidden');
              shareBtn.classList.remove('copied');
              shareBtn.setAttribute('aria-label', 'Share link');
              shareCopiedTimer = null;
            }, 2000);
          }).catch(function() {});
        });
      }

      var panel = document.getElementById('model-panel');
      var toggle = document.getElementById('model-toggle');
      if (panel && toggle) {
        toggle.addEventListener('click', function() {
          panel.classList.toggle('collapsed');
          toggle.setAttribute('aria-label', panel.classList.contains('collapsed') ? 'Expand' : 'Collapse');
        });
      }

      /* ----- Condition chip popover ----- */
      var verdictEl = document.getElementById('wind-hero-verdict');
      var popoverEl = document.getElementById('condition-popover');
      var popoverName = document.getElementById('popover-name');
      var popoverWind = document.getElementById('popover-wind');
      var popoverOneliner = document.getElementById('popover-oneliner');

      function updatePopoverContent() {
        var wind = _popoverCurrentWind != null ? _popoverCurrentWind : _popoverMaxWind;
        var maxWind = _popoverMaxWind;
        var windUnit = getWindUnit();
        var windDisp = convertWindForDisplay(wind);
        if (isHairModeEnabled()) {
          var tier = getHairTier(maxWind != null ? maxWind : wind);
          popoverName.textContent = tier.name;
          popoverWind.textContent = (windDisp != null ? windDisp : '—') + ' ' + windUnit;
          popoverOneliner.textContent = tier.oneliner;
        } else {
          var label = getConditionLabel(maxWind != null ? maxWind : wind);
          popoverName.textContent = label;
          popoverWind.textContent = (windDisp != null ? windDisp : '—') + ' ' + windUnit;
          popoverOneliner.textContent = getStandardTierTooltip(maxWind != null ? maxWind : wind);
        }
      }

      function showPopover() {
        updatePopoverContent();
        popoverEl.classList.add('visible');
        verdictEl.setAttribute('aria-expanded', 'true');
        setTimeout(function() {
          document.addEventListener('click', handleOutsideClick);
        }, 0);
      }

      function hidePopover() {
        popoverEl.classList.remove('visible');
        verdictEl.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', handleOutsideClick);
      }

      function handleOutsideClick(e) {
        if (!popoverEl.contains(e.target) && !verdictEl.contains(e.target)) {
          hidePopover();
        }
      }

      if (verdictEl && popoverEl) {
        verdictEl.addEventListener('click', function(e) {
          e.stopPropagation();
          if (popoverEl.classList.contains('visible')) {
            hidePopover();
          } else {
            showPopover();
          }
        });
        verdictEl.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            verdictEl.click();
          }
        });
      }
      function buildDetailUrl(model) {
        var p = new URLSearchParams({ lat: lat, lng: lng, name: locationName });
        var elev = resolveElevation();
        if (elev != null) p.set('elevation', elev);
        if (model) p.set('model', model);
        return 'detail.html?' + p.toString();
      }
      if (panel) panel.querySelectorAll('.model-row').forEach(function(row) {
        var model = row.getAttribute('data-model');
        var modelName = modelKeyToName(model);
        row.style.cursor = 'pointer';
        row.addEventListener('click', function() {
          if (modelName) setDefaultModel(modelName);
          window.location.href = buildDetailUrl(modelName);
        });
      });

      document.getElementById('location-name').textContent = locationName;
      document.title = 'Forecast — ' + locationName;

      var thInput = document.getElementById('plan-th-elev');
      var objInput = document.getElementById('plan-obj-elev');
      if (thInput) thInput.addEventListener('input', schedulePlanRefresh);
      if (objInput) objInput.addEventListener('input', schedulePlanRefresh);
      document.querySelectorAll('.plan-preset').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var delta = parseInt(btn.getAttribute('data-delta'), 10) || 500;
          var elevs = readPlanElevations();
          var th = elevs.th != null ? elevs.th : (resolveElevation() || 1200);
          if (thInput) thInput.value = String(th);
          if (objInput) objInput.value = String(Math.min(5000, th + delta));
          schedulePlanRefresh();
        });
      });

      if (typeof lucide !== 'undefined') {
        lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
      }

      loadForecast();
    })();
