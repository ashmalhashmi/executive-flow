/**
 * One-way push: My Calendar → Outlook (Microsoft Graph).
 * Requires VITE_MSAL_CLIENT_ID from an Azure App Registration (SPA + Calendars.ReadWrite).
 */

import {
  PublicClientApplication,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const SCOPES = ['Calendars.ReadWrite', 'User.Read'];
const ACCOUNT_KEY = 'executive_flow_outlook_account';
const TIME_ZONE = 'Asia/Karachi';

export const MSAL_CLIENT_ID = String(import.meta.env.VITE_MSAL_CLIENT_ID || '').trim();
export const MSAL_TENANT_ID = String(import.meta.env.VITE_MSAL_TENANT_ID || 'common').trim();

let msalInstance = null;
let msalInitPromise = null;

function getRedirectUri() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function isOutlookConfigured() {
  return Boolean(MSAL_CLIENT_ID);
}

function getMsalConfig() {
  return {
    auth: {
      clientId: MSAL_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${MSAL_TENANT_ID || 'common'}`,
      redirectUri: getRedirectUri(),
      postLogoutRedirectUri: getRedirectUri(),
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
  };
}

export async function getOutlookMsal() {
  if (!MSAL_CLIENT_ID) {
    throw new Error(
      'Outlook connect needs VITE_MSAL_CLIENT_ID in .env / Vercel. See .env.example.',
    );
  }
  if (msalInstance) return msalInstance;
  if (!msalInitPromise) {
    msalInitPromise = (async () => {
      const app = new PublicClientApplication(getMsalConfig());
      await app.initialize();
      msalInstance = app;
      return app;
    })();
  }
  return msalInitPromise;
}

function rememberAccountHomeId(account) {
  if (account?.homeAccountId) {
    sessionStorage.setItem(ACCOUNT_KEY, account.homeAccountId);
  }
}

function clearRememberedAccount() {
  sessionStorage.removeItem(ACCOUNT_KEY);
}

export function getActiveOutlookAccount(msal) {
  const remembered = sessionStorage.getItem(ACCOUNT_KEY);
  const accounts = msal.getAllAccounts();
  if (!accounts.length) return null;
  if (remembered) {
    const match = accounts.find((a) => a.homeAccountId === remembered);
    if (match) return match;
  }
  return accounts[0];
}

export function isOutlookConnectedSync() {
  try {
    return Boolean(sessionStorage.getItem(ACCOUNT_KEY));
  } catch {
    return false;
  }
}

/** Interactive login + consent for Calendars.ReadWrite */
export async function connectOutlookCalendar() {
  const msal = await getOutlookMsal();
  const result = await msal.loginPopup({
    scopes: SCOPES,
    prompt: 'select_account',
  });
  if (!result?.account) throw new Error('Outlook login failed');
  rememberAccountHomeId(result.account);
  return result.account;
}

export async function disconnectOutlookCalendar() {
  clearRememberedAccount();
  try {
    const msal = await getOutlookMsal();
    const account = getActiveOutlookAccount(msal);
    if (account) {
      await msal.logoutPopup({ account }).catch(() => {
        /* token clear is enough for this app */
      });
    }
  } catch {
    /* not configured or already cleared */
  }
}

export async function getOutlookAccessToken() {
  const msal = await getOutlookMsal();
  let account = getActiveOutlookAccount(msal);
  if (!account) {
    account = await connectOutlookCalendar();
  }

  try {
    const silent = await msal.acquireTokenSilent({
      account,
      scopes: SCOPES,
    });
    rememberAccountHomeId(silent.account || account);
    return silent.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError || err?.errorCode) {
      const interactive = await msal.acquireTokenPopup({
        account,
        scopes: SCOPES,
      });
      rememberAccountHomeId(interactive.account || account);
      return interactive.accessToken;
    }
    throw err;
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Build local dateTime string + 1h end (Graph + timeZone). */
export function buildOutlookEventDateTimes(meeting) {
  const date = String(meeting?.date || '').trim();
  const time = String(meeting?.time || '09:00').trim() || '09:00';
  const [hRaw, minRaw] = time.split(':');
  const startH = Number(hRaw) || 9;
  const startM = Number(minRaw) || 0;
  const endTotal = startH * 60 + startM + 60;
  const endH = Math.min(Math.floor(endTotal / 60), 23);
  const endM = endH === 23 && endTotal >= 24 * 60 ? 59 : endTotal % 60;

  const start = `${date}T${pad2(startH)}:${pad2(startM)}:00`;
  const end = `${date}T${pad2(endH)}:${pad2(endM)}:00`;
  return { start, end, timeZone: TIME_ZONE };
}

function attendeeEmails(attendees) {
  const list = Array.isArray(attendees) ? attendees : [];
  return list
    .map((a) => String(a || '').trim())
    .filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a))
    .map((email) => ({
      emailAddress: { address: email },
      type: 'required',
    }));
}

export function meetingToOutlookEventBody(meeting) {
  const { start, end, timeZone } = buildOutlookEventDateTimes(meeting);
  const location = String(meeting?.location || '').trim();
  const agenda = String(meeting?.agenda || '').trim();
  const body = {
    subject: String(meeting?.title || 'Meeting').trim() || 'Meeting',
    body: {
      contentType: 'Text',
      content: agenda || 'Scheduled via Executive Flow My Calendar.',
    },
    start: { dateTime: start, timeZone },
    end: { dateTime: end, timeZone },
    isReminderOn: Boolean(meeting?.automateReminders),
  };
  if (location) body.location = { displayName: location };
  const attendees = attendeeEmails(meeting?.attendees);
  if (attendees.length) body.attendees = attendees;
  return body;
}

/** Outlook web compose — no Azure Client ID needed (user confirms in browser). */
export function buildOutlookWebComposeUrl(meeting) {
  const { start, end } = buildOutlookEventDateTimes(meeting);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: String(meeting?.title || 'Meeting').trim() || 'Meeting',
    body: String(meeting?.agenda || '').trim(),
    location: String(meeting?.location || '').trim(),
    startdt: start,
    enddt: end,
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function openInOutlookCalendar(meeting) {
  if (typeof window === 'undefined') return;
  window.open(buildOutlookWebComposeUrl(meeting), '_blank', 'noopener,noreferrer');
}

function icsEscape(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function toIcsLocalStamp(dateTime) {
  // "YYYY-MM-DDTHH:mm:ss" → "YYYYMMDDTHHmmss"
  return String(dateTime || '').replace(/[-:]/g, '').slice(0, 15);
}

/** Download .ics — desktop Outlook / Calendar apps open it (zero Azure config). */
export function downloadOutlookIcs(meeting) {
  if (typeof window === 'undefined') return;
  const { start, end } = buildOutlookEventDateTimes(meeting);
  const uid = `${meeting?.id || `mtg-${Date.now()}`}@executive-flow`;
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Executive Flow//Petty Meetings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Asia/Karachi:${toIcsLocalStamp(start)}`,
    `DTEND;TZID=Asia/Karachi:${toIcsLocalStamp(end)}`,
    `SUMMARY:${icsEscape(meeting?.title || 'Meeting')}`,
    `DESCRIPTION:${icsEscape(meeting?.agenda || '')}`,
    `LOCATION:${icsEscape(meeting?.location || '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = String(meeting?.title || 'meeting')
    .replace(/[^\w\-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  a.href = url;
  a.download = `${safeName || 'meeting'}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Zero-config one-way add: .ics download + Outlook web compose.
 * Use when Graph Connect is not available / not connected.
 */
export function addMeetingToOutlookWithoutApi(meeting) {
  downloadOutlookIcs(meeting);
  openInOutlookCalendar(meeting);
}


async function graphFetch(path, { method = 'GET', body, accessToken } = {}) {
  const token = accessToken || (await getOutlookAccessToken());
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      clearRememberedAccount();
      throw new Error('Outlook session expired — Connect Outlook again');
    }
    const msg = data?.error?.message || `Outlook Graph error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

/** Create event on primary Outlook calendar → returns event id */
export async function createOutlookEvent(meeting) {
  const data = await graphFetch('/me/events', {
    method: 'POST',
    body: meetingToOutlookEventBody(meeting),
  });
  return data?.id || '';
}

/** Update existing Outlook event */
export async function updateOutlookEvent(eventId, meeting) {
  const id = String(eventId || '').trim();
  if (!id) return createOutlookEvent(meeting);
  await graphFetch(`/me/events/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: meetingToOutlookEventBody(meeting),
  });
  return id;
}

/** Delete Outlook event (ignore missing) */
export async function deleteOutlookEvent(eventId) {
  const id = String(eventId || '').trim();
  if (!id) return;
  try {
    await graphFetch(`/me/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.includes('404') || /not found/i.test(msg)) return;
    throw err;
  }
}

/**
 * Push meeting one-way: create or update.
 * @returns {{ eventId: string, action: 'created' | 'updated' }}
 */
export async function pushMeetingToOutlook(meeting) {
  const existing = String(meeting?.outlookEventId || '').trim();
  if (existing) {
    const eventId = await updateOutlookEvent(existing, meeting);
    return { eventId, action: 'updated' };
  }
  const eventId = await createOutlookEvent(meeting);
  return { eventId, action: 'created' };
}
