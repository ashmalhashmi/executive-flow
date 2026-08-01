# Pilot experiment: How to use WORKFLOW.md

**Goal:** Test whether the “How to Play” guide stops guessing — you follow Steps 1·2·3 instead of hunting around the app.

**Time:** ~20–25 minutes  
**You need:** Executive Flow open (browser or phone) + this repo’s `WORKFLOW.md` open beside it  
**Pass:** You complete Parts 1–3 without asking “where do I click?” for those flows

---

## Before you start (2 min)

1. Open the app (e.g. local `npm run dev` or your Vercel URL).
2. In Cursor (or any editor), open **`WORKFLOW.md`**.
3. Split the screen: **left = WORKFLOW.md**, **right = app**.
4. Promise for this pilot: **do not click a tab until the guide names it.**

Write your start time: `________`

---

## Part 0 — Learn the map (3 min)

In `WORKFLOW.md`, read only:

1. The intro (rooms vs rules of the game)
2. **Golden rule** table (Steps 1 · 2 · 3)
3. **Sidebar cheat sheet** at the bottom

**Check:** Without looking at the app, fill:

| I want to… | Tab I will click (from cheat sheet) |
|------------|-------------------------------------|
| Save data to cloud | _________________ |
| Add a to-do | _________________ |
| Record money spent | _________________ |

Answers: Sync & Backup · Task Log · Expenditure Log

If wrong → re-read cheat sheet once, then continue.

---

## Part 1 — Daily loop (Flow B) · ~5 min

**Who starts:** You  
**Guide section:** `WORKFLOW.md` → **B. Daily office loop**

| Your step | Do exactly this | Tick |
|-----------|-----------------|------|
| 1 | Sidebar → **Dashboard** or **My Calendar** — look only, no panic-clicking other tabs | ☐ |
| 2 | Sidebar → **Capture** → type a fake note: `Pilot: buy stamps` → add it | ☐ |
| 3 | Sidebar → **Task Log** → add a task from that idea (e.g. `Buy stamps`) → **Add Task** | ☐ |

**Rule check:** Did you open Capture because the guide said so, or because you guessed?  
Circle one: **Guide** / **Guess**

---

## Part 2 — One “log” flow (Flow H or E) · ~5 min

Pick **one**:

- **H. Track a task** (if Part 1 task is enough, mark it **Done** on the row), **or**
- **E. Record spending** (fake expense: `Pilot tea` · small amount)

Open the matching letter in `WORKFLOW.md`. Do **only** Steps 1 · 2 · 3 from that table.

| Step | What the table said | What you clicked | Tick |
|------|---------------------|------------------|------|
| 1 | | | ☐ |
| 2 | | | ☐ |
| 3 | | | ☐ |

---

## Part 3 — Cloud rule (Flow J dry-run) · ~5 min

**Do not overwrite real cloud data if unsure.** This part is a **read + decide** drill.

1. Open `WORKFLOW.md` → **J. Laptop ↔ mobile**.
2. Open app → **Sync & Backup** (cheat sheet / Flow J Step 1).
3. Answer on paper (do **not** click Save/Load until you answer):

| Question | Your answer |
|----------|-------------|
| On a **new** phone, after login, click **Save** or **Load** first? | ________ |
| Device A finished edits — which button? | ________ |
| Device B wants those edits — which button? | ________ |

**Correct:** Load first on new device · Save on A · Load on B  

4. Optional (only if already logged in and you know this device has the good copy):  
   click **Save to Cloud** once → confirm success message.

If you are on a blank/new device: **stop at step 3** — do not Save.

---

## Part 4 — Score the pilot (3 min)

| Question | Score 1–5 (5 = easy) |
|----------|----------------------|
| Finding the right tab without guessing | __ |
| Knowing what to do next (Step 2) | __ |
| Understanding Save vs Load | __ |
| Would you open WORKFLOW.md again next week? | Yes / No |

**Free note (one line):**  
What still felt confusing? `________________________________`

---

## Pass / fail

| Result | Meaning | Next action |
|--------|---------|-------------|
| **Pass** | Parts 1–3 done; Part 0 answers correct; Save/Load answers correct | Use WORKFLOW for real work tomorrow — pick letter A–J first |
| **Soft pass** | Flows OK, Sync answers wrong | Re-read Flow **J** + `docs/CLOUD_SYNC.md` once |
| **Fail** | Still guessing tabs | Re-run Part 0 + Part 1 only; tell an agent which letter was unclear |

---

## How to use WORKFLOW.md after the pilot (habit)

Every real task:

1. **Name the job** in one phrase (“issue dak”, “add contact”).
2. **Open WORKFLOW.md** → find letter **A–J** (or Golden rule).
3. **Do Steps 1 · 2 · 3 only** — then close the guide.
4. If the guide is wrong or missing a click → fix that row in `WORKFLOW.md` (same day).

**Do not** read the whole file every time. Open → jump to one letter → play → done.

---

## Pilot log (fill & keep)

| Field | Value |
|-------|--------|
| Date | |
| Device (laptop / phone) | |
| App URL or local | |
| Result (Pass / Soft / Fail) | |
| Avg score (Part 4) | |
| One fix needed in WORKFLOW.md | |

---

## For a second person (optional)

Give them this file + `WORKFLOW.md` only (not ARCHITECTURE).  
Same Parts 0–4. Compare scores — if both Pass, the playbook is good enough to share with the team.
