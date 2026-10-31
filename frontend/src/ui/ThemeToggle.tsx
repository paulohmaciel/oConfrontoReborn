import { useEffect, useState } from 'react';
import { applyMotion, applyTheme, savedMotion, savedTheme, MOTION_KEY, THEME_KEY, type Motion, type Theme } from '../lib/theme';

// Claro/Escuro. Fica no cabeçalho, na tela de entrada e no menu do celular; "Menos movimento" mora em Configurações (MotionToggle).
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === THEME_KEY || event.key === null) { const next = savedTheme(); applyTheme(next, false); setTheme(next); }
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function choose(next: Theme) { applyTheme(next); setTheme(next); }
  return <div className="theme-toggle" role="group" aria-label="Tema">
    <button type="button" aria-pressed={theme === 'light'} onClick={() => choose('light')}>Claro</button>
    <button type="button" aria-pressed={theme === 'dark'} onClick={() => choose('dark')}>Escuro</button>
  </div>;
}

// Animações ligadas ou desligadas. Sem escolha salva, segue a opção "Reduzir movimento" do sistema.
export function MotionToggle() {
  const [motion, setMotion] = useState<Motion>(() => document.documentElement.dataset.motion === 'reduce' ? 'reduce' : 'full');
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === MOTION_KEY || event.key === null) { const next = savedMotion(); applyMotion(next, false); setMotion(next); }
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function choose(next: Motion) { applyMotion(next); setMotion(next); }
  return <div className="theme-toggle" role="group" aria-label="Animações">
    <button type="button" aria-pressed={motion === 'full'} onClick={() => choose('full')}>Ligadas</button>
    <button type="button" aria-pressed={motion === 'reduce'} onClick={() => choose('reduce')}>Desligadas</button>
  </div>;
}
