import { lazy, Suspense, useEffect, useState } from 'react';
import { ExecutiveProvider } from './context/ExecutiveContext';
import ReminderHost from './components/reminders/ReminderHost';
import AppLayout from './components/layout/AppLayout';
import TabPanelSkeleton from './components/layout/TabPanelSkeleton';
import DeferredSyncProviders from './components/layout/DeferredSyncProviders';
import { TAB_IMPORTS } from './utils/tabImports';

const VIEWS = Object.fromEntries(
  Object.entries(TAB_IMPORTS).map(([id, importFn]) => [id, lazy(importFn)]),
);

function TabPanels({ activeTab, onNavigate }) {
  const [mounted, setMounted] = useState(() => new Set(['dashboard']));

  useEffect(() => {
    setMounted((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  return (
    <>
      {Object.entries(VIEWS).map(([id, View]) => {
        if (!mounted.has(id)) return null;
        const isActive = activeTab === id;

        return (
          <div key={id} hidden={!isActive} aria-hidden={!isActive}>
            <Suspense fallback={<TabPanelSkeleton tabId={id} />}>
              <View onNavigate={onNavigate} />
            </Suspense>
          </div>
        );
      })}
    </>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const schedule = () => {
      import('./utils/tabImports').then(({ prefetchAllTabsIdle }) => {
        prefetchAllTabsIdle();
      });
    };
    const t = setTimeout(schedule, 12000);
    return () => clearTimeout(t);
  }, []);

  return (
    <ExecutiveProvider>
      <DeferredSyncProviders>
        <ReminderHost>
          <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
            <TabPanels activeTab={activeTab} onNavigate={setActiveTab} />
          </AppLayout>
        </ReminderHost>
      </DeferredSyncProviders>
    </ExecutiveProvider>
  );
}
