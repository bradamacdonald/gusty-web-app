import './styles.css';
import { bootstrap } from '../../app/bootstrap.js';
import { mountBottomNav } from '../../components/shell/bottom-nav.js';
import {
  getHairMode,
  setHairMode,
  getUnits,
  setUnits,
  getTheme,
  setTheme,
  getDefaultModel,
  setDefaultModel,
  applyTheme,
} from '../../services/storage/settings.js';

bootstrap();
mountBottomNav('settings');

const hairToggle = document.getElementById('hair-toggle');
hairToggle.classList.toggle('on', getHairMode());
hairToggle.setAttribute('aria-checked', getHairMode());
hairToggle.addEventListener('click', () => {
  const on = !getHairMode();
  setHairMode(on);
  hairToggle.classList.toggle('on', on);
  hairToggle.setAttribute('aria-checked', on);
});
hairToggle.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    hairToggle.click();
  }
});

const unitsControl = document.querySelector('.settings-section:nth-of-type(2) .segmented-control');
const unitsOptions = unitsControl.querySelectorAll('.segmented-option');
const currentUnits = getUnits();
unitsOptions.forEach((btn) => {
  btn.classList.toggle('active', btn.dataset.value === currentUnits);
  btn.addEventListener('click', () => {
    setUnits(btn.dataset.value);
    unitsOptions.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

const themeControl = document.querySelector('.settings-section:nth-of-type(3) .segmented-control');
const themeOptions = themeControl.querySelectorAll('.segmented-option');
const currentTheme = getTheme();
themeOptions.forEach((btn) => {
  btn.classList.toggle('active', btn.dataset.value === currentTheme);
  btn.addEventListener('click', () => {
    setTheme(btn.dataset.value);
    themeOptions.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    applyTheme();
  });
});

const modelSelect = document.getElementById('default-model');
modelSelect.value = getDefaultModel();
modelSelect.addEventListener('change', () => {
  setDefaultModel(modelSelect.value);
});
