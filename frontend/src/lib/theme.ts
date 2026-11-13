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

// Animações: ligadas por padrão (decisão do dono em 2026-11-12, por causa da arena de batalha). Só ficam paradas se a pessoa
// desligar no jogo (Configurações ou o botão da arena). Quem pede menos movimento no sistema ainda tem as transições e os
// enfeites reduzidos pelas regras @media(prefers-reduced-motion) do CSS. Aplicado antes da renderização, como o tema.
export type Motion = 'reduce' | 'full';
export const MOTION_KEY = 'oconfronto-motion';
export function savedMotion(): Motion {
  try { if (localStorage.getItem(MOTION_KEY) === 'reduce') return 'reduce'; } catch { /* sem armazenamento: animações ligadas */ }
  return 'full';
}
export function applyMotion(motion: Motion, persist = true) {
  if (motion === 'reduce') document.documentElement.dataset.motion = 'reduce'; else delete document.documentElement.dataset.motion;
  if (persist) { try { localStorage.setItem(MOTION_KEY, motion); } catch { /* funciona sem armazenamento */ } }
}
export const smooth = (): ScrollBehavior => document.documentElement.dataset.motion === 'reduce' ? 'auto' : 'smooth';

// Para o que o CSS não consegue parar (um GIF animado): a tela pergunta aqui se as animações estão desligadas e é
// avisada quando isso muda (botão em Configurações ou na arena, outra aba). Um só observador para todos os ícones.
export const motionStill = () => document.documentElement.dataset.motion === 'reduce';
const motionListeners = new Set<() => void>();
let motionObserver: MutationObserver | null = null;
/** Para `useSyncExternalStore`: chama `changed` quando `motionStill` muda e devolve como parar de ouvir. */
export function watchMotion(changed: () => void) {
  motionListeners.add(changed);
  if (!motionObserver) {
    motionObserver = new MutationObserver(() => motionListeners.forEach(listener => listener()));
    motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  }
  return () => {
    motionListeners.delete(changed);
    if (!motionListeners.size && motionObserver) { motionObserver.disconnect(); motionObserver = null; }
  };
}
