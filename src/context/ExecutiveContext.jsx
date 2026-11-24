import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  INVENTORY_ITEMS,
} from '../data/mockData';
import {
  addDaysISO,
  getCurrentMonthLabel,
  getTodayISO,
  getYearMonth,
  normalizeMeetingForCalendar,
} from '../utils/dates';
import { clearReminderFired } from '../utils/reminders';
import { buildAppSnapshot } from '../utils/backup';
import {
  loadMorningBoardSettings,
  saveMorningBoardSettings,
} from '../utils/morningBoardSettings';
import {
  loadWeeklyExpenditureEmailSettings,
  saveWeeklyExpenditureEmailSettings,
} from '../utils/weeklyExpenditureEmailSettings';
import { nextOrderNumber, normalizeOrders } from '../utils/orderNumber';
import {
  applyDakClearedAt,
  generateDispatchNumber,
  loadDakClearedAt,
  maxDakClearedAt,
  mergeDakLists,
  normalizeDakList,
  parseDakClearedAt,
  resolveRegisterSr,
  saveDakClearedAt,
} from '../utils/dakEntries';
import { normalizeTaskList } from '../utils/taskEntries';
import { clearTaskReminderFired } from '../utils/taskReminders';
import { normalizeCaptureList } from '../utils/captureEntries';
import { normalizeCorrespondenceList } from '../utils/correspondenceEntries';
import { normalizeTarget, normalizeTargetList } from '../utils/targetEntries';
import { loadNotesVaultMeta, normalizeNotesVaultMeta, saveNotesVaultMeta } from '../utils/notesVault';
import {
  dedupeContactList,
  findDuplicateContact,
  normalizeContactList,
  prepareContactStore,
  standardizeContactRecord,
} from '../utils/contactEntries';
import {
  generatePettyCaseNo,
  generateRefreshmentNoteNo,
  normalizePettyCashCase,
  normalizePettyCashCaseList,
  normalizeRefreshmentNoteList,
} from '../utils/pettyCashEntries';
import {
  loadPettyCashSignatures,
  savePettyCashSignatures,
} from '../utils/pettyCashSignatureSettings';
import { normalizeFileLabel, normalizeFileLabelList } from '../utils/fileLabelEntries';
import { normalizeMuhasabaList } from '../utils/muhasabaEntries';
import { schedulePersist } from '../utils/persistStorage';
import { computeExpenditureBalance } from '../utils/expenditureAnalytics';
import {
  preferLocalExpenditureIfIncomingEmpty,
  preferLocalListIfIncomingEmpty,
  snapshotHasOtherDomainData,
} from '../utils/importGuards';
import {
  AppMetaContext,
  ContactsContext,
  DakContext,
  CorrespondenceContext,
  ExpenditureContext,
  MeetingsContext,
  OrdersContext,
  PettyCashContext,
  LabelsContext,
  MuhasabaContext,
  SouvenirsContext,
  TasksContext,
  TargetsContext,
  CaptureContext,
} from './executiveDomains';

const MEETINGS_STORAGE_KEY = 'executive_flow_meetings';
const SOUVENIRS_STORAGE_KEY = 'executive_flow_souvenirs';
const EXPENDITURE_STORAGE_KEY = 'executive_flow_expenditure';
const ORDERS_STORAGE_KEY = 'executive_flow_orders';
const DAK_STORAGE_KEY = 'executive_flow_dak';
const CORRESPONDENCE_STORAGE_KEY = 'executive_flow_correspondence';
const TARGETS_STORAGE_KEY = 'executive_flow_targets';
const TASKS_STORAGE_KEY = 'executive_flow_tasks';
const CAPTURE_STORAGE_KEY = 'executive_flow_captures';
const CONTACTS_STORAGE_KEY = 'executive_flow_contacts';
const PETTY_CASH_STORAGE_KEY = 'executive_flow_petty_cash';
const FILE_LABELS_STORAGE_KEY = 'executive_flow_file_labels';
const MUHASABA_STORAGE_KEY = 'executive_flow_muhasaba';

function loadContacts() {
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeContactList(parsed);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function loadPettyCashState() {
  try {
    const raw = localStorage.getItem(PETTY_CASH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        cases: normalizePettyCashCaseList(parsed.cases),
        refreshmentNotes: normalizeRefreshmentNoteList(parsed.refreshmentNotes),
      };
    }
  } catch {
    /* ignore */
  }
  return { cases: [], refreshmentNotes: [] };
}

function loadFileLabels() {
  try {
    const raw = localStorage.getItem(FILE_LABELS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeFileLabelList(parsed);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function loadMuhasabaEntries() {
  try {
    const raw = localStorage.getItem(MUHASABA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeMuhasabaList(parsed);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function loadCorrespondenceEntries() {
  try {
    const raw = localStorage.getItem(CORRESPONDENCE_STORAGE_KEY);
    if (raw) return normalizeCorrespondenceList(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return [];
}

function loadTargetEntries() {
  try {
    const raw = localStorage.getItem(TARGETS_STORAGE_KEY);
    if (raw) return normalizeTargetList(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return [];
}

function loadTaskEntries() {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeTaskList(parsed);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function loadCaptureEntries() {
  try {
    const raw = localStorage.getItem(CAPTURE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeCaptureList(parsed);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function loadDakEntries() {
  try {
    const raw = localStorage.getItem(DAK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return applyDakClearedAt(parsed, loadDakClearedAt());
    }
  } catch {
    /* ignore */
  }
  return [];
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? normalizeOrders(parsed) : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function loadExpenditureState() {
  try {
    const raw = localStorage.getItem(EXPENDITURE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        openingBalance: Number(parsed.openingBalance) || 0,
        openingBalanceDate: String(parsed.openingBalanceDate ?? '').trim(),
        expenditures: Array.isArray(parsed.expenditures) ? parsed.expenditures : [],
      };
    }
  } catch {
    /* ignore */
  }
  return { openingBalance: 0, openingBalanceDate: '', expenditures: [] };
}

function loadMeetings() {
  try {
    const raw = localStorage.getItem(MEETINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((m) => normalizeMeetingForCalendar(m))
        : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function loadSouvenirs() {
  try {
    const raw = localStorage.getItem(SOUVENIRS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

const ExecutiveContext = createContext(null);

export function ExecutiveProvider({ children }) {
  useEffect(() => {
    localStorage.removeItem('executive_flow_habits');
  }, []);

  const [meetings, setMeetings] = useState(loadMeetings);

  useEffect(() => {
    schedulePersist(MEETINGS_STORAGE_KEY, meetings);
  }, [meetings]);
  const [souvenirs, setSouvenirs] = useState(loadSouvenirs);

  useEffect(() => {
    schedulePersist(SOUVENIRS_STORAGE_KEY, souvenirs);
  }, [souvenirs]);

  const [expenditureState, setExpenditureState] = useState(loadExpenditureState);

  useEffect(() => {
    schedulePersist(EXPENDITURE_STORAGE_KEY, expenditureState);
  }, [expenditureState]);

  const [orders, setOrders] = useState(loadOrders);

  useEffect(() => {
    schedulePersist(ORDERS_STORAGE_KEY, orders);
  }, [orders]);

  const [dakEntries, setDakEntries] = useState(loadDakEntries);
  const [correspondenceEntries, setCorrespondenceEntries] = useState(loadCorrespondenceEntries);
  const [targetEntries, setTargetEntries] = useState(loadTargetEntries);
  const [dakClearedAt, setDakClearedAt] = useState(loadDakClearedAt);
  const dakClearedAtRef = useRef(dakClearedAt);
  dakClearedAtRef.current = dakClearedAt;

  useEffect(() => {
    schedulePersist(DAK_STORAGE_KEY, dakEntries);
  }, [dakEntries]);

  useEffect(() => {
    schedulePersist(CORRESPONDENCE_STORAGE_KEY, correspondenceEntries);
  }, [correspondenceEntries]);

  useEffect(() => {
    schedulePersist(TARGETS_STORAGE_KEY, targetEntries);
  }, [targetEntries]);

  useEffect(() => {
    saveDakClearedAt(dakClearedAt);
  }, [dakClearedAt]);

  const [taskEntries, setTaskEntries] = useState(loadTaskEntries);

  useEffect(() => {
    schedulePersist(TASKS_STORAGE_KEY, taskEntries);
  }, [taskEntries]);

  const [captureEntries, setCaptureEntries] = useState(loadCaptureEntries);

  useEffect(() => {
    schedulePersist(CAPTURE_STORAGE_KEY, captureEntries);
  }, [captureEntries]);

  const [contacts, setContacts] = useState(loadContacts);

  useEffect(() => {
    schedulePersist(CONTACTS_STORAGE_KEY, contacts);
  }, [contacts]);

  const [pettyCashState, setPettyCashState] = useState(loadPettyCashState);
  const [pettyCashSignatures, setPettyCashSignaturesState] = useState(loadPettyCashSignatures);

  useEffect(() => {
    schedulePersist(PETTY_CASH_STORAGE_KEY, pettyCashState);
  }, [pettyCashState]);

  const [fileLabels, setFileLabels] = useState(loadFileLabels);

  useEffect(() => {
    schedulePersist(FILE_LABELS_STORAGE_KEY, fileLabels);
  }, [fileLabels]);

  const [muhasabaEntries, setMuhasabaEntries] = useState(loadMuhasabaEntries);

  useEffect(() => {
    schedulePersist(MUHASABA_STORAGE_KEY, muhasabaEntries);
  }, [muhasabaEntries]);

  const [dataRevision, setDataRevision] = useState(0);
  const skipRevisionBump = useRef(true);

  useEffect(() => {
    if (skipRevisionBump.current) {
      skipRevisionBump.current = false;
      return;
    }
    setDataRevision((v) => v + 1);
  }, [meetings, souvenirs, expenditureState, orders, dakEntries, dakClearedAt, taskEntries, targetEntries, captureEntries, contacts, pettyCashState, fileLabels, muhasabaEntries]);

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
      location: (payload.location || '').trim(),
      agenda: (payload.agenda || '').trim(),
      attendees: payload.attendees,
      automateReminders: payload.automateReminders ?? false,
      status: 'Scheduled',
      scheduledViaCalendar: Boolean(payload.scheduledViaCalendar),
      outlookEventId: String(payload.outlookEventId || '').trim() || undefined,
      invitationImageRef: String(payload.invitationImageRef || '').trim() || undefined,
    };
    setMeetings((prev) => [...prev, meeting]);
    return meeting;
  }, []);

  /** My Calendar appointment cancel — list se hata dein */
  const cancelMeeting = useCallback((meetingId) => {
    clearReminderFired(meetingId);
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  }, []);

  /** Calendar meeting edit — date/time change par reminder dubara allow */
  const updateMeeting = useCallback((meetingId, payload) => {
    clearReminderFired(meetingId);
    setMeetings((prev) =>
      prev.map((m) =>
        m.id !== meetingId
          ? m
          : {
              ...m,
              title: payload.title.trim(),
              date: payload.date,
              time: payload.time,
              location: (payload.location || '').trim(),
              agenda: (payload.agenda || '').trim(),
              attendees: Array.isArray(payload.attendees) ? payload.attendees : [],
              automateReminders: payload.automateReminders ?? m.automateReminders,
              scheduledViaCalendar:
                payload.scheduledViaCalendar ?? m.scheduledViaCalendar ?? true,
              outlookEventId:
                payload.outlookEventId !== undefined
                  ? String(payload.outlookEventId || '').trim() || undefined
                  : m.outlookEventId,
              invitationImageRef:
                payload.invitationImageRef !== undefined
                  ? String(payload.invitationImageRef || '').trim() || undefined
                  : m.invitationImageRef,
            },
      ),
    );
  }, []);

  /** Patch Outlook Graph event id after one-way push (no reminder reset) */
  const setMeetingOutlookEventId = useCallback((meetingId, outlookEventId) => {
    const id = String(outlookEventId || '').trim();
    setMeetings((prev) =>
      prev.map((m) =>
        m.id !== meetingId
          ? m
          : { ...m, outlookEventId: id || undefined },
      ),
    );
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

  /**
   * Souvenir Log row — independent of calendar.
   * Meeting title optional (planned or spontaneous / walk-in).
   */
  const addSouvenirLogEntry = useCallback(
    ({ meetingId, meetingTitle, date, detail, source = 'quick-log' }) => {
      const text = String(detail ?? '').trim();
      if (!text) return null;
      const entry = {
        id: `souv-${Date.now()}`,
        meetingId: meetingId || undefined,
        meetingTitle: String(meetingTitle ?? '').trim() || 'Walk-in / Quick log',
        dateDistributed: date || undefined,
        detail: text,
        source,
      };
      setSouvenirs((prev) => [entry, ...prev]);
      return entry;
    },
    [],
  );

  /** Calendar convenience — same log row, optional link to a meeting */
  const addSouvenirsFromPresentation = useCallback(
    ({ meetingId, meetingTitle, date, rawText }) =>
      addSouvenirLogEntry({
        meetingId,
        meetingTitle,
        date,
        detail: rawText,
        source: meetingId ? 'calendar-meeting' : 'quick-log',
      }),
    [addSouvenirLogEntry],
  );

  /** Souvenir Log row delete — single entry ya purani batch */
  const removeSouvenirLogEntry = useCallback((rowId) => {
    setSouvenirs((prev) =>
      prev.filter(
        (s) => s.id !== rowId && s.presentationBatchId !== rowId,
      ),
    );
  }, []);

  /** Souvenir Log row edit — single entry ya presentation batch */
  const updateSouvenirLogEntry = useCallback(
    (rowId, { meetingTitle, date, detail }) => {
      const text = String(detail ?? '').trim();
      if (!rowId || !text) return null;
      const title = String(meetingTitle ?? '').trim() || 'Walk-in / Quick log';
      const nextDate = date || undefined;
      let updated = null;
      setSouvenirs((prev) => {
        const isBatch = prev.some((s) => s.presentationBatchId === rowId);
        if (isBatch) {
          return prev.map((s) => {
            if (s.presentationBatchId !== rowId) return s;
            const next = {
              ...s,
              meetingTitle: title,
              dateDistributed: nextDate,
              rawPresentationText: text,
            };
            updated = next;
            return next;
          });
        }
        return prev.map((s) => {
          if (s.id !== rowId) return s;
          const next = {
            ...s,
            meetingTitle: title,
            dateDistributed: nextDate,
            detail: text,
          };
          updated = next;
          return next;
        });
      });
      return updated;
    },
    [],
  );

  const addOrder = useCallback(({ item, quantity, vendor, placedDate }) => {
    let created;
    setOrders((prev) => {
      const order = {
        id: `ord-${Date.now()}`,
        orderNumber: nextOrderNumber(prev),
        item: item.trim(),
        quantity: Number(quantity) || 0,
        vendor: vendor.trim(),
        placedDate: placedDate || getTodayISO(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      created = order;
      return [order, ...prev];
    });
    return created;
  }, []);

  const updateOrder = useCallback((orderId, { item, quantity, vendor, placedDate }) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id !== orderId
          ? o
          : {
              ...o,
              item: item.trim(),
              quantity: Number(quantity) || 0,
              vendor: vendor.trim(),
              placedDate: placedDate || o.placedDate,
            },
      ),
    );
  }, []);

  const markOrderReceived = useCallback((orderId) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'received', receivedAt: new Date().toISOString() }
          : o,
      ),
    );
  }, []);

  const cancelOrder = useCallback((orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o)),
    );
  }, []);

  const removeOrder = useCallback((orderId) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  const addDakEntry = useCallback((payload) => {
    let created;
    setDakEntries((prev) => {
      const active = prev.filter((d) => d.status !== 'cancelled');
      const entry = {
        id: `dak-${Date.now()}`,
        fileId: generateDispatchNumber(active),
        registerSr: resolveRegisterSr(payload, active),
        externalDispatchNo: String(payload.externalDispatchNo ?? '').trim(),
        receivedDate: String(payload.receivedDate ?? '').trim(),
        forwardedDate: payload.forwardedDate,
        designation: payload.designation.trim(),
        subject: payload.subject.trim(),
        scanPhotoUrl: String(payload.scanPhotoUrl ?? '').trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      created = entry;
      return [entry, ...prev];
    });
    return created;
  }, []);

  const addDakEntriesBulk = useCallback((payloads) => {
    if (!Array.isArray(payloads) || !payloads.length) return [];
    const created = [];
    setDakEntries((prev) => {
      let active = prev.filter((d) => d.status !== 'cancelled');
      for (let i = 0; i < payloads.length; i += 1) {
        const payload = payloads[i];
        const entry = {
          id: `dak-${Date.now()}-${i}`,
          fileId: generateDispatchNumber(active),
          registerSr: resolveRegisterSr(payload, active),
          externalDispatchNo: String(payload.externalDispatchNo ?? '').trim(),
          receivedDate: String(payload.receivedDate ?? '').trim(),
          forwardedDate: payload.forwardedDate,
          designation: String(payload.designation ?? '').trim(),
          subject: String(payload.subject ?? '').trim(),
          scanPhotoUrl: String(payload.scanPhotoUrl ?? '').trim(),
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        active = [entry, ...active];
        created.push(entry);
      }
      return [...created, ...prev];
    });
    return created;
  }, []);

  const updateDakEntry = useCallback((dakId, payload) => {
    setDakEntries((prev) =>
      prev.map((d) =>
        d.id !== dakId
          ? d
          : {
              ...d,
              externalDispatchNo: String(payload.externalDispatchNo ?? '').trim(),
              receivedDate: String(payload.receivedDate ?? '').trim(),
              forwardedDate: payload.forwardedDate,
              designation: payload.designation.trim(),
              subject: payload.subject.trim(),
              registerSr:
                Number(payload.registerSr) > 0 ? Number(payload.registerSr) : d.registerSr,
              updatedAt: new Date().toISOString(),
            },
      ),
    );
  }, []);

  const cancelDakEntry = useCallback((dakId) => {
    setDakEntries((prev) =>
      prev.map((d) =>
        d.id === dakId
          ? { ...d, status: 'cancelled', updatedAt: new Date().toISOString() }
          : d,
      ),
    );
  }, []);

  const eraseDakEntry = useCallback((dakId) => {
    setDakEntries((prev) => prev.filter((d) => d.id !== dakId));
  }, []);

  const eraseAllDakEntries = useCallback(() => {
    const clearedAt = new Date().toISOString();
    dakClearedAtRef.current = clearedAt;
    setDakClearedAt(clearedAt);
    saveDakClearedAt(clearedAt);
    setDakEntries([]);
  }, []);

  const addTaskEntry = useCallback((payload) => {
    let created;
    const now = new Date().toISOString();
    const entry = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: String(payload.title || '').trim(),
      date: payload.date,
      time: payload.time,
      status: 'active',
      remind: Boolean(payload.remind),
      completedAt: null,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    if (!entry.title || !entry.date || !entry.time) return null;
    setTaskEntries((prev) => {
      created = entry;
      return [entry, ...prev];
    });
    return created;
  }, []);

  const updateTaskEntry = useCallback((taskId, payload) => {
    const now = new Date().toISOString();
    clearTaskReminderFired(taskId);
    setTaskEntries((prev) =>
      prev.map((t) =>
        t.id !== taskId
          ? t
          : {
              ...t,
              title: String(payload.title || '').trim() || t.title,
              date: payload.date || t.date,
              time: payload.time || t.time,
              remind: payload.remind == null ? Boolean(t.remind) : Boolean(payload.remind),
              updatedAt: now,
            },
      ),
    );
  }, []);

  const completeTaskEntry = useCallback((taskId) => {
    const now = new Date().toISOString();
    clearTaskReminderFired(taskId);
    setTaskEntries((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: 'done', completedAt: now, trashedAt: null, updatedAt: now }
          : t,
      ),
    );
  }, []);

  const reopenTaskEntry = useCallback((taskId) => {
    const now = new Date().toISOString();
    clearTaskReminderFired(taskId);
    setTaskEntries((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: 'active', completedAt: null, trashedAt: null, updatedAt: now }
          : t,
      ),
    );
  }, []);

  const trashTaskEntry = useCallback((taskId) => {
    const now = new Date().toISOString();
    clearTaskReminderFired(taskId);
    setTaskEntries((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: 'trash', trashedAt: now, updatedAt: now } : t,
      ),
    );
  }, []);

  const restoreTaskEntry = useCallback((taskId) => {
    const now = new Date().toISOString();
    setTaskEntries((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const done = Boolean(t.completedAt);
        return {
          ...t,
          status: done ? 'done' : 'active',
          trashedAt: null,
          updatedAt: now,
        };
      }),
    );
  }, []);

  const removeTaskEntry = useCallback((taskId) => {
    clearTaskReminderFired(taskId);
    setTaskEntries((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const cancelTaskEntry = trashTaskEntry;

  const addCaptureEntry = useCallback((payload) => {
    let created;
    const vault = payload?.vault || null;
    const text = vault ? '' : String(payload?.text ?? '').trim();
    const title = vault ? '' : String(payload?.title ?? '').trim();
    if (!vault && !text) return null;
    if (vault && !vault.cipher) return null;
    const now = new Date().toISOString();
    const entry = {
      id: `capture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      text,
      bucket: 'captured',
      status: 'active',
      pinned: false,
      pinnedAt: null,
      vault,
      completedAt: null,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    setCaptureEntries((prev) => {
      created = entry;
      return [entry, ...prev];
    });
    return created;
  }, []);

  const updateCaptureEntry = useCallback((captureId, payload) => {
    if (!captureId) return null;
    const now = new Date().toISOString();
    let updated = null;
    setCaptureEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== captureId) return entry;
        const nextVault = payload?.vault === undefined ? entry.vault : payload.vault || null;
        const text = nextVault ? '' : String(payload?.text ?? '').trim();
        const title = nextVault ? '' : String(payload?.title ?? '').trim();
        if (!nextVault && !text) return entry;
        updated = {
          ...entry,
          title,
          text,
          vault: nextVault,
          updatedAt: now,
        };
        return updated;
      }),
    );
    return updated;
  }, []);

  const setCapturePinned = useCallback((captureId, pinned) => {
    const now = new Date().toISOString();
    setCaptureEntries((prev) =>
      prev.map((entry) =>
        entry.id === captureId
          ? {
              ...entry,
              pinned: Boolean(pinned),
              pinnedAt: pinned ? now : null,
              updatedAt: now,
            }
          : entry,
      ),
    );
  }, []);

  const completeCaptureEntry = useCallback((captureId) => {
    const now = new Date().toISOString();
    setCaptureEntries((prev) =>
      prev.map((entry) =>
        entry.id === captureId
          ? { ...entry, status: 'archived', completedAt: now, trashedAt: null, updatedAt: now }
          : entry,
      ),
    );
  }, []);

  const trashCaptureEntry = useCallback((captureId) => {
    const now = new Date().toISOString();
    setCaptureEntries((prev) =>
      prev.map((entry) =>
        entry.id === captureId
          ? { ...entry, status: 'trash', trashedAt: now, completedAt: null, updatedAt: now }
          : entry,
      ),
    );
  }, []);

  const restoreCaptureEntry = useCallback((captureId) => {
    const now = new Date().toISOString();
    setCaptureEntries((prev) =>
      prev.map((entry) =>
        entry.id === captureId
          ? { ...entry, status: 'active', completedAt: null, trashedAt: null, updatedAt: now }
          : entry,
      ),
    );
  }, []);

  const moveCaptureEntry = useCallback((captureId, bucket) => {
    setCaptureEntries((prev) =>
      prev.map((entry) =>
        entry.id === captureId
          ? {
              ...entry,
              bucket: bucket === 'now' ? 'now' : 'captured',
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
    );
  }, []);

  const removeCaptureEntry = useCallback((captureId) => {
    setCaptureEntries((prev) => prev.filter((entry) => entry.id !== captureId));
  }, []);

  const clearDoneCaptures = useCallback(() => {
    setCaptureEntries((prev) =>
      prev.filter((entry) => entry.status !== 'done' && entry.status !== 'archived'),
    );
  }, []);

  const addContact = useCallback((payload) => {
    let created;
    const entry = standardizeContactRecord({
      id: `contact-${Date.now()}`,
      ...payload,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (!entry) return null;

    setContacts((prev) => {
      if (findDuplicateContact(prev, entry)) {
        created = null;
        return prev;
      }
      created = entry;
      return dedupeContactList([entry, ...prev]);
    });
    return created;
  }, []);

  const updateContact = useCallback((contactId, payload) => {
    const next = standardizeContactRecord({
      id: contactId,
      ...payload,
      status: 'active',
      updatedAt: new Date().toISOString(),
    });
    if (!next) return false;

    setContacts((prev) => {
      if (findDuplicateContact(prev, next, contactId)) return prev;
      return dedupeContactList(
        prev.map((c) =>
          c.id !== contactId
            ? c
            : {
                ...c,
                ...next,
                createdAt: c.createdAt,
              },
        ),
      );
    });
    return true;
  }, []);

  const removeContact = useCallback((contactId) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
  }, []);

  const importContacts = useCallback((entries, mode = 'merge') => {
    const normalized = normalizeContactList(entries);
    if (!normalized.length) return { saved: 0, merged: 0 };

    let saved = 0;
    let merged = 0;
    setContacts((prev) => {
      const combined = mode === 'replace' ? normalized : [...normalized, ...prev];
      const deduped = dedupeContactList(combined);
      saved = deduped.length;
      merged = combined.length - deduped.length;
      return deduped;
    });
    return { saved, merged };
  }, []);

  const clearAllContacts = useCallback(() => {
    setContacts([]);
  }, []);

  /** Contact Database tab — dedupe + format normalize on first open */
  const reconcileContacts = useCallback(() => {
    setContacts((prev) => prepareContactStore(prev));
  }, []);

  const addPettyCashCase = useCallback((payload) => {
    let created;
      setPettyCashState((prev) => {
      const cases = prev.cases || [];
      const invoicePhotoUrls = Array.isArray(payload.invoicePhotoUrls)
        ? payload.invoicePhotoUrls.map((u) => String(u ?? '').trim()).filter(Boolean)
        : [];
      const invoicePhotoUrl =
        invoicePhotoUrls[0] || String(payload.invoicePhotoUrl ?? '').trim();
      const entry =
        normalizePettyCashCase({
          id: `pc-case-${Date.now()}`,
          caseNo: generatePettyCaseNo(cases),
          meetingId: String(payload.meetingId ?? '').trim(),
          meetingTitle: String(payload.meetingTitle ?? '').trim(),
          meetingDate: String(payload.meetingDate ?? '').trim(),
          invoicePhotoUrl,
          invoicePhotoUrls: invoicePhotoUrls.length
            ? invoicePhotoUrls
            : invoicePhotoUrl
              ? [invoicePhotoUrl]
              : [],
          purchaseSlip: payload.purchaseSlip || {},
          satisfactoryNote: payload.satisfactoryNote || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }) || {
          id: `pc-case-${Date.now()}`,
          caseNo: generatePettyCaseNo(cases),
          purchaseSlip: payload.purchaseSlip || {},
          satisfactoryNote: payload.satisfactoryNote || {},
        };
      created = entry;
      return {
        ...prev,
        cases: [entry, ...cases],
      };
    });
    return created;
  }, []);

  const updatePettyCashCase = useCallback((caseId, payload) => {
    setPettyCashState((prev) => ({
      ...prev,
      cases: (prev.cases || []).map((c) => {
        if (c.id !== caseId) return c;
        const nextUrls = Array.isArray(payload.invoicePhotoUrls)
          ? payload.invoicePhotoUrls.map((u) => String(u ?? '').trim()).filter(Boolean)
          : c.invoicePhotoUrls;
        const invoicePhotoUrl =
          (Array.isArray(nextUrls) && nextUrls[0]) ||
          String(payload.invoicePhotoUrl ?? c.invoicePhotoUrl).trim();
        return (
          normalizePettyCashCase({
            ...c,
            meetingId: String(payload.meetingId ?? c.meetingId).trim(),
            meetingTitle: String(payload.meetingTitle ?? c.meetingTitle).trim(),
            meetingDate: String(payload.meetingDate ?? c.meetingDate).trim(),
            invoicePhotoUrl,
            invoicePhotoUrls: Array.isArray(nextUrls)
              ? nextUrls
              : invoicePhotoUrl
                ? [invoicePhotoUrl]
                : [],
            purchaseSlip: payload.purchaseSlip || c.purchaseSlip,
            satisfactoryNote: payload.satisfactoryNote || c.satisfactoryNote,
            updatedAt: new Date().toISOString(),
          }) || c
        );
      }),
    }));
  }, []);

  const removePettyCashCase = useCallback((caseId) => {
    setPettyCashState((prev) => ({
      ...prev,
      cases: (prev.cases || []).filter((c) => c.id !== caseId),
    }));
  }, []);

  const addRefreshmentNote = useCallback((payload) => {
    let created;
    setPettyCashState((prev) => {
      const notes = prev.refreshmentNotes || [];
      const entry = {
        id: `pc-refresh-${Date.now()}`,
        noteNo: generateRefreshmentNoteNo(notes),
        meetingId: String(payload.meetingId ?? '').trim(),
        meetingTitle: String(payload.meetingTitle ?? '').trim(),
        meetingDate: String(payload.meetingDate ?? '').trim(),
        date: String(payload.date ?? '').trim(),
        itemsIssued: String(payload.itemsIssued ?? '').trim(),
        quantity: String(payload.quantity ?? '').trim(),
        purpose: String(payload.purpose ?? '').trim(),
        receiverName: String(payload.receiverName ?? '').trim(),
        receiverDesignation: String(payload.receiverDesignation ?? '').trim(),
        issuedByName: String(payload.issuedByName ?? '').trim(),
        issuedByDesignation: String(payload.issuedByDesignation ?? '').trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      created = entry;
      return {
        ...prev,
        refreshmentNotes: [entry, ...notes],
      };
    });
    return created;
  }, []);

  const removeRefreshmentNote = useCallback((noteId) => {
    setPettyCashState((prev) => ({
      ...prev,
      refreshmentNotes: (prev.refreshmentNotes || []).filter((n) => n.id !== noteId),
    }));
  }, []);

  const updatePettyCashSignatures = useCallback((settingsOrFn) => {
    let next = null;
    setPettyCashSignaturesState((prev) => {
      const incoming = typeof settingsOrFn === 'function' ? settingsOrFn(prev) : settingsOrFn;
      next = savePettyCashSignatures(incoming);
      return next;
    });
    return next;
  }, []);

  const addFileLabel = useCallback((payload) => {
    const now = new Date().toISOString();
    const entry = normalizeFileLabel({
      id: `flabel-${Date.now()}`,
      name: payload?.name,
      nameSize: payload?.nameSize,
      fontSize: payload?.fontSize,
      nameWeight: payload?.nameWeight,
      nameAlign: payload?.nameAlign,
      logoSize: payload?.logoSize,
      border: payload?.border,
      orientation: payload?.orientation,
      copies: payload?.copies,
      createdAt: now,
      updatedAt: now,
    });
    if (!entry) return null;
    setFileLabels((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateFileLabel = useCallback((labelId, payload) => {
    setFileLabels((prev) =>
      prev.map((row) => {
        if (row.id !== labelId) return row;
        return (
          normalizeFileLabel({
            ...row,
            ...payload,
            id: row.id,
            createdAt: row.createdAt,
            updatedAt: new Date().toISOString(),
          }) || row
        );
      }),
    );
  }, []);

  const removeFileLabel = useCallback((labelId) => {
    setFileLabels((prev) => prev.filter((row) => row.id !== labelId));
  }, []);

  const addMuhasabaEntry = useCallback((payload) => {
    const now = new Date().toISOString();
    const entry = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `muhasaba-${Date.now()}`,
      deedText: String(payload?.deedText || '').trim(),
      classification: payload?.classification === 'bad' ? 'bad' : 'good',
      evaluation: String(payload?.evaluation || '').trim(),
      divineReference: String(payload?.divineReference || '').trim(),
      identityStatement: String(payload?.identityStatement || '').trim(),
      immediateAction: String(payload?.immediateAction || '').trim(),
      isActionCompleted: false,
      createdAt: now,
      updatedAt: now,
    };
    if (!entry.deedText) return null;
    setMuhasabaEntries((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const completeMuhasabaAction = useCallback((entryId) => {
    const now = new Date().toISOString();
    setMuhasabaEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, isActionCompleted: true, updatedAt: now }
          : entry,
      ),
    );
  }, []);

  const removeMuhasabaEntry = useCallback((entryId) => {
    setMuhasabaEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  }, []);

  const setExpenditureOpeningBalance = useCallback((amount, date) => {
    const effectiveDate = String(date ?? '').trim() || getTodayISO();
    setExpenditureState((prev) => ({
      ...prev,
      openingBalance: Math.max(0, Number(amount) || 0),
      openingBalanceDate: effectiveDate,
    }));
  }, []);

  const addExpenditure = useCallback(({ description, amount, date, category }) => {
    const entry = {
      id: `exp-${Date.now()}`,
      description,
      amount: Number(amount) || 0,
      date: date || getTodayISO(),
      category: String(category || '').trim() || 'Other',
    };
    setExpenditureState((prev) => ({
      ...prev,
      expenditures: [entry, ...prev.expenditures],
    }));
    return entry;
  }, []);

  const removeExpenditure = useCallback((id) => {
    setExpenditureState((prev) => ({
      ...prev,
      expenditures: prev.expenditures.filter((e) => e.id !== id),
    }));
  }, []);

  /** Remove log entries strictly before cutoff date (opening date). Returns count removed. */
  const removeExpendituresBeforeDate = useCallback((cutoffDate) => {
    const cut = String(cutoffDate ?? '').trim();
    if (!cut) return 0;
    let removed = 0;
    setExpenditureState((prev) => {
      const kept = prev.expenditures.filter((e) => {
        if (e.date && e.date < cut) {
          removed += 1;
          return false;
        }
        return true;
      });
      return { ...prev, expenditures: kept };
    });
    return removed;
  }, []);

  /** Clear opening balance + all expenses so a new period can start (Sheet backup is separate). */
  const clearExpenditureRecords = useCallback(() => {
    let removed = 0;
    setExpenditureState((prev) => {
      removed = prev.expenditures.length;
      return { openingBalance: 0, openingBalanceDate: '', expenditures: [] };
    });
    return removed;
  }, []);

  const updateExpenditure = useCallback((id, { description, amount, date, category }) => {
    setExpenditureState((prev) => ({
      ...prev,
      expenditures: prev.expenditures.map((e) =>
        e.id === id
          ? {
              ...e,
              description,
              amount: Number(amount) || 0,
              date: date || e.date,
              category: String(category || '').trim() || 'Other',
            }
          : e,
      ),
    }));
  }, []);

  const expenditureSummary = useMemo(
    () =>
      computeExpenditureBalance({
        openingBalance: expenditureState.openingBalance,
        openingBalanceDate: expenditureState.openingBalanceDate,
        expenditures: expenditureState.expenditures,
      }),
    [expenditureState],
  );

  const addCorrespondenceEntry = useCallback((payload) => {
    const entry = normalizeCorrespondenceList([
      {
        ...payload,
        id: payload?.id || `clr-${Date.now()}`,
        createdAt: payload?.createdAt || new Date().toISOString(),
      },
    ])[0];
    if (!entry) return null;
    setCorrespondenceEntries((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)]);
    return entry;
  }, []);

  const removeCorrespondenceEntry = useCallback((entryId) => {
    setCorrespondenceEntries((prev) => prev.filter((item) => item.id !== entryId));
  }, []);

  const addTarget = useCallback((payload) => {
    const entry = normalizeTargetList([
      {
        ...payload,
        id: payload?.id || `tgt-${Date.now()}`,
        createdAt: payload?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])[0];
    if (!entry) return null;
    setTargetEntries((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)]);
    return entry;
  }, []);

  const updateTarget = useCallback((id, patch) => {
    setTargetEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return (
          normalizeTarget({
            ...item,
            ...patch,
            id: item.id,
            createdAt: item.createdAt,
            updatedAt: new Date().toISOString(),
            actions: patch.actions ?? item.actions,
          }) || item
        );
      }),
    );
  }, []);

  const addTargetAction = useCallback((targetId, actionText) => {
    setTargetEntries((prev) =>
      prev.map((item) => {
        if (item.id !== targetId) return item;
        return (
          normalizeTarget({
            ...item,
            updatedAt: new Date().toISOString(),
            actions: [...item.actions, { text: actionText }],
          }) || item
        );
      }),
    );
  }, []);

  const removeTargetAction = useCallback((targetId, actionId) => {
    setTargetEntries((prev) =>
      prev.map((item) => {
        if (item.id !== targetId) return item;
        return (
          normalizeTarget({
            ...item,
            updatedAt: new Date().toISOString(),
            actions: item.actions.filter((action) => action.id !== actionId),
          }) || item
        );
      }),
    );
  }, []);

  const voteTargetAction = useCallback((targetId, actionId) => {
    const today = new Date().toISOString().slice(0, 10);
    setTargetEntries((prev) =>
      prev.map((item) => {
        if (item.id !== targetId || item.status === 'achieved') return item;
        return (
          normalizeTarget({
            ...item,
            updatedAt: new Date().toISOString(),
            actions: item.actions.map((action) =>
              action.id === actionId
                ? { ...action, repetitions: action.repetitions + 1, lastDoneOn: today }
                : action,
            ),
          }) || item
        );
      }),
    );
  }, []);

  const achieveTarget = useCallback((id) => {
    setTargetEntries((prev) =>
      prev.map((item) =>
        item.id === id
          ? normalizeTarget({
              ...item,
              status: 'achieved',
              achievedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }) || item
          : item,
      ),
    );
  }, []);

  const reopenTarget = useCallback((id) => {
    setTargetEntries((prev) =>
      prev.map((item) =>
        item.id === id
          ? normalizeTarget({
              ...item,
              status: 'active',
              achievedAt: '',
              updatedAt: new Date().toISOString(),
            }) || item
          : item,
      ),
    );
  }, []);

  const removeTarget = useCallback((id) => {
    setTargetEntries((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const importAppData = useCallback((data) => {
    // Safety guards on EVERY domain: refuse empty cloud wipe when other domains
    // in the same snapshot still have data (stale / partial Pulse).
    setMeetings((prev) => {
      const incoming = Array.isArray(data.meetings)
        ? data.meetings.map((m) => normalizeMeetingForCalendar(m))
        : [];
      return preferLocalListIfIncomingEmpty(prev, incoming, data, 'meetings');
    });
    setSouvenirs((prev) =>
      preferLocalListIfIncomingEmpty(
        prev,
        Array.isArray(data.souvenirs) ? data.souvenirs : [],
        data,
        'souvenirs',
      ),
    );
    setExpenditureState((prev) => preferLocalExpenditureIfIncomingEmpty(prev, data));
    setOrders((prev) =>
      preferLocalListIfIncomingEmpty(
        prev,
        Array.isArray(data.orders) ? data.orders : [],
        data,
        'orders',
      ),
    );
    const incomingClear = parseDakClearedAt(data.settings?.dakClearedAt);
    const dakClearedAtMerged = maxDakClearedAt(dakClearedAtRef.current, incomingClear);
    if (incomingClear && incomingClear > (dakClearedAtRef.current || '')) {
      dakClearedAtRef.current = incomingClear;
      setDakClearedAt(incomingClear);
      saveDakClearedAt(incomingClear);
    }
    setDakEntries((prev) => {
      const incoming = normalizeDakList(data.dak);
      if (!incoming.length) {
        if (incomingClear) {
          return applyDakClearedAt(prev, dakClearedAtMerged);
        }
        return preferLocalListIfIncomingEmpty(prev, incoming, data, 'dak');
      }
      return applyDakClearedAt(mergeDakLists(prev, incoming), dakClearedAtMerged);
    });
    setCorrespondenceEntries((prev) =>
      preferLocalListIfIncomingEmpty(
        prev,
        normalizeCorrespondenceList(data.correspondence),
        data,
        'correspondence',
      ),
    );
    setTargetEntries((prev) =>
      preferLocalListIfIncomingEmpty(
        prev,
        normalizeTargetList(data.targets),
        data,
        'targets',
      ),
    );
    setTaskEntries((prev) =>
      preferLocalListIfIncomingEmpty(prev, normalizeTaskList(data.tasks), data, 'tasks'),
    );
    setCaptureEntries((prev) =>
      preferLocalListIfIncomingEmpty(
        prev,
        normalizeCaptureList(data.captures),
        data,
        'captures',
      ),
    );
    setContacts((prev) =>
      preferLocalListIfIncomingEmpty(
        prev,
        normalizeContactList(data.contacts),
        data,
        'contacts',
      ),
    );
    setPettyCashState((prev) => {
      const incomingCases = normalizePettyCashCaseList(data.pettyCash?.cases);
      const incomingRefresh = normalizeRefreshmentNoteList(data.pettyCash?.refreshmentNotes);
      const incomingEmpty = !incomingCases.length && !incomingRefresh.length;
      const prevHas =
        (prev.cases?.length ?? 0) > 0 || (prev.refreshmentNotes?.length ?? 0) > 0;
      if (incomingEmpty && prevHas && snapshotHasOtherDomainData(data, 'pettyCash')) {
        return prev;
      }
      if (incomingEmpty && !prevHas) return prev;
      return {
        cases: incomingCases.length ? incomingCases : prev.cases,
        refreshmentNotes: incomingRefresh.length ? incomingRefresh : prev.refreshmentNotes,
      };
    });
    setFileLabels((prev) =>
      preferLocalListIfIncomingEmpty(
        prev,
        normalizeFileLabelList(data.fileLabels),
        data,
        'fileLabels',
      ),
    );
    setMuhasabaEntries((prev) =>
      preferLocalListIfIncomingEmpty(
        prev,
        normalizeMuhasabaList(data.muhasaba),
        data,
        'muhasaba',
      ),
    );
    if (data.settings?.morningMeetingBoard) {
      saveMorningBoardSettings(data.settings.morningMeetingBoard);
    }
    if (data.settings?.weeklyExpenditureEmail) {
      saveWeeklyExpenditureEmailSettings(data.settings.weeklyExpenditureEmail);
    }
    if (data.settings?.pettyCashSignatures) {
      setPettyCashSignaturesState(savePettyCashSignatures(data.settings.pettyCashSignatures));
    }
    const incomingVault = normalizeNotesVaultMeta(data.settings?.notesVault);
    if (incomingVault && !loadNotesVaultMeta()) {
      saveNotesVaultMeta(incomingVault);
    }
  }, []);

  const getAppSnapshot = useCallback(() => {
    const notesVault = loadNotesVaultMeta();
    return buildAppSnapshot({
      meetings,
      souvenirs,
      expenditureState,
      orders,
      dakEntries,
      correspondenceEntries,
      targetEntries,
      taskEntries,
      captureEntries,
      contacts,
      pettyCashState,
      fileLabels,
      muhasabaEntries,
      settings: {
        morningMeetingBoard: loadMorningBoardSettings(),
        weeklyExpenditureEmail: loadWeeklyExpenditureEmailSettings(),
        pettyCashSignatures: loadPettyCashSignatures(),
        ...(dakClearedAt ? { dakClearedAt } : {}),
        ...(notesVault ? { notesVault } : {}),
      },
    });
  }, [meetings, souvenirs, expenditureState, orders, dakEntries, correspondenceEntries, targetEntries, dakClearedAt, taskEntries, captureEntries, contacts, pettyCashState, fileLabels, muhasabaEntries]);

  const appMetaValue = useMemo(
    () => ({
      importAppData,
      getAppSnapshot,
      dataRevision,
      inventory,
    }),
    [importAppData, getAppSnapshot, dataRevision, inventory],
  );

  const meetingsValue = useMemo(
    () => ({
      meetings,
      setMeetings,
      addMeeting,
      cancelMeeting,
      updateMeeting,
      setMeetingOutlookEventId,
      importGoogleMeetings,
      stats,
      upcomingMeetings,
      meetingsNextWeek,
      calendarMeetingsNextWeek,
    }),
    [
      meetings,
      addMeeting,
      cancelMeeting,
      updateMeeting,
      setMeetingOutlookEventId,
      importGoogleMeetings,
      stats,
      upcomingMeetings,
      meetingsNextWeek,
      calendarMeetingsNextWeek,
    ],
  );

  const expenditureValue = useMemo(
    () => ({
      expenditureOpeningBalance: expenditureState.openingBalance,
      expenditureOpeningBalanceDate: expenditureState.openingBalanceDate,
      expenditures: expenditureState.expenditures,
      expenditureState,
      setExpenditureOpeningBalance,
      addExpenditure,
      removeExpenditure,
      removeExpendituresBeforeDate,
      clearExpenditureRecords,
      updateExpenditure,
      expenditureSummary,
    }),
    [
      expenditureState,
      setExpenditureOpeningBalance,
      addExpenditure,
      removeExpenditure,
      removeExpendituresBeforeDate,
      clearExpenditureRecords,
      updateExpenditure,
      expenditureSummary,
    ],
  );

  const ordersValue = useMemo(
    () => ({
      orders,
      addOrder,
      updateOrder,
      markOrderReceived,
      cancelOrder,
      removeOrder,
    }),
    [orders, addOrder, updateOrder, markOrderReceived, cancelOrder, removeOrder],
  );

  const dakValue = useMemo(
    () => ({
      dakEntries,
      addDakEntry,
      addDakEntriesBulk,
      updateDakEntry,
      cancelDakEntry,
      eraseDakEntry,
      eraseAllDakEntries,
    }),
    [dakEntries, addDakEntry, addDakEntriesBulk, updateDakEntry, cancelDakEntry, eraseDakEntry, eraseAllDakEntries],
  );

  const correspondenceValue = useMemo(
    () => ({
      correspondenceEntries,
      addCorrespondenceEntry,
      removeCorrespondenceEntry,
    }),
    [correspondenceEntries, addCorrespondenceEntry, removeCorrespondenceEntry],
  );

  const targetsValue = useMemo(
    () => ({
      targetEntries,
      addTarget,
      updateTarget,
      addTargetAction,
      removeTargetAction,
      voteTargetAction,
      achieveTarget,
      reopenTarget,
      removeTarget,
    }),
    [
      targetEntries,
      addTarget,
      updateTarget,
      addTargetAction,
      removeTargetAction,
      voteTargetAction,
      achieveTarget,
      reopenTarget,
      removeTarget,
    ],
  );

  const tasksValue = useMemo(
    () => ({
      taskEntries,
      addTaskEntry,
      updateTaskEntry,
      completeTaskEntry,
      reopenTaskEntry,
      trashTaskEntry,
      restoreTaskEntry,
      removeTaskEntry,
      cancelTaskEntry,
    }),
    [
      taskEntries,
      addTaskEntry,
      updateTaskEntry,
      completeTaskEntry,
      reopenTaskEntry,
      trashTaskEntry,
      restoreTaskEntry,
      removeTaskEntry,
      cancelTaskEntry,
    ],
  );

  const captureValue = useMemo(
    () => ({
      captureEntries,
      addCaptureEntry,
      updateCaptureEntry,
      setCapturePinned,
      completeCaptureEntry,
      trashCaptureEntry,
      restoreCaptureEntry,
      moveCaptureEntry,
      removeCaptureEntry,
      clearDoneCaptures,
    }),
    [
      captureEntries,
      addCaptureEntry,
      updateCaptureEntry,
      setCapturePinned,
      completeCaptureEntry,
      trashCaptureEntry,
      restoreCaptureEntry,
      moveCaptureEntry,
      removeCaptureEntry,
      clearDoneCaptures,
    ],
  );

  const contactsValue = useMemo(
    () => ({
      contacts,
      addContact,
      updateContact,
      removeContact,
      importContacts,
      clearAllContacts,
      reconcileContacts,
    }),
    [contacts, addContact, updateContact, removeContact, importContacts, clearAllContacts, reconcileContacts],
  );

  const pettyCashValue = useMemo(
    () => ({
      pettyCashCases: pettyCashState.cases || [],
      refreshmentNotes: pettyCashState.refreshmentNotes || [],
      pettyCashSignatures,
      addPettyCashCase,
      updatePettyCashCase,
      removePettyCashCase,
      addRefreshmentNote,
      removeRefreshmentNote,
      updatePettyCashSignatures,
    }),
    [
      pettyCashState,
      pettyCashSignatures,
      addPettyCashCase,
      updatePettyCashCase,
      removePettyCashCase,
      addRefreshmentNote,
      removeRefreshmentNote,
      updatePettyCashSignatures,
    ],
  );

  const labelsValue = useMemo(
    () => ({
      fileLabels,
      addFileLabel,
      updateFileLabel,
      removeFileLabel,
    }),
    [fileLabels, addFileLabel, updateFileLabel, removeFileLabel],
  );

  const muhasabaValue = useMemo(
    () => ({
      muhasabaEntries,
      addMuhasabaEntry,
      completeMuhasabaAction,
      removeMuhasabaEntry,
    }),
    [muhasabaEntries, addMuhasabaEntry, completeMuhasabaAction, removeMuhasabaEntry],
  );

  const souvenirsValue = useMemo(
    () => ({
      souvenirs,
      setSouvenirs,
      addSouvenir,
      addSouvenirLogEntry,
      addSouvenirsFromPresentation,
      updateSouvenirLogEntry,
      removeSouvenirLogEntry,
      monthlySouvenirSummary,
    }),
    [
      souvenirs,
      addSouvenir,
      addSouvenirLogEntry,
      addSouvenirsFromPresentation,
      updateSouvenirLogEntry,
      removeSouvenirLogEntry,
      monthlySouvenirSummary,
    ],
  );

  const legacyValue = useMemo(
    () => ({
      ...meetingsValue,
      ...expenditureValue,
      ...ordersValue,
      ...dakValue,
      ...correspondenceValue,
      ...targetsValue,
      ...tasksValue,
      ...captureValue,
      ...contactsValue,
      ...pettyCashValue,
      ...labelsValue,
      ...muhasabaValue,
      ...souvenirsValue,
      ...appMetaValue,
    }),
    [
      meetingsValue,
      expenditureValue,
      ordersValue,
      dakValue,
      correspondenceValue,
      targetsValue,
      tasksValue,
      captureValue,
      contactsValue,
      pettyCashValue,
      labelsValue,
      muhasabaValue,
      souvenirsValue,
      appMetaValue,
    ],
  );

  return (
    <AppMetaContext.Provider value={appMetaValue}>
      <MeetingsContext.Provider value={meetingsValue}>
        <ExpenditureContext.Provider value={expenditureValue}>
          <OrdersContext.Provider value={ordersValue}>
            <DakContext.Provider value={dakValue}>
              <CorrespondenceContext.Provider value={correspondenceValue}>
              <TargetsContext.Provider value={targetsValue}>
              <TasksContext.Provider value={tasksValue}>
                <CaptureContext.Provider value={captureValue}>
                  <ContactsContext.Provider value={contactsValue}>
                    <PettyCashContext.Provider value={pettyCashValue}>
                      <LabelsContext.Provider value={labelsValue}>
                      <MuhasabaContext.Provider value={muhasabaValue}>
                      <SouvenirsContext.Provider value={souvenirsValue}>
                        <ExecutiveContext.Provider value={legacyValue}>
                          {children}
                        </ExecutiveContext.Provider>
                      </SouvenirsContext.Provider>
                      </MuhasabaContext.Provider>
                      </LabelsContext.Provider>
                    </PettyCashContext.Provider>
                  </ContactsContext.Provider>
                </CaptureContext.Provider>
              </TasksContext.Provider>
              </TargetsContext.Provider>
              </CorrespondenceContext.Provider>
            </DakContext.Provider>
          </OrdersContext.Provider>
        </ExpenditureContext.Provider>
      </MeetingsContext.Provider>
    </AppMetaContext.Provider>
  );
}

export function useExecutive() {
  const ctx = useContext(ExecutiveContext);
  if (!ctx) {
    throw new Error('useExecutive must be used within ExecutiveProvider');
  }
  return ctx;
}

function useDomainContext(ctx, name) {
  const value = useContext(ctx);
  if (!value) {
    throw new Error(`${name} must be used within ExecutiveProvider`);
  }
  return value;
}

export const useMeetingsExecutive = () => useDomainContext(MeetingsContext, 'useMeetingsExecutive');
export const useExpenditureExecutive = () =>
  useDomainContext(ExpenditureContext, 'useExpenditureExecutive');
export const useOrdersExecutive = () => useDomainContext(OrdersContext, 'useOrdersExecutive');
export const useDakExecutive = () => useDomainContext(DakContext, 'useDakExecutive');
export const useCorrespondenceExecutive = () =>
  useDomainContext(CorrespondenceContext, 'useCorrespondenceExecutive');
export const useTargetsExecutive = () => useDomainContext(TargetsContext, 'useTargetsExecutive');
export const useTasksExecutive = () => useDomainContext(TasksContext, 'useTasksExecutive');
export const useCaptureExecutive = () => useDomainContext(CaptureContext, 'useCaptureExecutive');
export const useContactsExecutive = () => useDomainContext(ContactsContext, 'useContactsExecutive');
export const usePettyCashExecutive = () => useDomainContext(PettyCashContext, 'usePettyCashExecutive');
export const useLabelsExecutive = () => useDomainContext(LabelsContext, 'useLabelsExecutive');
export const useMuhasabaExecutive = () => useDomainContext(MuhasabaContext, 'useMuhasabaExecutive');
export const useSouvenirsExecutive = () =>
  useDomainContext(SouvenirsContext, 'useSouvenirsExecutive');
export const useAppMetaExecutive = () => useDomainContext(AppMetaContext, 'useAppMetaExecutive');
