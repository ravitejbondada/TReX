# TReX - Changelog

Format: `[version] YYYY-MM-DD — summary`
Files listed are the ones modified. Always update this on any meaningful change.

## [v4.14] 2026-06-01 — Mobile polish and Dino Mode guardrails

**What changed:** Tightened mobile navigation/dropdown/add-expense behavior and made Dino Mode opt-in/experimental.

**Files modified:**
- `js/core.js` — added picker page scroll lock/unlock so the page behind the custom picker cannot scroll on mobile; added `resetAppScrollToTop(viewName)` so navigation resets `window`, document/body, `<main>`, `#screenContainer`, and the active panel; changed clean-start `dinoPrefs.dinoMode` default to `false`.
- `styles.css` — added `overscroll-behavior` and `touch-action` guards to the custom picker overlay/panel/list so picker scrolling stays inside the sheet.
- `index.html` — labelled Dino Mode as `(experimental)` in Settings.
- `js/dashboard.js` — heatmap footprints now require both `dinoMode` and `dinoFootprints`, preventing footprint/egg markers while Dino Mode is off.
- `js/settings.js` — Dino dependent controls default to disabled/hidden when Dino Mode is off; dependent toggle handlers bail out if Dino Mode is off.
- `js/backup.js`, `js/sync.js` — backup/sync normalization and reset defaults now preserve Dino Mode as opt-in (`false`) when absent.
- `index.html` — Add Expense date and note fields now share one compact mobile row with a protected date width; Add Expense view has extra bottom padding so the save button clears the bottom nav.
- `README.md`, `ARCHITECTURE.md`, `FUNCTIONS.md`, `CHANGELOG.md` — updated docs.

**Behavior:**
- Fresh installs start with Dino Mode off.
- Dino Mode is explicitly marked experimental.
- Fossil Mode, Dino Footprints, and Extinction Warnings have no visible/runtime effect while Dino Mode is off.
- Opening the custom picker locks the page behind it; only the picker list scrolls.
- Bottom nav switches reliably scroll the target page to the top across mobile browsers.
- The high-use Add Expense form keeps the save button easier to reach on mobile.
- The header sync icon intentionally spins while `state.syncStatus === "syncing"`; it should stop when sync settles to idle/offline/error.

---

## [v4.13] 2026-06-01 — Central custom picker replaces native OS select on all dropdowns

**What changed:** All `<select class="app-dropdown">` elements now open a branded bottom-sheet custom picker instead of the native OS scroll-wheel picker. A central `openCustomPicker()` utility in `core.js` handles the full interaction; no other module needed changes. The previously non-functional ledger sort button is now fully wired.

**Files modified:**
- `js/core.js` — added `_ensurePickerDOM()`, `openCustomPicker(selectEl, titleOverride?)`, `closeCustomPicker()`, `openLedgerSortPicker()`; rewrote `wrapAllSelects()` to set `pointer-events:none` on each `app-dropdown` select and inject a `.select-catcher` sibling div (absolute, fills `.select-wrap`) that intercepts all taps and calls `openCustomPicker()`; `data-picker-attached` guard makes it idempotent; simplified `forceDropdownDarkTheme()` (option inline styles no longer needed); MutationObserver retained for auto-wrap on dynamic injection.
- `js/transactions.js` — `renderHistoryList()` now resets `#ledgerSortSelect` to `date-desc` and label to "Dated ↓" on every open; `filterHistory()` reads `#ledgerSortSelect.value` and branches into `date-desc` / `date-asc` / `amt-desc` / `amt-asc` sort logic (previously sort was hardcoded to `createdAt` desc only).
- `styles.css` — added `.select-catcher` (absolute overlay inside `.select-wrap` that intercepts taps); added `#customPickerOverlay`, `#customPickerPanel`, `#customPickerHandle`, `#customPickerTitle`, `#customPickerList`, `.picker-option`, `.picker-option.selected`, `.picker-check` with full dark / light / fossil theme variants.
- `index.html` — replaced the non-functional sort button anchor with a hidden `#ledgerSortSelect` (4 static options) + a visible button calling `openLedgerSortPicker()`; the select's `onchange` updates `#ledgerSortLabel` and calls `filterHistory()`.
- `ARCHITECTURE.md`, `FUNCTIONS.md`, `README.md`, `CHANGELOG.md` — updated docs.

**Behavior:**
- Tapping any dropdown (category, payment, currency, filter selects, recurring frequency, EMI tenure, sort, billing day, etc.) opens the custom bottom-sheet picker on all platforms — no native OS picker appears. The `<select>` gets `pointer-events:none`; a `.select-catcher` div on top handles all taps. This is the only reliable cross-browser method to fully suppress the native picker.
- The custom picker reads the live `<option>` list at tap time, so dynamically populated selects (category/payment in add expense, filter dropdowns) always show current sorted data.
- On selection, `select.value` is set and a real `change` event is dispatched — all existing `onchange` handlers (`filterHistory`, `renderMomReport`, `applyCategoryDefaultPayment`, `syncPaymentBillingDayRequirement`, etc.) fire automatically with no changes to their modules.
- Ledger sort button now works: opens picker with Dated ↓ / Dated ↑ / Amt ↓ / Amt ↑; `filterHistory()` applies the selected sort mode; resets to Dated ↓ on every ledger open.
- Category and payment dropdowns in the Add Expense form remain sorted A→Z (unchanged — `populateExpenseFormDropdowns` already sorted them).


---

## [v4.12] 2026-06-01 — Sorted cat/pay dropdowns across all forms

**What changed:** Category and payment options now sorted A→Z by name in every dropdown that wasn't already sorted.

**Files modified:**
- `js/transactions.js` — ledger filter dropdowns (category, payment) now sorted A→Z; payments also filtered to non-archived. Recurring form category and payment dropdowns sorted A→Z.
- `js/dashboard.js` — quick log editor category and payment dropdowns sorted A→Z; payments filtered to non-archived.
- `js/transactions.js` `populateExpenseFormDropdowns` and `populateEMIFormDropdowns` — already sorted, no change needed.

---



**What changed:** Collapsed the ledger top controls from ~6 rows into a compact 3-row header. Added a sort mode button and a collapsible filter sheet.

**Files modified:**
- `index.html` — replaced date-range block + search/filter block with: title row (back · title · sort button · filter icon), full-width search bar with inline clear button, summary row with active filter chips, and a hidden filter sheet containing date pickers + category + payment dropdowns.
- `js/transactions.js` — added `_ledgerSort`, `_LEDGER_SORT_CYCLE`, `_ledgerSortIdx` state; added `cycleLedgerSort()`, `toggleLedgerFilterSheet()`, `clearLedgerSearch()`, `_renderLedgerChips()`; `filterHistory()` now uses dynamic sort and renders chips + search-clear; `renderHistoryList()` resets sort to Date ↓ and date range to current cycle on every open; `openLedgerWithDate()` reordered to call `switchScreen` first then override dates, so heatmap single-day drill-down works correctly.
- `styles.css` — no changes; filter sheet and chips use Tailwind utility classes only.
- `ARCHITECTURE.md`, `FUNCTIONS.md`, `README.md`, `CHANGELOG.md` — updated docs.

**Behavior:**
- Filter sheet is collapsed by default; tapping the sliders icon expands it.
- Sort button cycles: Date ↓ → Date ↑ → Amt ↓ → Amt ↑ → Day ↓ → Day ↑. Resets to Date ↓ on every ledger open.
- Active category/payment/date-range filters appear as dismissible chips; a dot on the filter icon signals active filters.
- Heatmap → ledger drill-down correctly shows only the tapped day, sorted Date ↓.

---

## [v4.7] 2026-06-01 — Recurring catch-up sort fix

**What changed:** Recurring transactions posted in a catch-up batch (multiple missed dates posted at once) were all receiving `createdAt = new Date()` — the same millisecond — causing them to sort in insertion order (ascending) rather than newest-first. Fixed by stamping `createdAt` as end-of-day (`23:59:59`) on each entry's due date instead of wall-clock time.

**Files modified:**
- `js/recurring.js` — `postRecurringEntry`: replaced `createdAt: new Date().toISOString()` with end-of-day timestamp derived from `dateStr` (`new Date(y, m-1, d, 23, 59, 59, 0).toISOString()`).
- `ARCHITECTURE.md`, `FUNCTIONS.md`, `README.md`, `CHANGELOG.md` — updated docs.

**Behavior:**
- Recurring catch-up entries (e.g. 8 May, 9 May, 10 May posted together) now sort correctly newest-first in both the ledger and the home Recent Logs feed.
- Existing already-posted recurring transactions retain their old `createdAt`; only new postings benefit.

---



**What changed:** Modals opened from the side drawer no longer appear behind it. `closeDrawer()` is now called at the entry point of every modal that can be triggered from a drawer action.

**Files modified:**
- `js/settings.js` — `openEditCategoryModal`, `openEditPaymentModal`: `closeDrawer()` added at top. Add New buttons for categories, payments, recurring, and EMIs in `openDrawerSection` HTML: `closeDrawer();` prepended to each onclick.
- `js/recurring.js` — `openRecurringModal`, `openEMIModal`: `if (typeof closeDrawer === "function") closeDrawer();` added at top.
- `js/transactions.js` — `openInlineCategoryModal`, `openInlinePaymentModal`: already had the guard; no change needed.
- `CHANGELOG.md`, `FUNCTIONS.md`, `ARCHITECTURE.md`, `README.md` — updated docs.

**Behavior:**
- Editing or adding a category, payment method, recurring expense, or EMI from the drawer now closes the drawer first, then opens the modal cleanly on top.

---

## [v4.4] 2026-06-01 — Cycle-aware spend heatmap, orphan row pruning, nav removed

**What changed:** Heatmap rewritten to be cycle-aware. Salary mode renders only rows that contain at least one in-cycle day — fully out-of-cycle rows are pruned. Out-of-cycle days within shared rows get crosshatch tint with no interaction. Navigation arrows removed entirely (single active-cycle view only). Calendar mode unchanged.

**Files modified:**
- `js/dashboard.js` — `renderSpendHeatmap()` rewritten: builds rows-of-7 first, filters out all-crosshatch rows for salary mode, renders remaining rows with per-cell cycle awareness. Removed `_heatmapCycleOffset`, `_heatmapGetCycleWindow()`, `heatmapNavigate()`. Spend map keyed by full ISO date string.
- `index.html` — nav wrap + prev/next buttons removed from heatmap header; replaced with plain `#heatmapMonthLabel` span.
- `styles.css` — `.heatmap-nav-btn` removed; `.heatmap-crosshatch` retained.
- `CHANGELOG.md`, `FUNCTIONS.md`, `ARCHITECTURE.md`, `README.md` — updated docs.

**Behavior:**
- Salary cycle: grid shows only rows containing in-cycle days. Out-of-cycle days in those rows are crosshatched. No navigation — always the active cycle.
- Calendar cycle: rolling current month, no change.
- Header label shows cycle range ("May 11 – Jun 10") for salary, month+year for calendar.

---

## [v4.3] 2026-05-31 — Budget link fix, save confirmation, nav scroll-to-top

**What changed:** "Tap to set your budget" now opens the drawer budget panel directly. Saving budget shows a confirmation dialog and navigates home on OK. All bottom nav tab switches scroll the view to the top.

**Files modified:**
- `js/dashboard.js` — `updateAppDashboardView`: changed `onclick` of "Tap to set your budget" from `switchScreen('settings')` to `openDrawer(); openDrawerSection('budget')`.
- `js/settings.js` — `saveBudgetAndCycleSettings`: replaced `showNotification` with `customConfirm` confirmation dialog; on OK, calls `closeDrawer()` then `switchScreen('dashboard')`.
- `js/core.js` — `switchScreen`: added scroll reset for the active view panel element in addition to the existing `screenContainer` reset, so all nav tab switches scroll to top.
- `CHANGELOG.md`, `FUNCTIONS.md`, `README.md`, `ARCHITECTURE.md` — updated docs.

**Behavior:**
- Tapping "Tap to set your budget" on the dashboard opens the drawer Budget & Cycle panel, not the Settings screen.
- After submitting a budget, a confirmation modal appears. Tapping OK closes the drawer and returns to the dashboard.
- Tapping any bottom nav tab always resets the view scroll position to the top.

---

## [v4.2] 2026-05-31 - Recurring engine simplified

**What changed:** Recurring schedules now only insert ledger records when due. Once inserted, the transaction is treated like any other normal transaction.

**Files modified:**
- `js/recurring.js` - recurring rules use `lastPostedDate` and `postRecurringEntry()` creates plain transactions without recurring metadata.
- `ARCHITECTURE.md`, `FUNCTIONS.md`, `CHANGELOG.md`, `working.md` - documented the simplified recurring behavior.

**Behavior:**
- Recurring rules catch up every qualified date from `lastPostedDate + 1` or `startDate` through today.
- Monthly recurring dates clamp to month-end when the requested day does not exist, e.g. Jan 31 -> Feb 28/29.
- Resuming a paused schedule asks for a resume date, defaults to today, and catches up only from that date.
- Inserted transactions are normal ledger rows: edit/delete/history/report behavior is the same as manual expenses.
- Deleting a recurring schedule does not remove past ledger entries.

---

## [v4.1] 2026-05-31 — Payment types revised; currency list expanded

**What changed:** Removed UPI and Net Banking payment types. Renamed "Debit Card" to "Account/Debit Card". Expanded CURRENCIES from 4 to 16 entries with INR as default/first.

**Files modified:**
- `js/core.js` — `CURRENCIES` expanded (added AED, SGD, AUD, CAD, JPY, CNY, CHF, SAR, MYR, THB, IDR, NZD); `DEFAULT_PAYMENTS` updated (removed UPI p2, renamed Debit Card → Account/Debit Card).
- `index.html` — `inlinePayType` and `editPayType` dropdowns updated (removed UPI/Net Banking options, renamed Debit Card).
- `ARCHITECTURE.md`, `FUNCTIONS.md`, `CHANGELOG.md` — updated payment type list and DEFAULT_PAYMENTS docs.

**Behavior:**
- Available payment types: Cash, Credit Card, Account/Debit Card.
- Default payments for new installs: Cash + Account/Debit Card (no UPI seeded).
- Currency picker now shows 16 currencies; INR remains default.

---

## [v3.9] 2026-05-31 — Transaction timestamp sort

**What changed:** Added `createdAt` (full ISO 8601 timestamp) to every transaction so the ledger and recent activity feed sort by actual creation time within the same day, not just by date string. Time is never shown in the UI.

**Files modified:**
- `js/transactions.js` — `handleExpenseSubmit`: stamps `createdAt: new Date().toISOString()` on new transactions; on edit, preserves `createdAt` when the date is unchanged and updates it to now when the date changes. `renderHistoryList`: sort now uses `createdAt` desc with `date` fallback for old transactions.
- `js/dashboard.js` — `renderRecentActivityList`: same `createdAt`-first, `date`-fallback sort.
- `js/recurring.js` — `postRecurringEntry`, `postEMIEntry` (installment + processing fee): all stamped with `createdAt`.
- `js/goals-trips.js` — all four `state.transactions.push(...)` sites (banner quick-add, trip expense edit on→pre, trip expense add, `syncTripToLedger` rollup): all stamped with `createdAt`.
- `js/auth.js` — `submitLockedQuickExpense` ledger path: changed from `getTodayISO()` (date-only) to `new Date().toISOString()` (full timestamp).
- `ARCHITECTURE.md`, `FUNCTIONS.md`, `CHANGELOG.md` — documented `createdAt` field on transaction shape and updated affected function descriptions.

**Behavior:**
- All new transactions get a millisecond-precision `createdAt`. Two expenses on the same day now sort newest-first by the time they were entered — in both the home Recent Logs feed and the Ledger.
- Editing a transaction that stays on the same date retains its original `createdAt` so its position in same-day ordering is unchanged.
- Changing a transaction's date during edit resets `createdAt` to now, placing it correctly relative to other transactions on the new date.
- Existing transactions with no `createdAt` continue to sort by date as before; they get a proper `createdAt` the first time they are edited.

---

## [v3.8] 2026-05-31 — Remove dino icon flashing square; progress bar color shift

**What changed:** Removed the `trex-hungry-pulse` box-shadow keyframe animation that was rendering as a flashing square around the dino icon in the budget panel at high spend. Replaced with Option B — progress bar color shift — as the sole danger signal. Dino images at `dino-ravenous` and `dino-extinct` states now use `dino-idle-bob` at faster speeds instead.

**Files modified:**
- `styles.css` — removed `@keyframes trex-hungry-pulse` and `.budget-danger` class; replaced `.budget-dino-img.dino-ravenous` and `.dino-extinct` animation with `dino-idle-bob` at 1.1 s and 0.9 s; removed `budget-danger` from the `prefers-reduced-motion` block.
- `js/dashboard.js` — removed the Phase 4 `budget-danger` class toggle from `renderForecastCard`; progress bar color-shift (emerald → amber → orange → yellow) in `updateAppDashboardView` is unchanged and now the sole visual danger indicator.

**Behavior:**
- No flashing square appears around the dino icon at any spend level.
- Progress bar shifts: emerald→teal (0–60%), amber (60–85%), amber→orange (85–100%), amber→orange→yellow (100%+).
- Dino image still animates at ravenous/extinct states — faster bob instead of pulse flash.

---

## [v3.7] 2026-05-31 - Phase 8 sound engine

**What changed:** Added the shared Phase 8 sound engine and moved App Sounds out of the Dino/Personality section so sounds work in both normal and Dino Mode.

**Files modified:**
- `index.html` - added `js/sounds.js` to load order after `core.js`; moved App Sounds and volume/test controls under Appearance.
- `js/sounds.js` - new Web Audio engine with normal and dino sound banks, lazy AudioContext startup, master volume, and global `S` / `playSound()`.
- `js/settings.js` - detached sound controls from the Dino Mode dependent toggle gate.
- `js/core.js`, `js/auth.js`, `js/transactions.js`, `js/dashboard.js`, `js/goals-trips.js`, `js/recurring.js`, `js/backup.js`, `js/sync.js` - wired sound cues into key save/delete/PIN/sync/alert actions.
- `ARCHITECTURE.md`, `FUNCTIONS.md`, `CHANGELOG.md`, `working.md` - documented Phase 8.

**Verification:**
- All app JS files pass `node --check` using the bundled Codex Node runtime.
- `git diff --check` passed with only existing CRLF normalization warnings.

## [v3.6] 2026-05-31 - Implementation plan Phases 1-3 complete

**What changed:** Completed the dino revamp foundation through Phase 3: side drawer settings architecture, dino preference state, and Dino Mode copy/micro-text coverage.

**Files modified:**
- `index.html` - Phase 1 drawer/header/clean Settings structure and Phase 2 Personality controls were verified as present.
- `js/core.js` - added/verified drawer helpers, `dp(key)`, and `t(neutral, dino)`; wrapped theme toast copy.
- `js/auth.js`, `js/transactions.js`, `js/dashboard.js`, `js/settings.js`, `js/goals-trips.js`, `js/recurring.js`, `js/reports.js`, `js/sync.js`, `js/backup.js`, `js/credit-cards.js` - finished Phase 3 dino/neutral copy wrapping for remaining toasts, confirms, empty states, and contextual labels.
- `ARCHITECTURE.md`, `FUNCTIONS.md`, `CHANGELOG.md`, `working.md` - reconciled docs for Phase 1-3 completion and Phase 4 readiness.
- `js/settings.js` - added a Dino Mode master-toggle gate that disables dependent dino controls while preserving their saved choices.
- `index.html`, `styles.css`, `js/core.js`, `js/settings.js`, `js/transactions.js` - refined the drawer/Personality UI: Dino Mode toggles in Settings and drawer header, top gear plus retained Settings row, drawer sync email pill, and drawer close before add category/payment modals.

**Verification:**
- All app JS files pass `node --check` using the bundled Codex Node runtime.
- Local HTTP server returned `200` for `index.html` during the Phase 1-3 audit.

## [v3.5] 2026-05-30 — Lock screen UX rework, encoding fixes, budget sync fix

**What changed:** Reworked the locked quick expense UX, fixed widespread UTF-8 encoding corruption in dashboard.js, and fixed a budget field sync bug where a device with no budget could overwrite a real budget from another device.

**Files modified:**
- `index.html` — replaced the floating `+` button and inline lock-screen form with a `circle-plus` keypad key (bottom-right, same style as biometric key); moved delete to a small `x` inline beside the PIN dots; added `#lockedExpenseSheet` slide-up sheet with full add-expense form (big amount input, category, payment, date pre-filled today, note, active trip badge).
- `js/auth.js` — added `openLockedExpenseSheet()`, `closeLockedExpenseSheet()`, `closeLockedExpenseSheetOutside()`; `submitLockedQuickExpense()` now saves to normal ledger when no active trip is detected (removed trip-only block); `lockApp()` closes sheet on lock; `unlockApp()` closes sheet on unlock.
- `js/dashboard.js` — fixed widespread UTF-8 double-encoding corruption: 284× `──` section dividers, 11× `–` en dashes, 3× `·` middle dots, 2× `→` arrows, 1× `🔔` bell emoji; stripped BOM from file header. All emojis (😄 😱 😰 😟 😐 🙂 🎯) confirmed clean.
- `js/sync.js` — fixed `buildMergedSyncState()` budget merge: `monthlyBudget` now prefers the non-zero value regardless of timestamp; a device with `monthlyBudget: 0` can no longer overwrite a real budget from another device.
- `README.md`, `ARCHITECTURE.md`, `FUNCTIONS.md`, `CHANGELOG.md`, `working.md` — updated docs.

**Behavior:**
- Lock screen keypad bottom row: `[biometric] [0] [circle-plus]`. Tapping the `circle-plus` key opens the expense sheet; the sheet pre-fills today's date, focuses the amount field, shows a trip badge if an active trip is detected. Saving routes to the active trip or the normal ledger.
- Budget sync: highest non-zero budget wins on merge, regardless of which device has the newer `updatedAt`.
- PWA reminder limitation documented: `scheduleDailyReminder()` uses `setTimeout` and requires the browser tab to be active; background/screen-off firing requires a native wrapper (Capacitor) or server-push. Noted for future Capacitor migration.

## [v3.4] 2026-05-30 - Hosted web app enablement

**What changed:** Enabled hosted-web security and reminder features, added lock-screen active-trip quick expense, moved reset controls to the final Settings panel, and fixed reset-marker follow-up behavior.

**Files modified:**
- `index.html` - moved reset panel to the bottom of Settings; added biometric Settings toggle/status, reminder test notification button, and locked quick expense form.
- `js/auth.js` - replaced simulated biometrics with WebAuthn/passkey unlock; added locked quick expense form population and active-trip-only save behavior.
- `js/core.js` - added biometric/reminder state defaults and service worker registration.
- `js/dashboard.js` - upgraded reminders with service-worker notification delivery, missed-reminder checks, and test notification support.
- `js/sync.js` - preserves local biometric metadata during remote apply; resolves cloud reset markers to a fresh post-reset cloud state when another device chooses Reset This Device Too.
- `sw.js` - added service worker notification click handling.
- `README.md`, `ARCHITECTURE.md`, `FUNCTIONS.md`, `working.md` - documented Phase 9 behavior.

**Behavior:** Biometric unlock is device-local WebAuthn with PIN fallback. Daily reminders are browser/PWA notifications with a missed-reminder check on app open. Locked quick expense saves only to active trips; normal expenses require unlocking.

## [v3.3] 2026-05-30 - Full reset control

**What changed:** Added a dedicated Settings Danger Zone for destructive reset actions and cross-device reset handling.

**Files modified:**
- `js/sync.js` - added `renderResetDangerZone()`, `resetAllData()`, reset markers, `syncEpoch` lineage, and reset-boundary choice modals. Cloud-only reset is disabled unless Drive sync is connected, while Full Reset remains visible for local-only factory reset.
- `README.md`, `ARCHITECTURE.md`, `FUNCTIONS.md` - documented the difference between Reset Sync and Full Reset.

**Behavior:** Full reset replaces the cloud backup with a reset marker when possible, removes `androidWalletState_v4` from localStorage, clears `trex_onboarding_seen` from sessionStorage, and reloads the app to defaults. Other devices must explicitly choose reset local / make local main, or force cloud / force local / force merge if newer post-reset cloud data exists.
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
