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
import { fetchLocationForecast, fetchModelWind } from '../../services/api/open-meteo.js';
import { formatCoordinates } from '../../lib/coordinates.js';
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

      const params = new URLSearchParams(window.location.search);
      const lat = parseFloat(params.get('lat')) || DEFAULT_LAT;
      const lng = parseFloat(params.get('lng')) || DEFAULT_LON;

      const nameParam = params.get('name');
      const decodedName = nameParam ? decodeURIComponent(nameParam) : null;
      const locationName = (decodedName && decodedName !== 'Location') ? decodedName : formatCoordinates(lat, lng);

      var apiElevation = null;
      var _popoverCurrentWind = null;
      var _popoverMaxWind = null;

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

      function renderModelComparison(ecmwf, gfs, gem, activeModelKey) {
        const idx = getCurrentHourIndex(ecmwf.hourly);
        const gLen = gfs.hourly.windspeed_10m.length;
        const mLen = gem.hourly.windspeed_10m.length;
        const eVal = ecmwf.hourly.windspeed_10m[idx];
        const gVal = gfs.hourly.windspeed_10m[Math.min(idx, gLen - 1)];
        const mVal = gem.hourly.windspeed_10m[Math.min(idx, mLen - 1)];

        var windUnit = getWindUnit();
        var eDisp = convertWindForDisplay(eVal);
        var gDisp = convertWindForDisplay(gVal);
        var mDisp = convertWindForDisplay(mVal);
        document.getElementById('model-ecmwf').textContent = (eDisp != null ? eDisp : '—') + ' ' + windUnit;
        document.getElementById('model-ecmwf').style.color = windRampColor(eVal || 0);
        document.getElementById('model-gfs').textContent = (gDisp != null ? gDisp : '—') + ' ' + windUnit;
        document.getElementById('model-gfs').style.color = windRampColor(gVal || 0);
        document.getElementById('model-gem').textContent = (mDisp != null ? mDisp : '—') + ' ' + windUnit;
        document.getElementById('model-gem').style.color = windRampColor(mVal || 0);

        ['gfs', 'ecmwf', 'gem'].forEach(function(key) {
          var row = document.querySelector('.model-row[data-model="' + key + '"]');
          var badge = document.getElementById('active-badge-' + key);
          var runEl = document.getElementById('model-run-' + key);
          if (row && badge) {
            row.classList.toggle('active', key === activeModelKey);
            badge.classList.toggle('hidden', key !== activeModelKey);
          }
          if (runEl) runEl.textContent = getModelRunTimeAgo(key);
        });

        const vals = [eVal, gVal, mVal].filter(v => v != null);
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

      async function loadForecast() {
        showLoading();
        hideError();
        try {
          const [main, gfs, gem] = await Promise.all([
            fetchLocationForecast(lat, lng),
            fetchModelWind(lat, lng, 'gfs_seamless'),
            fetchModelWind(lat, lng, 'gem_seamless')
          ]);

          console.log('Open-Meteo API response (main/ECMWF):', main);
          console.log('Open-Meteo API response (GFS):', gfs);
          console.log('Open-Meteo API response (GEM):', gem);

          var preferred = getDefaultModel();
          var heroData = main;
          var activeKey = 'ecmwf';
          if (preferred === 'GFS') { heroData = gfs; activeKey = 'gfs'; }
          else if (preferred === 'GEM') { heroData = gem; activeKey = 'gem'; }

          const idx = getCurrentHourIndex(main.hourly);
          var heroIdx = Math.min(idx, (heroData.hourly.windspeed_10m.length || 1) - 1);
          var tempC = main.hourly.temperature_2m && main.hourly.temperature_2m[idx];
          renderWindHero(heroData, heroIdx, tempC);
          renderHourlyStrip(main, idx, 24);
          renderPrecipStrip(main, idx, 24);
          renderDailyStrip(main);
          renderModelComparison(main, gfs, gem, activeKey);
          renderConditionVerdict(heroData, idx, 12);
          apiElevation = main.elevation;
          console.log('API elevation:', main.elevation);
          const elevText = document.getElementById('wind-hero-elev-text');
          if (elevText) elevText.textContent = (main.elevation != null && !isNaN(main.elevation))
            ? Math.round(main.elevation).toLocaleString() + ' m'
            : '—';

          const avalancheCard = document.getElementById('avalanche-card');
          if (avalancheCard) {
            const elev = main.elevation;
            avalancheCard.style.display = (elev != null && !isNaN(elev) && elev >= 1000) ? '' : 'none';
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
          elevation: apiElevation != null && !isNaN(apiElevation) ? Math.round(apiElevation) : null,
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
        if (apiElevation != null && !isNaN(apiElevation)) p.set('elevation', Math.round(apiElevation));
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
