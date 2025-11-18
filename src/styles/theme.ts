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
    background: '#1a1a1a',
    surface: '#252525',
    surfaceAlt: '#2d2d2d',
    primary: '#0066ff',
    primaryAccent: '#0052cc',
    text: '#ffffff',
    textMuted: '#999999',
    border: '#3d3d3d',
    success: '#00b894',
    warning: '#fdcb6e',
    danger: '#e74c3c'
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,.2)',
    md: '0 2px 8px rgba(0,0,0,.2)',
    inner: 'inset 0 1px 2px rgba(0,0,0,.1)'
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px'
  },
  fontSize: {
    sm: '13px',
    md: '15px',
    lg: '17px',
  },
  gradients: {
    primary: 'linear-gradient(180deg, #0066ff, #0052cc)',
  },
  spacing: (n: number) => `${n * 8}px`
};

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#f8f8f8',
    primary: '#0066ff',
    primaryAccent: '#0052cc',
    text: '#000000',
    textMuted: '#666666',
    border: '#e5e5e5',
    success: '#00b894',
    warning: '#fdcb6e',
    danger: '#e74c3c'
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,.06)',
    md: '0 2px 8px rgba(0,0,0,.08)',
    inner: 'inset 0 1px 2px rgba(0,0,0,.05)'
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px'
  },
  fontSize: {
    sm: '13px',
    md: '15px',
    lg: '17px',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #0066ff, #0052cc)',
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
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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