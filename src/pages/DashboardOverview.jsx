import { useExecutive } from '../context/ExecutiveContext';
import TodayMeetingsHero from '../components/dashboard/TodayMeetingsHero';
import NextWeekMeetings from '../components/dashboard/NextWeekMeetings';
import SouvenirWeeklySummary from '../components/dashboard/SouvenirWeeklySummary';

export default function DashboardOverview({ onNavigate }) {
  const { stats, calendarMeetingsNextWeek, weeklySouvenirSummary } = useExecutive();

  return (
    <div className="space-y-8">
      <TodayMeetingsHero todayMeetings={stats.todayMeetings} />

      <SouvenirWeeklySummary
        summary={weeklySouvenirSummary}
        onNavigate={onNavigate}
      />

      <NextWeekMeetings
        meetings={calendarMeetingsNextWeek}
        onNavigate={onNavigate}
      />
    </div>
  );
}
