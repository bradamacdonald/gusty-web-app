#!/usr/bin/env node
/**
 * One-time migration helper: extracts inline <style> and <script> from HTML pages
 * into src/styles/pages/ and src/js/pages/ modules.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');

const PAGES = [
  'forecast',
  'search',
  'saved',
  'settings',
  'detail',
  'index',
];

const STRIP_CSS_PATTERNS = [
  /\/\* =+[\s\S]*?GUSTY\.CA DESIGN TOKENS[\s\S]*?--hour-cell-width: 52px;\s*\}/,
  /html\.theme-light\s*\{[\s\S]*?--color-text-inverse:\s*#F0F4F8;\s*\}/,
  /\/\* =+[\s\S]*?RESET \+ BASE[\s\S]*?padding-bottom: calc\(var\(--space-16\) \+ var\(--space-4\)\);\s*\}/,
  /\/\* =+[\s\S]*?BOTTOM NAVIGATION[\s\S]*?padding: 4px;\s*\}/,
  /\*[\s\S]*?box-sizing: border-box; margin: 0; padding: 0;\s*\}/,
  /html\s*\{[\s\S]*?-webkit-font-smoothing: antialiased;\s*\}/,
  /body\s*\{[\s\S]*?padding: 0;\s*\}/,
  /\.app-frame\s*\{[\s\S]*?padding-bottom: calc\(var\(--space-16\) \+ var\(--space-4\)\);\s*\}/,
  /html\.theme-light \.app-frame\s*\{[\s\S]*?\}/,
];

function extractBetween(html, startTag, endTag, fromIndex = 0) {
  const starts = [];
  let i = fromIndex;
  while (true) {
    const idx = html.indexOf(startTag, i);
    if (idx === -1) break;
    starts.push(idx);
    i = idx + startTag.length;
  }
  if (!starts.length) return null;

  // Use last inline script block before </body> for page logic
  const start = startTag === '<script>' ? starts[starts.length - 1] : starts[0];
  const contentStart = start + startTag.length;
  const end = html.indexOf(endTag, contentStart);
  if (end === -1) return null;
  return html.slice(contentStart, end).trim();
}

function stripSharedCss(css) {
  let result = css;
  for (const pattern of STRIP_CSS_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

for (const page of PAGES) {
  const htmlPath = path.join(ROOT, `${page}.html`);
  if (!fs.existsSync(htmlPath)) continue;

  const html = fs.readFileSync(htmlPath, 'utf8');
  const styleContent = extractBetween(html, '<style>', '</style>');
  const scriptContent = extractBetween(html, '<script>', '</script>');

  if (styleContent) {
    const cssDir = path.join(ROOT, 'src/styles/pages');
    fs.mkdirSync(cssDir, { recursive: true });
    const pageCss = stripSharedCss(styleContent);
    const out = `@import '../shared.css';\n\n${pageCss}\n`;
    fs.writeFileSync(path.join(cssDir, `${page}.css`), out);
    console.log(`Wrote src/styles/pages/${page}.css`);
  }

  if (scriptContent && !scriptContent.includes('GustySettings.applyTheme')) {
    const jsDir = path.join(ROOT, 'src/js/pages');
    fs.mkdirSync(jsDir, { recursive: true });
    const wrapped = `import '../../styles/pages/${page}.css';\nimport { initApp } from '../lib/init.js';\n\ninitApp();\n\n${scriptContent}\n`;
    fs.writeFileSync(path.join(jsDir, `${page}.js`), wrapped);
    console.log(`Wrote src/js/pages/${page}.js`);
  }
}

console.log('Extraction complete.');
