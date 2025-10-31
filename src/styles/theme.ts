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
    background: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#f5f5f5',
    primary: '#5a5a5a',
    primaryAccent: '#6c6c6c',
    text: '#1a1a1a',
    textMuted: '#8a8a8a',
    border: '#e0e0e0',
    success: '#4a4a4a',
    warning: '#6a6a6a',
    danger: '#8a8a8a'
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,.08)',
    md: '0 4px 12px rgba(0,0,0,.08)',
    inner: '0 1px 0 rgba(255,255,255,.8) inset, 0 1px 2px rgba(0,0,0,.03) inset'
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px'
  },
  fontSize: {
    sm: '13px',
    md: '15px',
    lg: '17px',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #5a5a5a, #6c6c6c)',
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
  * { 
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }
  
  html {
    height: 100%;
    width: 100%;
    overflow: hidden;
    position: fixed;
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  
  body {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
    max-width: 100vw;
    overflow: hidden;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    letter-spacing: -0.01em;
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
  }
  
  #root {
    height: 100%;
    width: 100%;
    max-width: 100vw;
    overflow: hidden;
    position: relative;
  }
  
  /* Профессиональные скроллбары */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.colors.border} transparent;
  }
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    border: 1px solid transparent;
    background-clip: padding-box;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.textMuted};
  }
  
  ::selection { 
    background: ${({ theme }) => theme.colors.primary}; 
    color: #fff; 
  }
  
  /* Улучшенная типографика */
  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.3;
    margin: 0;
    letter-spacing: -0.02em;
  }
  
  p {
    margin: 0 0 1em 0;
  }
  
  /* Стили для кнопок */
  button {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
  
  /* Улучшенные фокусы */
  *:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  /* Мобильные устройства (до 480px) */
  @media (max-width: 480px) {
    body {
      font-size: 14px;
      line-height: 1.5;
    }
    
    /* Уменьшаем отступы для мобильных */
    * {
      scrollbar-width: thin;
      scrollbar-color: ${({ theme }) => theme.colors.border} transparent;
    }
  }
  
  /* Безопасные зоны для iPhone */
  @supports (padding: max(0px)) {
    body {
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
  }

  /* Планшеты (481px - 768px) */
  @media (min-width: 481px) and (max-width: 768px) {
    body {
      font-size: 15px;
    }
  }

  /* Десктоп (769px+) */
  @media (min-width: 769px) {
    body {
      font-size: 16px;
    }
  }

  /* Очень маленькие экраны (до 320px) */
  @media (max-width: 320px) {
    body {
      font-size: 13px;
    }
  }

  /* Большие планшеты (769px - 1024px) */
  @media (min-width: 769px) and (max-width: 1024px) {
    body {
      font-size: 15px;
    }
  }
`;