/** Shared dynamic imports — prefetch and lazy() use the same chunk promises */

export const TAB_IMPORTS = {
  dashboard: () => import('../pages/DashboardOverview'),
  calendar: () => import('../pages/ExecutiveCalendar'),
  souvenirs: () => import('../pages/SouvenirLog'),
  expenditure: () => import('../pages/ExpenditureLog'),
  orders: () => import('../pages/OrderLog'),
  dak: () => import('../pages/DakIssuanceLog'),
  tasks: () => import('../pages/TaskLog'),
  capture: () => import('../pages/CaptureInbox'),
  contacts: () => import('../pages/ContactDatabase'),
  sync: () => import('../pages/SyncBackup'),
};

const PREFETCH_ORDER = [
  'calendar',
  'expenditure',
  'tasks',
  'capture',
  'contacts',
  'orders',
  'dak',
  'souvenirs',
  'sync',
];

export function prefetchTab(tabId) {
  const loader = TAB_IMPORTS[tabId];
  if (!loader) return Promise.resolve();
  return loader();
}

/** Stagger tab chunk downloads during browser idle time after boot */
export function prefetchAllTabsIdle() {
  const schedule = (fn) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(fn, { timeout: 10000 });
    } else {
      setTimeout(fn, 2000);
    }
  };

  schedule(() => {
    let index = 0;

    const pump = (deadline) => {
      const hasBudget =
        !deadline || typeof deadline.timeRemaining !== 'function' || deadline.timeRemaining() > 8;

      while (index < PREFETCH_ORDER.length && hasBudget) {
        TAB_IMPORTS[PREFETCH_ORDER[index]]?.();
        index += 1;
      }

      if (index < PREFETCH_ORDER.length) {
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(pump, { timeout: 5000 });
        } else {
          setTimeout(() => pump({ timeRemaining: () => 50 }), 120);
        }
      }
    };

    pump({ timeRemaining: () => 50 });
  });
}
