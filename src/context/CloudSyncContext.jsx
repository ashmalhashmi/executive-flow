import { createContext, useContext } from 'react';
import { useAppMetaExecutive } from './ExecutiveContext';
import { useCloudSync } from '../hooks/useCloudSync';

const CloudSyncContext = createContext(null);

export function CloudSyncProvider({ children }) {
  const { importAppData, getAppSnapshot, dataRevision } = useAppMetaExecutive();
  const sync = useCloudSync({ getAppSnapshot, importAppData, dataRevision });

  return <CloudSyncContext.Provider value={sync}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSyncContext() {
  return useContext(CloudSyncContext);
}
