/**
 * Terrain aspect / slope math from a 3×3 elevation neighborhood (metres).
 * Aspect: degrees clockwise from north (0 = N, 90 = E, 180 = S, 270 = W).
 */

export const ASPECT_OFFSET_M = 60;

/** Offset a lat/lng by metres north (dy) and east (dx). */
export function offsetLatLng(lat, lng, dxMeters, dyMeters) {
  const dLat = dyMeters / 111320;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = cosLat === 0 ? 0 : dxMeters / (111320 * cosLat);
  return { lat: lat + dLat, lng: lng + dLng };
}

/**
 * Build a 3×3 sampling grid around a point (NW…SE row-major).
 * @returns {{ lat: number, lng: number }[]}
 */
export function buildElevationSamplePoints(lat, lng, offsetM = ASPECT_OFFSET_M) {
  const deltas = [
    [-offsetM, offsetM],
    [0, offsetM],
    [offsetM, offsetM],
    [-offsetM, 0],
    [0, 0],
    [offsetM, 0],
    [-offsetM, -offsetM],
    [0, -offsetM],
    [offsetM, -offsetM],
  ];
  return deltas.map(([dx, dy]) => offsetLatLng(lat, lng, dx, dy));
}

/**
 * Horn's formula slope/aspect from 3×3 elev grid (metres).
 * Grid order: [NW,N,NE, W,C,E, SW,S,SE]
 */
export function computeSlopeAspect(elevations, cellSizeM = ASPECT_OFFSET_M) {
  if (!Array.isArray(elevations) || elevations.length < 9) {
    return null;
  }
  const e = elevations.map((v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v)));
  if (e.some((v) => v == null)) return null;

  const [nw, n, ne, w, , eCell, sw, s, se] = e;
  const dzdx = (ne + 2 * eCell + se - (nw + 2 * w + sw)) / (8 * cellSizeM);
  const dzdy = (nw + 2 * n + ne - (sw + 2 * s + se)) / (8 * cellSizeM);

  const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
  const slopeDeg = (slopeRad * 180) / Math.PI;

  // Flat terrain — aspect undefined
  if (slopeDeg < 2) {
    return {
      slopeDeg,
      aspectDeg: null,
      aspectLabel: 'Flat',
      aspectCardinal: null,
      isFlat: true,
    };
  }

  // Aspect: direction of steepest descent (slope facing), 0=N, 90=E
  let aspectDeg = (Math.atan2(-dzdx, dzdy) * 180) / Math.PI;
  if (aspectDeg < 0) aspectDeg += 360;

  return {
    slopeDeg,
    aspectDeg,
    aspectLabel: degreesToAspectLabel(aspectDeg),
    aspectCardinal: degreesToAspectCardinal(aspectDeg),
    isFlat: false,
  };
}

export function degreesToAspectLabel(deg) {
  if (deg == null || Number.isNaN(deg)) return '—';
  const dirs = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return dirs[i];
}

export function degreesToAspectCardinal(deg) {
  if (deg == null || Number.isNaN(deg)) return null;
  const dirs = ['N', 'E', 'S', 'W'];
  const i = Math.round((((deg % 360) + 360) % 360) / 90) % 4;
  return dirs[i];
}

/**
 * Classify whether a slope facing `aspectDeg` is windward, lee, or cross
 * given meteorological wind-from direction.
 */
export function classifyWindExposure(aspectDeg, windFromDeg) {
  if (aspectDeg == null || windFromDeg == null) {
    return { kind: 'unknown', label: '—' };
  }
  const windTo = (windFromDeg + 180) % 360;
  let delta = Math.abs(aspectDeg - windTo);
  if (delta > 180) delta = 360 - delta;

  // Slope faces roughly where wind is going → lee
  if (delta <= 45) {
    return { kind: 'lee', label: 'Lee to this wind' };
  }
  // Slope faces into the wind → windward
  if (delta >= 135) {
    return { kind: 'windward', label: 'Windward to this wind' };
  }
  return { kind: 'cross', label: 'Cross-loaded / cross aspect' };
}

export function formatAspectSummary(terrain, windFromDeg) {
  if (!terrain) return 'Aspect unavailable for this spot.';
  if (terrain.isFlat) {
    return `Terrain ~flat (slope ${terrain.slopeDeg.toFixed(0)}°) — aspect not meaningful.`;
  }
  const slope = terrain.slopeDeg.toFixed(0);
  const aspect = terrain.aspectLabel;
  const exposure = classifyWindExposure(terrain.aspectDeg, windFromDeg);
  if (windFromDeg == null) {
    return `Objective aspect ${aspect} · slope ~${slope}°`;
  }
  return `Objective faces ${aspect} · slope ~${slope}° · ${exposure.label}`;
}
