import { describe, expect, it } from 'vitest';
import {
  normalizeSearchQuery,
  rankSuggestions,
  searchCuratedSpots,
} from '../src/services/api/geocoding.js';

describe('normalizeSearchQuery', () => {
  it('collapses case, punctuation, and spacing', () => {
    expect(normalizeSearchQuery('WhiteWater')).toBe('whitewater');
    expect(normalizeSearchQuery('White-Water')).toBe('white water');
    expect(normalizeSearchQuery("O'Hara")).toBe('ohara');
  });
});

describe('searchCuratedSpots', () => {
  it('ranks Whitewater Ski Resort for WhiteWater', () => {
    const hits = searchCuratedSpots('WhiteWater');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].name).toBe('Whitewater Ski Resort');
    expect(hits[0].region).toBe('BC');
    expect(hits[0].lat).toBeCloseTo(49.441, 2);
    expect(hits[0].lng).toBeCloseTo(-117.15, 2);
  });

  it('finds Alberta resorts by alias', () => {
    const louise = searchCuratedSpots('lake louise');
    expect(louise[0].name).toMatch(/Lake Louise/i);
    expect(louise[0].region).toBe('AB');

    const sunshine = searchCuratedSpots('Sunshine');
    expect(sunshine[0].name).toMatch(/Sunshine/i);
    expect(sunshine[0].region).toBe('AB');
  });

  it('finds Whistler', () => {
    const hits = searchCuratedSpots('whistler');
    expect(hits[0].name).toMatch(/Whistler/i);
    expect(hits[0].region).toBe('BC');
  });
});

describe('rankSuggestions', () => {
  it('keeps curated Whitewater above a distant Mapbox place', () => {
    const curated = searchCuratedSpots('WhiteWater');
    const features = [
      {
        text: 'Whitewater',
        place_name: 'Whitewater, Manitoba, Canada',
        place_type: ['place'],
        context: [
          { id: 'region.1', text: 'Manitoba' },
          { id: 'country.1', text: 'Canada' },
        ],
        geometry: { coordinates: [-100.3, 49.2] },
      },
    ];

    const ranked = rankSuggestions('WhiteWater', { curated, features, geonames: [] });
    expect(ranked.curated[0].name).toBe('Whitewater Ski Resort');
    expect(ranked.ordered[0].source).toBe('curated');
    expect(ranked.ordered[0].data.name).toBe('Whitewater Ski Resort');
  });

  it('demotes non-western provinces for recreational queries', () => {
    const ranked = rankSuggestions('Temple', {
      curated: [],
      features: [
        {
          text: 'Temple',
          place_name: 'Temple, Manitoba, Canada',
          place_type: ['place'],
          context: [
            { id: 'region.1', text: 'Manitoba' },
            { id: 'country.1', text: 'Canada' },
          ],
          geometry: { coordinates: [-100.0, 50.0] },
        },
        {
          text: 'Temple Peak',
          place_name: 'Temple Peak, Alberta, Canada',
          place_type: ['poi'],
          context: [
            { id: 'region.1', text: 'Alberta' },
            { id: 'country.1', text: 'Canada' },
          ],
          geometry: { coordinates: [-116.2, 51.35] },
        },
      ],
      geonames: [],
    });

    expect(ranked.features[0].text).toBe('Temple Peak');
  });
});
