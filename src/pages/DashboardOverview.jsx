import { useMeetingsExecutive } from '../context/ExecutiveContext';
import TodayMeetingsHero from '../components/dashboard/TodayMeetingsHero';
import NextWeekMeetings from '../components/dashboard/NextWeekMeetings';

export default function DashboardOverview({ onNavigate }) {
  const { stats, calendarMeetingsNextWeek } = useMeetingsExecutive();

  return (
    <div className="space-y-8">
      <TodayMeetingsHero todayMeetings={stats.todayMeetings} />

      <NextWeekMeetings
        meetings={calendarMeetingsNextWeek}
        onNavigate={onNavigate}
      />
    </div>
  );
}
