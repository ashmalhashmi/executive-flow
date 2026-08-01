import { useState } from 'react';
import { Table2 } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import { NAV_ITEMS } from '../../constants/navigation';
import { useGoogleSheetsSyncContext } from '../../context/GoogleSheetsSyncContext';

/**
 * Main shell: sticky glass sidebar + responsive content area.
 */
export default function AppLayout({ activeTab, onTabChange, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sheets = useGoogleSheetsSyncContext();

  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab);
  const pageTitle = activeItem?.label ?? 'Executive Flow';

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-clip">
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content — offset for fixed sidebar on desktop */}
      <div className="lg:pl-72">
        <MobileHeader
          onMenuOpen={() => setSidebarOpen(true)}
          title={pageTitle}
          showSheetButton={Boolean(sheets?.sheetViewUrl)}
          onSheetView={() => sheets?.openSheetViewer?.()}
        />

        <main
          className="custom-scrollbar mx-auto w-full max-w-6xl px-4 py-3 pb-[calc(1.5rem+var(--safe-bottom))] sm:px-6 sm:py-8 lg:px-8"
        >
          {/* Desktop page header */}
          <header className="mb-8 hidden lg:block">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-indigo-400/90">
                  Executive Flow
                </p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">
                  {pageTitle}
                </h2>
                {activeItem?.description && (
                  <p className="mt-2 max-w-xl text-sm text-zinc-500">
                    {activeItem.description}
                  </p>
                )}
              </div>
              {sheets?.sheetViewUrl && (
                <button
                  type="button"
                  onClick={() => sheets.openSheetViewer?.()}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  <Table2 className="h-4 w-4" />
                  View Google Sheet
                </button>
              )}
            </div>
          </header>

          <div className="tab-panel-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
