const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/** Build "Add to Google Calendar" URL (no API key required) */
export function buildGoogleCalendarAddUrl(meeting) {
  const { title, date, time, agenda, attendees } = meeting;
  const [y, m, d] = date.split('-');
  const [h, min] = (time || '09:00').split(':');
  const startH = Number(h);
  const endH = Math.min(startH + 1, 23);
  const start = `${y}${m}${d}T${String(startH).padStart(2, '0')}${min}00`;
  const end = `${y}${m}${d}T${String(endH).padStart(2, '0')}${min}00`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: agenda || '',
  });

  if (attendees?.length) {
    params.set('add', attendees.join(','));
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function openInGoogleCalendar(meeting) {
  window.open(buildGoogleCalendarAddUrl(meeting), '_blank', 'noopener,noreferrer');
}

/** Load Google Identity Services script once */
let gsiLoadPromise = null;

export function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gsiLoadPromise) return gsiLoadPromise;

  gsiLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return gsiLoadPromise;
}

const TOKEN_KEY = 'executive_flow_gcal_token';

export function getStoredGoogleToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredGoogleToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

/** Request OAuth token via GIS */
export async function requestGoogleCalendarAccess() {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      'Google Calendar sync needs VITE_GOOGLE_CLIENT_ID in your .env file. See .env.example.',
    );
  }

  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        setStoredGoogleToken(response.access_token);
        resolve(response.access_token);
      },
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

function parseEventDateTime(event) {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) return null;

  if (start.includes('T')) {
    const dt = new Date(start);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const h = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, time: `${h}:${min}` };
  }

  return { date: start, time: '09:00' };
}

/** Fetch primary calendar events between two ISO datetimes */
export async function fetchGoogleCalendarEvents(timeMin, timeMax, accessToken) {
  const token = accessToken || getStoredGoogleToken();
  if (!token) throw new Error('Not connected to Google Calendar');

  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    if (res.status === 401) {
      setStoredGoogleToken(null);
      throw new Error('Session expired — please connect again');
    }
    throw new Error('Could not load Google Calendar events');
  }

  const data = await res.json();
  return (data.items || [])
    .filter((e) => e.status !== 'cancelled')
    .map((event) => {
      const when = parseEventDateTime(event);
      if (!when) return null;
      return {
        id: `gcal-${event.id}`,
        googleEventId: event.id,
        title: event.summary || 'Untitled meeting',
        date: when.date,
        time: when.time,
        agenda: event.description || '',
        attendees:
          event.attendees?.map((a) => a.displayName || a.email).filter(Boolean) || [],
        automateReminders: false,
        status: 'Scheduled',
      };
    })
    .filter(Boolean);
}

export function mapGoogleEventToMeeting(event) {
  return event;
}
