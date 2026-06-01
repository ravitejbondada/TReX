# TReX Working Log

**Last updated:** June 1, 2026
**Current version:** v4.16
**Plan:** `TREX_IMPLEMENTATION_PLAN.md` - Feature Implementation Plan

---

## Current Item

Phase 1 - Item 6: Inline edit (amount + note)

## Status

[x] Done

## Notes

- Fresh start for the new feature implementation plan.
- Recurring pause/resume and recurring scheduler simplification are already complete and intentionally removed from the new plan.
- Before touching source for an item, update this file to `[~] In progress`; after verification, mark `[x] Done` and add a brief completion note.
- Implementing the first three ledger UX items together because they share the ledger row/header/filter surface.
- Completed ledger swipe-to-delete, bulk select/delete, and amount range filtering.
- Implementing running balance and transaction presets together because both touch ledger row rendering and the add-expense form.
- Completed ledger running balance and transaction presets/preset manager.
- Completed inline edit for amount + note on ledger rows. Scoped to non-tripRef, non-selectMode rows. Tap amount or note span to edit in-place; Escape cancels, Enter/blur commits. Running balances recomputed in-place on amount change with no full re-render.

---

## Completed

- Previous Dino/theme/sounds implementation work is documented in `CHANGELOG.md`.
- Recurring engine simplification is complete: recurring inserts plain ledger rows, catches up qualified due dates, clamps monthly dates to month-end, and resume restarts from a chosen date.

---

## Checklist

### Phase 1 - Core Ledger UX

[x] 1. Swipe-to-delete
[x] 2. Bulk delete / select mode
[x] 3. Filter by amount range
[x] 4. Running balance
[x] 5. Transaction templates / presets
[x] 6. Inline edit (amount + note)

### Phase 2 - Analytics & Insights

[ ] 7. Payment split chart (dashboard)
[ ] 8. Weekly/monthly comparison (dashboard)
[ ] 9. Category spend trend (reports)
[ ] 10. Goal progress bar + projected date
[ ] 11. Trip daily budget breakdown

### Phase 3 - Power Features

[ ] 12. Split transactions
[ ] 13. Tag / label system
[ ] 14. EMI foreclosure calculator
[ ] 15. Offline conflict queue

### Phase 4 - Low Priority

[ ] 16. High contrast theme

---

## Known Limitations

- PWA daily reminder uses `setTimeout`; it requires the browser tab to be active.
- Browser/PWA notification quirks may vary by platform.
