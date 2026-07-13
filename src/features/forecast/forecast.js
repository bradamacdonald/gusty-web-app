import './styles.css';
import { bootstrap } from '../../app/bootstrap.js';
import { mountBottomNav } from '../../components/shell/bottom-nav.js';
import { DEFAULT_LAT, DEFAULT_LON } from '../../lib/constants.js';
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
import {
  isSpotSaved,
  toggleSavedSpot,
} from '../../services/storage/saved-spots.js';
import { fetchAvalancheForecast } from '../../services/api/avalanche-canada.js';
import { fetchLocationForecast, fetchModelWind } from '../../services/api/open-meteo.js';
import { parseLocationFromUrl, formatCoordinates } from '../../lib/coordinates.js';
import { formatDay, formatHour, getCurrentHourIndex } from '../../lib/datetime.js';
import {
  getHairTier,
  getStandardTierTooltip,
  isHairModeEnabled,
} from '../../lib/hair-mode.js';
import { getModelRunTimeAgo, modelKeyToName } from '../../lib/models.js';
import { degreesToCompass, windRampColor } from '../../lib/wind.js';

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
          if (runEl) runEl.textContent = getModelRunTimeAgo(key);
        });

        const vals = [hVal, eVal, gVal, mVal].filter(v => v != null);
        const spread = vals.length >= 2 ? Math.round(Math.max(...vals) - Math.min(...vals)) : 0;
        var spreadDisp = convertWindForDisplay(spread);
        let conf = '—';
        if (spread <= 5) conf = 'Models agree within ' + spreadDisp + ' ' + windUnit + ' — high confidence.';
        else if (spread <= 15) conf = 'Models agree within ' + spreadDisp + ' ' + windUnit + ' — moderate confidence.';
        else conf = 'Models differ by ' + spreadDisp + ' ' + windUnit + ' — low confidence.';
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

        var bandsEl = document.getElementById('avalanche-bands');
        var indicator = document.getElementById('avalanche-indicator');
        var desc = document.getElementById('avalanche-desc');
        var link = document.getElementById('avalanche-link');

        if (bandsEl) {
          bandsEl.innerHTML = '';
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

        if (indicator) {
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

        if (desc) {
          desc.textContent = forecast.highlights ||
            (forecast.areaName ? ('Forecast region: ' + forecast.areaName) : '');
        }
        if (link) {
          link.href = forecast.url || 'https://avalanche.ca';
          link.textContent = formatIssued(forecast.dateIssued) + ' · View full forecast →';
        }
        card.hidden = false;
      }

      async function loadForecast() {
        showLoading();
        hideError();
        try {
          const elevHint = urlElevation;
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
          const gfs = settled[1].status === 'fulfilled' ? settled[1].value : main;
          const gem = settled[2].status === 'fulfilled' ? settled[2].value : main;
          const hrdps = settled[3].status === 'fulfilled' ? settled[3].value : null;
          const avy = settled[4].status === 'fulfilled' ? settled[4].value : null;

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
        toggleSavedSpot({
          lat,
          lng,
          name: locationName,
          elevation: resolveElevation(),
        });
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

      if (typeof lucide !== 'undefined') {
        lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
      }

      loadForecast();
    })();
