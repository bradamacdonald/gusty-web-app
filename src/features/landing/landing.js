import './styles.css';
import { bootstrap } from '../../app/bootstrap.js';
import {
  buildForecastUrlFromCoords,
  getRegionFromContext,
  searchPlaces,
} from '../../services/api/geocoding.js';

bootstrap();

const searchInput = document.getElementById('index-search-input');
const dropdown = document.getElementById('index-search-dropdown');
let debounceTimer = null;
let lastRequestId = 0;

const mountainIconSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 18 9-11 4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>';

function showDropdown() {
  dropdown.classList.remove('hidden');
}

function hideDropdown() {
  dropdown.classList.add('hidden');
}

function renderSuggestions(features, geonames) {
  dropdown.innerHTML = '';
  geonames = geonames || [];
  const total = (features || []).length + geonames.length;
  if (total === 0) {
    hideDropdown();
    return;
  }
  showDropdown();

  (features || []).forEach((f) => {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const [lng, lat] = coords;
    const name = (f.text || f.place_name || '').trim();
    const region = getRegionFromContext(f.context);
    const btn = document.createElement('button');
    btn.className = 'search-dropdown-item';
    btn.type = 'button';
    btn.innerHTML =
      '<span class="search-dropdown-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg></span><span class="search-dropdown-name"></span><span class="search-dropdown-region"></span>';
    btn.querySelector('.search-dropdown-name').textContent = name || 'Location';
    btn.querySelector('.search-dropdown-region').textContent = region || '';
    btn.addEventListener('click', () => {
      window.location.href = buildForecastUrlFromCoords(lat, lng, name || 'Location');
    });
    dropdown.appendChild(btn);
  });

  geonames.forEach((g) => {
    const lng = parseFloat(g.lng);
    const lat = parseFloat(g.lat);
    if (isNaN(lng) || isNaN(lat)) return;
    const name = (g.name || '').trim();
    const region = [g.adminName1, g.countryName].filter(Boolean).join(', ');
    const btn = document.createElement('button');
    btn.className = 'search-dropdown-item';
    btn.type = 'button';
    btn.innerHTML = `<span class="search-dropdown-icon search-dropdown-icon-mountain" title="Terrain feature">${mountainIconSvg}</span><span class="search-dropdown-name"></span><span class="search-dropdown-region"></span>`;
    btn.querySelector('.search-dropdown-name').textContent = name || 'Location';
    btn.querySelector('.search-dropdown-region').textContent = region || '';
    btn.addEventListener('click', () => {
      window.location.href = buildForecastUrlFromCoords(lat, lng, name || 'Location');
    });
    dropdown.appendChild(btn);
  });
}

async function fetchGeocode(query) {
  if (!query || query.trim().length < 3) {
    dropdown.innerHTML = '';
    hideDropdown();
    return;
  }
  const requestId = ++lastRequestId;
  const { features, geonames } = await searchPlaces(query);
  if (requestId !== lastRequestId) return;
  renderSuggestions(features, geonames);
}

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const query = searchInput.value.trim();
  if (query.length >= 3) {
    debounceTimer = setTimeout(() => fetchGeocode(query), 300);
  } else {
    dropdown.innerHTML = '';
    hideDropdown();
  }
});

searchInput.addEventListener('focus', () => {
  const query = searchInput.value.trim();
  if (dropdown.children.length > 0) {
    showDropdown();
  } else if (query.length >= 3) {
    fetchGeocode(query);
  }
});

document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.search-wrap');
  if (wrap && !wrap.contains(e.target)) hideDropdown();
});

const backdrop = document.getElementById('legal-backdrop');
const termsSheet = document.getElementById('legal-sheet-terms');
const privacySheet = document.getElementById('legal-sheet-privacy');

function closeLegalSheets() {
  backdrop.classList.remove('visible');
  termsSheet.classList.remove('visible');
  privacySheet.classList.remove('visible');
}

function openLegalSheet(sheetId) {
  closeLegalSheets();
  backdrop.classList.add('visible');
  const sheet = document.getElementById(`legal-sheet-${sheetId}`);
  if (sheet) sheet.classList.add('visible');
}

document.querySelectorAll('.legal-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sheet = link.getAttribute('data-sheet');
    if (sheet) openLegalSheet(sheet);
  });
});

backdrop.addEventListener('click', closeLegalSheets);
document.getElementById('legal-close-terms').addEventListener('click', closeLegalSheets);
document.getElementById('legal-close-privacy').addEventListener('click', closeLegalSheets);
