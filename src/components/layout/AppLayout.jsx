import { useState } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import { NAV_ITEMS } from '../../constants/navigation';

/**
 * Main shell: sticky glass sidebar + responsive content area.
 */
export default function AppLayout({ activeTab, onTabChange, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab);
  const pageTitle = activeItem?.label ?? 'Executive Flow';

  return (
    <div className="min-h-screen overflow-x-hidden">
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
        />

        <main
          className="custom-scrollbar mx-auto max-w-6xl px-3 py-4 pb-[calc(1rem+var(--safe-bottom))] sm:px-6 sm:py-8 lg:px-8"
        >
          {/* Desktop page header */}
          <header className="mb-8 hidden lg:block">
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
          </header>

          <div key={activeTab} className="tab-panel-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
