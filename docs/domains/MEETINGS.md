# Domain: Meetings

Calendar appointments, reminders, morning meeting board email/PDF.

## Touch first

| Layer | Paths |
|-------|--------|
| UI | `src/pages/ExecutiveCalendar.jsx`, `src/components/calendar/`, dashboard meeting widgets |
| State | `MeetingsContext` via `useMeetingsExecutive` |
| Logic | `src/utils/calendar.js`, `dates.js`, `reminders.js`, `morningBoardSettings.js`, `meetingBoardPdf.js`, `monthlyMeetingLogPdf.js`, `googleCalendar.js`, `outlookCalendar.js`, `meetingAiExtract.js`, `diaryImport.js` |
| API | `api/morning-meeting-board.js`, `api/extract-meeting.js`, `api/_lib/meetingExtract.js`, `api/_lib/meetingInviteStorage.js`, `api/_lib/meetingBoardPdf.js`, `sendMeetingBoardEmail.js`, `loadMorningBoardJobs.js`, `karachiDate.js` |

## Storage

- Key: `executive_flow_meetings`
- Normalize with helpers in `dates.js` (`normalizeMeetingForCalendar`, etc.)
- Optional `outlookEventId` — Microsoft Graph event id after one-way Outlook push
- Optional `invitationImageRef` — link to the invitation photo (`meeting-invites/`). The photo is not stored as base64 on the meeting.

## AI fill

On **Nayi Appointment**, the operator can skip field-by-field typing.

- **Short brief:** place, time, and topic. `POST /api/extract-meeting` fills title, date, time, location, agenda, and attendees. The operator checks the form, then saves.
- **Invitation snap:** a JPG, PNG, or WebP photo is stored privately and sent to the same route. If the model fails after upload, the photo ref still comes back so it can be saved with the appointment.
- Login is required (`guardPost`), same as Dak scan. A signed-out operator is told to sign in from Sync & Backup.

## Outlook (one-way)

**On save:** the operator is asked whether to schedule on Outlook. **Haan** opens Outlook web compose with the appointment filled in. **Nahi** saves only in My Calendar. Each saved appointment still has an **Outlook** button.

**Silent Graph push (optional, not used on save):** set `VITE_MSAL_CLIENT_ID` via `scripts/setup-outlook-env.ps1`, redeploy, then **Connect Outlook**. Cancel of a linked event can still remove it from Outlook (`Asia/Karachi`, 1 hour).

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
