import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { darkTheme, lightTheme, type AppTheme } from './theme';

type Ctx = {
  mode: 'light' | 'dark';
  setMode: (m: 'light' | 'dark') => void;
  toggle: () => void;
};

const ThemeModeContext = createContext<Ctx | undefined>(undefined);

export function useThemeMode(): Ctx {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  useEffect(() => {
    localStorage.setItem('theme', mode);
  }, [mode]);
  const toggle = useCallback(
    () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
    []
  );
  const theme: AppTheme = useMemo(
    () => (mode === 'light' ? lightTheme : darkTheme),
    [mode]
  );
  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, toggle]);
  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
}


