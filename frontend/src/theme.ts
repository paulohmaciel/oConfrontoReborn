export type Theme = 'light' | 'dark';
export const THEME_KEY = 'oconfronto-theme';
export function savedTheme(): Theme {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}
export function applyTheme(theme: Theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#ddc89c' : '#171c20');
  if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch { /* Tema funciona mesmo sem armazenamento. */ } }
}
