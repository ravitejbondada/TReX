# TReX Working Log

**Last updated:** May 31, 2026
**Current version:** v4.2+
**Plan:** `TREX_IMPLEMENTATION_PLAN.md` - Feature Implementation Plan

---

## Current Item

Phase 1 - Item 1: Swipe-to-delete on ledger rows

## Status

[ ] Not started

## Notes

- Fresh start for the new feature implementation plan.
- Recurring pause/resume and recurring scheduler simplification are already complete and intentionally removed from the new plan.
- Before touching source for an item, update this file to `[~] In progress`; after verification, mark `[x] Done` and add a brief completion note.

---

## Completed

- Previous Dino/theme/sounds implementation work is documented in `CHANGELOG.md`.
- Recurring engine simplification is complete: recurring inserts plain ledger rows, catches up qualified due dates, clamps monthly dates to month-end, and resume restarts from a chosen date.

---

## Checklist

### Phase 1 - Core Ledger UX

[ ] 1. Swipe-to-delete
[ ] 2. Bulk delete / select mode
[ ] 3. Filter by amount range
[ ] 4. Running balance
[ ] 5. Transaction templates / presets
[ ] 6. Inline edit (amount + note)

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
