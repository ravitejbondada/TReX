# TReX - Active Work Log

**Last updated:** May 31, 2026
**Current version:** v3.6
**Changelog:** All completed work from v2.0-v3.6 is documented in `CHANGELOG.md`.

---

## Current Status

TREX_IMPLEMENTATION_PLAN.md Phase 3 (Dino Copy & Micro-text) - **Complete**
Next up: **TREX_IMPLEMENTATION_PLAN.md - Phase 4 (Dino Animations & CSS)**

Completed implementation-plan phases:
- Phase 1 - Settings Architecture Revamp: side drawer, drawer sub-panels, clean Settings layout.
- Phase 2 - State & Preferences Foundation: `dinoPrefs`, `dp(key)`, Personality settings controls, backup/sync normalization.
- Phase 3 - Dino Copy & Micro-text: `t(neutral, dino)` and dino-mode copy across toasts, confirms, empty states, and contextual labels.
- Phase 3.5 - Dino Mode master toggle: dependent dino controls are disabled when Dino Mode is off, with saved choices preserved.

---

## Known Limitations

- **PWA daily reminder:** `scheduleDailyReminder()` uses `setTimeout` - requires the browser tab to be active. Does not fire with screen off or browser backgrounded. Planned fix: Capacitor migration (`@capacitor/local-notifications`).
- **PWA notifications:** Chrome's "Tap to copy URL" notification appears alongside app notifications on Android - this is browser behaviour, not fixable from JS.

---

## Next Phase - Implementation Plan Phase 4

**Reference:** `TREX_IMPLEMENTATION_PLAN.md`
**Goal:** Dino animations and CSS triggers
**Upload these files to start:**
`styles.css`, `js/auth.js`, `js/dashboard.js`, `js/transactions.js`

**Session resume format:**
```text
TReX dev session resume.
Current phase: 4
Current step: [description]
Last completed: Phase 3 copy/micro-text pass; JS syntax checks passed
Uploading: styles.css, js/auth.js, js/dashboard.js, js/transactions.js
```

---

## Resume Instructions

Re-upload only the files being touched for the current phase/step.
Verify the stability checklist before moving to the next step.
Update `CHANGELOG.md` and this file after each phase ships.