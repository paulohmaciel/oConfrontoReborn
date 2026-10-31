import { useEffect, useState } from 'react';
import { applyTheme, savedTheme, THEME_KEY, type Theme } from '../lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== THEME_KEY && event.key !== null) return;
      const next = savedTheme();
      applyTheme(next, false);
      setTheme(next);
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function choose(next: Theme) { applyTheme(next); setTheme(next); }
  return <div className="theme-toggle" role="group" aria-label="Aparência">
    <button type="button" aria-pressed={theme === 'light'} onClick={() => choose('light')}>Claro</button>
    <button type="button" aria-pressed={theme === 'dark'} onClick={() => choose('dark')}>Escuro</button>
  </div>;
}
