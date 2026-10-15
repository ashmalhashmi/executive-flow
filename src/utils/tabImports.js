/** Shared dynamic imports — prefetch and lazy() use the same chunk promises */

export const TAB_IMPORTS = {
  dashboard: () => import('../pages/DashboardOverview'),
  compose: () => import('../pages/ComposeDesk'),
  labels: () => import('../pages/LabelGenerator'),
  calendar: () => import('../pages/ExecutiveCalendar'),
  souvenirs: () => import('../pages/SouvenirLog'),
  expenditure: () => import('../pages/ExpenditureLog'),
  pettyCash: () => import('../pages/PettyCashRecord'),
  orders: () => import('../pages/OrderLog'),
  dak: () => import('../pages/DakIssuanceLog'),
  tasks: () => import('../pages/TaskLog'),
  capture: () => import('../pages/CaptureInbox'),
  contacts: () => import('../pages/ContactDatabase'),
  sync: () => import('../pages/SyncBackup'),
};

export function prefetchTab(tabId) {
  const conn = typeof navigator !== 'undefined' ? navigator.connection || navigator.mozConnection : null;
  if (conn?.saveData) return Promise.resolve();
  const slow = String(conn?.effectiveType || '');
  if (slow === 'slow-2g' || slow === '2g') return Promise.resolve();
  const loader = TAB_IMPORTS[tabId];
  if (!loader) return Promise.resolve();
  return loader();
}
