# TReX - Function Index

Searchable reference of app functions. Format: `functionName` — what it does.

To find where to add/edit something, scan the relevant section header then go to that file.

---

## sounds.js - Sound Engine

| Function / Constant | Description |
|---|---|
| `S` | Global sound id map used by feature modules, e.g. `S.SAVE`, `S.DELETE`, `S.UNLOCK_PIN`, `S.BUDGET_ALERT` |
| `getAudioCtx()` | Lazily creates/resumes a Web Audio `AudioContext` on user-triggered sound playback |
| `tone(hz, start, dur, vol, type?)` | Plays a short oscillator tone with envelope shaping |
| `noise(start, dur, vol)` | Plays a short decaying noise burst for dino/delete/reset effects |
| `chirp(vol, dino?)` | Shared compact success chirp used by both sound banks |
| `playSound(id)` | Public API; exits when App Sounds are off, applies master volume, and selects normal vs dino bank |

---

## core.js — App Core

| Function | Description |
|---|---|
| `_ensurePickerDOM()` | Lazily injects the `#customPickerOverlay` bottom-sheet DOM into `<body>` on first use; idempotent |
| `openCustomPicker(selectEl, titleOverride?)` | Opens the central custom bottom-sheet picker for any `<select class="app-dropdown">`; reads live options, builds styled rows, sets `select.value` and dispatches a real `change` event on selection so all existing `onchange` handlers fire automatically |
| `closeCustomPicker()` | Slides the custom picker sheet away and clears the active select reference |
| `lockPickerPageScroll()` | Freezes the page behind the custom picker at the current scroll position so mobile sheet scrolling does not move the background page |
| `unlockPickerPageScroll()` | Restores page scroll after the custom picker closes |
| `openLedgerSortPicker()` | Thin wrapper — calls `openCustomPicker` on `#ledgerSortSelect` with title "Sort by"; wired to the ledger sort button |
| `forceDropdownDarkTheme(sel)` | Sets `color-scheme: dark` on a `<select>` element |
| `wrapAllSelects(root?)` | Wraps all `.app-dropdown` selects in a `.select-wrap` div; sets `pointer-events:none` on each select; injects a `.select-catcher` sibling div (absolute, fills wrapper) that intercepts all taps and calls `openCustomPicker()`; `data-picker-attached` guard makes it idempotent; safe to call multiple times after dynamic option injection |
| `generateDynamicIcons()` | **Deprecated — no longer used.** Static app icon is now served from `assets/favicon.png`, with the PWA manifest moved to external `manifest.json`. Previously drew the logo to canvas and set the favicon + Apple touch icon |
| `initLucideIcons(root?)` | Calls `lucide.createIcons()` on the document or a scoped root element |
| `cleanArchivedPayments()` | Removes archived payments that have zero linked transactions |
| `saveStateToLocalStorage()` | Serializes `state` to `localStorage` key `androidWalletState_v4`; sets `state.updatedAt`; queues a latest snapshot with `enqueueOfflineMutation()` when sync is enabled but offline; otherwise triggers debounced `pushToDrive()` |
| `showNotification(message)` | Shows the bottom toast banner for 2.8 seconds |
| `customConfirm(message, title?, okLabel?)` | Promise-based confirm dialog replacing `window.confirm`. Returns `true`/`false` |
| `normalizeTheme(theme)` | Returns a valid theme id: `dark`, `light`, or `high-contrast`; falls back to `dark` |
| `applyTheme(theme, fossilMode?)` | Sets `data-theme` on `<html>` for light, high contrast, or fossil mode; dark removes the attribute |
| `setThemeSetting(theme)` | Applies and persists the selected theme from Settings |
| `toggleThemeSetting()` | Backward-compatible theme toggle helper; retained for old callers |
| `openDrawer()` | Opens the hamburger side drawer and refreshes the drawer sync status pill |
| `closeDrawer()` | Closes the side drawer/backdrop and resets any open drawer sub-panel |
| `dp(key)` | Safely reads a value from `state.dinoPrefs` |
| `t(neutral, dino)` | Returns Dino Mode copy when `dinoPrefs.dinoMode` is enabled, otherwise neutral copy |
| `resetAppScrollToTop(viewName)` | Resets every real app scroll host (`window`, document/body, `<main>`, `#screenContainer`, and the active panel) when switching screens |
| `switchScreen(viewName)` | Main router — hides all view panels, shows target, updates nav tabs, calls init render, resets scroll on both `screenContainer` and the active view panel |
| `registerTrexServiceWorker()` | Registers `sw.js` on secure origins/localhost for PWA notification handling |
| `checkAndShowOnboardingModal()` | Called from `window.onload`; delegates to `sync.js` to show the Drive onboarding prompt if sync is disabled and not yet seen this session |
| `updateHeaderSyncIcon()` | *(defined in sync.js, called from core.js boot)* Updates the `#headerSyncBtn` icon and click binding in the app header based on `state.syncStatus` |

---

## auth.js — PIN, Biometrics & App Lock

| Function | Description |
|---|---|
| `closePinSuccessModal()` | Hides the PIN change success modal |
| `showPinChangeSuccess()` | Shows the PIN change success modal with animation |
| `isAppLocked()` | Returns true if `pinEnabled` and lock screen is visible |
| `updateAppLockButton()` | Syncs the header lock icon button appearance to current lock state |
| `biometricBufferToBase64Url(buffer)` | Encodes WebAuthn ArrayBuffer credential ids for localStorage |
| `biometricBase64UrlToBuffer(value)` | Decodes stored credential ids back to ArrayBuffer |
| `createBiometricChallenge()` | Creates a random WebAuthn challenge |
| `createBiometricUserId()` | Creates a random local WebAuthn user id |
| `isBiometricApiAvailable()` | Checks secure-context WebAuthn API availability |
| `isBiometricUnlockSupported()` | Checks platform authenticator availability |
| `syncBiometricSettingsUI()` | Syncs biometric Settings toggle/status and lock button state |
| `syncBiometricLockUI()` | Enables/disables the lock-screen biometric button |
| `openLockedExpenseSheet()` | Opens the slide-up locked expense sheet; populates selects, pre-fills today's date, resets amount/note, shows active trip badge, focuses amount field |
| `closeLockedExpenseSheet()` | Hides the locked expense sheet |
| `closeLockedExpenseSheetOutside(event)` | Closes the sheet when the backdrop (not the panel) is tapped |
| `populateLockedQuickExpenseForm()` | Populates category and payment selects in the locked expense sheet from existing state; no add-new controls |
| `applyLockedCategoryDefaultPayment()` | Applies category default payment inside the locked expense sheet |
| `submitLockedQuickExpense(event)` | Saves expense from locked sheet; routes to active trip expenses if a trip is active, otherwise saves as a normal ledger transaction with `createdAt` full ISO timestamp; both paths trigger sync via `saveStateToLocalStorage()` |
| `lockApp()` | Shows the lock screen overlay, clears the PIN input buffer, and closes the locked expense sheet if open |
| `unlockApp(silent?)` | Hides the lock screen after successful PIN entry and closes the locked expense sheet; skips PIN unlock sound when `silent` is true |
| `clearBiometricState()` | Clears local WebAuthn credential metadata |
| `togglePinSetting()` | Enables/disables PIN lock from the settings checkbox |
| `registerBiometricCredential()` | Registers a platform WebAuthn credential for this device |
| `toggleBiometricSetting()` | Enables/disables biometric unlock from Settings |
| `pressPin(char)` | Handles a numeric keypad press; auto-submits on 4 digits |
| `clearPin(silent?)` | Clears the last entered PIN digit; triggered by the small `x` inline beside the PIN dots; skips back sound when `silent` is true |
| `simulateBiometrics()` | Runs WebAuthn biometric/passkey unlock; PIN remains fallback |
| `updatePinVisualDots()` | Updates the 4 dot indicators based on current `pinAttemptBuffer` length |
| `changePin()` | Validates old PIN, sets new PIN from settings form, saves state |

---

## dashboard.js — Dashboard & Budget Widgets

| Function | Description |
|---|---|
| `calculateActiveCycleRange()` | Returns `{ startDate, endDate }` for the current budget cycle |
| `calculateCycleMetrics()` | Computes spent, remaining, daily rate, days left for the active cycle |
| `formatDateReadable(dateObj, opts?)` | Formats a Date as "Mon DD" or "Mon DD, YYYY" with optional weekday |
| `formatDateTime(dateObj)` | Formats a Date as "Today", "Yesterday", or "Mon DD" for activity feed |
| `updateAppDashboardView()` | Master dashboard refresh — calls all widget renderers; "Tap to set your budget" link opens the drawer budget panel via `openDrawer(); openDrawerSection('budget')` |
| `renderForecastCard(metrics)` | Renders the projected end-of-cycle forecast card |
| `renderSpendHeatmap()` | Renders the cycle-aware heatmap. Calendar: rolling current month. Salary: active payday window only — rows with no in-cycle days are pruned; out-of-cycle days in mixed rows get crosshatch tint and no interaction. Spend map keyed by full ISO date string. Label shows cycle range or month/year. |
| `getQuickLogs()` | Returns quick log config array from state or default seeds |
| `renderQuickLogButtons()` | Renders the 1-tap quick log button grid on the dashboard |
| `openQuickLogEditor()` | Opens the quick log customization modal; category and payment dropdowns sorted A→Z |
| `renderQuickLogEditorRow(q, i)` | Renders a single editable row in the quick log editor |
| `addNewQuickLogSlot()` | Appends a new empty quick log slot in the editor |
| `removeQuickLogSlot(id)` | Removes a quick log slot by id in the editor |
| `saveAndCloseQuickLogEditor()` | Validates and saves quick log config to state, closes modal |
| `closeQuickLogEditor()` | Closes the quick log editor modal without saving |
| `saveBudgetAlertSetting()` | Saves budget alert threshold from settings form |
| `checkBudgetAlerts(metrics)` | Triggers a browser notification if spending exceeds alert threshold |
| `toggleDailyReminderSetting()` | Enables/disables daily reminder, requests notification permission |
| `saveDailyReminderTime()` | Saves reminder time from settings form |
| `getTodayLocalISO()` | Returns today's local ISO date string |
| `getReminderFireDate(reference?)` | Returns the next daily reminder fire time |
| `getDailyReminderBody()` | Builds the daily reminder notification body |
| `showTrexBrowserNotification(title, body)` | Sends a service-worker notification when possible, otherwise falls back to `new Notification` |
| `markDailyReminderShown()` | Records today's reminder as shown |
| `scheduleDailyReminder()` | Schedules the next in-browser daily reminder using `setTimeout` while the tab is active; does not fire when the screen is off or the browser is backgrounded (PWA limitation — requires Capacitor for native delivery) |
| `checkMissedDailyReminder()` | Sends a missed reminder when the app opens after the configured time |
| `sendTestReminderNotification()` | Sends a test browser notification from Settings |
| `requestNotificationPermission(callback)` | Requests browser notification permission, calls callback on grant |
| `syncNotificationSettings()` | Syncs all notification UI toggles from state on load |
| `triggerQuickLog(amount, categoryId, note, paymentId)` | Instantly adds a transaction from a quick log tap |
| `renderDashboardCategoryHorizontalBars(startDate, endDate)` | Renders horizontal bar chart of spending by category |
| `renderDashboardCategoryStackedBar(startDate, endDate)` | Renders stacked bar of category spend ratios |
| `renderDashboardPaymentStackedBar(startDate, endDate)` | Renders stacked bar of payment method ratios |
| `renderDashboardPaymentHorizontalBars(startDate, endDate)` | Renders horizontal bars of spending per payment method |
| `setTrendPeriod(period)` | Sets `activeTrendPeriod` and re-renders the trend chart |
| `renderWeeklyTrendChartLine()` | Renders the weekly/monthly line trend chart using Chart.js |
| `renderRecentActivityList()` | Renders the recent transactions feed at the bottom of the dashboard; sorted by `createdAt` desc (falls back to `date` for transactions without `createdAt`), shows top 4 |
| `setDashCompareMode(mode)` | Sets dashboard comparison mode to `week` or `month` and re-renders the comparison chart |
| `renderDashboardSpendComparison()` | Renders current-vs-previous week/month spend comparison as a compact Chart.js grouped bar chart |

---

## transactions.js — Expense Form & Ledger

| Function | Description |
|---|---|
| `getKnownTags()` | Returns deduped known tags from `state.knownTags` and all transaction tags |
| `rememberTags(tags)` | Merges newly used tags into `state.knownTags` |
| `renderTagSuggestions(partial?)` | Renders matching tag suggestion buttons under the expense tag input |
| `addExpenseTag(raw?)` | Adds a normalized tag to the expense form tag set |
| `removeExpenseTag(tag)` | Removes a tag from the current expense form tag set |
| `renderTagInput(containerId, initialTags?)` | Renders the expense tag chip input and autocomplete host |
| `getExpenseTags()` | Returns the current normalized expense-form tags |
| `applyTagFilter()` | Reads the ledger tag filter input and re-runs `filterHistory()` |
| `validateSplitRows()` | Validates split rows: at least two rows, positive row amounts, and no duplicate categories; the main amount is derived from row totals |
| `addSplitRow(catId?, amount?)` | Adds one category/amount row to the split section |
| `removeSplitRow(rowId)` | Removes a split row and recomputes split totals |
| `toggleSplitMode(force?)` | Enables/disables split mode, replacing the category picker with split rows and making the main amount read-only while split is active |
| `setupExpenseFormForAdd()` | Resets the expense form for a new transaction |
| `populateExpenseFormDropdowns(currentPaymentId?)` | Populates category and payment `<select>` options, both sorted A→Z by name; payments filtered to non-archived |
| `populateEMIFormDropdowns()` | Populates EMI form category and payment dropdowns |
| `applyCategoryDefaultPayment()` | Auto-selects the default payment when a category is chosen |
| `loadExpenseToFormForEdit(txId, returnCardId?)` | Populates the expense form for editing an existing transaction |
| `handleExpenseSubmit(e)` | Form submit handler - validates, creates/updates normal or split transactions, saves tags, stamps `createdAt`, preserves `createdAt` when date is unchanged, and updates it when date changes |
| `populateInlineCategoryPaymentOptions()` | Populates dropdowns inside the inline add category/payment modals |
| `openInlineCategoryModal(mode?)` | Calls `closeDrawer()` then opens the quick-add category modal; works from expense form and drawer |
| `closeInlineCategoryModal()` | Closes the inline category modal |
| `saveInlineCategory()` | Creates a new category from the inline modal, updates dropdowns |
| `openInlinePaymentModal(mode?)` | Calls `closeDrawer()` then opens the quick-add payment modal; works from expense form and drawer |
| `closeInlinePaymentModal()` | Closes the inline payment modal |
| `saveInlinePayment()` | Creates a new payment method from the inline modal, updates dropdowns |
| `renderHistoryList()` | Renders the full ledger/history list; resets `#ledgerSortSelect` to `date-desc` and sort label to "Dated ↓" on every open; seeds date pickers with current cycle; populates category/payment filters and preset bars |
| `initLedgerMonthSelector()` | Populates the ledger date range pickers with the current active cycle |
| `resetLedgerToCycle()` | Resets ledger date range and amount filters to the current active cycle, then re-runs filterHistory |
| `getLedgerDateRange()` | Returns `{ from, to }` ISO strings from the ledger date pickers |
| `openLedgerWithDate(dateISO)` | Switches to history view (resetting sort + cycle dates), then overrides both date pickers to a single day and calls filterHistory; used by the spend heatmap |
| `filterHistory()` | Applies search text + category/payment/date/amount/tag filters; reads `#ledgerSortSelect` value (`date-desc`, `date-asc`, `amt-desc`, `amt-asc`); groups split rows; computes cumulative balances from the final visible tile order by summing bottom-to-top; renders summary bar, chips, bulk bar, and search-clear button visibility |
| ~~`cycleLedgerSort()`~~ | **Removed** — replaced by `openLedgerSortPicker()` + the central custom picker system |
| `toggleLedgerFilterSheet()` | Toggles the collapsed filter sheet (date range + category + payment dropdowns) |
| `clearLedgerSearch()` | Clears the search input and re-runs filterHistory |
| `applyAmountRangeFilter()` | Reads ledger min/max amount inputs, normalizes empty values to `null`, and re-runs filterHistory |
| `closeOpenSwipeRow(exceptEl?)` | Closes any currently revealed swipe-delete ledger row |
| `syncLedgerBulkBar()` | Syncs select-mode bar visibility, selected count, selected button state, and delete disabled state |
| `toggleLedgerSelectMode(force?)` | Toggles or forces ledger select mode; clears selected IDs when leaving select mode |
| `toggleLedgerRowSelect(txId)` | Selects/deselects a normal ledger row for bulk delete; ignores trip-synced rows |
| `bulkDeleteSelected()` | Confirms and deletes all selected non-trip ledger transactions, then refreshes dependent views |
| `attachSwipeToDelete(rowEl, txId)` | Adds mobile touch handlers that reveal the row's delete action after a left swipe |
| `_renderLedgerChips(catId, payId, from, to)` | Renders dismissible active-filter chips, including amount range chips; shows/hides the filter dot indicator on the filter button |
| `deleteTransaction(id, splitDeleteMode?)` | Async - confirms then removes a transaction; parent split delete uses `"all"` to remove the whole group, expanded split child rows use `"part"` to remove one part; recurring-created transactions are plain ledger rows |

---

## ledger-templates.js - Transaction Presets (10 functions)

| Function | Description |
|---|---|
| `ensureTransactionTemplates()` | Ensures `state.transactionTemplates` exists and returns it |
| `getTemplateMeta(template)` | Resolves display category/payment metadata for a preset |
| `renderTransactionTemplatesBars()` | Renders preset chips in Add Expense and Ledger, hiding bars when there are no presets |
| `saveCurrentAsTemplate()` | Saves or updates a preset from the current Add Expense amount/category/payment/note |
| `applyTemplateToExpenseForm(templateId)` | Opens Add Expense and fills the form from a preset |
| `logTemplateExpense(templateId)` | Confirms and logs a new transaction for today from a preset |
| `openTemplatesManager()` | Opens the preset manager modal |
| `renderTemplatesManagerList()` | Renders preset manager rows with apply/delete actions |
| `deleteTemplate(templateId)` | Confirms and deletes a preset |
| `closeTemplatesManager()` | Closes the preset manager modal |

---

## reports.js — Analytics & Reports

| Function | Description |
|---|---|
| `destroyReportChart(instance)` | Destroys a Chart.js instance and returns null |
| `resizeReportCharts()` | Triggers resize on all active report chart instances |
| `hexToRgba(hex, alpha)` | Converts a hex color string to `rgba(r,g,b,alpha)` |
| `premiumChartTooltip()` | Returns a shared Chart.js tooltip config object for consistent styling |
| `renderPremiumDoughnut(canvasId, labels, values, colors)` | Renders a styled doughnut chart on the given canvas |
| `renderPremiumBarChart(labels, values, colors)` | Renders a styled horizontal bar chart for reports |
| `renderReportGauge(spent, budget)` | Renders the budget utilization gauge arc chart |
| `renderPremiumReportCharts(catLabels, catValues, catColors, payLabels, payValues, payColors)` | Orchestrates rendering of all report charts |
| `renderReportTopCategories(labels, values, colors)` | Renders the top-category ranked list below the doughnut |
| `toggleReportMode(mode)` | Switches between "charts", "list", "mom" report tabs |
| `renderHistoricalMonthReport()` | Main report renderer — computes data and calls chart/list renderers |
| `renderAccordionReportList()` | Renders the itemized accordion transaction list |
| `toggleAccordionItem(listId, iconId)` | Toggles open/close state of an accordion section |
| `getMomAvailableCycles()` | Returns array of available cycle keys for MoM comparison selectors |
| `populateMomCycleSelectors()` | Populates the two MoM cycle selector dropdowns |
| `getTxForCycle(cycleKey)` | Returns transactions for a specific cycle key string |
| `sumByCategory(txs)` | Aggregates transaction array into `{ categoryId: totalAmount }` map |
| `cycleLabelFromKey(key)` | Converts a cycle key string to a human-readable label |
| `renderMomReport()` | Renders the full month-over-month comparison section |
| `setCategoryTrendPeriod(n)` | Sets the reports Trends period to 3 or 6 months |
| `renderCategoryTrendChart()` | Renders the category spend trend multi-line chart for the selected period |
| `generatePDFReport()` | Generates and downloads a PDF summary report for the selected statement cycle using html2canvas + jsPDF |

---

## settings.js — Settings, Categories & Payments

| Function | Description |
|---|---|
| `buildCurrencySelectorOptions()` | Populates the currency `<select>` from the CURRENCIES constant |
| `syncSettingsFormFields()` | Syncs all settings form inputs from current state on screen open, including the three-option theme selector |
| `toggleCycleDateSelector()` | Shows/hides the cycle day input based on cycle type selection |
| `updateCurrencySetting()` | Reads currency selector and saves to state |
| `toggleCreditCardsSetting()` | Enables/disables credit card mode, backfills billing days |
| `backfillMissingCreditCardBillingDays()` | Sets default `billingDay: 15` on CC payments missing one |
| `isCreditCardBillingDayRequired(paymentType)` | Returns true if CC mode is on and type is Credit Card |
| `syncPaymentBillingDayRequirement(scopeKey)` | Shows/hides billing day field based on payment type in forms |
| `formatBillingDayLabel(day)` | Converts day number to ordinal string e.g. "15th" |
| `getPaymentSummaryLabel(pay)` | Returns display string like "Credit Card • Billing day: 15th" |
| `getMonthKeyFromDate(dateObj)` | Returns "YYYY-MM" string from a Date |
| `getCreditCardAvailableCycles()` | Returns sorted array of `{ key, label }` for all months with transactions |
| `addDaysToISO(dateISO, days)` | Adds N days to an ISO date string, returns new ISO string |
| `getPreviousBillingBoundaryISO(pay, referenceDate?)` | Returns the ISO date of the billing boundary one day before reference |
| `getCreditCardDueRange(pay, cycleKey?, referenceDate?)` | Returns `{ startISO, endISO, label }` for a CC billing cycle |
| `getCreditCardRecentRange(pay, referenceDate?)` | Returns `{ startISO, endISO, label }` for the current (unbilled) cycle |
| `populateCreditCardCycleSelectors()` | Populates the cycle dropdown selectors in the cards view |
| `setCreditCardViewMode(mode, cycleKey?)` | Sets active CC view mode and re-renders the cards view |
| `isCreditCardPayment(pay)` | Returns true if payment type is "Credit Card" or "CC" |
| `getPaymentBillingDay(pay)` | Returns billing day number from payment, defaults to 15 |
| `toLocalISODate(dateObj)` | Converts a Date to local "YYYY-MM-DD" string (avoids UTC offset issues) |
| `getBillingBoundaryISO(pay, referenceDate?)` | Returns the ISO date of the last billing day for a CC payment |
| `getCreditCardBucketSnapshot(pay, dueCycleKey?, referenceDate?)` | Returns `{ dueTxs, recentTxs, dueTotal, recentTotal, dueRange, recentRange }` for one card |
| `getCreditCardPortfolioSnapshot(dueCycleKey?, referenceDate?)` | Aggregates bucket snapshots across all CC payments |
| `updateExpensePaymentLockUI()` | Disables/enables the payment dropdown when locked to a CC |
| `clearExpensePaymentLock()` | Clears payment lock state and updates UI |
| `applyExpensePaymentLock(paymentId)` | Locks the expense form payment to a specific payment id |
| `saveBudgetAndCycleSettings()` | Reads budget/cycle form fields, validates, saves to state, shows a `customConfirm` dialog; on OK closes the drawer and navigates to the dashboard |
| `renderSettingsLists()` | Renders categories list, payments list, recurring list, EMI list |
| `openDrawerSection(sectionName)` | Opens a drawer sub-panel and renders Budget, Categories, Payments, Credit Cards, Recurring, EMI, or backup content |
| `closeDrawerSection()` | Closes the drawer content sub-panel and returns to the drawer nav list |
| `syncPersonalitySettings()` | Syncs Personality section controls from `state.dinoPrefs` |
| `syncDinoDependentControls()` | Disables/hides Dino Mode dependent controls from the master toggle while preserving saved values |
| `toggleDinoMode()` | Saves the Dino Mode master toggle; Dino Mode is off by default and labelled experimental in Settings |
| `toggleRoarSounds()` | Saves the Roar Sounds toggle and shows/hides the volume row |
| `saveSoundVolume()` | Persists the roar sound volume slider value |
| `toggleFossilMode()` | Saves Fossil Mode preference for the future visual phase |
| `toggleDinoFootprints()` | Saves footprint preference and refreshes the heatmap |
| `toggleExtinctionWarnings()` | Saves dramatic budget-warning copy preference |
| `openEditCategoryModal(catId)` | Calls `closeDrawer()` then populates and opens the edit category modal |
| `closeEditCategoryModal()` | Closes the edit category modal |
| `saveEditCategory()` | Saves edited category fields to state |
| `deleteCategory(catId)` | Async — confirms then removes a category (blocks if in use) |
| `openEditPaymentModal(payId)` | Calls `closeDrawer()` then populates and opens the edit payment modal |
| `closeEditPaymentModal()` | Closes the edit payment modal |
| `saveEditPayment()` | Saves edited payment fields to state |
| `deletePaymentMethod(payId)` | Async — confirms, cancels linked recurrings, archives or removes payment |

---

## credit-cards.js — Credit Card View & Analytics (10 functions)

| Function | Description |
|---|---|
| `refreshCreditCardViews()` | Re-renders credit card view if currently visible |
| `openCreditCardDetail(payId)` | Sets `activeCreditCardId` and re-renders to show detail panel |
| `closeCreditCardDetail()` | Clears `activeCreditCardId` and re-renders to show card list |
| `openExpenseFromCreditCard()` | Navigates to add expense form with payment locked to active card |
| `loadExpenseToFormForEditFromCreditCard(txId, payId)` | Loads an existing transaction for edit from within the card view |
| `renderCreditCardTransactionRows(container, txs, pay)` | Renders transaction rows into a card detail container |
| `renderCreditCardDetailView(pay, snapshot)` | Renders the full detail panel for a single credit card |
| `renderCreditCardsView()` | Master renderer for the cards screen — list or detail based on `activeCreditCardId` |
| `toggleCardAnalytics()` | Expands/collapses the card analytics chart panel |
| `renderCardAnalyticsChart()` | Renders the monthly spend bar chart for the active card |

---

## recurring.js — Recurring Expenses & EMIs

**Date Utilities**

| Function | Description |
|---|---|
| `getTodayISO()` | Returns today's date as "YYYY-MM-DD" |
| `parseISODate(str)` | Parses "YYYY-MM-DD" string to a local Date object |
| `formatISODate(d)` | Formats a Date to "YYYY-MM-DD" using local timezone |

**Recurring Expenses**

| Function | Description |
|---|---|
| `addDaysISO(dateStr, days)` | Adds days to a local ISO date string |
| `getMonthLastDay(year, monthIndex)` | Returns the last day number for a month |
| `isRecurringDateDue(rec, dateStr)` | Returns true when a recurring rule qualifies for a specific date; monthly rules clamp to month-end and `skippedDates` are excluded |
| `getRecurringDueDates(rec, upToDate?)` | Returns every due date from `lastPostedDate + 1` or `startDate` through the target date |
| `isRecurringDueToday(rec)` | Returns true when there is at least one due recurring date through today |
| `toggleRecurringPause(id)` | Pauses a recurring schedule; on resume, asks for a resume date and restarts catch-up from that date |
| `openRecurringModal(editId?)` | Calls `closeDrawer()` then opens the recurring expense create/edit modal; category and payment dropdowns sorted A→Z |
| `closeRecurringModal()` | Closes the recurring modal |
| `saveRecurring()` | Creates or updates a recurring expense rule in state |
| `deleteRecurring(id)` | Async - confirms and removes the recurring rule; past inserted transactions remain in the ledger |
| `renderRecurringExpenses()` | Renders the recurring schedules list in settings |
| `dedupeRecurringTransactions()` | Removes duplicate auto-generated recurring ledger rows that share the same schedule/date/amount/category/payment/note key |
| `processRecurringExpenses()` | Checks recurring rules, dedupes legacy repeated auto rows, inserts missed qualified due dates through today only when no matching row already exists, then updates `lastPostedDate` |
| `postRecurringEntry(rec, dateStr)` | Creates one ledger transaction for a recurring rule with `source="recurring"`, `recurringId`, and `sourceName`; stamps `createdAt` as end-of-day (23:59:59) on `dateStr` so catch-up batches posted in the same run sort correctly by date rather than all sharing the same wall-clock timestamp |

**EMI (Equated Monthly Installments)**

| Function | Description |
|---|---|
| `openEMIFromCreditCard()` | Opens the EMI modal pre-locked to the active credit card |
| `openEMIModal(emiId?)` | Calls `closeDrawer()` then opens the EMI create/edit modal |
| `closeEMIModal()` | Closes the EMI modal |
| `openEMIScheduleModal(emiId)` | Opens the read-only EMI amortization schedule modal |
| `closeEMIScheduleModal()` | Closes the EMI schedule modal |
| `calculateEMILivePreview()` | Updates the live EMI preview as principal/rate/tenure change |
| `calculateEMIDetails(principal, rateYear, tenure)` | Returns `{ monthlyEMI, totalAmount, totalInterest }` |
| `calcEMIOutstandingPrincipal(emi, asOfDate?)` | Walks the EMI amortization schedule through a date and returns outstanding principal, interest paid, principal paid, and months completed |
| `openEMIPrepayModal(emiId)` | Opens the EMI prepay/foreclosure modal with outstanding principal and payoff preview |
| `closeEMIPrepayModal()` | Closes the EMI prepay/foreclosure modal |
| `confirmEMIForeclosure(emiId)` | Records final EMI payoff as a transaction, marks the EMI foreclosed, stores charge metadata, and removes future EMI installments |
| `saveEMI()` | Creates or updates an EMI rule in state |
| `deleteEMI(id)` | Async — confirms, removes future EMI transactions, removes rule |
| `removeFutureEMITransactions(emiId)` | Removes all future-dated EMI transactions |
| `renderEMIsList()` | Renders the EMI list in settings |
| `processEMIs()` | Posts any missing EMI installment entries up to today, skipping foreclosed EMIs |
| `getEMIOccurrenceDates(emi, today)` | Returns all installment dates for an EMI up to today |
| `hasEMITxOnDate(emiId, dateStr)` | Returns true if an EMI transaction already exists for that date |
| `postEMIEntry(emi, dateStr, monthNumber)` | Creates and saves one EMI installment transaction (and processing fee on month 1); stamps `createdAt` with full ISO timestamp on both |

---

## goals-trips.js — Saving Goals & Trips

**Saving Goals**

| Function | Description |
|---|---|
| `calcGoalProjectedDate(goal)` | Projects a goal completion date from contribution history and remaining target |
| `renderSavingGoalsDedicated()` | Renders all saving goals in the goals tab |
| `toggleGoalAccordion(id)` | Expands/collapses a goal's contribution history |
| `editGoalContribution(cid)` | Opens inline edit form for a contribution |
| `cancelEditContribution(cid)` | Cancels the contribution edit, restores display |
| `saveGoalContribution(goalId, cid)` | Saves an edited contribution amount/note |
| `deleteGoalContribution(goalId, cid)` | Async — confirms and removes a contribution |
| `createNewSavingGoalDedicated()` | Creates a new saving goal from the form |
| `fundSavingGoalDedicated(id)` | Adds a new contribution to a goal |
| `removeSavingGoalDedicated(id)` | Async — confirms and removes a saving goal |

**Trips**

| Function | Description |
|---|---|
| `getActiveTrip()` | Returns the trip currently in progress (today within its date range) |
| `renderActiveTripBanner()` | Renders/hides the active trip banner on the dashboard |
| `openTripQuickAdd(tripId)` | Opens the quick-add expense overlay on the trip banner |
| `closeTripQuickAdd()` | Closes the trip quick-add overlay |
| `submitTripQuickAdd()` | Submits a quick expense to the active trip |
| `bannerSyncTrip(tripId)` | Syncs the trip to the ledger from the banner |
| `renderNewTripEmojiPicker()` | Renders the emoji grid picker in the new trip form |
| `pickTripEmoji(btn, emoji)` | Selects an emoji in the picker UI |
| `selectNewTripEmoji(e)` | Handles emoji selection from the grid |
| `updateNewTripEmojiPickerUI()` | Updates selected state in the emoji picker grid |
| `getSelectedNewTripEmoji()` | Returns the currently selected emoji in the new trip form |
| `switchGoalsTab(tab)` | Switches between "goals" and "trips" tabs |
| `getTripStatus(trip)` | Returns "upcoming" \| "active" \| "completed" for a trip |
| `getTripTotalSpent(trip)` | Returns total amount across all trip expenses |
| `getTripPreSpent(trip)` | Returns total of pre-trip expenses |
| `getTripOnSpent(trip)` | Returns total of on-trip expenses |
| `renderTripsList()` | Renders all trips in the trips tab |
| `createNewTrip()` | Creates a new trip from the form |
| `openTripEdit()` | Opens the trip edit form for the current trip detail |
| `saveEditedTrip()` | Saves changes to a trip's name/dates/budget/emoji |
| `openTripDetail(tripId)` | Switches to the trip detail view for a given trip |
| `closeTripDetail()` | Navigates back to the goals/trips screen |
| `renderTripDetailStats()` | Renders the stats header in the trip detail view |
| `getTripDaysCount(trip)` | Returns the number of days in a trip |
| `renderTripDailyBreakdown(trip)` | Renders per-day on-trip spend vs daily budget below trip detail stats |
| `renderTripExpenses()` | Renders the trip expenses list in the detail view |
| `switchTripTab(tab)` | Switches between "pre-trip" and "on-trip" expense tabs |
| `populateTripExpenseDropdowns()` | Populates category/payment dropdowns in the trip expense form |
| `determineTripExpenseType(trip, dateStr)` | Returns "pre" or "on" based on the date relative to trip dates |
| `setTripExpenseType(type)` | Sets the expense type toggle in the trip form |
| `addTripExpense()` | Creates a new trip expense entry |
| `deleteTripExpense(expenseId)` | Async — confirms and removes a trip expense |
| `openEditTripExpense(expenseId)` | Populates the inline edit form for a trip expense |
| `cancelEditTripExpense()` | Cancels inline trip expense editing |
| `syncTripToLedger()` | Creates/updates main ledger transactions for all synced trip expenses; stamps `createdAt` with full ISO timestamp on each rollup entry |
| `deleteTripConfirm()` | Async — confirms and removes the current trip and its synced transactions |

---

## backup.js — Data Backup & Restore (15 functions)

| Function | Description |
|---|---|
| `cloneStateSnapshot()` | Returns a deep clone of the current state via JSON parse/stringify |
| `buildBackupPayload()` | Wraps state snapshot with metadata for export |
| `normalizeImportedState(raw)` | Sanitizes and fills defaults on an imported state object, including transaction presets, split fields, tags, high contrast theme, and EMI foreclosure fields |
| `isValidBackupPayload(parsed)` | Returns true if the parsed object has the required backup structure |
| `applyFullStateRestore(importedRaw)` | Validates, normalizes, applies, and saves an imported state |
| `csvEscape(val)` | Escapes a value for CSV output (quotes if contains comma/newline) |
| `csvRow(fields)` | Converts an array of values to a CSV row string |
| `parseCSVLine(line)` | Parses a single CSV line, handles quoted fields |
| `parseBackupCSVSections(text)` | Splits a multi-section CSV backup into a `{ SECTION: lines[] }` map |
| `parseSectionTable(sectionLines)` | Converts section lines (header + rows) into an array of objects |
| `buildStateFromCSVSections(sections)` | Reconstructs a state draft from parsed CSV sections, including `[TRANSACTION_TEMPLATES]` |
| `downloadBackupFile(filename, content, mime)` | Creates a Blob and triggers a browser file download |
| `exportDataToJSON()` | Builds and downloads a full JSON backup file |
| `exportDataToCSV()` | Builds and downloads a full CSV backup file |
| `importBackupFile(e)` | File input handler — reads JSON or CSV and calls `applyFullStateRestore()` |

---

## sync.js — Google Drive Cloud Sync

**Auth & Token Management**

| Function | Description |
|---|---|
| `initGoogleAuth(forceInteractive?)` | Initialises the GIS `TokenClient` with Drive AppData plus `openid email profile` scopes; sets up the OAuth callback |
| `getValidToken(forceInteractive?)` | Returns a valid OAuth token from cache if not expired (1-min grace); otherwise requests one silently or interactively via GIS |

**Drive API Wrappers**

| Function | Description |
|---|---|
| `fetchWithRetry(url, options, retries?)` | `fetch` wrapper with exponential backoff `[2s, 5s, 15s]`; auto-refreshes token on 401 |
| `findSyncFileId(token)` | Queries Drive `appDataFolder` for `trex_sync_v4.json`; returns the file ID or `null` |
| `createSyncFile(token, content)` | Creates `trex_sync_v4.json` in `appDataFolder` with the given JSON string |
| `updateSyncFile(token, fileId, content)` | Patches the content of an existing Drive sync file |
| `downloadSyncFile(token, fileId)` | Downloads and JSON-parses the remote sync file |

**Sync Engine**

| Function | Description |
|---|---|
| `getOfflineQueue()` | Reads and parses localStorage key `trex_offline_queue`, clearing corrupted queue data safely |
| `hasOfflineQueue()` | Returns true when an offline full-snapshot queue item exists |
| `enqueueOfflineMutation(type, payload)` | Stores the latest full-state snapshot while sync is enabled but the browser is offline |
| `flushOfflineQueue()` | Pushes queued offline state before normal sync and clears the queue only after sync settles successfully |
| `initOfflineListener()` | Installs online/offline listeners; online flushes queued edits before normal Drive pull |
| `pushToDrive()` | Serializes `state` and uploads it to Drive; updates `state.lastSyncedAt` on success |
| `syncFromDrive()` | Silent background pull: reconciles categories, payments, transactions, transaction presets, known tags, goals, trips, recurring expenses, and EMIs by `id`; applies newer shared settings; pushes converged state back to Drive when needed |
| `buildMergedSyncState(localState, remoteState)` | Builds a converged state object from local + remote collections and shared settings; `monthlyBudget` uses non-zero-wins logic — the higher non-zero value is kept regardless of timestamp |
| `sameSyncArrays(a, b)` | Compares sync-relevant arrays and scalar settings to detect whether reconciliation changed either side |
| `applyRemoteState(remoteState, silent?)` | Normalizes and applies a remote state object; preserves `googleClientId`, `syncUserEmail`, `syncDriveFileId`; forces `syncEnabled=true`; re-renders UI without page reload |
| `_applyRemoteSilent(remoteState, isInitialLinkage, token, fileId)` | Legacy/internal helper for applying remote state after budget conflict decisions |
| `_showBudgetConflictModal(localBudget, remoteBudget, onResolved)` | Scoped two-button modal for budget-only discrepancy; calls `onResolved(keepRemote: boolean)` |
| `normalizeSyncState(remoteState)` | Normalizes Drive sync state while preserving the full live app shape, including split fields, tags, `creditCardsEnabled`, EMIs, alerts, reminders, high contrast theme, and sync metadata |

**Account & Metadata**

| Function | Description |
|---|---|
| `fetchGoogleUserEmail(token)` | Hits `/oauth2/v3/userinfo`; stores email in `state.syncUserEmail` and persists to localStorage |
| `renderSyncMetaBadge()` | Shows/hides the `#syncMetaBadge` panel; populates connected email and Drive file ID; resolves file ID live if not cached in `state.syncDriveFileId` |

**Status UI**

| Function | Description |
|---|---|
| `updateSyncStatus(status, message?)` | Updates the sync status indicator in the settings panel (`idle` / `syncing` / `error` / `offline`); calls `updateHeaderSyncIcon()` |
| `updateHeaderSyncIcon()` | Updates the always-visible `#headerSyncBtn`: sync off/error/offline → gray `cloud-off` + Settings; `idle` → indigo `cloud-check` + `triggerManualSync()`; `syncing` → spinning `refresh-cw` |
| `formatTimeAgo(isoString)` | Formats sync timestamps into compact relative text such as `just now`, `5m ago`, or `2h ago` |

**Conflict Resolution (legacy — retained, no longer called by syncFromDrive)**

| Function | Description |
|---|---|
| `showConflictModal(remoteState)` | Legacy full-screen conflict modal; no longer invoked by the sync engine; retained for potential manual use |
| `createConflictModalUI()` | Injects the conflict modal HTML into the DOM |

**Settings Controls**

| Function | Description |
|---|---|
| `connectGoogleSync()` | OAuth entry point: obtains token → fetches user email → checks for existing Drive file → silent upload if no file (no migration modal) → migration modal if file + local data exist; caches `syncDriveFileId`; calls `renderSyncMetaBadge()` |
| `disconnectGoogleSync()` | Confirms then disables sync, clears token, resets sync state fields |
| `triggerManualSync()` | Runs a full `syncFromDrive()` cycle on demand from the Settings panel |
| `saveCustomClientId()` | Applies or clears a custom OAuth Client ID from the settings form |
| `renderSyncControls()` | Renders Connect / Sync Now / Disconnect controls based on `state.syncEnabled`; calls `renderSyncMetaBadge()` and `renderResetDangerZone()` |

**Onboarding, Migration & Reset**

| Function | Description |
|---|---|
| `showOnboardingModal()` | Injects the bottom-sheet onboarding modal warning about local-only data risk |
| `checkAndShowOnboardingModal()` | Gate function called from `window.onload`; fires `showOnboardingModal()` after 1.2 s if sync is off and `sessionStorage` key is absent |
| `showMigrationModal()` | Promise-based modal shown in `connectGoogleSync()` only when a Drive file already exists and local data is present; resolves to `"merge"`, `"fresh"`, or `null` |
| `renderResetDangerZone()` | Renders the dedicated destructive reset section; disables cloud-only reset when Drive is disconnected and keeps full local reset visible |
| `showCloudResetMarkerModal()` | Blocks sync when cloud only contains a reset marker; offers Reset This Device Too, Make This Device Main, or Decide Later |
| `showResetBoundaryConflictModal()` | Blocks stale-device sync across reset epochs; offers Force Cloud, Force Local, Force Merge, or Keep Sync Paused |
| `buildFreshStateAfterReset()` | Builds a fresh empty post-reset cloud state when a device accepts Reset This Device Too |
| `resetAllData()` | Replaces `trex_sync_v4.json` with a reset marker when possible, clears local app data, clears onboarding session state, and reloads to a fresh default state |
| `resetSyncData()` | Replaces `trex_sync_v4.json` with a reset marker and resets local sync state; local app data is preserved |
