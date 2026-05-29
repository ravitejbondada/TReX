# DabbuX — Personal Finance Made Personal

A local-first personal finance PWA. Runs entirely in the browser with no backend.
All data lives in `localStorage`. Designed as a mobile-first installable app.

**Live app:** https://ravitejbondada.github.io/dabbux/
**Repository:** https://github.com/ravitejbondada/dabbux

---

## Quick Start

**Easiest — just open the live app:**
👉 https://ravitejbondada.github.io/dabbux/

**Or run locally:**

> ⚠️ Must be served — opening `index.html` directly via `file://` will block the JS modules.

```bash
# Option 1 — Node (recommended)
npx serve .

# Option 2 — Python
python3 -m http.server 8080

# Option 3 — VS Code
Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then open `http://localhost:3000` (or whatever port) in Chrome.

---

## Install as App (PWA)

**Android / Chrome desktop:** Visit the URL → three-dot menu → "Add to Home Screen" / "Install app"

**iOS Safari:** Visit the URL → Share → "Add to Home Screen"

The app already has all required PWA meta tags and an external manifest (`manifest.json`) for proper icon resolution.

The app icon is served from `assets/favicon.png` and referenced by both the HTML favicon links and the PWA manifest.

> If you update `assets/favicon.png`, clear the browser cache and hard refresh to ensure the new icon is loaded.

---

## Project Structure

```
dabbux/
├── index.html          HTML shell — all views + CDN script tags + module loaders
├── manifest.json       External PWA manifest for proper icon resolution
├── styles.css          All app CSS (dark/light theme, glassmorphism, dropdowns)
├── assets/
│   └── favicon.png        App icon (transparent, favicon + Apple touch icon + PWA icon)
└── js/
    ├── core.js             State, boot, persistence, routing, theme, notifications
    ├── auth.js             PIN lock/unlock, biometrics, PIN change
    ├── dashboard.js        Budget widgets, forecast, heatmap, quick logs, alerts
    ├── transactions.js     Add/edit expense form, ledger history, filter/search
    ├── reports.js          Chart.js renderers, analytics reports, MoM comparison
    ├── settings.js         Settings form, category/payment CRUD, CC helpers
    ├── credit-cards.js     Credit card view, card analytics, payment lock UI
    ├── recurring.js        Recurring expenses, EMI engine, date utilities
    ├── goals-trips.js      Saving goals, trip budgets, trip expense tracking
    ├── backup.js           JSON/CSV export & import, state restore
    └── sync.js             Google Drive OAuth, push/pull sync, conflict resolution, onboarding
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Styling | Tailwind CSS (CDN) |
| Icons | Lucide Icons (CDN) |
| Charts | Chart.js (CDN) |
| Font | Plus Jakarta Sans (Google Fonts) |
| Storage | `localStorage` key: `androidWalletState_v4` |
| Cloud Sync | Google Drive REST API v3 + Google Identity Services (GIS) |
| JS | Vanilla ES6+ — no framework, no bundler |

---

## Data Persistence

State is serialized to `localStorage` on every write via `saveStateToLocalStorage()` in `core.js`.
On boot, `window.onload` reads it back. If the key is missing, seed data (default categories and payments) is used.

**localStorage key:** `androidWalletState_v4`

> ⚠️ Local-only data is lost if the browser cache is cleared. Enable Google Drive sync in Settings to keep a persistent backup.

---

## Google Drive Cloud Sync

Cloud sync is **live** via `js/sync.js`. It uses the Google Identity Services (GIS) implicit OAuth flow and the Drive REST API v3 `appDataFolder` scope — no server required.

**Key behaviours:**
- On every `saveStateToLocalStorage()` call a debounced (3 s) `pushToDrive()` is triggered.
- On `window.onload`, `syncFromDrive()` pulls the remote state and applies last-write-wins conflict resolution.
- A **Migration modal** (Merge / Fresh Start) appears before OAuth when the user has existing local data.
- An **Onboarding modal** warns new users about local-only data loss risks and prompts them to connect Drive. Uses `sessionStorage` so it re-triggers in incognito.
- **Reset Sync** deletes the `dabbux_sync_v4.json` file from `appDataFolder` and disconnects the device cleanly.

**Drive file:** `dabbux_sync_v4.json` inside the `appDataFolder` (private to this app, invisible to the user's Drive).

See `ARCHITECTURE.md` for the full sync design and `FUNCTIONS.md` for the `sync.js` function index.

---

## Default PIN

`1234` — can be changed in Settings → Security.
