# TReX — Feature Implementation Plan

> **For the implementing developer:** Work through phases sequentially. After completing each item, mark it `[x]` in `working.md`. Do not skip ahead. Each item lists exact files, functions, and UI changes required — no guesswork needed.

---

## working.md Protocol

Maintain a file called `working.md` at the project root. Template:

```md
# TReX Working Log

## Current Item
Phase X — Item Y: <name>

## Status
[ ] Not started | [~] In progress | [x] Done

## Notes
<any blockers or decisions made>

## Completed
- Phase 1 — Item 1: Swipe-to-delete ✓
- ...
```

Update `working.md` before touching any source file and after completing each item.

---

## Global Conventions

- **State mutations** always end with `saveStateToLocalStorage()`.
- **Re-render after mutation:** call the appropriate render function for the affected view.
- **IDs:** generate with `crypto.randomUUID()` or `Date.now().toString(36)`.
- **No new dependencies.** All work uses existing CDN libs (Tailwind, Lucide, Chart.js).
- **Swipe gestures:** use `touchstart` / `touchend` pointer events; threshold 60 px horizontal delta.
- **Modals:** inject HTML into `#modalContainer` (or append to `<body>`); remove on close.
- **Styles:** all new CSS goes in `styles.css` under a clearly labeled comment block.
- **Light-theme coverage:** any new UI element must have a `html[data-theme="light"]` override if it uses hardcoded dark colors.
- **Module size guard:** prefer new focused JS files for new feature clusters instead of growing already-large modules. Suggested modules: `js/ledger-gestures.js` for swipe/bulk ledger interactions, `js/ledger-templates.js` for presets, `js/ledger-tags.js` for tags, `js/analytics-extra.js` for extra charts, and `js/offline-queue.js` for offline queue logic. Add any new file to `index.html`, `ARCHITECTURE.md`, and `FUNCTIONS.md`.

---

## Phase 1 — Core Ledger UX

### Item 1 — Swipe-to-delete on ledger rows

**Goal:** Right-to-left swipe on a transaction row reveals a red delete action.

**Files:** `transactions.js`, `styles.css`

**Functions:**
- `renderHistoryList()` — wrap each row `<div>` in a `.swipe-row-wrapper`; attach touch listeners inline or via a helper.
- **NEW** `attachSwipeToDelete(rowEl, txId)` — binds `touchstart`/`touchmove`/`touchend` to the wrapper; translates the row on swipe; reveals `.swipe-delete-btn` behind it; calls `deleteTransaction(id)` on confirm-tap.

**UI changes:**
- Each ledger row: `<div class="swipe-row-wrapper"> <div class="swipe-delete-btn">🗑 Delete</div> <div class="tx-row">...</div> </div>`
- On swipe left ≥ 60 px: `tx-row` slides left via `transform: translateX(-80px)`, delete button becomes visible.
- Tap anywhere else or swipe right: snap back.

**Styles (styles.css):**
```css
/* === Swipe-to-delete === */
.swipe-row-wrapper { position: relative; overflow: hidden; }
.swipe-delete-btn {
  position: absolute; right: 0; top: 0; height: 100%;
  width: 80px; background: #ef4444;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 0.8rem; cursor: pointer;
}
.tx-row { transition: transform 0.2s ease; background: inherit; }
html[data-theme="light"] .swipe-delete-btn { background: #dc2626; }
```

---

### Item 2 — Bulk delete / select mode in ledger

**Goal:** A "Select" toggle in the ledger toolbar enters multi-select mode; selected rows can be batch-deleted.

**Files:** `transactions.js`, `index.html`, `styles.css`

**State (in-memory only, not persisted):**
```js
let ledgerSelectMode = false;
let ledgerSelectedIds = new Set();
```

**Functions:**
- **NEW** `toggleLedgerSelectMode()` — flips `ledgerSelectMode`; calls `renderHistoryList()`.
- **NEW** `toggleLedgerRowSelect(txId)` — adds/removes from `ledgerSelectedIds`; updates row visual.
- **NEW** `bulkDeleteSelected()` — calls `customConfirm()`, removes all selected IDs from `state.transactions`, saves, renders.
- `renderHistoryList()` — when `ledgerSelectMode=true`, prepend a checkbox `<input type="checkbox">` to each row and show the bulk-action bar.

**UI changes (index.html additions):**
- Add to ledger toolbar (near existing filter controls):
  ```html
  <button onclick="toggleLedgerSelectMode()" id="ledgerSelectBtn">Select</button>
  ```
- Bulk action bar (hidden by default, shown in select mode):
  ```html
  <div id="ledgerBulkBar" class="hidden">
    <span id="ledgerSelectCount">0 selected</span>
    <button onclick="bulkDeleteSelected()">Delete Selected</button>
    <button onclick="toggleLedgerSelectMode()">Cancel</button>
  </div>
  ```

**Styles:**
```css
/* === Bulk select === */
#ledgerBulkBar { display:flex; gap:0.5rem; align-items:center; padding:0.5rem; background:var(--surface); }
.tx-row.selected { background: rgba(99,102,241,0.15); }
```

---

### Item 3 — Filter by amount range in ledger

**Goal:** Two number inputs (Min ₹ / Max ₹) in the ledger filter bar.

**Files:** `transactions.js`, `index.html`

**State (in-memory, not persisted):**
```js
let ledgerAmountMin = null;
let ledgerAmountMax = null;
```

**Functions:**
- `filterHistory()` — extend existing filter logic to also exclude rows where `tx.amount < ledgerAmountMin` or `tx.amount > ledgerAmountMax` (when set).
- **NEW** `applyAmountRangeFilter()` — reads min/max inputs, sets module vars, calls `filterHistory()`.

**UI changes (index.html):**
- In the ledger filter row, add after existing filters:
  ```html
  <input type="number" id="amtMin" placeholder="Min ₹" oninput="applyAmountRangeFilter()">
  <input type="number" id="amtMax" placeholder="Max ₹" oninput="applyAmountRangeFilter()">
  ```
- Clear these inputs when `resetLedgerToCycle()` is called.

---

### Item 4 — Running balance in ledger

**Goal:** Show a cumulative spend column beside each row in the ledger (oldest → newest running total).

**Files:** `transactions.js`, `styles.css`

**Functions:**
- `renderHistoryList()` — after sorting transactions descending, compute a running total array by iterating in reverse (ascending) and accumulating `amount`; render it as a subtle right-aligned badge on each row.

**UI changes:**
- Add to each ledger row: `<span class="running-balance">₹ X,XXX</span>`

**Styles:**
```css
/* === Running balance === */
.running-balance { font-size:0.7rem; color: var(--text-muted); text-align:right; }
```

---

### Item 5 — Transaction templates / presets

**Goal:** Save an expense combo (amount + category + payment + note) as a named preset; 1-tap log from the ledger or add-expense screen.

**Files:** `transactions.js`, `core.js`, `index.html`, `styles.css`, `backup.js`, `sync.js`

**State:**
```js
state.transactionTemplates = [
  { id, name, amount, categoryId, paymentId, note }
]
```
Add `transactionTemplates: []` to the default state in `core.js`, plus backup/import and sync normalization defaults.

**Functions:**
- **NEW** `saveCurrentAsTemplate()` — reads live expense form fields, prompts for a template name via a small inline modal, pushes to `state.transactionTemplates`, saves.
- **NEW** `applyTemplate(templateId)` — populates the expense form from a template object.
- **NEW** `deleteTemplate(templateId)` — removes from state, re-renders.
- **NEW** `renderTemplatesBar()` — renders a horizontal scrollable chip row above the expense form showing all saved templates; each chip triggers `applyTemplate()`.
- **NEW** `openTemplatesManager()` — opens a modal listing all templates with delete buttons.

**UI changes (index.html):**
- Above the expense form add:
  ```html
  <div id="templatesBar" class="templates-bar"></div>
  <button onclick="openTemplatesManager()">Manage Presets</button>
  ```
- Inside the expense form footer, add:
  ```html
  <button type="button" onclick="saveCurrentAsTemplate()">Save as Preset</button>
  ```

**Styles:**
```css
/* === Templates === */
.templates-bar { display:flex; gap:0.5rem; overflow-x:auto; padding:0.25rem 0; }
.template-chip {
  white-space:nowrap; padding:0.25rem 0.75rem;
  border-radius:9999px; background:rgba(99,102,241,0.2);
  font-size:0.8rem; cursor:pointer;
}
```

---

### Item 6 — Inline edit (amount + note from ledger)

> **Implement only if it can be done elegantly.** Do not force it.

**Goal:** Tapping the amount or note on a ledger row shows a small inline input; blur/Enter saves.

**Files:** `transactions.js`, `styles.css`

**Condition:** Only expose inline edit for non-`tripRef` transactions.

**Functions:**
- **NEW** `startInlineEdit(txId, field)` — replaces the amount or note text node with a focused `<input>`; binds `blur` and `keydown Enter` to `commitInlineEdit()`.
- **NEW** `commitInlineEdit(txId, field, value)` — validates, updates `state.transactions`, saves, re-renders the single row (not the full list).

**UI:** On tap of `.tx-amount` or `.tx-note` span, swap for `<input class="inline-edit-input">`.

**Styles:**
```css
/* === Inline edit === */
.inline-edit-input {
  width:100%; background:transparent; border:none;
  border-bottom:1px solid var(--indigo); font-size:inherit;
  color:inherit; outline:none;
}
```

---

## Phase 2 — Analytics & Insights

### Item 7 — Payment method split chart (dashboard)

**Status:** Skipped by design decision. The existing budget/forecast and reports surfaces cover this need without adding another dashboard chart.

**Goal:** A doughnut / pill chart on the dashboard showing spend by payment method for the current cycle.

**Files:** `dashboard.js`, `index.html`, `styles.css`

**Functions:**
- **NEW** `renderDashboardPaymentSplitChart()` — computes per-payment totals for the active cycle; renders a small Chart.js doughnut on `<canvas id="dashPaymentSplitChart">`.
- `updateAppDashboardView()` — call `renderDashboardPaymentSplitChart()`.

**UI changes (index.html):**
- Add a new dashboard card below the existing spend widgets:
  ```html
  <div class="dash-card" id="paymentSplitCard">
    <h3>Payment Split</h3>
    <canvas id="dashPaymentSplitChart" height="160"></canvas>
  </div>
  ```

---

### Item 8 — Weekly/monthly spend comparison on dashboard

**Goal:** A compact bar chart on the dashboard: current week vs last week (or current month vs last month), togglable.

**Files:** `dashboard.js`, `index.html`

**Functions:**
- **NEW** `renderDashboardSpendComparison()` — computes this-week/last-week totals (or this-month/last-month); renders via Chart.js grouped bar on `<canvas id="dashSpendCompareChart">`.
- **NEW** `setDashCompareMode(mode)` — `'week'` | `'month'`; re-renders chart.
- `updateAppDashboardView()` — call `renderDashboardSpendComparison()`.

**UI changes (index.html):**
```html
<div class="dash-card">
  <div style="display:flex;justify-content:space-between">
    <h3>Spend Comparison</h3>
    <div>
      <button onclick="setDashCompareMode('week')">Week</button>
      <button onclick="setDashCompareMode('month')">Month</button>
    </div>
  </div>
  <canvas id="dashSpendCompareChart" height="140"></canvas>
</div>
```

---

### Item 9 — Category spend trend (last 3–6 months)

**Goal:** In Reports, a new "Trends" tab showing a line chart per category over 3 or 6 months.

**Files:** `reports.js`, `index.html`

**Functions:**
- **NEW** `renderCategoryTrendChart(months)` — gathers cycle-bucketed totals per category for last N months; renders multi-line Chart.js on `<canvas id="categoryTrendChart">`.
- **NEW** `setCategoryTrendPeriod(n)` — `3` or `6`; re-renders.
- `toggleReportMode(mode)` — add case `'trends'`.

**UI changes (index.html):**
- Add "Trends" tab button to the reports tab bar.
- Add panel:
  ```html
  <div id="reportTrendsPanel" class="hidden">
    <button onclick="setCategoryTrendPeriod(3)">3M</button>
    <button onclick="setCategoryTrendPeriod(6)">6M</button>
    <canvas id="categoryTrendChart"></canvas>
  </div>
  ```

---

### Item 10 — Goal target date progress bar with projected completion

**Goal:** Each saving goal card shows a progress bar and a projected completion date.

**Files:** `goals-trips.js`

**Functions:**
- **NEW** `calcGoalProjectedDate(goal)` — computes average contribution per day/month from `goal.contributions`; returns projected ISO date or `null`.
- `renderSavingGoalsDedicated()` — add progress bar `<div>` with `width: X%` and projected date label below each goal.

**UI changes:**
- Below each goal's current/target amounts:
  ```html
  <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:X%"></div></div>
  <p class="goal-projected">Projected: <strong>MMM YYYY</strong></p>
  ```

**Styles:**
```css
/* === Goal progress === */
.goal-progress-bar { height:6px; background:rgba(255,255,255,0.1); border-radius:3px; margin:0.5rem 0; }
.goal-progress-fill { height:100%; background:#6366f1; border-radius:3px; transition:width 0.4s; }
.goal-projected { font-size:0.75rem; color:var(--text-muted); }
html[data-theme="light"] .goal-progress-bar { background:rgba(0,0,0,0.1); }
```

---

### Item 11 — Trip daily budget breakdown

**Goal:** In the trip detail view, show a per-day spend breakdown table alongside the daily budget.

**Files:** `goals-trips.js`

**Functions:**
- **NEW** `renderTripDailyBreakdown(trip)` — groups trip expenses by day; computes daily budget = `trip.budget / tripDays`; renders a table or list with per-day actual vs budget, colour-coded.
- `renderTripDetailStats()` — call `renderTripDailyBreakdown(trip)`.

**UI changes:**
- In trip detail panel, below existing stats:
  ```html
  <div id="tripDailyBreakdown"></div>
  ```

---

## Phase 3 — Power Features

### Item 12 — Split transactions across multiple categories

**Goal:** On the add/edit expense form, a "Split" mode lets the user divide one total across multiple category+amount rows.

**Files:** `transactions.js`, `index.html`, `styles.css`, `core.js`, `backup.js`

**State:** A split expense is stored as multiple individual transactions linked by a shared `splitGroupId`.
```js
// Each split part stored as a normal transaction with:
{ ..., splitGroupId: "uuid", splitLabel: "Grocery – Food" }
```
Add `splitGroupId` and `splitLabel` as optional fields to the transaction shape in `ARCHITECTURE.md` comments, and preserve them in backup export/import normalization.

**Functions:**
- **NEW** `toggleSplitMode()` — shows/hides the split rows section on the form; hides the single amount input.
- **NEW** `addSplitRow()` — appends a split-row `<div>` with category select + amount input.
- **NEW** `removeSplitRow(rowId)` — removes a split row.
- **NEW** `validateSplitRows()` — ensures split amounts sum to total; returns boolean.
- `handleExpenseSubmit(e)` — if split mode active: generate a `splitGroupId`, create one transaction per split row, save all, render.
- `renderHistoryList()` — group transactions with the same `splitGroupId` under a collapsible row with a "Split" badge; show sub-rows indented.
- `deleteTransaction(id)` — if `tx.splitGroupId` exists, `customConfirm` asks: "Delete this split part only or all parts?"

**UI changes (index.html):**
- Below the amount input in the expense form:
  ```html
  <button type="button" onclick="toggleSplitMode()">Split across categories</button>
  <div id="splitRowsContainer" class="hidden"></div>
  <div id="splitTotal" class="hidden">Total: ₹0 / ₹0</div>
  ```

**Styles:**
```css
/* === Split transactions === */
.split-badge { font-size:0.65rem; background:#6366f1; color:#fff; border-radius:4px; padding:1px 5px; }
.split-child-row { margin-left:1.5rem; border-left:2px solid #6366f1; padding-left:0.5rem; }
```

---

### Item 13 — Tag / label system beyond category

**Goal:** Any transaction can have one or more free-text tags. Ledger can filter by tag.

**Files:** `transactions.js`, `core.js`, `index.html`, `styles.css`, `backup.js`, `sync.js`

**State:**
```js
// On each transaction (optional):
{ ..., tags: ["weekend", "family"] }

// Global tag list for autocomplete:
state.knownTags = []   // add to default state in core.js
```

**Functions:**
- **NEW** `renderTagInput(containerId, initialTags)` — renders a tag chip input (type + Enter to add, click × to remove); used in add/edit form and search filters.
- **NEW** `getKnownTags()` — returns deduped list from all `tx.tags` + `state.knownTags`.
- **NEW** `renderTagSuggestions(partial)` — shows autocomplete dropdown under the tag input.
- `handleExpenseSubmit(e)` — collect tags from tag input; save to `tx.tags`; add new tags to `state.knownTags`.
- `loadExpenseToFormForEdit(txId)` — populate tag input from `tx.tags`.
- `filterHistory()` — add tag filter: if `activeTagFilter` is set, only show rows where `tx.tags` includes it.
- `renderHistoryList()` — render tag chips on each row if `tx.tags.length > 0`.

**UI changes (index.html):**
- In expense form, below Note field:
  ```html
  <div id="tagInputContainer"></div>
  ```
- In ledger filter bar:
  ```html
  <input id="tagFilterInput" placeholder="Filter by tag" oninput="applyTagFilter()">
  ```

**Styles:**
```css
/* === Tags === */
.tag-chip {
  display:inline-flex; align-items:center; gap:4px;
  padding:2px 8px; border-radius:9999px;
  background:rgba(99,102,241,0.2); font-size:0.7rem;
}
.tag-chip .tag-remove { cursor:pointer; opacity:0.6; }
.tag-suggestions { position:absolute; background:var(--surface); border:1px solid var(--border); border-radius:8px; z-index:50; }
```

---

### Item 14 — EMI prepayment / foreclosure calculator

**Goal:** In the EMI detail view, a "Prepay / Foreclose" button opens a modal that calculates the outstanding principal as of today, applies an optional foreclosure charge %, and lets the user record the settlement as a transaction.

**Files:** `recurring.js`, `index.html`, `styles.css`, `backup.js`, `sync.js`

**Functions:**
- **NEW** `calcEMIOutstandingPrincipal(emi, asOfDate)` — amortization walk from EMI start date to `asOfDate`; returns `{ outstandingPrincipal, interestPaid, principalPaid, monthsCompleted }`.
- **NEW** `openEMIPrepayModal(emiId)` — opens modal; calls `calcEMIOutstandingPrincipal`; displays outstanding principal, foreclosure charge input, and computed total payoff amount.
- **NEW** `closeEMIPrepayModal()` — closes modal.
- **NEW** `confirmEMIForeclosure(emiId)` — reads foreclosure charge %; computes final payoff; calls `customConfirm`; on confirm: creates a one-off transaction for the payoff amount, marks `emi.foreclosed = true`, sets `emi.foreclosedDate`, removes future installments via `removeFutureEMITransactions(emiId)`, saves.
- `renderEMIsList()` — show "Foreclose" button on each active EMI card; show "Foreclosed" badge on foreclosed EMIs.
- `processEMIs()` — skip EMIs where `emi.foreclosed === true`.

**State additions on EMI object:**
```js
{ ..., foreclosed: false, foreclosedDate: null, foreclosureCharge: 0 }
```

**UI (modal injected at runtime):**
```html
<div id="emiPrepayModal">
  <h3>Prepay / Foreclose EMI</h3>
  <p>Outstanding Principal: <strong id="emiOutstanding"></strong></p>
  <label>Foreclosure Charge %<input type="number" id="foreclosureChargePct" value="0" step="0.1"></label>
  <p>Total Payoff: <strong id="emiPayoff"></strong></p>
  <button onclick="confirmEMIForeclosure(activeEmiId)">Confirm & Record</button>
  <button onclick="closeEMIPrepayModal()">Cancel</button>
</div>
```

---

### Item 15 — Offline-first conflict queue

**Goal:** When the user edits while offline, queue mutations. On reconnection, flush the queue before the next `pushToDrive()`.

**Files:** `sync.js`, `core.js`

**State (persisted to localStorage separately):**
```js
// localStorage key: trex_offline_queue
// Shape for the chosen full-snapshot strategy:
[{ id, type: 'fullSnapshot', payload: state, timestamp }]
```

**Functions:**
- **NEW** `enqueueOfflineMutation(type, payload)` - stores a full-state snapshot in localStorage; called from `saveStateToLocalStorage()` when `!navigator.onLine && state.syncEnabled`. Keep only the latest snapshot to avoid queue bloat.
- **NEW** `flushOfflineQueue()` - reads the latest queued full snapshot, pushes it, clears the queue, and calls `pushToDrive()`.
- **NEW** `initOfflineListener()` — binds `window.addEventListener('online', flushOfflineQueue)`.
- `saveStateToLocalStorage()` — if `!navigator.onLine && state.syncEnabled`, call `enqueueOfflineMutation('fullSnapshot', state)` instead of relying on debounced push.
- Boot sequence in `core.js` `window.onload` — call `initOfflineListener()`; call `flushOfflineQueue()` if `navigator.onLine` and queue is non-empty.

**Note:** Full-snapshot queue strategy (simpler than per-operation): keep only the newest full state. This avoids complex operation replay and avoids growing localStorage while offline.

---

## Phase 4 — Low Priority

### Item 16 — High contrast theme

**Goal:** A third theme option (high contrast) togglable in Settings → Appearance.

**Files:** `styles.css`, `settings.js`, `core.js`, `index.html`

**State:** `state.theme: "dark" | "light" | "high-contrast"`

**Functions:**
- `applyTheme(theme)` — add case `"high-contrast"`: sets `data-theme="high-contrast"` on `<html>`.
- `toggleThemeSetting()` — extend to 3-state cycle or use a `<select>`.
- `syncSettingsFormFields()` — sync the theme selector to `state.theme`.

**UI changes:** Replace theme toggle checkbox with a 3-option selector in Settings.

**Styles:**
```css
/* === High Contrast Theme === */
html[data-theme="high-contrast"] {
  --bg: #000;
  --surface: #111;
  --text: #fff;
  --text-muted: #ccc;
  --border: #fff;
  --indigo: #a5b4fc;
}
html[data-theme="high-contrast"] .tx-row,
html[data-theme="high-contrast"] .dash-card {
  border: 1px solid #fff;
}
```

---

## Omitted

| Item | Reason |
|---|---|
| Android/iOS Widget | PWA cannot natively deliver home-screen widgets. Requires Capacitor migration. Defer. |
| Mid-cycle budget edits with prorated recalculation | Low value, high complexity, rarely requested. Omit. |

---

## Appendix — State Shape Additions Summary

| Field | Location | Type | Default |
|---|---|---|---|
| `transactionTemplates` | `state` (core.js) | `Array` | `[]` |
| `knownTags` | `state` (core.js) | `Array<string>` | `[]` |
| `tx.tags` | each transaction | `Array<string>` | `[]` |
| `tx.splitGroupId` | each transaction | `string \| null` | `null` |
| `tx.splitLabel` | each transaction | `string \| null` | `null` |
| `emi.foreclosed` | each EMI | `boolean` | `false` |
| `emi.foreclosedDate` | each EMI | `string \| null` | `null` |
| `emi.foreclosureCharge` | each EMI | `number` | `0` |

All new `state` top-level fields must be added to:
1. The default state initializer in `core.js`
2. `normalizeImportedState()` in `backup.js` (with safe default fallback)
3. `normalizeSyncState()` in `sync.js` (with safe default fallback)

All new transaction/EMI optional fields must also be preserved by backup export/import normalization; otherwise JSON/CSV restore will silently drop them.

---

## Appendix — Implementation Order Checklist

```
Phase 1
[x] 1. Swipe-to-delete
[x] 2. Bulk delete / select mode
[x] 3. Filter by amount range
[x] 4. Running balance
[x] 5. Transaction templates / presets
[x] 6. Inline edit (amount + note)

Phase 2
[-] 7.  Payment split chart (dashboard) - skipped
[x] 8.  Weekly/monthly comparison (dashboard)
[x] 9. Category spend trend (reports)
[x] 10. Goal progress bar + projected date
[x] 11. Trip daily budget breakdown

Phase 3
[x] 12. Split transactions
[x] 13. Tag / label system
[x] 14. EMI foreclosure calculator
[ ] 15. Offline conflict queue

Phase 4
[ ] 16. High contrast theme
```
