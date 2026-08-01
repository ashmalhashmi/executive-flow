# Executive Flow

Premium minimalist AI Executive Assistant Dashboard — React, Vite, Tailwind CSS, Lucide.

## Setup

```bash
cd executive-flow
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Mobile app (Android / iOS)

Capacitor wrapper — see **[MOBILE_APP.md](./MOBILE_APP.md)** for full steps.

```bash
npm install
npm run build
npx cap add android
npm run cap:sync
npm run cap:android
```

## Stack

- React 19 + Vite 6
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Lucide React icons

## Project structure

```
src/
├── components/
│   ├── layout/     # AppLayout, Sidebar, MobileHeader
│   └── ui/         # GlassCard and shared UI
├── constants/      # Navigation config
├── pages/          # Tab views (Dashboard, Meetings, Copilot, Souvenirs)
├── App.jsx
├── main.jsx
└── index.css
```

## Architecture storybook & how to play

Domain map (rooms / bricks) → **[ARCHITECTURE.md](./ARCHITECTURE.md)**  
**How to play** (Steps 1–2–3, where to click) → **[WORKFLOW.md](./WORKFLOW.md)**  
**Pilot (try WORKFLOW in 20 min)** → **[docs/WORKFLOW_PILOT.md](./docs/WORKFLOW_PILOT.md)**  
Agent / builder workflow → **[AGENTS.md](./AGENTS.md)**  
Domain deep-dives → [`docs/domains/`](./docs/domains/) (Sync, Meetings, Expenditure)  
Cursor/agent rules → `.cursor/rules/executive-flow-domains.mdc`