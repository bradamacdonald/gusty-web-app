import './styles.css';
import { bootstrap } from '../../app/bootstrap.js';
import { mountBottomNav } from '../../components/shell/bottom-nav.js';
import { WEATHER_MODELS } from '../../lib/constants.js';
import { getDefaultModel, setDefaultModel, convertWindForDisplay, getWindUnit } from '../../services/storage/settings.js';
import { fetchDetailForecast } from '../../services/api/open-meteo.js';

bootstrap();
mountBottomNav('location');

(function() {
      var params = new URLSearchParams(window.location.search);
      var lat = parseFloat(params.get('lat')) || 49.3756;
      var lng = parseFloat(params.get('lng')) || -123.0378;
      var elevationFromUrl = params.get('elevation');
      var elevation = elevationFromUrl !== null && elevationFromUrl !== '' ? parseInt(elevationFromUrl, 10) : null;
      var locationName = params.get('name') ? decodeURIComponent(params.get('name')) : 'Garibaldi Lake TH';
      var urlModel = params.get('model') || '';

      var MODELS = WEATHER_MODELS;
      var modelIdx = 0;
      if (urlModel) {
        var mi = MODELS.findIndex(function(m) { return m.name === urlModel; });
        if (mi >= 0) modelIdx = mi;
      } else {
        var defaultModel = getDefaultModel();
        var dm = MODELS.findIndex(function(m) { return m.name === defaultModel; });
        if (dm >= 0) modelIdx = dm;
      }

      document.querySelector('.location-name').textContent = locationName;
      var backBtn = document.getElementById('back-btn');
      if (backBtn) {
        var p = new URLSearchParams({ lat: lat, lng: lng, name: locationName });
        if (elevation != null && !isNaN(elevation)) p.set('elevation', elevation);
        backBtn.href = 'forecast.html?' + p.toString();
      }

      function cssVar(name, fallback) {
        var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
      }

      var chartGrid = cssVar('--color-border', 'rgba(255,255,255,0.12)');
      var chartTick = cssVar('--color-text-muted', '#8A9BB0');
      var chartAccent = cssVar('--color-accent', '#38BDF8');
      var chartSecondary = cssVar('--color-text-secondary', '#B8C4D4');
      var chartMuted = cssVar('--color-text-muted', '#8A9BB0');
      var windStrong = cssVar('--wind-strong', '#F97316');
      var windModerate = cssVar('--wind-moderate', '#FBBF24');
      var windCalm = cssVar('--wind-calm', '#34D399');
      var precipHeavy = cssVar('--precip-heavy', 'rgba(96, 165, 250, 0.85)');
      var precipSnow = cssVar('--precip-snow', 'rgba(226, 232, 240, 0.70)');
      var cloudFill = document.documentElement.classList.contains('theme-light')
        ? 'rgba(61, 79, 99, 0.08)'
        : 'rgba(255,255,255,0.04)';
      var cloudStroke = document.documentElement.classList.contains('theme-light')
        ? 'rgba(61, 79, 99, 0.18)'
        : 'rgba(255,255,255,0.12)';

      var xAxisTicksEvery2 = {
        grid: { color: chartGrid },
        ticks: {
          color: chartTick,
          font: { size: 10, family: "'DM Mono'" },
          maxRotation: 0,
          callback: function(val, index, ticks) {
            return index % 2 === 0 ? this.getLabelForValue(val) : '';
          }
        }
      };
      var CHART_OPTS = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: xAxisTicksEvery2,
          y: { grid: { color: chartGrid }, ticks: { color: chartTick, font: { size: 10, family: "'DM Mono'" } } }
        }
      };

      var labels = [];
      for (var li = 0; li < 48; li++) labels.push('');

      var timeAxisEl = document.getElementById('time-axis');
      timeAxisEl.innerHTML = '';
      for (var si = 0; si < 48; si++) {
        var span = document.createElement('span');
        span.className = 'time-tick';
        span.textContent = '';
        timeAxisEl.appendChild(span);
      }

      var windData = { summit: [], mid: [], trailhead: [], gustsSummit: [], gustsMid: [], gustsTrailhead: [] };
      var tempData = { temp: [], dewPoint: [], freezing: [] };
      var precipData = { cloud: [], rain: [], snow: [], cumulative: [] };

      var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      var dayAbbrev = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

      function formatDateHeader(d) {
        return dayNames[d.getDay()] + ' · ' + monthNames[d.getMonth()] + ' ' + d.getDate();
      }

      function formatLabel(iso) {
        var d = new Date(iso);
        var h = d.getHours();
        var today = new Date();
        if (d.getDate() !== today.getDate() || d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear()) {
          if (h === 0) return dayAbbrev[d.getDay()] + ' ' + d.getDate();
          return dayAbbrev[d.getDay()] + ' ' + (h === 12 ? '12pm' : h < 12 ? h + 'am' : (h - 12) + 'pm');
        }
        return h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? h + 'am' : (h - 12) + 'pm';
      }

      var dateHeaderEl = document.getElementById('date-header');
      if (dateHeaderEl) dateHeaderEl.textContent = formatDateHeader(new Date());

      function fetchForecast(modelApi, elev) {
        var elevVal = elev != null ? elev : (elevation != null && !isNaN(elevation) ? elevation : null);
        return fetchDetailForecast(lat, lng, modelApi, elevVal);
      }

      function extractHourly(arr, len) {
        if (!arr) return [];
        return arr.slice(0, len).map(function(v) { return v != null ? v : 0; });
      }

      function loadModelData() {
        var model = MODELS[modelIdx];
        var selectEl = document.getElementById('model-select');
        if (!selectEl) return;
        selectEl.value = model.name;
        selectEl.disabled = true;

        fetchForecast(model.api, null).then(function(mainData) {
          if (mainData.error) {
            console.error('API error:', mainData.reason || mainData);
            return Promise.reject(new Error(mainData.reason || 'API error'));
          }
          var baseElev = mainData.elevation != null && !isNaN(mainData.elevation) ? mainData.elevation : (elevation || 0);
          var elevationChip = document.getElementById('elevation-chip');
          if (elevationChip && mainData.elevation != null && !isNaN(mainData.elevation)) {
            console.log(mainData.elevation);
            elevationChip.textContent = Math.round(mainData.elevation).toLocaleString() + ' m';
            if (backBtn) {
              var p = new URLSearchParams({ lat: lat, lng: lng, name: locationName });
              p.set('elevation', Math.round(mainData.elevation));
              backBtn.href = 'forecast.html?' + p.toString();
            }
          } else if (elevationChip) {
            elevationChip.textContent = '—';
          }
          var elevTrail = baseElev;
          var elevMid = baseElev + 500;
          var elevSummit = baseElev + 1000;

          return Promise.all([
            fetchForecast(model.api, elevTrail),
            fetchForecast(model.api, elevMid),
            fetchForecast(model.api, elevSummit)
          ]).then(function(windResults) {
            var windTrail = windResults[0].hourly;
            var windMid = windResults[1].hourly;
            var windSummit = windResults[2].hourly;
            var main = mainData.hourly;
            var len = Math.min(48, main.time.length);

            windData.trailhead = extractHourly(windTrail.windspeed_10m, len);
            windData.mid = extractHourly(windMid.windspeed_10m, len);
            windData.summit = extractHourly(windSummit.windspeed_10m, len);
            windData.gustsTrailhead = extractHourly(windTrail.windgusts_10m, len);
            windData.gustsMid = extractHourly(windMid.windgusts_10m, len);
            windData.gustsSummit = extractHourly(windSummit.windgusts_10m, len);

            tempData.temp = extractHourly(main.temperature_2m, len);
            tempData.dewPoint = extractHourly(main.dewpoint_2m, len);
            tempData.freezing = tempData.temp.map(function(t, i) {
              return baseElev + Math.max(0, -t * 120);
            });

            precipData.cloud = extractHourly(main.cloudcover, len);
            var precip = extractHourly(main.precipitation, len);
            precipData.rain = tempData.temp.map(function(t, i) { return t >= 0 ? (precip[i] || 0) : 0; });
            precipData.snow = tempData.temp.map(function(t, i) { return t < 0 ? (precip[i] || 0) / 10 : 0; });
            var cum = 0;
            precipData.cumulative = precip.map(function(p) { cum += p || 0; return cum; });

            if (main.time && main.time.length >= len) {
              for (var i = 0; i < len; i++) labels[i] = formatLabel(main.time[i]);
              for (var j = 0; j < len && j < timeAxisEl.children.length; j++) {
                timeAxisEl.children[j].textContent = (j % 2 === 0) ? labels[j] : '';
              }
            }

            windChart.data.datasets[0].data = windData.summit;
            windChart.data.datasets[1].data = windData.mid;
            windChart.data.datasets[2].data = windData.trailhead;
            windChart.data.labels = labels;
            windChart.update('none');

            tempChart.data.datasets[0].data = tempData.temp;
            tempChart.data.datasets[1].data = tempData.dewPoint;
            tempChart.data.datasets[2].data = tempData.freezing;
            tempChart.data.labels = labels.slice(0, len);
            tempChart.update('none');

            precipChart.data.datasets[0].data = precipData.cloud;
            precipChart.data.datasets[1].data = precipData.rain;
            precipChart.data.datasets[2].data = precipData.snow;
            precipChart.data.datasets[3].data = precipData.cumulative;
            precipChart.data.labels = labels;
            var maxCum = precipData.cumulative.length ? Math.max.apply(null, precipData.cumulative) : 0;
            precipChart.options.scales.yCumulative.max = Math.max(5, Math.ceil(maxCum * 1.2));
            precipChart.update('none');
          });
        }).catch(function(err) {
          console.error('Fetch error:', err);
        }).finally(function() {
          selectEl.disabled = false;
        });
      }

      var windChart = new Chart(document.getElementById('wind-chart'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Summit', data: windData.summit, borderColor: windStrong, backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 0 },
            { label: 'Mid', data: windData.mid, borderColor: windModerate, backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 0 },
            { label: 'Trailhead', data: windData.trailhead, borderColor: windCalm, backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 0 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index' },
          hover: { mode: 'index' },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function(items) { return items[0] && items[0].label ? items[0].label : ''; },
                label: function(ctx) {
                  var i = ctx.dataIndex;
                  var gust = ctx.datasetIndex === 0 ? windData.gustsSummit[i] : ctx.datasetIndex === 1 ? windData.gustsMid[i] : windData.gustsTrailhead[i];
                  var windUnit = getWindUnit();
                  var val = ctx.raw;
                  var gustVal = gust != null ? gust : null;
                  var valDisp = convertWindForDisplay(val);
                  var gustDisp = convertWindForDisplay(gustVal);
                  return ctx.dataset.label + ': ' + (valDisp != null ? valDisp : '—') + ' ' + windUnit + ' · Gusts ' + (gustDisp != null ? gustDisp : '—') + ' ' + windUnit;
                }
              },
              usePointStyle: true,
              boxPadding: 4
            }
          },
          scales: {
            x: xAxisTicksEvery2,
            y: { grid: { color: chartGrid }, ticks: { color: chartTick, font: { size: 10, family: "'DM Mono'" } }, min: 0, max: 120 }
          }
        }
      });

      var tempChart = new Chart(document.getElementById('temp-chart'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Temp', data: tempData.temp, borderColor: chartAccent, backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 0 },
            { label: 'Dew Point', data: tempData.dewPoint, borderColor: chartSecondary, backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [4,4], tension: 0.3, pointRadius: 0 },
            { label: 'Freezing', data: tempData.freezing, borderColor: chartMuted, backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [4,4], tension: 0.3, pointRadius: 0, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: CHART_OPTS.scales.x,
            y: { ...CHART_OPTS.scales.y, position: 'left', min: -15, max: 10 },
            y1: { ...CHART_OPTS.scales.y, position: 'right', min: 1500, max: 2200, grid: { drawOnChartArea: false } }
          }
        }
      });

      var precipChart = new Chart(document.getElementById('precip-chart'), {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'Cloud', data: precipData.cloud, type: 'line', borderColor: cloudStroke, backgroundColor: cloudFill, fill: true, tension: 0.3, pointRadius: 0, yAxisID: 'yCloud', order: 0 },
            { label: 'Rain', data: precipData.rain, backgroundColor: precipHeavy, borderWidth: 0, stack: 'precip', order: 2 },
            { label: 'Snow', data: precipData.snow, backgroundColor: precipSnow, borderWidth: 0, stack: 'precip', order: 1 },
            { label: 'Cumulative', data: precipData.cumulative, type: 'line', borderColor: chartAccent, backgroundColor: 'transparent', borderWidth: 2, tension: 0, stepped: true, pointRadius: 0, yAxisID: 'yCumulative', order: 3 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: CHART_OPTS.scales.x,
            y: { ...CHART_OPTS.scales.y, position: 'left', stacked: true, min: 0, max: 2 },
            yCloud: { ...CHART_OPTS.scales.y, position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false } },
            yCumulative: { ...CHART_OPTS.scales.y, position: 'right', min: 0, max: 50, grid: { drawOnChartArea: false } }
          },
          datasets: { bar: { barPercentage: 0.8, categoryPercentage: 0.9 } }
        }
      });

      var modelSelect = document.getElementById('model-select');
      if (modelSelect) {
        modelSelect.selectedIndex = modelIdx;
        modelSelect.addEventListener('change', function() {
          modelIdx = modelSelect.selectedIndex;
          var selectedModel = MODELS[modelIdx] ? MODELS[modelIdx].name : 'ECMWF';
          setDefaultModel(selectedModel);
          loadModelData();
        });
      }

      loadModelData();
    })();
