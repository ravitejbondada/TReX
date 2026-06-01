# TReX Working Log

**Last updated:** June 1, 2026
**Current version:** v4.17
**Plan:** `TREX_IMPLEMENTATION_PLAN.md` - Feature Implementation Plan

---

## Current Item

Phase 3 - Item 12: Split transactions

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
- Completed inline edit for amount + note on ledger rows. Non-tripRef, non-selectMode only. Tap in-place; Escape cancels, Enter/blur commits. Running balances recomputed in-place on amount change.
- Item 7 (payment split chart) skipped by design decision.
- Completed spend comparison chart on dashboard. Week mode: grouped bar per day Mon–Sun, this week vs last week. Month mode: this month-to-date vs same date range last month. Toggle matches Spend Velocity style. Chart instance destroyed/recreated on toggle.
- Completed category spend trend in reports. New Trends tab (4th tab) added to reports tab bar. Multi-line Chart.js, one line per category (top 6 by total spend). 3M/6M toggle. Empty state handled. `categoryTrendChartInstance` added to `resizeReportCharts`. `_catTrendPeriod` defaults to 3.
- Completed goal progress bar + projected date. `calcGoalProjectedDate(goal)` computes average daily contribution rate from contribution history and projects forward from today. Projected date shown inline below the progress bar in each goal card. Color-coded: emerald if on track to beat target date, rose if late, slate if no target set. Hidden when goal is fully funded or has no contributions.
- Completed trip daily budget breakdown. `renderTripDailyBreakdown(trip)` renders below the stats card in trip detail view. Groups on-trip expenses by day, computes daily budget = total budget / trip days, renders a mini bar per day with actual vs budget. Over-budget days get a rose bar and a "+₹N" badge. Header shows daily budget rate and a count of over-budget days. Empty (no on-trip expenses) renders nothing. Called at end of `renderTripDetailStats`. `<div id="tripDailyBreakdown">` added to index.html between the stats card and the tab bar.

- Corrected implementation-plan numbering after skipped Item 3 caused later headings to drift by one.
- Completed split transactions. Split mode now validates rows against the total amount, stores parts with shared `splitGroupId`, renders grouped ledger rows, supports split edit, preserves split fields in backup/core migration, and delete now offers part-only vs all-parts choices.

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

[-] 7. Payment split chart (dashboard) — skipped
[x] 8. Weekly/monthly comparison (dashboard)
[x] 9. Category spend trend (reports)
[x] 10. Goal progress bar + projected date
[x] 11. Trip daily budget breakdown

### Phase 3 - Power Features

[x] 12. Split transactions
[ ] 13. Tag / label system
[ ] 14. EMI foreclosure calculator
[ ] 15. Offline conflict queue

### Phase 4 - Low Priority

[ ] 16. High contrast theme

---

## Known Limitations

- PWA daily reminder uses `setTimeout`; it requires the browser tab to be active.
- Browser/PWA notification quirks may vary by platform.
