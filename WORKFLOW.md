# Executive Flow — How to Play (Workflow Roadmap)

> Architecture map = **rooms & names**.  
> This file = **rules of the game**: who starts, what next, where to click.

Do not guess. Follow the matching flow below.

---

## Golden rule (every day)

| Step | Who | What | Where to click |
|------|-----|------|----------------|
| **1** | You | Open the right room | Sidebar → the tab for that job |
| **2** | You | Add / edit / mark done | Form on that page → Save / Add |
| **3** | System (if 2 devices) | Protect the work | **Real-time Pulse** auto-saves after every edit (login once on Sync & Backup) |

Data lives on **this device** and **pulses to cloud** in the background when you are logged in. No Save/Load clicks.

---

## Core flows (Steps 1 · 2 · 3)

### A. First-time / second device setup

| Step | Who starts | What happens next | Where to click |
|------|------------|-------------------|----------------|
| 1 | You | Log in | Sidebar → **Sync & Backup** → **Send Email Code** → open link / enter code |
| 2 | System | Pull existing data | **Real-time Pulse** auto-loads cloud backup on empty device |
| 3 | You | Confirm | Status shows **Pulse · live** + data looks right → then use other tabs |

Detail: [docs/CLOUD_SYNC.md](./docs/CLOUD_SYNC.md)

---

### B. Daily office loop (recommended order)

| Step | Who | Action | Click |
|------|-----|--------|-------|
| 1 | You | See the day | **Dashboard** (overview) or **My Calendar** |
| 2 | You | Capture loose thoughts | **Capture** → type → add |
| 3 | You | Turn thoughts into work | Move items into **Task Log** / **My Calendar** / **Dak** as needed |

---

### C. Schedule a meeting

| Step | Who | What | Click |
|------|-----|------|-------|
| 1 | You | Open calendar | **My Calendar** |
| 2 | You | Pick day → create appointment | Day cell / schedule controls → fill form → save |
| 3 | System | Reminder when due | No click — alert appears in-app when time comes |

Souvenir for that meeting? → go to flow **D** (or souvenir panel on the meeting).

---

### D. Log a souvenir

| Step | Who | What | Click |
|------|-----|------|-------|
| 1 | You | Open log | **Souvenir Log** |
| 2 | You | Add record | Add form → save |
| 3 | Optional | Low stock | Watch **Dashboard** alerts — restock via Orders if needed |

---

### E. Record spending

| Step | Who | What | Click |
|------|-----|------|-------|
| 1 | You (once) | Set opening balance | **Expenditure Log** → opening balance fields |
| 2 | You | Add expense | Same page → add entry → save |
| 3 | Optional | Weekly email / PDF | **Sync & Backup** → weekly expenditure card / settings (job runs on schedule) |

---

### F. Place / track an order

| Step | Who | What | Click |
|------|-----|------|-------|
| 1 | You | Open orders | **Order Log** |
| 2 | You | Create order | Add form → system order no. → save |
| 3 | You | Mark received / share | Row actions (received / WhatsApp / PDF as shown) |

---

### G. Issue dak

| Step | Who | What | Click |
|------|-----|------|-------|
| 1 | You | Open dak | **Dak Issuance Log** |
| 2 | You | Enter subject · date · addressee | Form → **Add Dak Entry** (dispatch no. auto) |
| 3 | You | Share / print | Row PDF / WhatsApp actions |

---

### H. Track a task

| Step | Who | What | Click |
|------|-----|------|-------|
| 1 | You | Open tasks | **Task Log** |
| 2 | You | Add task + date/time | Form → **Add Task** |
| 3 | You | Finish | Row → mark **Done** (or edit / cancel) |

---

### I. Add / find a contact

| Step | Who | What | Click |
|------|-----|------|-------|
| 1 | You | Open directory | **Contact Database** |
| 2 | You | Add or search | Form / search box (or AI / CSV import on that page) |
| 3 | You | Reuse later | Search again — do not retype from memory |

---

### J. Laptop ↔ mobile (after login)

| Step | Who | Device A | Device B |
|------|-----|----------|----------|
| 1 | You | Edit anything — Pulse auto-saves | Same login |
| 2 | System | — | Pulse auto-loads when cloud is newer |
| 3 | You | Keep working | Open the matching tab to see new rows |

Empty overwrite is blocked: a blank device will not wipe cloud; Pulse restores first.

---

## Who does what (roles)

| Role | Starts when… | Does |
|------|----------------|------|
| **You (operator)** | Any work day | Click tabs, fill forms; cloud Pulse runs in background after login |
| **App (system)** | After you edit | Stores on device; Real-time Pulse; reminders; auto dispatch/order numbers |
| **Cloud job** | Schedule / Sync settings | Morning board email, weekly expenditure email (server) |
| **Builder / AI** | Code change | Follow [ARCHITECTURE.md](./ARCHITECTURE.md) + [AGENTS.md](./AGENTS.md) — different game |

---

## Builder playbook (code — do not mix with user clicks)

| Step | Who | What | Where |
|------|-----|------|-------|
| 1 | Builder | Name the room | `ARCHITECTURE.md` domain table |
| 2 | Builder | Change only that pile | Page → utils → context/API |
| 3 | Builder | Update the map if a new room appears | `ARCHITECTURE.md` + domain guide |

---

## Sidebar cheat sheet

| Want to… | Click |
|----------|--------|
| Overview | Dashboard |
| Meetings | My Calendar |
| Gifts / stock | Souvenir Log |
| Money out | Expenditure Log |
| Vendor orders | Order Log |
| Official dispatch | Dak Issuance Log |
| To-dos | Task Log |
| Quick notes | Capture |
| People | Contact Database |
| Login / Save / Load | Sync & Backup |

---

When someone is tired of guessing: open **this file**, pick the letter (A–J), do only Steps 1–2–3.

**First time using this guide?** Run the 20‑minute pilot → [docs/WORKFLOW_PILOT.md](./docs/WORKFLOW_PILOT.md)
