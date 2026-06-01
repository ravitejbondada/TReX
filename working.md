# TReX Working Log

**Last updated:** June 1, 2026
**Current version:** v4.19
**Plan:** `TREX_IMPLEMENTATION_PLAN.md` - Feature Implementation Plan

---

## Current Item

Documentation refresh - completed feature plan

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
- Completed split transactions. Split mode stores parts with shared `splitGroupId`, renders grouped ledger rows, supports split edit, preserves split fields in backup/core migration, and now derives the main amount from split rows.
- Starting tag labels and EMI foreclosure together because both add persisted optional fields and backup/sync normalization.
- Completed tag labels and EMI foreclosure. Expense form now saves transaction tags, ledger can search/filter tags, rows show compact tag chips, backup/sync/core preserve tag state, EMI cards expose Foreclose on active schedules, and foreclosure records a payoff transaction while stopping future EMI processing.
- Fixing split transaction UX issues: toggle placement, category replacement behavior, duplicate-category warning, dashboard recent spend inclusion, ledger visual parity, running totals, and split edit/delete actions.
- Completed split polish pass. Split toggle now lives in the Category Tag header and replaces the category picker with split rows, duplicate split categories are blocked with a warning, dashboard recent logs collapse split parts into one item, ledger split cards share the normal bordered tile style, running balance counts split groups once, and split edit/delete buttons stop event bleed-through.
- Completed split follow-up fixes. Split mode now derives the main read-only amount from individual row amounts and no longer validates against a separate target amount. Ledger cumulative balances are computed from the final visible tile order by summing bottom-to-top after filter/search/sort. Parent split delete now warns and deletes the whole split; expanded child rows delete individual split parts.
- Completed transaction tile layout normalization. Ledger, dashboard recent activity, and credit-card transaction lists now use name / date + payment / categories. Split tiles show every category chip and the split stripe uses every unique split category color.
- Removed the dashboard recurring expenses panel. Recurring remains in the sidebar/drawer, and Add Expense now has a subtle "Make this recurring" link under the amount panel. Split toggle colors are rose/red when off and green when on.
- Replaced the Settings Appearance dropdown with a three-way segmented theme switch. Heatmap cells now have stronger borders and a very light tint so empty/low cells read better.
- Fixed recurring auto-post duplication. Recurring rows now carry `recurringId`, legacy duplicate auto rows are compacted by schedule/date key, existing auto rows block reposting the same due date, and editing/deleting an auto row records that date in `skippedDates`.
- Starting the final two implementation-plan items together: offline conflict queue and high contrast theme. Full README/ARCHITECTURE/FUNCTIONS update is intentionally deferred.
- Completed offline queue and high contrast theme. Offline sync-enabled edits now persist a latest-snapshot queue and flush before the next Drive push when the app comes online. Settings now has a three-option theme selector with Dark, Light, and High contrast.
- Completed documentation refresh for the finished implementation plan. README, ARCHITECTURE, FUNCTIONS, CHANGELOG, working log, and implementation checklist now describe Phase 1-4 through offline queue and high contrast theme.

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
[x] 13. Tag / label system
[x] 14. EMI foreclosure calculator
[x] 15. Offline conflict queue

### Phase 4 - Low Priority

[x] 16. High contrast theme

---

## Known Limitations

- PWA daily reminder uses `setTimeout`; it requires the browser tab to be active.
- Browser/PWA notification quirks may vary by platform.
