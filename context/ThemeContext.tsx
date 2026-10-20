'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeId, DESIGN_THEMES, DesignTheme, getStoredThemeId, setStoredThemeId } from '@/lib/themeService';

interface ThemeContextType {
  themeId: ThemeId;
  theme: DesignTheme;
  setTheme: (id: ThemeId) => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: 'light-lilac',
  theme: DESIGN_THEMES['light-lilac'],
  setTheme: () => {},
  isThemeModalOpen: false,
  setIsThemeModalOpen: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>('light-lilac');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const initial = getStoredThemeId();
    setThemeIdState(initial);
    setMounted(true);

    const handleThemeChange = (e: any) => {
      if (e.detail && DESIGN_THEMES[e.detail as ThemeId]) {
        setThemeIdState(e.detail);
      }
    };
    window.addEventListener('altto_theme_changed', handleThemeChange);
    return () => window.removeEventListener('altto_theme_changed', handleThemeChange);
  }, []);

  const setTheme = (id: ThemeId) => {
    if (DESIGN_THEMES[id]) {
      setThemeIdState(id);
      setStoredThemeId(id);
    }
  };

  const activeTheme = DESIGN_THEMES[themeId] || DESIGN_THEMES['light-yellow'];

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', themeId);
      if (activeTheme.mode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      root.style.setProperty('--app-bg', activeTheme.colors.bg);
      root.style.setProperty('--app-surface', activeTheme.colors.surface);
      root.style.setProperty('--app-card', activeTheme.colors.card);
      root.style.setProperty('--app-border', activeTheme.colors.border);
      root.style.setProperty('--app-text', activeTheme.colors.text);
      root.style.setProperty('--app-text-muted', activeTheme.colors.textMuted);
      root.style.setProperty('--app-accent', activeTheme.colors.accent);
      root.style.setProperty('--app-accent-hover', activeTheme.colors.accentHover);
      root.style.setProperty('--app-accent-text', activeTheme.colors.accentText);

      document.body.style.backgroundColor = activeTheme.colors.bg;
      document.body.style.color = activeTheme.colors.text;
    }
  }, [themeId, activeTheme]);

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        theme: activeTheme,
        setTheme,
        isThemeModalOpen,
        setIsThemeModalOpen,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx;
}
