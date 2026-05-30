# Active Work Log - TReX Cloud Sync Updates

## [Phase 9 Plan - May 30, 2026]

| # | Workstream | Status | Notes |
|---|---|---|---|
| 1 | Move reset controls to standalone final Settings panel | Complete | Moved reset panel out of Cloud Sync and placed at the absolute end of Settings |
| 2 | Properly enable biometric unlock | In progress | Use WebAuthn/passkeys on hosted origin; PIN remains fallback |
| 3 | Properly enable reminders | Pending | Use Notification API/service worker where possible; document browser/PWA limits |
| 4 | Add locked-screen quick expense | Pending | Add-only form with existing category/payment selectors; no add-new controls |
| 5 | Route locked quick expenses to active trips | Pending | During active trip days, save locked quick expense into trip flow; normal expense still requires login |

### Phase 9 Point 1 Checklist

| # | Task | Status | Files |
|---|---|---|---|
| 1 | Record implementation plan in `working.md` | Complete | `working.md` |
| 2 | Move `resetDangerZoneContainer` out of Cloud Sync and to absolute end of Settings | Complete | `index.html` |
| 3 | Render reset controls as a standalone destructive app panel | Complete | `js/sync.js` |
| 4 | Verify syntax and reset panel placement | Complete | `node --check js/sync.js`; placement check confirms reset panel is after portability and before Goals view |

### Phase 9 Point 2 Checklist

| # | Task | Status | Files |
|---|---|---|---|
| 1 | Inspect current PIN lock and simulated biometric flow | Complete | `index.html`, `js/auth.js`, `js/core.js`, `js/settings.js` |
| 2 | Add local biometric state defaults and migration fields | Complete | `js/core.js` |
| 3 | Add Settings toggle/status for biometric unlock | Complete | `index.html`, `js/core.js` |
| 4 | Replace simulated biometric unlock with WebAuthn registration/authentication | Complete | `js/auth.js` |
| 5 | Preserve biometric metadata as device-local during cloud sync apply | Complete | `js/sync.js` |
| 6 | Verify syntax and browser UI smoke path | In progress | local check |

---

## [Session Date]
May 30, 2026

## [Current Phase]
Phase 8 — Documentation Reconciliation — Complete ✅

---

## [Phase 8 Fix — May 30, 2026]

| # | Fix | Status | Files |
|---|---|---|---|
| 1 | Updated README Cloud Sync behaviour to match current reconciliation engine | ✅ | `README.md` |
| 2 | Updated Architecture sync flow, OAuth scopes, header icon, and migration semantics | ✅ | `ARCHITECTURE.md` |
| 3 | Updated Function Index with PDF and sync helper functions | ✅ | `FUNCTIONS.md` |
| 4 | Removed stale PDF pending notes; kept dynamic report-cycle selector pending | ✅ | `working.md` |

---

## [Phase 7 Fix — May 30, 2026]

| # | Fix | Status | Files |
|---|---|---|---|
| 1 | Stopped using backup import normalizer for Drive sync remote apply | ✅ | `sync.js` |
| 2 | Added `normalizeSyncState()` to preserve full live app fields during sync | ✅ | `sync.js` |
| 3 | Fixed `creditCardsEnabled=true` being stripped after remote apply | ✅ | `sync.js` |
| 4 | Verified remote apply keeps Credit Cards enabled, preserves EMIs, and updates Settings toggle | ✅ | local browser test |

---

## [Phase 6 Fix — May 30, 2026]

| # | Fix | Status | Files |
|---|---|---|---|
| 1 | Added category/payment reconciliation by `id` | ✅ | `sync.js` |
| 2 | Added shared settings reconciliation for currency, budget cycle, theme, reminders, and budget alerts | ✅ | `sync.js` |
| 3 | Preserved `creditCardsEnabled=true` across devices so card mode appears after sync | ✅ | `sync.js` |
| 4 | Re-rendered Settings forms/lists and Credit Cards view immediately after remote apply | ✅ | `sync.js` |
| 5 | Verified category merge + credit card mode sync in browser probe | ✅ | local browser test |

---

## [Phase 5 Fix — May 30, 2026]

| # | Fix | Status | Files |
|---|---|---|---|
| 1 | Added reconciliation merge for same Drive file across devices | ✅ | `sync.js` |
| 2 | `Sync Now` now combines missing transactions/goals/trips/recurring/EMI records by `id` and pushes the converged file back to Drive | ✅ | `sync.js` |
| 3 | Existing-file "Merge" connection no longer blindly overwrites cloud with the current device | ✅ | `sync.js` |
| 4 | Added `openid email profile` scopes and email retry in metadata badge | ✅ | `sync.js` |
| 5 | Verified clean browser boot still shows `Offline` + `Connect Google Drive` | ✅ | local browser test |

---

## [Phase 4 Fix — May 30, 2026]

| # | Fix | Status | Files |
|---|---|---|---|
| 1 | Fixed browser-fatal `Identifier 'DEFAULT_CLIENT_ID' has already been declared` parse error | ✅ | `sync.js` |
| 2 | Renamed sync module fallback constant to `SYNC_DEFAULT_CLIENT_ID` | ✅ | `sync.js` |
| 3 | Verified clean browser load now shows `Offline` + `Connect Google Drive` instead of permanent `Checking...` | ✅ | local browser test |
| 4 | Documented regression and fix | ✅ | `CHANGELOG.md`, `ARCHITECTURE.md`, `working.md` |

---

## [Phase 3 Fixes — May 30, 2026]

| # | Fix | Status | Files |
|---|---|---|---|
| 1 | `updateSyncStatus` function declaration restored in `sync.js` | ✅ | `sync.js` |
| 2 | `updateHeaderSyncIcon` separated and correctly declared | ✅ | `sync.js` |
| 3 | `switchScreen('settings')` now calls `renderSyncControls()` + `updateSyncStatus()` | ✅ | `core.js` |
| 4 | `window.onload` boot order fixed: `initLucideIcons` before `updateHeaderSyncIcon` | ✅ | `core.js` |
| 5 | Explicit `updateSyncStatus("offline")` at boot when sync disabled | ✅ | `core.js` |
| 6 | `#headerSyncBtn` — removed `hidden` class; always visible; default `cloud-off` icon | ✅ | `index.html` |
| 7 | GIS script `onload` → `_trexGISReady()` → `initGoogleAuth()` fires when SDK ready | ✅ | `index.html`, `sync.js` |
| 8 | `syncFromDrive()` guards early if GIS not ready; sets `offline` cleanly | ✅ | `sync.js` |
| 9 | `initGoogleAuth()` no longer calls `updateSyncStatus` (prevented boot crash) | ✅ | `sync.js` |
| 10 | Client ID placeholder shows actual default ID with explanatory note | ✅ | `index.html` |
| 11 | Inline `SYNC UI BOOT PATCH` in `index.html` — cache-proof fallback | ✅ | `index.html` |

---

## [Phase 2 Deliverables — May 30, 2026 — Complete ✅]

| # | Task | Status | Files |
|---|---|---|---|
| 1 | 4-State Navbar Sync Icon | ✅ | `sync.js` |
| 1a | State A (Sync Off) → gray `cloud-off` → `switchScreen('settings')` | ✅ | `sync.js` |
| 1b | State B (Sync On + `!navigator.onLine`) → offline state | ✅ | `sync.js` |
| 1c | State C (Sync On + Idle) → indigo `cloud-check` → `triggerManualSync()` | ✅ | `sync.js` |
| 1d | State D (Sync On + Syncing) → spinning `refresh-cw` `animate-spin` | ✅ | `sync.js` |
| 1e | Button always visible (removed `hidden` when sync disabled) | ✅ | `sync.js` |
| 2 | True Hard Reset Engine | ✅ | `sync.js` |
| 3 | Ghost Month Purges | ✅ | `reports.js` |
| 4 | PDF Summary Report Engine | ✅ | `reports.js` |

---

## [Pending]

### A — `#reportCycleSelector` dynamic population
The Reports statement-cycle selector is still hardcoded in `index.html`; replace it with dynamic options derived from available transaction cycles.

---

## [Previous Sessions — Complete]

### Task A — Fix auth callback: `state.syncEnabled` auto-saves ✅
### Task B — Relocate Cloud Sync section ✅
### Task C — Reset Sync button with confirmation ✅
### Task D — Migration modal (Merge vs. Fresh Start) ✅

---

## [Resume Instructions]
Re-upload the changed files, then verify multi-device Drive sync with Settings, categories, payments, transactions, trips, goals, recurring expenses, EMIs, and Credit Cards enabled.
