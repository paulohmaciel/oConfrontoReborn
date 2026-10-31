export type Theme = 'light' | 'dark';
export const THEME_KEY = 'oconfronto-theme';
export function savedTheme(): Theme {
  // O tema escuro é o principal: só vira claro se a pessoa escolheu isso.
  try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}
export function applyTheme(theme: Theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#ddc89c' : '#171c20');
  if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch { /* Tema funciona mesmo sem armazenamento. */ } }
}
