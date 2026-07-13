import './styles.css';
import { bootstrap } from '../../app/bootstrap.js';
import { mountBottomNav } from '../../components/shell/bottom-nav.js';
import { DEFAULT_LAT, DEFAULT_LON, MAPBOX_TOKEN } from '../../lib/constants.js';
import { fetchCurrentWeather } from '../../services/api/open-meteo.js';
import {
  getRegionFromContext,
  onlyStreetOrAddress,
  reverseGeocodeSmart,
  searchMapboxPlaces,
  searchNearbyTerrain,
  searchTerrainFeatures,
} from '../../services/api/geocoding.js';
import { formatCoordinates, isCoordinateLike } from '../../lib/coordinates.js';
import { getCurrentHourIndex } from '../../lib/datetime.js';
import { formatTemp, formatWindSpeed } from '../../services/storage/settings.js';
import { degreesToCompass } from '../../lib/wind.js';

bootstrap();
mountBottomNav('search');

document.addEventListener('DOMContentLoaded', function() {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      var STATES = { DEFAULT: 1, SEARCHING: 2, SELECTED: 3 };
      var state = STATES.DEFAULT;
      var selectedLocation = null;
      var debounceTimer = null;
      var lastRequestId = 0;

      var sheet = document.getElementById('bottom-sheet');
      var searchBar = document.getElementById('search-bar');
      var searchInput = document.getElementById('search-input');
      var suggestionsList = document.getElementById('suggestions-list');
      var mapDimOverlay = document.getElementById('map-dim-overlay');

      var defaultCenter = [-122.8, 49.85];
      var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: defaultCenter,
        zoom: 11
      });

      var markerEl = document.createElement('div');
      markerEl.innerHTML = "<svg width='28' height='36' viewBox='0 0 28 36' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22s14-12.667 14-22C28 6.268 21.732 0 14 0z' fill='#F97316'/><circle cx='14' cy='14' r='5' fill='white'/></svg>";
      markerEl.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))';
      var marker = new mapboxgl.Marker({ element: markerEl, anchor: 'bottom' })
        .setLngLat(defaultCenter)
        .addTo(map);

      // Zoom controls
      document.getElementById('map-zoom-in').addEventListener('click', function() {
        map.zoomIn();
      });
      document.getElementById('map-zoom-out').addEventListener('click', function() {
        map.zoomOut();
      });

      function flyToLocation(lng, lat) {
        map.flyTo({
          center: [lng, lat],
          zoom: 13,
          duration: 1200
        });
        marker.setLngLat([lng, lat]);
      }

      function fetchReverseGeocode(lng, lat, callback) {
        var coordsStr = formatCoordinates(lat, lng);
        reverseGeocodeSmart(lng, lat, coordsStr).then(callback).catch(function() { callback(coordsStr); });
      }

      map.on('click', function(e) {
        var lng = e.lngLat.lng;
        var lat = e.lngLat.lat;
        marker.setLngLat([lng, lat]);
        fetchReverseGeocode(lng, lat, function(name) {
          var coordsStr = formatCoordinates(lat, lng);
          if (!isCoordinateLike(name)) {
            goToSelected(name, '—', coordsStr, lat, lng);
            return;
          }
          searchNearbyTerrain(lat, lng)
            .then(function(terrainName) {
              goToSelected(terrainName || 'Dropped Pin', '—', coordsStr, lat, lng);
            })
            .catch(function() {
              goToSelected('Dropped Pin', '—', coordsStr, lat, lng);
            });
        });
      });

      function fetchGeocode(query) {
        var requestId = ++lastRequestId;
        searchBar.classList.add('loading');
        searchMapboxPlaces(query)
          .then(function(features) {
            if (requestId !== lastRequestId) return;
            var needsFallback = features.length === 0 || onlyStreetOrAddress(features);
            if (needsFallback && query.trim().length >= 4) {
              return searchTerrainFeatures(query).then(function(geonames) {
                if (requestId !== lastRequestId) return;
                searchBar.classList.remove('loading');
                renderSuggestions(features, geonames);
              });
            }
            searchBar.classList.remove('loading');
            renderSuggestions(features, []);
          })
          .catch(function() {
            if (requestId !== lastRequestId) return;
            if (query.trim().length < 4) {
              searchBar.classList.remove('loading');
              renderSuggestions([], []);
              return;
            }
            searchTerrainFeatures(query)
              .then(function(geonames) {
                if (requestId !== lastRequestId) return;
                searchBar.classList.remove('loading');
                renderSuggestions([], geonames);
              })
              .catch(function() {
                if (requestId !== lastRequestId) return;
                searchBar.classList.remove('loading');
                renderSuggestions([], []);
              });
          });
      }

      var mountainIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 18 9-11 4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>';

      function renderSuggestions(features, geonames) {
        suggestionsList.innerHTML = '';
        geonames = geonames || [];
        var total = (features || []).length + geonames.length;
        if (total === 0) {
          suggestionsList.classList.add('hidden');
          return;
        }
        suggestionsList.classList.remove('hidden');
        (features || []).forEach(function(f) {
          var coords = f.geometry && f.geometry.coordinates;
          if (!coords || coords.length < 2) return;
          var lng = coords[0];
          var lat = coords[1];
          var name = f.text || f.place_name || '';
          var region = getRegionFromContext(f.context);
          var coordsStr = formatCoordinates(lat, lng);
          var btn = document.createElement('button');
          btn.className = 'suggestion-item';
          btn.type = 'button';
          btn.dataset.name = name;
          btn.dataset.elev = '—';
          btn.dataset.coords = coordsStr;
          btn.dataset.lat = lat;
          btn.dataset.lng = lng;
          btn.innerHTML = '<span class="suggestion-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg></span><span class="suggestion-name"></span><span class="suggestion-region"></span>';
          btn.querySelector('.suggestion-name').textContent = name || '';
          btn.querySelector('.suggestion-region').textContent = region || '';
          btn.addEventListener('click', function() {
            var name = btn.dataset.name;
            var displayName = (name && !isCoordinateLike(name)) ? name : 'Dropped Pin';
            goToSelected(displayName, btn.dataset.elev, btn.dataset.coords, btn.dataset.lat, btn.dataset.lng);
            suggestionsList.innerHTML = '';
            suggestionsList.classList.add('hidden');
          });
          suggestionsList.appendChild(btn);
        });
        geonames.forEach(function(g) {
          var lng = parseFloat(g.lng);
          var lat = parseFloat(g.lat);
          if (isNaN(lng) || isNaN(lat)) return;
          var name = (g.name || '').trim();
          var region = [g.adminName1, g.countryName].filter(Boolean).join(', ');
          var elev = (g.elevation != null && !isNaN(g.elevation)) ? Math.round(g.elevation).toLocaleString() + ' m' : '—';
          var coordsStr = formatCoordinates(lat, lng);
          var btn = document.createElement('button');
          btn.className = 'suggestion-item suggestion-item-geonames';
          btn.type = 'button';
          btn.dataset.name = name;
          btn.dataset.elev = elev;
          btn.dataset.coords = coordsStr;
          btn.dataset.lat = lat;
          btn.dataset.lng = lng;
          btn.innerHTML = '<span class="suggestion-icon suggestion-icon-mountain" title="Terrain feature">' + mountainIconSvg + '</span><span class="suggestion-name"></span><span class="suggestion-region"></span>';
          btn.querySelector('.suggestion-name').textContent = name || 'Location';
          btn.querySelector('.suggestion-region').textContent = region || '';
          btn.addEventListener('click', function() {
            var name = btn.dataset.name;
            var displayName = (name && !isCoordinateLike(name)) ? name : 'Dropped Pin';
            goToSelected(displayName, btn.dataset.elev, btn.dataset.coords, btn.dataset.lat, btn.dataset.lng);
            suggestionsList.innerHTML = '';
            suggestionsList.classList.add('hidden');
          });
          suggestionsList.appendChild(btn);
        });
      }

      function setState(newState) {
        state = newState;
        if (state === STATES.DEFAULT) {
          suggestionsList.classList.add('hidden');
          sheet.classList.add('hidden');
          mapDimOverlay.classList.remove('visible');
          searchInput.value = '';
          searchInput.placeholder = 'Search a peak, trailhead, or spot…';
        } else if (state === STATES.SEARCHING) {
          sheet.classList.add('hidden');
          mapDimOverlay.classList.add('visible');
          if (selectedLocation) {
            searchInput.value = selectedLocation.name;
            searchInput.placeholder = '';
          } else {
            searchInput.value = searchInput.value || '';
            searchInput.placeholder = 'Search a peak, trailhead, or spot…';
          }
        } else if (state === STATES.SELECTED) {
          suggestionsList.innerHTML = '';
          suggestionsList.classList.add('hidden');
          sheet.classList.remove('hidden');
          sheet.classList.remove('peek');
          sheet.classList.add('expanded');
          mapDimOverlay.classList.remove('visible');
          searchInput.value = selectedLocation.name;
          searchInput.placeholder = '';
          document.querySelector('.sheet-location-name').textContent = selectedLocation.name;
          document.querySelector('.sheet-coords').textContent = selectedLocation.coords;
          var cta = document.getElementById('sheet-cta');
          if (cta) cta.href = buildForecastUrl();
        }
      }

      function toggleSheetExpand() {
        if (state !== STATES.SELECTED || sheet.classList.contains('hidden')) return;
        if (sheet.classList.contains('peek')) {
          sheet.classList.remove('peek');
          sheet.classList.add('expanded');
        } else {
          sheet.classList.remove('expanded');
          sheet.classList.add('peek');
        }
      }

      function goToSearching() {
        setState(STATES.SEARCHING);
      }

      function loadWeatherPreview(lat, lng) {
        var windEl = document.getElementById('sheet-weather-wind');
        var tempEl = document.getElementById('sheet-weather-temp');
        var elevEl = document.getElementById('sheet-weather-elev');
        if (windEl) windEl.textContent = '—';
        if (tempEl) tempEl.textContent = '—';
        if (elevEl) elevEl.textContent = '';

        fetchCurrentWeather(lat, lng)
          .then(function(data) {
            var h = data.hourly;
            if (!h || !h.time || h.time.length === 0) return;
            var idx = getCurrentHourIndex(h);
            var speed = h.windspeed_10m && h.windspeed_10m[idx];
            var dir = h.winddirection_10m && h.winddirection_10m[idx];
            var tempC = h.temperature_2m && h.temperature_2m[idx];
            var windFmt = formatWindSpeed(speed);
            var tempFmt = formatTemp(tempC);
            var windStr = windFmt.value !== '—' ? windFmt.value + ' ' + windFmt.unit + ' ' + degreesToCompass(dir) : '—';
            var tempStr = tempFmt.value !== '—' ? tempFmt.value + tempFmt.unit : '—';
            var elev = data.elevation;
            var elevStr = (elev != null && !isNaN(elev)) ? Math.round(elev).toLocaleString() + ' m' : '';
            if (windEl) windEl.textContent = windStr;
            if (tempEl) tempEl.textContent = tempStr;
            if (elevEl) elevEl.textContent = elevStr;
          })
          .catch(function() {
            if (windEl) windEl.textContent = '—';
            if (tempEl) tempEl.textContent = '—';
            if (elevEl) elevEl.textContent = '';
          });
      }

      function goToSelected(name, elev, coords, lat, lng) {
        selectedLocation = { name: name, elev: elev, coords: coords, lat: lat, lng: lng };
        setState(STATES.SELECTED);
        if (lat != null && lng != null) {
          flyToLocation(parseFloat(lng), parseFloat(lat));
          loadWeatherPreview(parseFloat(lat), parseFloat(lng));
        }
      }

      function parseElevation(elevStr) {
        if (!elevStr || elevStr === '—') return 1580;
        var m = String(elevStr).match(/([\d,]+)\s*m/);
        return m ? parseInt(m[1].replace(/,/g, ''), 10) : 1580;
      }

      function buildForecastUrl() {
        if (!selectedLocation || selectedLocation.lat == null || selectedLocation.lng == null) {
          return 'forecast.html?lat=' + DEFAULT_LAT + '&lng=' + DEFAULT_LON + '&elevation=1580&name=Garibaldi+Lake+TH';
        }
        var name = selectedLocation.name || 'Location';
        if (isCoordinateLike(name)) name = 'Location';
        var params = new URLSearchParams({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          elevation: parseElevation(selectedLocation.elev),
          name: name
        });
        return 'forecast.html?' + params.toString();
      }

      function dismissSuggestions() {
        if (selectedLocation) {
          setState(STATES.SELECTED);
        } else {
          setState(STATES.DEFAULT);
        }
      }

      searchBar.addEventListener('click', function() {
        if (state === STATES.DEFAULT || state === STATES.SELECTED) {
          goToSearching();
        }
      });

      searchInput.addEventListener('input', function() {
        var query = searchInput.value.trim();
        if (state !== STATES.SEARCHING) goToSearching();
        clearTimeout(debounceTimer);
        if (query.length >= 3) {
          debounceTimer = setTimeout(function() {
            fetchGeocode(query);
          }, 300);
        } else {
          renderSuggestions([]);
        }
      });

      searchInput.addEventListener('focus', function() {
        if (state === STATES.DEFAULT || state === STATES.SELECTED) {
          goToSearching();
        }
      });

      mapDimOverlay.addEventListener('click', function() {
        if (state === STATES.SEARCHING) {
          dismissSuggestions();
        }
      });

      document.addEventListener('click', function(e) {
        if (state === STATES.SEARCHING &&
            !searchBar.contains(e.target) && !suggestionsList.contains(e.target)) {
          dismissSuggestions();
        }
      });

      var sheetHandle = document.getElementById('sheet-handle');
      var sheetPeekArea = document.getElementById('sheet-peek-area');
      if (sheetHandle) sheetHandle.addEventListener('click', toggleSheetExpand);
      if (sheetPeekArea) sheetPeekArea.addEventListener('click', function() {
        if (state === STATES.SELECTED && sheet.classList.contains('peek')) {
          sheet.classList.remove('peek');
          sheet.classList.add('expanded');
        }
      });

      // Check for ?q= URL param and auto-populate + trigger search
      var urlParams = new URLSearchParams(window.location.search);
      var q = urlParams.get('q');
      if (q && typeof q === 'string') {
        var query = q.trim();
        searchInput.value = query;
        goToSearching();
        if (query.length >= 3) {
          fetchGeocode(query);
        }
      }
    });
