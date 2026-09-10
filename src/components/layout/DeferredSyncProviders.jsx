import { useEffect, useState } from 'react';

/**
 * Defer cloud + sheets providers until after first paint — cuts initial JS on slow mobile.
 */
export default function DeferredSyncProviders({ children }) {
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      Promise.all([
        import('../../context/CloudSyncContext'),
        import('../../context/GoogleSheetsSyncContext'),
      ]).then(([cloudMod, sheetsMod]) => {
        if (cancelled) return;
        setProviders({ CloudSyncProvider: cloudMod.CloudSyncProvider, GoogleSheetsSyncProvider: sheetsMod.GoogleSheetsSyncProvider });
      });
    };

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(start, { timeout: 4000 });
    } else {
      setTimeout(start, 1500);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (!providers) return children;

  const { CloudSyncProvider, GoogleSheetsSyncProvider } = providers;
  return (
    <CloudSyncProvider>
      <GoogleSheetsSyncProvider>{children}</GoogleSheetsSyncProvider>
    </CloudSyncProvider>
  );
}
