import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_MEETINGS,
  INITIAL_SOUVENIRS,
  INVENTORY_ITEMS,
} from '../data/mockData';
import {
  addDaysISO,
  formatDisplayDate,
  getCurrentMonthLabel,
  getCurrentWeekRangeISO,
  getNextWeekEndLabel,
  getTodayISO,
  getYearMonth,
  isWeeklySummaryEnabled,
} from '../utils/dates';

const MEETINGS_STORAGE_KEY = 'executive_flow_meetings';
const SOUVENIRS_STORAGE_KEY = 'executive_flow_souvenirs';

function loadMeetings() {
  try {
    const raw = localStorage.getItem(MEETINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return INITIAL_MEETINGS;
}

function loadSouvenirs() {
  try {
    const raw = localStorage.getItem(SOUVENIRS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return INITIAL_SOUVENIRS;
}

const ExecutiveContext = createContext(null);

export function ExecutiveProvider({ children }) {
  const [meetings, setMeetings] = useState(loadMeetings);

  useEffect(() => {
    localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetings));
  }, [meetings]);
  const [souvenirs, setSouvenirs] = useState(loadSouvenirs);

  useEffect(() => {
    localStorage.setItem(SOUVENIRS_STORAGE_KEY, JSON.stringify(souvenirs));
  }, [souvenirs]);
  const [inventory] = useState(INVENTORY_ITEMS);

  const stats = useMemo(() => {
    const today = getTodayISO();
    const todayMeetings = meetings
      .filter(
        (m) =>
          m.date === today &&
          m.scheduledViaCalendar === true &&
          m.status !== 'Completed',
      )
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((m) => ({ id: m.id, title: m.title, time: m.time }));

    const lowStockItems = inventory.filter((i) => i.stock <= i.threshold);
    const pendingSouvenirs = souvenirs.filter((s) => s.status === 'Pending').length;

    return {
      meetingsToday: todayMeetings.length,
      todayMeetings,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      pendingSouvenirs,
    };
  }, [meetings, inventory, souvenirs]);

  const meetingsNextWeek = useMemo(() => {
    const today = getTodayISO();
    const weekEnd = addDaysISO(today, 7);
    return [...meetings]
      .filter(
        (m) => m.date >= today && m.date <= weekEnd && m.status !== 'Completed',
      )
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  }, [meetings]);

  /** Sirf Executive Flow Calendar par schedule ki hui appointments */
  const calendarMeetingsNextWeek = useMemo(
    () => meetingsNextWeek.filter((m) => m.scheduledViaCalendar === true),
    [meetingsNextWeek],
  );

  const monthlySouvenirSummary = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;

    const monthItems = souvenirs.filter((s) => {
      const { year, month } = getYearMonth(s.dateDistributed);
      return year === y && month === mo;
    });

    const qtyByItem = {};
    monthItems.forEach((s) => {
      qtyByItem[s.itemName] = (qtyByItem[s.itemName] || 0) + s.quantity;
    });

    const topItems = Object.entries(qtyByItem)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);

    return {
      monthLabel: getCurrentMonthLabel(),
      count: monthItems.length,
      totalQty: monthItems.reduce((sum, s) => sum + s.quantity, 0),
      delivered: monthItems.filter((s) => s.status === 'Delivered').length,
      pending: monthItems.filter((s) => s.status === 'Pending').length,
      topItems,
    };
  }, [souvenirs]);

  /** Is hafte (Mon–Sun) — sirf Sunday ko dashboard par enable */
  const weeklySouvenirSummary = useMemo(() => {
    const { weekStart, weekEnd } = getCurrentWeekRangeISO();
    const enabled = isWeeklySummaryEnabled();

    const weekItems = souvenirs.filter(
      (s) =>
        s.source === 'calendar-meeting' &&
        s.dateDistributed >= weekStart &&
        s.dateDistributed <= weekEnd,
    );

    const qtyByItem = {};
    weekItems.forEach((s) => {
      qtyByItem[s.itemName] = (qtyByItem[s.itemName] || 0) + s.quantity;
    });

    const topItems = Object.entries(qtyByItem)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const meetingCount = new Set(
      weekItems.map((s) => s.presentationBatchId || s.meetingId).filter(Boolean),
    ).size;

    return {
      enabled,
      nextEnableLabel: getNextWeekEndLabel(),
      weekLabel: `${formatDisplayDate(weekStart)} – ${formatDisplayDate(weekEnd)}`,
      totalQty: weekItems.reduce((sum, s) => sum + s.quantity, 0),
      totalEntries: weekItems.length,
      meetingCount,
      topItems,
    };
  }, [souvenirs]);

  const upcomingMeetings = useMemo(() => {
    const today = getTodayISO();
    return [...meetings]
      .filter((m) => m.date >= today && m.status !== 'Completed')
      .sort((a, b) => {
        const da = `${a.date}T${a.time}`;
        const db = `${b.date}T${b.time}`;
        return da.localeCompare(db);
      });
  }, [meetings]);

  /** Add a new meeting — always starts as Scheduled */
  const addMeeting = useCallback((payload) => {
    const meeting = {
      id: `mtg-${Date.now()}`,
      title: payload.title.trim(),
      date: payload.date,
      time: payload.time,
      agenda: (payload.agenda || '').trim(),
      attendees: payload.attendees,
      automateReminders: payload.automateReminders ?? false,
      status: 'Scheduled',
      scheduledViaCalendar: Boolean(payload.scheduledViaCalendar),
    };
    setMeetings((prev) => [...prev, meeting]);
    return meeting;
  }, []);

  /** Merge Google Calendar events (skip duplicates) */
  const importGoogleMeetings = useCallback((events) => {
    let imported = 0;
    setMeetings((prev) => {
      const next = [...prev];
      for (const ev of events) {
        const duplicate = next.some(
          (m) =>
            m.googleEventId === ev.googleEventId ||
            (m.title === ev.title && m.date === ev.date && m.time === ev.time),
        );
        if (!duplicate) {
          next.push(ev);
          imported += 1;
        }
      }
      return next;
    });
    return imported;
  }, []);

  const addSouvenir = useCallback((payload) => {
    const entry = {
      id: `souv-${Date.now()}`,
      itemName: payload.itemName.trim(),
      recipientName: payload.recipientName.trim(),
      quantity: payload.quantity,
      dateDistributed: payload.dateDistributed,
      status: payload.status,
      source: payload.source || 'manual',
    };
    setSouvenirs((prev) => [entry, ...prev]);
    return entry;
  }, []);

  /** Calendar meeting — text se parse karke har item alag Souvenir Log row */
  const addSouvenirsFromPresentation = useCallback(
    ({ meetingId, meetingTitle, date, rawText, items }) => {
      const batchId = `batch-${Date.now()}`;
      const entries = items.map((item, index) => ({
        id: `souv-${batchId}-${index}`,
        itemName: item.label,
        quantity: item.quantity,
        recipientName: `Presented at meeting`,
        dateDistributed: date,
        status: 'Delivered',
        source: 'calendar-meeting',
        meetingId,
        meetingTitle,
        presentationBatchId: batchId,
        rawPresentationText: index === 0 ? rawText : undefined,
      }));
      setSouvenirs((prev) => [...entries, ...prev]);
      return entries;
    },
    [],
  );

  const value = useMemo(
    () => ({
      meetings,
      setMeetings,
      addMeeting,
      souvenirs,
      setSouvenirs,
      addSouvenir,
      addSouvenirsFromPresentation,
      inventory,
      stats,
      upcomingMeetings,
      meetingsNextWeek,
      calendarMeetingsNextWeek,
      monthlySouvenirSummary,
      weeklySouvenirSummary,
      importGoogleMeetings,
    }),
    [
      meetings,
      addMeeting,
      souvenirs,
      addSouvenir,
      addSouvenirsFromPresentation,
      inventory,
      stats,
      upcomingMeetings,
      meetingsNextWeek,
      calendarMeetingsNextWeek,
      monthlySouvenirSummary,
      weeklySouvenirSummary,
      importGoogleMeetings,
    ],
  );

  return (
    <ExecutiveContext.Provider value={value}>{children}</ExecutiveContext.Provider>
  );
}

export function useExecutive() {
  const ctx = useContext(ExecutiveContext);
  if (!ctx) {
    throw new Error('useExecutive must be used within ExecutiveProvider');
  }
  return ctx;
}
