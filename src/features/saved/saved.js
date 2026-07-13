import './styles.css';
import { bootstrap } from '../../app/bootstrap.js';
import { mountBottomNav } from '../../components/shell/bottom-nav.js';
import { formatElevation } from '../../lib/datetime.js';
import { spotKey } from '../../lib/coordinates.js';
import { fetchSpotWindSnapshot } from '../../services/compare-spots.js';
import {
  buildForecastUrl,
  getSavedSpots,
  getSpotDisplayData,
  setSavedSpots,
  updateSavedSpotWind,
} from '../../services/storage/saved-spots.js';

bootstrap();
mountBottomNav('saved');

const spotList = document.getElementById('spot-list');
const emptyState = document.getElementById('empty-state');

function renderSpots() {
  const spots = getSavedSpots();
  emptyState.classList.toggle('hidden', spots.length > 0);
  spotList.innerHTML = '';

  spots.forEach((spot) => {
    const d = getSpotDisplayData(spot);
    const wrapper = document.createElement('div');
    wrapper.className = 'spot-card-wrapper';
    const url = buildForecastUrl(spot);
    const displayName = (spot.name || 'Location').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    wrapper.innerHTML =
      `<div class="spot-card" data-lat="${spot.lat}" data-lng="${spot.lng}">` +
      '  <div class="spot-drag-handle" aria-label="Drag to reorder">' +
      '    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>' +
      '  </div>' +
      '  <div class="spot-card-content">' +
      `    <span class="spot-name">${displayName}</span>` +
      `    <span class="condition-badge badge-${d.condition}"><span class="dot"></span>${d.conditionLabel}</span>` +
      `    <div class="spot-meta">${formatElevation(spot.elevation)} · ${d.windDir}</div>` +
      `    <div class="spot-wind-speed ${d.windClass}">${d.windDisp} <span style="color:var(--color-text-secondary);font-size:var(--text-sm)">${d.windUnit}</span></div>` +
      '  </div>' +
      '  <button class="spot-delete-btn" type="button" aria-label="Delete spot">' +
      '    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>' +
      '  </button>' +
      '</div>';
    spotList.appendChild(wrapper);

    const card = wrapper.querySelector('.spot-card');
    card.addEventListener('click', (e) => {
      if (e.target.closest('.spot-delete-btn') || e.target.closest('.spot-drag-handle')) return;
      window.location.href = url;
    });

    wrapper.querySelector('.spot-delete-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = spotKey(spot.lat, spot.lng);
      setSavedSpots(getSavedSpots().filter((s) => spotKey(s.lat, s.lng) !== key));
      wrapper.style.maxHeight = `${wrapper.offsetHeight}px`;
      wrapper.offsetHeight;
      wrapper.classList.add('collapsing');
      setTimeout(() => {
        wrapper.remove();
        emptyState.classList.toggle('hidden', getSavedSpots().length > 0);
      }, 350);
    });
  });

  if (typeof Sortable !== 'undefined' && spots.length > 1) {
    new Sortable(spotList, {
      handle: '.spot-drag-handle',
      draggable: '.spot-card-wrapper',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onMove(evt) {
        spotList.querySelector('.drop-indicator')?.remove();
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        const { related } = evt;
        if (evt.willInsertAfter) {
          spotList.insertBefore(indicator, related.nextSibling);
        } else {
          spotList.insertBefore(indicator, related);
        }
      },
      onEnd() {
        spotList.querySelector('.drop-indicator')?.remove();
        const order = [];
        spotList.querySelectorAll('.spot-card-wrapper').forEach((w) => {
          const card = w.querySelector('.spot-card');
          if (!card) return;
          const lat = parseFloat(card.dataset.lat);
          const lng = parseFloat(card.dataset.lng);
          const found = getSavedSpots().find(
            (s) => Math.abs(s.lat - lat) < 0.0001 && Math.abs(s.lng - lng) < 0.0001
          );
          if (found) order.push(found);
        });
        setSavedSpots(order);
      },
    });
  }
}

async function refreshSavedWinds() {
  const spots = getSavedSpots();
  if (!spots.length) return;

  const results = await Promise.all(
    spots.map(async (spot) => {
      try {
        const snap = await fetchSpotWindSnapshot(spot);
        return { spot, snap };
      } catch {
        return { spot, snap: null };
      }
    })
  );

  let changed = false;
  results.forEach(({ spot, snap }) => {
    if (!snap || snap.error || snap.speed == null) return;
    const updated = updateSavedSpotWind(spot.lat, spot.lng, {
      windSpeed: snap.speed,
      windDirection: snap.dirLabel !== '—' ? snap.dirLabel : null,
      elevation: spot.elevation,
    });
    if (updated) changed = true;
  });

  if (changed) renderSpots();
}

renderSpots();
refreshSavedWinds();
