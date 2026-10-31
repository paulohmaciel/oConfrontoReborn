import { useEffect, useState } from 'react';
import { applyMotion, applyTheme, savedMotion, savedTheme, MOTION_KEY, THEME_KEY, type Motion, type Theme } from '../lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  const [motion, setMotion] = useState<Motion>(() => document.documentElement.dataset.motion === 'reduce' ? 'reduce' : 'full');
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === THEME_KEY || event.key === null) { const next = savedTheme(); applyTheme(next, false); setTheme(next); }
      if (event.key === MOTION_KEY || event.key === null) { const next = savedMotion(); applyMotion(next, false); setMotion(next); }
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function choose(next: Theme) { applyTheme(next); setTheme(next); }
  function toggleMotion() { const next: Motion = motion === 'reduce' ? 'full' : 'reduce'; applyMotion(next); setMotion(next); }
  return <div className="theme-toggle" role="group" aria-label="Aparência">
    <button type="button" aria-pressed={theme === 'light'} onClick={() => choose('light')}>Claro</button>
    <button type="button" aria-pressed={theme === 'dark'} onClick={() => choose('dark')}>Escuro</button>
    <button type="button" aria-pressed={motion === 'reduce'} title="Desliga animações, transições e o fogo dos itens +10" onClick={toggleMotion}>Menos movimento</button>
  </div>;
}
