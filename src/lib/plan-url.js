/**
 * Merge trailhead/objective elevations into a forecast query string
 * so shared links reopen the same Plan setup.
 */
export function withPlanElevParams(search, th, obj) {
  const p = new URLSearchParams(
    typeof search === 'string' ? search.replace(/^\?/, '') : search || ''
  );
  if (Number.isFinite(th)) p.set('th', String(Math.round(th)));
  else p.delete('th');
  if (Number.isFinite(obj)) p.set('obj', String(Math.round(obj)));
  else p.delete('obj');
  return p.toString();
}
