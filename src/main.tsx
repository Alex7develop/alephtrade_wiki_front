import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { GlobalStyle } from './styles/theme';
import { ThemeModeProvider } from './styles/ThemeMode';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeModeProvider>
        <GlobalStyle />
        <App />
      </ThemeModeProvider>
    </Provider>
  </React.StrictMode>
);


