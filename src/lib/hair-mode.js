import { getHairMode } from '../services/storage/settings.js';

/** Detailed hair tiers for forecast popover */
export function getHairTier(kmh) {
  if (kmh == null) return { name: '—', oneliner: '' };
  const v = Number(kmh);
  if (v <= 5) return { name: 'No Drama', oneliner: 'Barely a whisper. Hair is completely safe.' };
  if (v <= 19) return { name: 'Hair Aware', oneliner: 'A gentle reminder that air exists.' };
  if (v <= 28) return { name: 'Windswept', oneliner: 'Romantic movie hair. Slightly chaotic.' };
  if (v <= 38) return { name: 'Character Building', oneliner: 'A toque is not optional.' };
  if (v <= 49) return { name: 'Absolutely Feral', oneliner: 'Your hair has filed for independence.' };
  if (v <= 61) return { name: 'Unhinged', oneliner: 'Forward progress is now a negotiation.' };
  if (v <= 74) return { name: 'Beyond Help', oneliner: 'You ARE the weather event.' };
  return { name: 'Do Not Go Outside', oneliner: 'gusty agrees with your hair on this one.' };
}

export function getStandardTierTooltip(kmh) {
  if (kmh == null) return '';
  const v = Number(kmh);
  if (v < 30) return 'Winds under 30 km/h.';
  if (v <= 60) return 'Winds 30–60 km/h.';
  return 'Winds over 60 km/h.';
}

export function isHairModeEnabled() {
  return getHairMode();
}
