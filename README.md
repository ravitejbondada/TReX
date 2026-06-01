# TReX - Devour Your Expenses

A local-first personal finance PWA. Runs entirely in the browser with no backend.
All data lives in `localStorage`. Designed as a mobile-first installable app.

**Live app:** https://ravitejbondada.github.io/TReX/
**Repository:** https://github.com/ravitejbondada/TReX

---

## Quick Start

**Easiest — just open the live app:**
👉 https://ravitejbondada.github.io/TReX/

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
TReX/
├── index.html          HTML shell — all views + CDN script tags + module loaders
├── manifest.json       External PWA manifest for proper icon resolution
├── sw.js               Service worker for PWA notification click handling
├── styles.css          All app CSS (dark/light theme, glassmorphism, custom picker sheet)
├── assets/
│   └── favicon.png        App icon (transparent, favicon + Apple touch icon + PWA icon)
└── js/
    ├── core.js             State, boot, persistence, routing, theme, notifications
    ├── auth.js             PIN lock/unlock, WebAuthn biometrics, locked expense sheet (slide-up)
    ├── dashboard.js        Budget widgets, forecast, heatmap, quick logs, alerts/reminders
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

**Transaction sort order:** Every transaction carries a `createdAt` full ISO 8601 timestamp stamped at creation time. The recent activity feed sorts by `createdAt` descending. The ledger defaults to **Dated ↓** (expense date field, descending) on every open — the sort dropdown offers Dated ↓↑ and Amt ↓↑. Recurring catch-up entries use end-of-day (`23:59:59`) on their due date as `createdAt` so multi-day batches posted at once sort correctly. Existing transactions without `createdAt` fall back to sorting by `date`.

> ⚠️ Local-only data is lost if the browser cache is cleared. Enable Google Drive sync in Settings to keep a persistent backup.

---

## Hosted Web / PWA Features

- **Biometric unlock:** Settings can register a local WebAuthn/passkey credential for Face ID, fingerprint, or device passkey unlock. PIN remains the fallback. Biometric credentials are device-local and are not inherited from Drive sync.
- **Reminders:** Daily reminders use browser notifications, prefer service-worker notifications when available, include a test notification button, and check for missed reminders when the app is opened after the scheduled time.
- **Locked quick expense:** When the app is locked, a `circle-plus` key in the PIN keypad (bottom-right) opens a slide-up expense sheet — existing categories and payments only, no add-new controls, date pre-filled to today. Saves to the active trip if one is in progress; otherwise saves as a normal ledger transaction. Both paths trigger Drive sync via `saveStateToLocalStorage()`.
- **PWA reminder limitation:** The daily reminder scheduler uses `setTimeout` and requires the browser tab to be active. Background / screen-off firing is not supported in a PWA without a server-push or native wrapper. Planned: Capacitor migration for exact native alarm delivery.
- Browser notification timing still depends on OS/browser/PWA behavior; exact native alarms require a native wrapper or server push.

---
## Google Drive Cloud Sync

Cloud sync is **live** via `js/sync.js`. It uses the Google Identity Services (GIS) implicit OAuth flow and the Drive REST API v3 `appDataFolder` scope — no server required.

**Key behaviours:**
- On every `saveStateToLocalStorage()` call a debounced (3 s) `pushToDrive()` is triggered.
- On `window.onload`, `syncFromDrive()` pulls the remote state and applies a **silent background reconciliation** with no intrusive conflict modals.
- A `visibilitychange` listener fires `syncFromDrive()` whenever the user switches back to the app tab.
- **Multi-device convergence:** categories, payments, transactions, saving goals, trips, recurring expenses, and EMIs are merged by stable `id`; merged results are pushed back to Drive so devices converge.
- **Shared settings sync:** currency, budget/cycle settings, theme, reminders, and budget alerts follow the newer state; `creditCardsEnabled=true` is preserved across devices.
- **Drive apply safety:** sync uses `normalizeSyncState()` so full live app fields are preserved; it does not use the backup import normalizer.
- **Budget discrepancy:** a scoped two-button modal asks which budget to keep; all other data syncs silently.
- A **Migration modal** (Merge / Fresh Start) is shown only when an existing Drive file is found and local data is present.
- An **Onboarding modal** warns new users about local-only data loss risks. Uses `sessionStorage` so it re-triggers in incognito.
- **Reset Cloud Sync Only** appears in the final destructive reset panel when Google Drive is connected; it clears the cloud backup, leaves a reset marker for other devices, and disconnects the device while keeping local data.
- **Full Reset: Cloud + Local** is always visible in the Danger Zone; it clears the cloud backup when connected, leaves a reset marker for other devices, clears `androidWalletState_v4` from this browser, clears the onboarding session marker, and reloads to a fresh default state.
- **Cross-device reset handling** uses `syncEpoch` plus reset lineage. Devices with stale pre-reset local data must choose: reset local too / make local the source when the cloud is only a reset marker, or force cloud / force local / force merge when newer post-reset cloud data already exists. Choosing reset local also resolves the cloud marker into a fresh empty post-reset cloud state to avoid repeated prompts.
- **Header sync icon** (`#headerSyncBtn`) — always visible in the app header; shows live status (`cloud-check` / spinning `refresh-cw` / `cloud-off`) and provides one-tap access to manual sync or settings.
- **Account metadata badge** in the Settings panel shows the connected Google email and the Drive file ID once authenticated.

**Default OAuth Client ID:** `219866394954-pg9187uvcq3gu0c4l51728m1u1hojt0c.apps.googleusercontent.com` (hardcoded fallback; overridable via Advanced Sync Settings).

**Drive file:** `trex_sync_v4.json` inside the `appDataFolder` (private to this app, invisible to the user's Drive).

See `ARCHITECTURE.md` for the full sync design and `FUNCTIONS.md` for the `sync.js` function index.

## PDF Reports

The Reports / Premium Insights screen includes a **Download PDF Summary Report** button. It uses `html2canvas` and `jsPDF` CDN scripts loaded in `index.html` and exports the selected statement cycle.

---

## Default PIN

`1234` — can be changed in Settings → Security.

---

## UX Notes

- **Ledger header:** Compact three-row design — title + Sort button + Filter icon button / search bar / summary + active filter chips. Filter sheet (date range, category, payment) is collapsed by default; tap the filter icon to expand. Sort uses 4 picker options (Dated ↓↑, Amt ↓↑) and resets to Dated ↓ on each ledger open. Active filters appear as dismissible chips; a dot on the filter icon signals active filters.
- **Heatmap legend:** Compact right-aligned swatches (Low → High: light green, light yellow, amber, light rose) rendered below the heatmap grid. Matches `heatColor()` thresholds and the forecast risk palette.
- **Heatmap → Ledger:** Tapping a heatmap day opens the ledger scoped to that single day, sorted Dated ↓ by default.
- **Ledger sort:** Tap the sort button to open the custom picker with 4 options — Dated ↓, Dated ↑, Amt ↓, Amt ↑. "Dated" sorts by the expense date field. Resets to Dated ↓ on every ledger open.
- **Mobile date fields:** Add Expense keeps Date and Note side by side in a compact row. Goals and Trips stack date-heavy rows on phones and switch to two columns only at wider breakpoints so full date values remain visible without overflow.
- **Custom picker scroll lock:** Opening any custom dropdown locks the page behind the picker on mobile; only the picker sheet/list scrolls.
- **Dino Mode:** Off by default for new users and labelled experimental in Settings. Fossil Mode, Dino Footprints, and Extinction Warnings are dependent on Dino Mode and have no visible effect while it is off.
- **Sync icon:** The header sync icon spins while Drive sync is actively pushing/pulling (`syncStatus="syncing"`), then returns to synced/offline/error when the operation settles.
- **Goal editing:** Each goal card has a pencil icon that opens an inline edit row (target amount + goal date) inside the accordion. `toggleGoalEdit` / `saveGoalEdit` handle open/save.
- **Drawer — Goals & Trips:** Now open sub-panels (`openDrawerSection('goals'/'trips')`) showing live tiles with Fund/Edit/Delete (goals) and Add Expense/View/Edit (trips, auto-detects pre/on status). Each panel has a "View" link at top and "+ New" at bottom.
- **Drawer — Credit Cards:** "View Cards Tab" link moved to top of the section.
- **Budget save flow:** After submitting a budget in the drawer, a confirmation dialog appears. Tapping OK closes the drawer and navigates to the dashboard.
- **Nav scroll-to-top:** Every bottom nav tab switch resets the view scroll position to the top across `window`, document/body, `<main>`, `screenContainer`, and the active view panel.
