import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import AppErrorBoundary from './components/layout/AppErrorBoundary.jsx';
import { markAppBootSuccess } from './pwa/registerSW';

export function startApp() {
  if (typeof window !== 'undefined') {
    window.__efBoot = { ...(window.__efBoot || {}), moduleLoaded: true, at: Date.now() };
  }

  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element missing');

  createRoot(rootEl).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );

  requestAnimationFrame(() => {
    markAppBootSuccess();
  });
}
