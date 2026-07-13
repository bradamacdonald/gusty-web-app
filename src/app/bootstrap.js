import { applyTheme, attachGlobal } from '../services/storage/settings.js';

/** Bootstrap shared app state on every page */
export function bootstrap() {
  attachGlobal();
  applyTheme();
}
