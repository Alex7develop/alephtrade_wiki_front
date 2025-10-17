import { createGlobalStyle } from 'styled-components';

export type AppTheme = {
  mode: 'light' | 'dark';
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    primary: string;
    primaryAccent: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
  };
  shadows: {
    sm: string;
    md: string;
    inner: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  fontSize: {
    sm: string;
    md: string;
    lg: string;
  };
  gradients: {
    primary: string;
  };
  spacing: (n: number) => string;
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    background: '#0b132b',
    surface: '#1c2541',
    surfaceAlt: '#243b55',
    primary: '#3a86ff',
    primaryAccent: '#73a9ff',
    text: '#e6eefc',
    textMuted: '#a9b8d4',
    border: '#2e3a5a',
    success: '#2ec4b6',
    warning: '#ffbe0b',
    danger: '#ff006e'
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,.25)',
    md: '0 6px 24px rgba(0,0,0,.25)',
    inner: '0 1px 0 rgba(255,255,255,.04) inset, 0 1px 2px rgba(0,0,0,.35) inset'
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px'
  },
  fontSize: {
    sm: '14px',
    md: '16px',
    lg: '18px',
  },
  gradients: {
    primary: 'linear-gradient(180deg, #3a86ff, #73a9ff)',
  },
  spacing: (n: number) => `${n * 8}px`
};

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    background: '#f7f9fc',
    surface: '#ffffff',
    surfaceAlt: '#f2f5fb',
    primary: '#1e63ff',
    primaryAccent: '#4a84ff',
    text: '#0e1a2b',
    textMuted: '#5c6b82',
    border: '#e1e6ef',
    success: '#16a085',
    warning: '#ffb703',
    danger: '#d90429'
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,.06)',
    md: '0 8px 24px rgba(0,0,0,.08)',
    inner: '0 1px 0 rgba(255,255,255,.9) inset, 0 1px 2px rgba(0,0,0,.04) inset'
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px'
  },
  fontSize: {
    sm: '14px',
    md: '16px',
    lg: '18px',
  },
  gradients: {
    primary: 'linear-gradient(180deg, #1e63ff, #4a84ff)',
  },
  spacing: (n: number) => `${n * 8}px`
};

// Типы для styled-components
declare module 'styled-components' {
  export interface DefaultTheme {
    mode: AppTheme['mode'];
    colors: AppTheme['colors'];
    shadows: AppTheme['shadows'];
    radius: AppTheme['radius'];
    fontSize: AppTheme['fontSize'];
    gradients: AppTheme['gradients'];
    spacing: AppTheme['spacing'];
  }
}

export const GlobalStyle = createGlobalStyle`
  :root { color-scheme: ${({ theme }) => (theme.mode === 'light' ? 'light' : 'dark')}; }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    font-size: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  /* красивые тёмные скроллбары */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.colors.border} transparent;
  }
  *::-webkit-scrollbar { width: 10px; height: 10px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 8px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }
  ::selection { background: ${({ theme }) => theme.colors.primary}; color: #fff; }
`;