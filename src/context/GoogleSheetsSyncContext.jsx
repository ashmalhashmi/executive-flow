import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAppMetaExecutive } from './ExecutiveContext';
import { useGoogleSheetsSync } from '../hooks/useGoogleSheetsSync';
import GoogleSheetViewerModal from '../components/sheets/GoogleSheetViewerModal';
import { sheetViewUrl } from '../utils/googleSheetsSync';

const GoogleSheetsSyncContext = createContext(null);

export function GoogleSheetsSyncProvider({ children }) {
  const { getAppSnapshot, dataRevision } = useAppMetaExecutive();
  const sync = useGoogleSheetsSync({ getAppSnapshot, dataRevision });
  const [viewerOpen, setViewerOpen] = useState(false);

  const openSheetViewer = useCallback(() => setViewerOpen(true), []);
  const closeSheetViewer = useCallback(() => setViewerOpen(false), []);

  const value = useMemo(
    () => ({
      ...sync,
      sheetViewUrl,
      openSheetViewer,
      closeSheetViewer,
    }),
    [sync, openSheetViewer, closeSheetViewer],
  );

  return (
    <GoogleSheetsSyncContext.Provider value={value}>
      {children}
      <GoogleSheetViewerModal isOpen={viewerOpen} onClose={closeSheetViewer} />
    </GoogleSheetsSyncContext.Provider>
  );
}

export function useGoogleSheetsSyncContext() {
  return useContext(GoogleSheetsSyncContext);
}
