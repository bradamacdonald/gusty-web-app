import { applyTheme } from '../services/storage/settings.js';

/** Bootstrap shared app state on every page */
export function bootstrap() {
  applyTheme();
}
