# TReX - Active Work Log

**Last updated:** May 31, 2026
**Current version:** v3.7
**Changelog:** All completed work from v2.0-v3.7 is documented in `CHANGELOG.md`.

---

## Current Status

TREX_IMPLEMENTATION_PLAN.md Phase 8 (Sound Engine) - **Complete**
Next up: **TREX_IMPLEMENTATION_PLAN.md - Phase 9 (Polish)**

Completed implementation-plan phases:
- Phase 1 - Settings Architecture Revamp: side drawer, drawer sub-panels, clean Settings layout.
- Phase 2 - State & Preferences Foundation: `dinoPrefs`, `dp(key)`, Personality settings controls, backup/sync normalization.
- Phase 3 - Dino Copy & Micro-text: `t(neutral, dino)` and dino-mode copy across toasts, confirms, empty states, and contextual labels.
- Phase 3.5 - Dino Mode master toggle: dependent dino controls are disabled when Dino Mode is off, with saved choices preserved.
- Phase 8 - Sound Engine: shared `js/sounds.js`, normal/dino sound banks, App Sounds setting under Appearance, and key action sound cues.
- Recurring engine simplification: recurring schedules catch up qualified due dates, monthly dates clamp to month-end, pause skips processing, resume restarts from a chosen date, and inserted rows behave like manual expenses.

---

## Known Limitations

- **PWA daily reminder:** `scheduleDailyReminder()` uses `setTimeout` - requires the browser tab to be active. Does not fire with screen off or browser backgrounded. Planned fix: Capacitor migration (`@capacitor/local-notifications`).
- **PWA notifications:** Chrome's "Tap to copy URL" notification appears alongside app notifications on Android - this is browser behaviour, not fixable from JS.

---

## Next Phase - Implementation Plan Phase 9

**Reference:** `TREX_IMPLEMENTATION_PLAN.md`
**Goal:** Final polish pass
**Upload these files to start:**
`styles.css`, `js/core.js`, `js/dashboard.js`, `js/goals-trips.js`

**Session resume format:**
```text
TReX dev session resume.
Current phase: 9
Current step: [description]
Last completed: Phase 8 sound engine; JS syntax checks passed
Uploading: styles.css, js/core.js, js/dashboard.js, js/goals-trips.js
```

---

## Resume Instructions

Re-upload only the files being touched for the current phase/step.
Verify the stability checklist before moving to the next step.
Update `CHANGELOG.md` and this file after each phase ships.
