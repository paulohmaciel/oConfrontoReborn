import { api } from './api';

export type ProductEvent = { name: string; page?: string; contentType?: string; contentId?: string; test?: boolean };
let lastPage = '';

// Telemetria enxuta: falha silenciosamente para nunca atrapalhar uma ação do jogo.
export function track(events: ProductEvent | ProductEvent[]) {
  const rows = Array.isArray(events) ? events : [events];
  if (!rows.length) return;
  void api('/analytics/events', { events: rows }).catch(() => {});
}
export function trackPageView(path = location.pathname) {
  // React StrictMode executa efeitos duas vezes no desenvolvimento; a mesma página só conta uma vez por navegação.
  if (lastPage === path) return;
  lastPage = path;
  track({ name: 'page_view', page: path });
}
export function trackSelect(select: HTMLSelectElement) {
  const label = select.getAttribute('data-track-content') || select.getAttribute('aria-label') || select.name || 'selecao';
  const value = select.value;
  if (!value) return;
  track({ name: 'select_content', page: location.pathname, contentType: 'select', contentId: `${label}:${value}`.slice(0, 120) });
}
