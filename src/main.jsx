import { recoverFromStalePwaCache, registerServiceWorker } from './pwa/registerSW';

function showBootFailure(detail = '') {
  if (document.getElementById('ef-chunk-recovery')) return;
  if (window.__efBoot?.reactMounted) return;

  const bar = document.createElement('div');
  bar.id = 'ef-chunk-recovery';
  bar.style.cssText =
    'position:fixed;inset:auto 0 0 0;padding:1rem 1.25rem calc(1rem + env(safe-area-inset-bottom));background:#18181b;border-top:1px solid rgba(255,255,255,.12);z-index:9999;text-align:center;font-family:system-ui,sans-serif;font-size:14px;color:#e4e4e7;line-height:1.5;';
  bar.innerHTML =
    'App start nahi hui — data restore page par safe hai.' +
    (detail ? `<p style="margin:8px 0 0;font-size:12px;color:#fca5a5;word-break:break-all">${detail}</p>` : '') +
    '<a href="./restore.html" style="display:block;margin:10px auto 0;color:#a5b4fc">Emergency restore</a>' +
    '<button type="button" id="ef-chunk-recovery-btn" style="display:block;margin:10px auto 0;padding:10px 20px;border-radius:10px;border:none;background:#6366f1;color:#fff;font-weight:600;font-size:14px;">Refresh app</button>';

  document.body.appendChild(bar);
  document.getElementById('ef-chunk-recovery-btn')?.addEventListener('click', () => {
    recoverFromStalePwaCache().catch(() => window.location.reload());
  });
}

window.addEventListener('error', (event) => {
  const target = event.target;
  if (target instanceof HTMLScriptElement || target instanceof HTMLLinkElement) {
    showBootFailure(target.src || target.href || 'Asset load fail');
  } else if (event.message) {
    showBootFailure(event.message);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  showBootFailure(String(event.reason?.message || event.reason || 'Load fail'));
});

window.__efBoot = { ...(window.__efBoot || {}), bootStarted: true, at: Date.now() };
registerServiceWorker();

import('./appEntry.jsx')
  .then((mod) => mod.startApp())
  .catch((err) => {
    showBootFailure(String(err?.message || err));
  });
