# Domain: Meetings

Calendar appointments, reminders, morning meeting board email/PDF.

## Touch first

| Layer | Paths |
|-------|--------|
| UI | `src/pages/ExecutiveCalendar.jsx`, `src/components/calendar/`, dashboard meeting widgets |
| State | `MeetingsContext` via `useMeetingsExecutive` |
| Logic | `src/utils/calendar.js`, `dates.js`, `reminders.js`, `morningBoardSettings.js`, `meetingBoardPdf.js`, `monthlyMeetingLogPdf.js`, `googleCalendar.js`, `diaryImport.js` |
| API | `api/morning-meeting-board.js`, `api/_lib/meetingBoardPdf.js`, `sendMeetingBoardEmail.js`, `loadMorningBoardJobs.js`, `karachiDate.js` |

## Storage

- Key: `executive_flow_meetings`
- Normalize with helpers in `dates.js` (`normalizeMeetingForCalendar`, etc.)

## Related (not this domain)

| Feature | Owner |
|---------|--------|
| Souvenirs attached to a meeting | **Souvenirs** (`MeetingSouvenirPanel` may compose both) |
| Morning board email card on Sync tab | Settings = Meetings utils; host UI = Sync |
| Dashboard “upcoming / next week” | **Dashboard** reads Meetings data — don’t own writes there |

## Do / don’t

- **Do** keep reminder firing in `ReminderHost` / `reminders.js`.
- **Do** use Karachi date helpers for scheduled board jobs.
- **Don’t** store expenditure or contacts inside meeting records.
- **Don’t** send board email from the calendar page directly — call the API job path.
