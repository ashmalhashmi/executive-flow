import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import AppErrorBoundary from './components/layout/AppErrorBoundary.jsx';
import { markAppBootSuccess, recoverFromStalePwaCache, registerServiceWorker } from './pwa/registerSW';
import { initPerformanceKpi } from './utils/performanceKpi';
import { prefetchAllTabsIdle } from './utils/tabImports';

function showChunkLoadRecovery() {
  if (document.getElementById('ef-chunk-recovery')) return;

  const bar = document.createElement('div');
  bar.id = 'ef-chunk-recovery';
  bar.style.cssText =
    'position:fixed;inset:auto 0 0 0;padding:1rem 1.25rem calc(1rem + env(safe-area-inset-bottom));background:#18181b;border-top:1px solid rgba(255,255,255,.12);z-index:9999;text-align:center;font-family:system-ui,sans-serif;font-size:14px;color:#e4e4e7;line-height:1.5;';
  bar.innerHTML =
    'App update detect hui — purani file load nahi ho rahi. ' +
    '<button type="button" id="ef-chunk-recovery-btn" style="display:block;margin:10px auto 0;padding:10px 20px;border-radius:10px;border:none;background:#6366f1;color:#fff;font-weight:600;font-size:14px;">Refresh app</button>';

  document.body.appendChild(bar);
  document.getElementById('ef-chunk-recovery-btn')?.addEventListener('click', () => {
    recoverFromStalePwaCache().catch(() => window.location.reload());
  });
}

window.addEventListener('error', (event) => {
  const target = event.target;
  if (target instanceof HTMLScriptElement || target instanceof HTMLLinkElement) {
    showChunkLoadRecovery();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = String(event.reason?.message || event.reason || '');
  if (
    reason.includes('Failed to fetch dynamically imported module') ||
    reason.includes('Importing a module script failed') ||
    reason.includes('error loading dynamically imported module')
  ) {
    showChunkLoadRecovery();
  }
});

initPerformanceKpi();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

markAppBootSuccess();
registerServiceWorker();

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(prefetchAllTabsIdle, 1200);
  }, { once: true });
}
