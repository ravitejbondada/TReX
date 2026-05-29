# Active Work Log - DabbuX Cloud Sync Updates

## [Current Phase]
Phase 2-4: COMPLETE

## [Completed Tasks]
- Reordered UI: Relocated 'Google Drive Cloud Sync' section directly under 'Base Engine Settings' in `index.html`.
- **Onboarding Modal** (`showOnboardingModal` / `checkAndShowOnboardingModal` in `js/sync.js`):
  - Bottom-sheet style modal fires 1.2s after boot if sync is disabled.
  - Uses `sessionStorage` key so it retriggers in incognito/new sessions.
  - "Enable Sync" button navigates to Settings and opens `connectGoogleSync()`.
  - Hooked into `window.onload` in `js/core.js` via `checkAndShowOnboardingModal()`.
- **Migration Modal** (`showMigrationModal` in `js/sync.js`):
  - Promise-based modal shown before OAuth when local data exists.
  - Options: "Merge" (push local to Drive) or "Fresh Start" (pull cloud over local).
  - "Cancel" aborts the auth flow entirely.
  - Integrated into `connectGoogleSync()`.
- **Reset Sync** (`resetSyncData` in `js/sync.js`):
  - Finds and DELETEs `dabbux_sync_v4.json` from Google Drive `appDataFolder`.
  - Resets local `syncEnabled`, `lastSyncedAt`, `syncStatus`, clears token.
  - Guarded by `customConfirm()` before execution.
  - "Reset Sync" button added to `renderSyncControls()` beside "Disconnect".

## [Pending Tasks]
None. All requested features implemented.

## [Files Modified]
- `js/sync.js` — Added: `showOnboardingModal`, `checkAndShowOnboardingModal`, `showMigrationModal`, `resetSyncData`; updated `connectGoogleSync`, `renderSyncControls`, and `initGoogleAuth` callback.
- `js/core.js` — Added `checkAndShowOnboardingModal()` call in `window.onload`.
