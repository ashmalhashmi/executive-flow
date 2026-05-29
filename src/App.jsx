import { useState } from 'react';
import { ExecutiveProvider } from './context/ExecutiveContext';
import ReminderHost from './components/reminders/ReminderHost';
import AppLayout from './components/layout/AppLayout';
import DashboardOverview from './pages/DashboardOverview';
import ExecutiveCalendar from './pages/ExecutiveCalendar';
import SouvenirLog from './pages/SouvenirLog';

const VIEWS = {
  dashboard: DashboardOverview,
  calendar: ExecutiveCalendar,
  souvenirs: SouvenirLog,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const ActiveView = VIEWS[activeTab] ?? DashboardOverview;

  return (
    <ExecutiveProvider>
      <ReminderHost>
        <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
          <ActiveView onNavigate={setActiveTab} />
        </AppLayout>
      </ReminderHost>
    </ExecutiveProvider>
  );
}
