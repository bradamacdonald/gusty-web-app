#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url.replace('/scripts/fix-imports.mjs', '')));
const SRC = path.join(ROOT, 'src');

const REPLACEMENTS = [
  ["from '../lib/init.js'", "from '../../app/bootstrap.js'"],
  ["from '../../lib/init.js'", "from '../../app/bootstrap.js'"],
  ['initApp()', 'bootstrap()'],
  ["import { initApp }", "import { bootstrap }"],
  ["from '../config/constants.js'", "from '../../lib/constants.js'"],
  ["from '../../config/constants.js'", "from '../../lib/constants.js'"],
  ["from '../stores/settings.js'", "from '../../services/storage/settings.js'"],
  ["from '../../stores/settings.js'", "from '../../services/storage/settings.js'"],
  ["from '../stores/saved-spots.js'", "from '../../services/storage/saved-spots.js'"],
  ["from '../../stores/saved-spots.js'", "from '../../services/storage/saved-spots.js'"],
  ["from '../services/open-meteo.js'", "from '../../services/api/open-meteo.js'"],
  ["from '../../services/open-meteo.js'", "from '../../services/api/open-meteo.js'"],
  ["from '../services/geocoding.js'", "from '../../services/api/geocoding.js'"],
  ["from '../../services/geocoding.js'", "from '../../services/api/geocoding.js'"],
  ["from '../components/bottom-nav.js'", "from '../../components/shell/bottom-nav.js'"],
  ["from '../../components/bottom-nav.js'", "from '../../components/shell/bottom-nav.js'"],
  ["from '../utils/", "from '../../lib/"],
  ["from '../../utils/", "from '../../lib/"],
  ["import '../../styles/pages/index.css'", "import './styles.css'"],
  ["import '../../styles/pages/forecast.css'", "import './styles.css'"],
  ["import '../../styles/pages/search.css'", "import './styles.css'"],
  ["import '../../styles/pages/saved.css'", "import './styles.css'"],
  ["import '../../styles/pages/settings.css'", "import './styles.css'"],
  ["import '../../styles/pages/detail.css'", "import './styles.css'"],
  ["attachGlobal } from '../stores/settings.js'", "attachGlobal } from '../services/storage/settings.js'"],
  ["applyTheme, attachGlobal } from '../stores/settings.js'", "applyTheme, attachGlobal } from '../services/storage/settings.js'"],
  ["getHairMode } from '../stores/settings.js'", "getHairMode } from '../services/storage/settings.js'"],
  ["from '../config/constants.js'", "from './constants.js'"],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.css')) {
      let content = fs.readFileSync(full, 'utf8');
      let changed = false;
      for (const [from, to] of REPLACEMENTS) {
        if (content.includes(from)) {
          content = content.split(from).join(to);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(full, content);
    }
  }
}

walk(SRC);

// Fix bootstrap relative import
const bootstrapPath = path.join(SRC, 'app/bootstrap.js');
let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
bootstrap = bootstrap.replace(
  "from '../services/storage/settings.js'",
  "from '../services/storage/settings.js'"
);
// bootstrap is in app/ so storage is ../services/storage/
bootstrap = bootstrap.replace(
  /from '\.\.\/stores\/settings\.js'/,
  "from '../services/storage/settings.js'"
);
fs.writeFileSync(bootstrapPath, bootstrap);

// Fix lib/hair-mode and lib/models - they're in lib/ so storage is ../services/storage/
const hairMode = path.join(SRC, 'lib/hair-mode.js');
let hm = fs.readFileSync(hairMode, 'utf8');
hm = hm.replace("from '../services/storage/settings.js'", "from '../services/storage/settings.js'");
hm = hm.replace("from '../../services/storage/settings.js'", "from '../services/storage/settings.js'");
fs.writeFileSync(hairMode, hm);

const models = path.join(SRC, 'lib/models.js');
let m = fs.readFileSync(models, 'utf8');
m = m.replace("from '../../lib/constants.js'", "from './constants.js'");
fs.writeFileSync(models, m);

// Fix saved-spots imports from lib perspective
const savedSpots = path.join(SRC, 'services/storage/saved-spots.js');
let ss = fs.readFileSync(savedSpots, 'utf8');
ss = ss.replace("from '../../lib/coordinates.js'", "from '../../lib/coordinates.js'");
ss = ss.replace("from './settings.js'", "from './settings.js'");
fs.writeFileSync(savedSpots, ss);

console.log('Import paths updated.');
