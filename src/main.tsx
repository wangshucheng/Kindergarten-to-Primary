import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('找不到 #root 挂载点');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>,
);
