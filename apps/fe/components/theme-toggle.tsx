"use client";

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem('ticketbox-theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle({ inverse = false }: { inverse?: boolean }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function handleToggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem('ticketbox-theme', nextTheme);
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
      className={
        inverse
          ? 'grid size-10 place-items-center rounded-full border border-sidebar-border bg-sidebar-accent text-sidebar-foreground transition hover:border-primary hover:text-primary'
          : 'grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-primary'
      }
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
