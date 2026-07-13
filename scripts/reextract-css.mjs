#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');

const SKIP_SECTIONS = new Set([
  'GUSTY.CA DESIGN TOKENS',
  'RESET + BASE',
  'BOTTOM NAVIGATION',
]);

function fromGit(file) {
  return execSync(`git show HEAD:${file}`, { cwd: ROOT, encoding: 'utf8' });
}

function extractStyle(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  return m ? m[1].trim() : '';
}

function splitBySections(css) {
  const headers = [...css.matchAll(/\/\* ={10,}\s*([\s\S]*?)\s*=+\s*\*\//g)].map((m) =>
    m[1].replace(/\s+/g, ' ').trim()
  );
  const parts = css.split(/\/\* ={10,}[\s\S]*?\*\/\s*/);
  return headers.map((title, i) => ({ title, body: (parts[i + 1] || '').trim() }));
}

function stripSectioned(css) {
  return splitBySections(css)
    .filter((s) => !SKIP_SECTIONS.has(s.title))
    .map((s) => `/* ${s.title} */\n${s.body}`)
    .join('\n\n')
    .trim();
}

function stripDetailTokens(css) {
  let r = css;
  r = r.replace(
    /\/\* =+[\s\S]*?GUSTY\.CA DESIGN TOKENS[\s\S]*?\*\/\s*/,
    ''
  );
  r = r.replace(/:root\s*\{[\s\S]*?--hour-cell-width:[^;]+;\s*\}/, '');
  r = r.replace(/html\.theme-light\s*\{[\s\S]*?\}/, '');
  r = r.replace(
    /\/\* =+[\s\S]*?BOTTOM NAVIGATION[\s\S]*?\*\/\s*\.bottom-nav[\s\S]*?\.nav-item\.active \.nav-icon\s*\{[\s\S]*?\}/,
    ''
  );
  return r.replace(/\n{3,}/g, '\n\n').trim();
}

function write(page, css, opts = {}) {
  const { importShared = true, extras = '' } = opts;
  const dir = path.join(ROOT, 'src/styles/pages');
  fs.mkdirSync(dir, { recursive: true });
  const header = importShared ? `@import '../shared.css';\n${extras}\n\n` : '';
  fs.writeFileSync(path.join(dir, `${page}.css`), `${header}${css}\n`);
  console.log(`${page}.css — ${css.split('\n').length} lines`);
}

for (const page of ['forecast', 'search', 'saved', 'settings']) {
  const css = stripSectioned(extractStyle(fromGit(`${page}.html`)));
  const extras =
    page === 'forecast'
      ? '\nbody {\n  padding-bottom: calc(var(--space-16) + var(--space-4));\n}'
      : '';
  write(page, css, { extras });
}

write('detail', stripDetailTokens(extractStyle(fromGit('detail.html'))));
write('index', extractStyle(fromGit('index.html')), { importShared: false });
