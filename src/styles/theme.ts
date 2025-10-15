import { createGlobalStyle } from 'styled-components';

export const theme = {
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
} as const;

// Типы для styled-components
declare module 'styled-components' {
  export interface DefaultTheme {
    colors: typeof theme.colors;
    shadows: typeof theme.shadows;
    radius: typeof theme.radius;
    fontSize: typeof theme.fontSize;
    gradients: typeof theme.gradients;
    spacing: typeof theme.spacing;
  }
}

export const GlobalStyle = createGlobalStyle`
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    background: ${() => theme.colors.background};
    color: ${() => theme.colors.text};
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    font-size: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  /* красивые тёмные скроллбары */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${() => theme.colors.border} transparent;
  }
  *::-webkit-scrollbar { width: 10px; height: 10px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb {
    background: ${() => theme.colors.border};
    border-radius: 8px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }
  ::selection { background: ${() => theme.colors.primary}; color: #fff; }
`;