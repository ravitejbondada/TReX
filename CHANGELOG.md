# TReX - Changelog

Format: `[version] YYYY-MM-DD — summary`
Files listed are the ones modified. Always update this on any meaningful change.

---

## [v3.3] 2026-05-30 - Full reset control

**What changed:** Added a destructive **Full Reset: Cloud + Local** action for clearing test data completely.

**Files modified:**
- `js/sync.js` - added `resetAllData()` and surfaced the button under Cloud Sync controls whether sync is connected or disconnected.
- `README.md`, `ARCHITECTURE.md`, `FUNCTIONS.md` - documented the difference between Reset Sync and Full Reset.

**Behavior:** Full reset deletes `trex_sync_v4.json` from Drive when possible, removes `androidWalletState_v4` from localStorage, clears `trex_onboarding_seen` from sessionStorage, and reloads the app to defaults.
## [v3.2] 2026-05-30 - Repo rename follow-through and new sync file

**What changed:** Completed the follow-up after renaming the folder/repo to **TReX** and intentionally moved test cloud sync to a new Drive file.

**Files modified:**
- `README.md` - updated live app and repository links to `ravitejbondada/TReX`.
- `js/sync.js` - renamed Drive sync file from `dabbux_sync_v4.json` to `trex_sync_v4.json`, onboarding session key from `dabbux_onboarding_seen` to `trex_onboarding_seen`, and GIS ready callback from `_dabbuxGISReady` to `_trexGISReady`.
- `index.html` - updated displayed Drive target and GIS script `onload` callback.
- `ARCHITECTURE.md`, `FUNCTIONS.md`, `working.md` - updated sync filename/session key/callback references.

**Migration note:** Existing test data in the old `dabbux_sync_v4.json` Drive file will not be read by this version. A fresh `trex_sync_v4.json` file will be created on next connect/sync.
## [v3.1] 2026-05-30 — Rebrand app to TReX

**What changed:** Updated the current app brand from DabbuX to **TReX** with the tagline **Devour Your Expenses**.

**Files modified:**
- `index.html` — updated document title, Apple web app title, header brand/tagline, lock screen title, image alt text, and report-visible brand text.
- `manifest.json` — updated PWA name and short name.
- `README.md`, `ARCHITECTURE.md`, `FUNCTIONS.md`, `working.md`, `Cloud Sync Integration Plan.md` — updated current-facing project names/headings.
- `js/*.js` — updated current file headers, notifications, backup export labels, sync copy, and PDF report branding.

**Compatibility notes:**
- Initial rebrand kept compatibility-critical names temporarily; v3.2 intentionally moves the test sync file/session key/repo URLs to TReX names.

## [v3.0] 2026-05-30 — Documentation reconciliation for sync and PDF reports

**What changed:** Brought the project docs back in line with the current code after recent sync and Reports changes.

**Files modified:**
- `README.md` — updated Cloud Sync behaviour to describe multi-device reconciliation, full sync-state preservation, always-visible header icon, and PDF report export.
- `ARCHITECTURE.md` — updated sync conflict flow, OAuth scopes, header icon behaviour, and Migration modal semantics.
- `FUNCTIONS.md` — added `generatePDFReport()`, sync reconciliation helpers, `normalizeSyncState()`, and `formatTimeAgo()`; updated function counts.
- `working.md` — removed stale PDF button/CDN pending notes; left only dynamic report-cycle selector as pending.

## [v2.9] 2026-05-30 — Preserve full Drive state during remote apply

**What changed:** Fixed the bug that could disable Credit Cards again after sync even when reconciliation had preserved `creditCardsEnabled=true`.

**Files modified:**
- `js/sync.js` — replaced use of `normalizeImportedState()` inside `applyRemoteState()` with a sync-specific `normalizeSyncState()` that preserves the full live app state shape.
- `js/sync.js` — prevents Drive sync from dropping fields that the backup importer does not include, including `creditCardsEnabled`, `emis`, sync metadata, and alert/reminder settings.

**Verification:**
- Browser apply test confirms a remote state with `creditCardsEnabled=true` remains enabled locally.
- Browser apply test confirms Settings toggle updates to checked immediately.
- Browser apply test confirms EMIs survive remote apply.

## [v2.8] 2026-05-30 — Sync settings, categories, payments, and credit card mode

**What changed:** Fixed remaining multi-device sync gaps where Settings changes could fail to appear on another device even when both devices pointed at the same Drive file.

**Files modified:**
- `js/sync.js` — extended reconciliation to merge `categories` and `payments` by stable `id`, not only transaction-style records.
- `js/sync.js` — added shared-setting reconciliation for currency, budget cycle settings, theme, reminder settings, and budget alert settings using the newer state.
- `js/sync.js` — treats `creditCardsEnabled=true` as shared across devices so a stale device with `false` cannot hide credit card mode after sync.
- `js/sync.js` — refreshes Settings lists/forms and Credit Cards view immediately after applying remote/merged state, so synced settings are visible without reload.

**Verification:**
- `sync.js`, `settings.js`, and `core.js` syntax checks pass.
- Browser merge probe confirms categories from both devices are retained and `creditCardsEnabled` syncs as `true`.

## [v2.7] 2026-05-30 — Multi-device sync convergence and account email fix

**What changed:** Fixed a multi-device sync flaw where two devices could point at the same Google Drive file but keep different local data after repeated manual syncs.

**Files modified:**
- `js/sync.js` — added a reconciliation pass in `syncFromDrive()` that merges missing `transactions`, `savingGoals`, `trips`, `recurringExpenses`, and `emis` by stable `id`, applies the merged state locally, and pushes the converged state back to Drive.
- `js/sync.js` — changed existing-file "Merge" connection flow to run reconciliation instead of overwriting the cloud file with only the current device's local state.
- `js/sync.js` — added `openid email profile` OAuth scopes and retries user email fetch from the metadata badge when `syncUserEmail` is blank.
- `CHANGELOG.md`, `working.md` — documented the multi-device sync fix.

**Verification:**
- `sync.js` syntax check passes.
- Clean browser load still renders Cloud Sync status as `Offline` with `Connect Google Drive`.
- Reconciliation helper functions are registered in the browser.

## [v2.6] 2026-05-30 — Fix sync module boot crash from duplicate Client ID constant

**What changed:** Fixed a browser-fatal script parse error that prevented `sync.js` from loading at all, leaving Cloud Sync stuck on the hardcoded "Checking..." status in both normal and incognito sessions.

**Files modified:**
- `js/sync.js` — renamed the duplicate top-level `DEFAULT_CLIENT_ID` constant to `SYNC_DEFAULT_CLIENT_ID`. `core.js` already declared `DEFAULT_CLIENT_ID`, and classic browser scripts share one global lexical scope, so redeclaring the same `const` caused `Identifier 'DEFAULT_CLIENT_ID' has already been declared` and stopped every sync function from registering.
- `CHANGELOG.md`, `ARCHITECTURE.md`, `working.md` — documented the regression and the fix.

**Verification:**
- Clean browser load now renders Cloud Sync status as `Offline` instead of `Checking...`.
- `#syncControlsContainer` now renders the `Connect Google Drive` button.
- `updateSyncStatus()` and `renderSyncControls()` are registered again from `sync.js`.

## [v2.5] 2026-05-30 — Sync UI boot fix: status panel, header icon & GIS timing

**What changed:** Fixed three compounding bugs that left the Cloud Sync panel permanently stuck on "Checking..." and the header icon invisible. Root cause was `updateSyncStatus` function declaration missing from `sync.js` (body existed but signature was deleted), `switchScreen('settings')` never refreshing sync UI on navigation, and the GIS SDK loading async before `initGoogleAuth` was called. Added inline boot patch to `index.html` as a cache-proof safety net.

**Files modified:**
- `js/sync.js` — restored missing `function updateSyncStatus(status, detail = "")` declaration (function body was orphaned as top-level statements, causing ReferenceError on every call); restored `updateHeaderSyncIcon` as a separate correctly-ordered function; button now always visible (gray `cloud-off` when sync disabled, never `hidden`); `syncFromDrive()` guards early if GIS SDK not ready (sets `offline` cleanly instead of hanging); `initGoogleAuth()` no longer calls `updateSyncStatus` on SDK-not-ready (prevented circular crash at boot); added `window._trexGISReady` callback so `initGoogleAuth` fires the moment the GIS SDK finishes loading.
- `js/core.js` — `switchScreen('settings')` now calls `renderSyncControls()` + `updateSyncStatus()` every time Settings opens (previously only `renderSettingsLists()` was called, leaving sync panel stale); `window.onload` boot order corrected: `initLucideIcons()` before `updateHeaderSyncIcon()`; explicit `updateSyncStatus("offline")` called at boot when sync is disabled.
- `index.html` — removed `hidden` class from `#headerSyncBtn`; default icon changed from `cloud` to `cloud-off`; GIS script tag gains `onload` callback to trigger `_trexGISReady`; Client ID field placeholder now shows actual default Client ID with explanatory note; added inline `SYNC UI BOOT PATCH` script at end of `<body>` that calls `refreshSyncUI()` on `window.load` and wraps `switchScreen` — works as a cache-proof fallback even if `sync.js`/`core.js` are served stale from CDN/browser cache.

**Root causes fixed:**
1. `updateSyncStatus` function declaration deleted from `sync.js` → ReferenceError on every call → status frozen at hardcoded "Checking..."
2. `switchScreen('settings')` never called `renderSyncControls()` → `syncControlsContainer` always empty → no Connect button visible
3. GIS SDK loads `async defer` but `initGoogleAuth` only called on user action → returning users with `syncEnabled=true` hung on boot
4. `#headerSyncBtn` had `hidden` class in HTML and JS kept hiding it → icon never appeared

---

## [v2.4] 2026-05-30 — Silent sync engine, header status icon & account metadata

**What changed:** Replaced intrusive conflict modals with a fully silent background sync engine. Added a live cloud status icon to the app header. Added connected account and Drive file metadata display in the Settings panel. Hardcoded fallback OAuth Client ID. Extracted user email via userinfo endpoint post-OAuth.

**Files modified:**
- `js/sync.js` — rewritten `syncFromDrive()`: silent background engine; ongoing sync → remote overwrites arrays; initial linkage → deduplicate-merge by `id`; budget discrepancy → scoped `_showBudgetConflictModal()` only. Rewritten `applyRemoteState()`: preserves `googleClientId`, `syncUserEmail`, `syncDriveFileId`; forces `syncEnabled=true`; immediate UI re-render (no `window.location.reload()`). Rewritten `connectGoogleSync()`: obtains token first, checks `findSyncFileId()`, bypasses migration modal if no cloud file exists. Added `fetchGoogleUserEmail()`, `renderSyncMetaBadge()`, `updateHeaderSyncIcon()`, `_applyRemoteSilent()`, `_showBudgetConflictModal()`. Replaced `window.focus` listener with `visibilitychange` listener. Updated `DEFAULT_CLIENT_ID` to `219866394954-pg9187uvcq3gu0c4l51728m1u1hojt0c.apps.googleusercontent.com`.
- `js/core.js` — added `DEFAULT_CLIENT_ID` constant; added `syncUserEmail`, `syncDriveFileId`, `googleClientId` to default `state` and boot guards; added `updateHeaderSyncIcon()` call in `window.onload` after sync boot.
- `index.html` — added `#headerSyncBtn` cloud icon button in the app header navbar; added `#syncMetaBadge` account + file metadata panel inside Cloud Sync settings block.

**Features shipped:**
- **Silent sync engine** — no conflict modals; remote is source of truth on ongoing sync; deduplication merge on initial linkage.
- **Budget conflict modal** — scoped two-button modal for budget-only discrepancy (no full-screen takeover).
- **Header sync icon** — live `#headerSyncBtn` reflects `syncStatus`; taps trigger sync (idle) or open settings (error/offline).
- **Account metadata badge** — `#syncMetaBadge` shows connected Google email and Drive file ID in Settings.
- **Email fetch** — `fetchGoogleUserEmail()` hits `/oauth2/v3/userinfo` after OAuth; email persisted in `state.syncUserEmail`.
- **Tab visibility auto-sync** — `visibilitychange` listener replaces `window.focus`; syncs on every tab switch-back.
- **Silent upload on first connect** — if no Drive file exists, migration modal is bypassed entirely.
- **Connection config preservation** — `applyRemoteState()` never overwrites `googleClientId`, `syncUserEmail`, or `syncDriveFileId` from remote.

---

## [v2.3] 2026-05-30 — Google Drive Cloud Sync

**What changed:** Implemented full Google Drive `appDataFolder` sync engine with onboarding, migration, and reset capabilities.

**Files modified:**
- [js/sync.js](file:///c:/VS_Code/TReX/js/sync.js) — **new file**. Added: OAuth via GIS (`initGoogleAuth`, `getValidToken`); Drive REST API wrappers (`fetchWithRetry`, `findSyncFileId`, `createSyncFile`, `updateSyncFile`, `downloadSyncFile`); sync engine (`pushToDrive`, `syncFromDrive`, `applyRemoteState`); conflict modal (`showConflictModal`); status UI (`updateSyncStatus`); settings controls (`connectGoogleSync`, `disconnectGoogleSync`, `triggerManualSync`, `saveCustomClientId`, `renderSyncControls`); onboarding modal (`showOnboardingModal`, `checkAndShowOnboardingModal`); migration modal (`showMigrationModal`); reset (`resetSyncData`).
- [js/core.js](file:///c:/VS_Code/TReX/js/core.js) — added `syncEnabled`, `updatedAt`, `lastSyncedAt`, `syncStatus`, `googleClientId` to `state`; `saveStateToLocalStorage()` now sets `updatedAt` and triggers debounced `pushToDrive()`; `window.onload` calls `syncFromDrive()` and `checkAndShowOnboardingModal()`.
- [index.html](file:///c:/VS_Code/TReX/index.html) — added GIS and Drive API CDN script tags; injected Cloud Sync settings UI block (status indicator, Client ID field, sync controls container); relocated Cloud Sync section to appear directly below Base Engine Settings; registered `<script src="js/sync.js">`.

**Features shipped:**
- **Onboarding modal** — bottom-sheet warning fires 1.2 s after boot when sync is off; uses `sessionStorage` so it retriggers in every incognito session.
- **Migration modal** — shown before OAuth when local data exists; user chooses "Merge" (push local to Drive) or "Fresh Start" (pull cloud over local); cancel aborts auth.
- **Reset Sync** — deletes `trex_sync_v4.json` from Drive and disconnects; local data untouched.
- **Conflict resolution** — last-write-wins by `updatedAt`; conflict modal shown when both sides have data and timestamps diverge.
- **Exponential backoff** — `fetchWithRetry()` retries failed Drive calls at 2 s, 5 s, 15 s; token auto-refreshed on 401.

---

## [v2.2] 2026-05-29 — Clean onboarding and empty state handling for new users

**What changed:** Removed all dummy/mock transactions, mock saving goals, mock quick logs, and specific credit card defaults to ensure a clean slate onboarding experience for new users. Added robust empty state views, budget placeholder guidance, and safety checks for default payment references.

**Files modified:**
- [core.js](file:///c:/VS_Code/TReX/js/core.js) — cleared active/historical mock transactions, mock goals; reset budget defaults to 0 and cycle type/day to calendar-first defaults; simplified category and payment seeding.
- [dashboard.js](file:///c:/VS_Code/TReX/js/dashboard.js) — added prompt to set monthly budget if 0; hid forecast card if no budget/spend exists; cleared default quick logs array.
- [reports.js](file:///c:/VS_Code/TReX/js/reports.js) — added empty state verification and fallbacks for report charts and month-over-month view when transactions are empty.
- [settings.js](file:///c:/VS_Code/TReX/js/settings.js) — added budget field placeholder.
- [transactions.js](file:///c:/VS_Code/TReX/js/transactions.js) — added check to ensure referenced default payment method exists and is not archived before applying to category transaction forms.
- [README.md](file:///c:/VS_Code/TReX/README.md) — updated data persistence section to remove mock transactions reference.
- [ARCHITECTURE.md](file:///c:/VS_Code/TReX/ARCHITECTURE.md) — updated state object template with new default onboarding values.

---

## [v2.1.1] 2026-05-29 — Fixed PWA manifest and optimized icon rendering

**What changed:** Replaced embedded PWA manifest data URI with external `manifest.json` file. Removed stale base64-encoded images from HTML. Added CSS optimizations for crisp icon rendering and white background removal.

**Files modified:**
- `index.html` — removed two embedded base64 image data URIs (header logo line 39, lock screen logo line 68); updated `<link rel="manifest">` to point to external `manifest.json` instead of data URI
- `manifest.json` — created new external PWA manifest file (replaces embedded data URI in HTML)
- `styles.css` — added high-quality icon rendering rules: `image-rendering: crisp-edges`, `image-rendering: pixelated`, `mix-blend-mode: multiply` for white background removal
- `assets/favicon.png` — replaced with new transparent icon (3D golden coin with green checkmark, no white background)

**What this fixes:**
- ✅ PWA icon no longer cached incorrectly (manifest now externally versioned)
- ✅ Favicon renders crisp/pixel-perfect (no more blur/interpolation artifacts)
- ✅ White background removed from icon display
- ✅ Reduced HTML file size (removed large base64 strings)
- ✅ Better cross-browser icon compatibility

**Migration notes:**
- Ensure `manifest.json` exists at project root alongside `index.html`
- Ensure `assets/favicon.png` is the transparent version (1.7MB+)
- Clear browser cache and hard refresh (Ctrl+Shift+R) to see changes

---

## [v2.1] 2026-05-29 — Project renamed to DabbuX; deployed to GitHub Pages

**What changed:** Renamed the project from "Trex" to "DabbuX — Personal Finance Made Personal". Replaced canvas-generated favicon with a static `assets/icon.png`. Deployed to GitHub Pages.

**Live URL:** https://ravitejbondada.github.io/TReX/
**Repository:** https://github.com/ravitejbondada/TReX

**Files modified:**
- `index.html` — updated `<title>`, `apple-mobile-web-app-title` meta, PWA manifest name/short_name/icon, header app name + tagline, lock screen title. Replaced dynamic `<link id="dynamicFavicon">` and `<link id="dynamicAppleIcon">` with static `<link rel="icon">` and `<link rel="apple-touch-icon">` pointing to `assets/icon.png`
- `js/core.js` — updated file header; removed `generateDynamicIcons()` function and its call from `window.onload`; favicon is now static
- `README.md` — updated title, added live URL and repo link, project folder name, added `assets/` to project structure
- `ARCHITECTURE.md` — updated title
- `FUNCTIONS.md` — updated title; marked `generateDynamicIcons()` as deprecated
- `CHANGELOG.md` — updated title and added this entry

**Migration notes:**
- The `assets/` directory must exist at the project root with `icon.png` inside it
- `generateDynamicIcons()` in `core.js` has been removed; no other code depends on it

---

## [v2.0] 2026-05-29 — Option B module split

**What changed:** Broke the monolithic `Trex_v2_0.html` (8,191 lines) into 12 focused files.

**Files created:**
- `index.html` — HTML shell only, loads CSS and JS modules
- `styles.css` — all CSS extracted from inline `<style>` block
- `js/core.js` — state, boot, routing, persistence, utilities
- `js/auth.js` — PIN lock/unlock, biometrics, PIN change
- `js/dashboard.js` — budget widgets, heatmap, quick logs, alerts, charts
- `js/transactions.js` — expense form, ledger, history filter
- `js/reports.js` — Chart.js renderers, report modes, MoM comparison
- `js/settings.js` — settings form, categories/payments CRUD, CC billing logic
- `js/credit-cards.js` — card view renderer, card analytics chart
- `js/recurring.js` — recurring expenses, EMI engine, date utilities
- `js/goals-trips.js` — saving goals, trip budgets, trip expenses, ledger sync
- `js/backup.js` — JSON/CSV export & import, state restore
- `README.md`, `ARCHITECTURE.md`, `FUNCTIONS.md`, `CHANGELOG.md`

**No logic changed** — pure structural refactor. All 226 functions preserved verbatim.

## [v2.0] 2026-05-28 — DabbuX v2.0 single-file release

Original feature-complete single-file app (`Trex_v2_0.html`).

**Features in this version:**
- Budget cycle engine (salary-day or calendar-month cycles)
- Add / edit / delete transactions with category + payment tagging
- Ledger view with date range filter, search, and category/payment filter
- Analytics reports: doughnut charts, bar charts, budget gauge
- Month-over-month comparison report
- Accordion itemized report list
- Credit card mode with billing cycle tracking and due/recent views
- Card-level spend analytics chart
- Recurring expenses with daily/weekly/monthly/yearly frequencies
- EMI engine with amortization schedule preview
- Saving goals with contribution history
- Trip budgets with pre-trip and on-trip expense tracking
- Trip → ledger sync
- Quick log 1-tap buttons (customizable)
- Spending heatmap calendar
- End-of-cycle forecast card
- Budget alerts (browser notifications)
- Daily reminder notifications
- PIN lock screen with biometric simulation
- Light / dark theme toggle
- JSON and CSV backup / restore
- PWA installable (manifest + meta tags)
- Multi-currency support (INR, USD, EUR, GBP)

---

## How to Write a Changelog Entry

```
## [v2.1] YYYY-MM-DD — short description of change

**What changed:** One sentence.

**Files modified:**
- `js/goals-trips.js` — added X function, changed Y behaviour
- `js/core.js` — added Z field to state

**Migration notes (if any):**
- State key `androidWalletState_v4` is still compatible / bumped to v5
```
