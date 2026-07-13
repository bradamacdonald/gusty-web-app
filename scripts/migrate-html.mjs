#!/usr/bin/env node
/**
 * Rewrites HTML entry points to use Vite module architecture.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Barlow:ital,wght@1,700&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap';
const FONT_URL_LANDING =
  'https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;1,700&family=DM+Mono:wght@400;500&family=Inter:wght@400;500&display=swap';

const PAGE_CONFIG = {
  index: { title: 'Gusty — Mountain Wind Forecasts', font: FONT_URL_LANDING, module: true, nav: false },
  forecast: { title: 'Forecast — gusty.ca', font: FONT_URL, module: true, nav: 'location', lucide: true },
  search: { title: 'Search — gusty.ca', font: FONT_URL, module: true, nav: 'search', mapbox: true },
  saved: { title: 'Saved — gusty.ca', font: FONT_URL, module: true, nav: 'saved', sortable: true },
  settings: { title: 'Settings — gusty.ca', font: FONT_URL, module: true, nav: 'settings' },
  detail: { title: 'Model Detail — gusty.ca', font: FONT_URL, module: true, nav: 'location', chartjs: true },
};

function buildHead(page, config) {
  const extra = [];
  if (config.mapbox) {
    extra.push('  <link href="https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css" rel="stylesheet">');
    extra.push('  <script src="https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.js"></script>');
  }
  if (config.lucide) {
    extra.push('  <script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>');
  }
  if (config.sortable) {
    extra.push('  <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>');
  }
  if (config.chartjs) {
    extra.push('  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js"></script>');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <title>${config.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${config.font}" rel="stylesheet">
${extra.join('\n')}
  <script type="module" src="/src/js/pages/${page}.js"></script>
  <script defer src="/_vercel/insights/script.js"></script>
</head>`;
}

function stripHeadAndScripts(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) return html;
  let body = bodyMatch[1];

  // Remove inline style blocks
  body = body.replace(/<style>[\s\S]*?<\/style>/gi, '');
  // Remove inline script blocks
  body = body.replace(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/gi, '');

  return body.trim();
}

function replaceBottomNav(body, navId) {
  if (!navId) return body;
  const navPattern =
    /<!-- BOTTOM NAVIGATION -->[\s\S]*?<nav class="bottom-nav">[\s\S]*?<\/nav>/;
  if (navPattern.test(body)) {
    return body.replace(navPattern, '<!-- BOTTOM NAVIGATION -->\n  <nav id="bottom-nav"></nav>');
  }
  return body;
}

for (const [page, config] of Object.entries(PAGE_CONFIG)) {
  const htmlPath = path.join(ROOT, `${page}.html`);
  if (!fs.existsSync(htmlPath)) continue;

  const original = fs.readFileSync(htmlPath, 'utf8');
  let body = stripHeadAndScripts(original);
  body = replaceBottomNav(body, config.nav);

  const out = `${buildHead(page, config)}
<body>

${body}

</body>
</html>
`;

  fs.writeFileSync(htmlPath, out);
  console.log(`Updated ${page}.html`);
}

console.log('HTML migration complete.');
