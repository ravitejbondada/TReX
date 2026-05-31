/**
 * transactions.js — Expense Form & Ledger
 * TReX � Devour Your Expenses
 *
 * Add/edit expense form setup, form submission, category/payment dropdowns,
 * inline category & payment modals, history list renderer, ledger date
 * range selector, filter/search, transaction delete.
 *
 * Dependencies: core.js must load before all other modules.
 * Global state: window.state (defined in core.js)
 */

function setupExpenseFormForAdd() {
    document.getElementById("expenseFormTitle").textContent = "Record Expense";
    document.getElementById("editExpenseId").value = "";
    document.getElementById("expenseAmount").value = "";
    const todayISO = getTodayISO();
    const dateEl = document.getElementById("expenseDate");
    dateEl.value = todayISO;
    dateEl.max = todayISO;
    document.getElementById("expenseNote").value = "";

    populateExpenseFormDropdowns();
    clearExpensePaymentLock();
    if (pendingExpensePaymentLockId) {
        applyExpensePaymentLock(pendingExpensePaymentLockId);
        pendingExpensePaymentLockId = "";
    }
    applyCategoryDefaultPayment();
}

function populateExpenseFormDropdowns(currentPaymentId) {
    const catSelect = document.getElementById("expenseCategory");
    catSelect.innerHTML = "";
    const sortedCategories = [...state.categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    sortedCategories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        catSelect.appendChild(opt);
    });

    const paySelect = document.getElementById("expensePayment");
    paySelect.innerHTML = "";
    const activePayments = state.payments.filter(p => !p.archived || p.id === currentPaymentId);
    const sortedPayments = [...activePayments].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    sortedPayments.forEach(pay => {
        const opt = document.createElement("option");
        opt.value = pay.id;
        opt.textContent = `${pay.name} (${pay.type})`;
        paySelect.appendChild(opt);
    });
}

function populateEMIFormDropdowns() {
    const catSelect = document.getElementById("emiCategory");
    if (!catSelect) return;
    catSelect.innerHTML = "";
    const sortedCategories = [...state.categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    sortedCategories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        catSelect.appendChild(opt);
    });
}

function applyCategoryDefaultPayment() {
    if (expensePaymentLockId) {
        updateExpensePaymentLockUI();
        return;
    }
    const catId = document.getElementById("expenseCategory").value;
    const cat = state.categories.find(c => c.id === catId);
    if (cat && cat.defaultPaymentId) {
        // Guard: only apply if the payment still exists and is not archived
        const targetPay = state.payments.find(p => p.id === cat.defaultPaymentId && !p.archived);
        if (targetPay) {
            document.getElementById("expensePayment").value = cat.defaultPaymentId;
        }
    }
}

function loadExpenseToFormForEdit(txId, returnCardId = "") {
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) return;
    if (tx.tripRef) { showNotification(t("Edit this expense inside the Trip.", "This fossil belongs to a trip. Edit it there.")); return; }
    pendingExpensePaymentLockId = "";
    expenseFormReturnCardId = returnCardId || "";
    switchScreen('addExpense');

    document.getElementById("expenseFormTitle").textContent = "Modify Expense";
    document.getElementById("editExpenseId").value = tx.id;
    document.getElementById("expenseAmount").value = tx.amount;
    const editDateEl = document.getElementById("expenseDate");
    editDateEl.value = tx.date;
    editDateEl.max = getTodayISO();
    document.getElementById("expenseNote").value = tx.note || "";

    populateExpenseFormDropdowns(tx.paymentId);
    document.getElementById("expenseCategory").value = tx.categoryId;
    document.getElementById("expensePayment").value = tx.paymentId;
}

function handleExpenseSubmit(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById("expenseAmount").value);
    const catId = document.getElementById("expenseCategory").value;
    const payId = expensePaymentLockId || document.getElementById("expensePayment").value;
    const date = document.getElementById("expenseDate").value;
    const note = document.getElementById("expenseNote").value.trim();
    const editId = document.getElementById("editExpenseId").value;

    if (isNaN(amount) || amount <= 0) {
        showNotification(t("Please supply a valid amount.", "TReX needs a real amount to devour."));
        return;
    }

    if (date > getTodayISO()) {
        showNotification(t("Expense date cannot be in the future.", "TReX cannot hunt in tomorrow yet."));
        return;
    }

    if (editId) {
        const index = state.transactions.findIndex(t => t.id === editId);
        if (index !== -1) {
            const existing = state.transactions[index];
            const dateChanged = existing.date !== date;

            // If this was a recurring/EMI-generated tx, mark the old date as skipped
            // so processRecurringExpenses won't re-post it, then detach from the rule.
            if (existing.recurringId) {
                const rec = state.recurringExpenses?.find(r => r.id === existing.recurringId);
                if (rec) {
                    if (!Array.isArray(rec.skippedDates)) rec.skippedDates = [];
                    if (!rec.skippedDates.includes(existing.date)) {
                        rec.skippedDates.push(existing.date);
                        rec.updatedAt = new Date().toISOString();
                    }
                }
            }

            const { isRecurring: _r, recurringId: _rid, isEMI: _e, emiId: _eid, ...rest } = existing;
            state.transactions[index] = {
                ...rest,
                amount, categoryId: catId, paymentId: payId, date, note,
                createdAt: dateChanged ? new Date().toISOString() : (existing.createdAt || new Date().toISOString())
            };
            showNotification(t("Transaction updated successfully.", "Ledger fossil updated."));
            playSound(S.SYSTEM);
        }
    } else {
        const newTx = {
            id: "tx_" + Date.now(),
            amount, categoryId: catId, paymentId: payId, date, note,
            createdAt: new Date().toISOString()
        };
        state.transactions.push(newTx);
        playSound(S.SAVE);
        showNotification(t("Transaction saved.", "🦖 Devoured! Expense saved."));
    }

    saveStateToLocalStorage();
    refreshCreditCardViews();
    const returnCardId = expenseFormReturnCardId;
    expenseFormReturnCardId = "";

    const doNavigate = () => {
        if (returnCardId) {
            activeCreditCardId = returnCardId;
            switchScreen('cards');
        } else {
            switchScreen('dashboard');
        }
        updateAppDashboardView();
    };

    if (!editId && dp('dinoMode')) {
        const formCard = document.getElementById('addExpenseView');
        if (formCard) {
            formCard.classList.add('expense-chomp');
            setTimeout(() => {
                formCard.classList.remove('expense-chomp');
                doNavigate();
            }, 320);
        } else {
            doNavigate();
        }
    } else {
        doNavigate();
    }
}

/* INLINE DIRECTORY POP-UPS */
function populateInlineCategoryPaymentOptions() {
    const sel = document.getElementById("inlineCatDefaultPayment");
    if (!sel) return;
    sel.innerHTML = "";
    const activePayments = state.payments.filter(p => !p.archived);
    if (activePayments.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Add an account first";
        sel.appendChild(opt);
        sel.disabled = true;
        return;
    }
    sel.disabled = false;
    activePayments.forEach(pay => {
        const opt = document.createElement("option");
        opt.value = pay.id;
        opt.textContent = `${pay.name} (${pay.type})`;
        sel.appendChild(opt);
    });
}

let inlineCategoryModalMode = "";

function openInlineCategoryModal(mode = null) {
    if (typeof closeDrawer === "function") closeDrawer();
    inlineCategoryModalMode = mode || "";
    document.getElementById("inlineCategoryModalTitle").textContent = "Add New Category";
    document.getElementById("inlineCatName").value = "";
    document.getElementById("inlineCatColor").value = "#3b82f6";
    populateInlineCategoryPaymentOptions();
    const paySel = document.getElementById("inlineCatDefaultPayment");
    if (paySel && state.payments.length > 0) {
        paySel.value = state.payments[0].id;
    }
    document.getElementById("inlineCategoryModal").classList.remove("hidden");
    initLucideIcons(document.getElementById("inlineCategoryModal"));
}

function closeInlineCategoryModal() {
    document.getElementById("inlineCategoryModal").classList.add("hidden");
}

function saveInlineCategory() {
    const name = document.getElementById("inlineCatName").value.trim();
    const color = document.getElementById("inlineCatColor").value;
    const defaultPaymentId = document.getElementById("inlineCatDefaultPayment").value || "";

    if (!name) {
        showNotification(t("Please enter a category name.", "Name this new territory."));
        return;
    }

    const newId = "cat_" + Date.now();
    state.categories.push({ id: newId, name, color, defaultPaymentId });
    saveStateToLocalStorage();

    populateExpenseFormDropdowns();
    populateEMIFormDropdowns();

    if (!document.getElementById("addExpenseView").classList.contains("hidden")) {
        document.getElementById("expenseCategory").value = newId;
        if (defaultPaymentId) {
            document.getElementById("expensePayment").value = defaultPaymentId;
        }
    }

    if (inlineCategoryModalMode === "cardEMI" || !document.getElementById("emiModal").classList.contains("hidden")) {
        document.getElementById("emiCategory").value = newId;
    }

    // Refresh recurring modal if open
    if (!document.getElementById("recurringModal").classList.contains("hidden")) {
        const recurringCatSel = document.getElementById("recurringCategory");
        if (recurringCatSel) {
            recurringCatSel.innerHTML = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
            recurringCatSel.value = newId;
        }
    }

    if (!document.getElementById("settingsView").classList.contains("hidden")) {
        renderSettingsLists();
    }
    refreshCreditCardViews();

    inlineCategoryModalMode = "";
    closeInlineCategoryModal();
    playSound(S.SAVE);
    showNotification(t(`Category "${name}" added.`, `Territory "${name}" claimed.`));
}

function openInlinePaymentModal(mode = null) {
    if (typeof closeDrawer === "function") closeDrawer();
    document.getElementById("inlinePaymentModalTitle").textContent = "Add New Payment Method";
    document.getElementById("inlinePayName").value = "";
    document.getElementById("inlinePayType").value = "UPI";
    document.getElementById("inlinePayBillingDay").value = "";
    document.getElementById("inlinePayColor").value = "#10b981";
    
    // Disable payment method form if called from card EMI
    const payTypeField = document.getElementById("inlinePayType");
    const payTypeContainer = payTypeField?.parentElement?.parentElement;
    if (mode === "cardEMI") {
        // Hide the entire payment creation form for card EMI context
        // Since EMIs must be CC, we don't allow new payment method creation
        showNotification(t("Only Credit Cards can be used for EMIs. Please add a Credit Card in Payment Settings.", "EMI trails need a credit card cave. Add one in Payment Settings."));
        return;
    }
    
    document.getElementById("inlinePaymentModal").classList.remove("hidden");
    syncPaymentBillingDayRequirement("inline");
    initLucideIcons(document.getElementById("inlinePaymentModal"));
}

function closeInlinePaymentModal() {
    document.getElementById("inlinePaymentModal").classList.add("hidden");
}

function saveInlinePayment() {
    const name = document.getElementById("inlinePayName").value.trim();
    const type = document.getElementById("inlinePayType").value;
    const billingDayRaw = document.getElementById("inlinePayBillingDay").value.trim();
    const billingDay = billingDayRaw ? Math.min(28, Math.max(1, parseInt(billingDayRaw, 10) || 15)) : null;
    const color = document.getElementById("inlinePayColor").value;

    if (!name) {
        showNotification(t("Please enter a payment name.", "Name this hunting weapon."));
        return;
    }
    if (isCreditCardBillingDayRequired(type) && billingDay === null) {
        showNotification(t("Billing day is required for credit cards.", "Credit card caves need a billing day."));
        return;
    }

    const newId = "pay_" + Date.now();
    state.payments.push({ id: newId, name, type, limit: 0, color, billingDay });
    saveStateToLocalStorage();

    populateExpenseFormDropdowns();

    if (!document.getElementById("addExpenseView").classList.contains("hidden")) {
        document.getElementById("expensePayment").value = newId;
    }

    // Refresh recurring modal if open
    if (!document.getElementById("recurringModal").classList.contains("hidden")) {
        const recurringPaySel = document.getElementById("recurringPayment");
        if (recurringPaySel) {
            recurringPaySel.innerHTML = state.payments.filter(p => !p.archived).map(p => `<option value="${p.id}">${p.name}</option>`).join("");
            recurringPaySel.value = newId;
        }
    }

    if (!document.getElementById("settingsView").classList.contains("hidden")) {
        renderSettingsLists();
    }
    refreshCreditCardViews();

    closeInlinePaymentModal();
    playSound(S.SAVE);
    showNotification(t(`Payment method "${name}" added.`, `Hunting weapon "${name}" added.`));
}

/* LEDGER WORKFLOW FILTER MODULE */

// Sort state
let _ledgerSort = { field: 'date', dir: 'desc', key: 'date_desc' };
const _LEDGER_SORT_OPTIONS = [
    { field: 'date',   dir: 'desc', label: 'Dated ↓', key: 'date_desc'   },
    { field: 'date',   dir: 'asc',  label: 'Dated ↑', key: 'date_asc'    },
    { field: 'amount', dir: 'desc', label: 'Amt ↓',   key: 'amount_desc' },
    { field: 'amount', dir: 'asc',  label: 'Amt ↑',   key: 'amount_asc'  },
];

function openLedgerSortPicker() {
    let panel = document.getElementById('ledgerSortPanel');
    if (panel) { panel.remove(); return; }
    panel = document.createElement('div');
    panel.id = 'ledgerSortPanel';
    panel.className = 'absolute right-0 top-full mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[130px]';
    _LEDGER_SORT_OPTIONS.forEach(opt => {
        const btn = document.createElement('button');
        const isActive = opt.key === _ledgerSort.key;
        btn.className = 'w-full text-left px-3 py-2 text-[10px] font-bold transition-all ' +
            (isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800');
        btn.textContent = opt.label;
        btn.onclick = () => {
            _ledgerSort = opt;
            const lbl = document.getElementById('ledgerSortLabel');
            if (lbl) lbl.textContent = opt.label;
            panel.remove();
            filterHistory();
        };
        panel.appendChild(btn);
    });
    const anchor = document.getElementById('ledgerSortAnchor');
    anchor.appendChild(panel);
    setTimeout(() => document.addEventListener('click', function handler(e) {
        if (!panel.contains(e.target)) { panel.remove(); document.removeEventListener('click', handler); }
    }), 0);
}

function toggleLedgerFilterSheet() {
    const sheet = document.getElementById('ledgerFilterSheet');
    if (!sheet) return;
    sheet.classList.toggle('hidden');
    initLucideIcons(sheet);
}

function clearLedgerSearch() {
    const inp = document.getElementById('historySearchInput');
    if (inp) { inp.value = ''; filterHistory(); }
}

function _renderLedgerChips(catId, payId, from, to) {
    const wrap = document.getElementById('ledgerActiveChips');
    if (!wrap) return;
    wrap.innerHTML = '';
    const chip = (label, clearFn) => {
        const el = document.createElement('span');
        el.className = 'inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800';
        el.innerHTML = label + '<button class="ml-0.5 text-indigo-400 hover:text-white">x</button>';
        el.querySelector('button').onclick = clearFn;
        wrap.appendChild(el);
    };
    if (catId) {
        const cat = state.categories.find(c => c.id === catId);
        if (cat) chip(cat.name, () => { document.getElementById('historyFilterCategory').value = ''; filterHistory(); });
    }
    if (payId) {
        const pay = state.payments.find(p => p.id === payId);
        if (pay) chip(pay.name, () => { document.getElementById('historyFilterPayment').value = ''; filterHistory(); });
    }
    const cycle = calculateActiveCycleRange();
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
    const cycleFrom = fmt(cycle.startDate), cycleTo = fmt(cycle.endDate);
    if (from !== cycleFrom || to !== cycleTo) {
        chip(from + ' → ' + to, () => resetLedgerToCycle());
    }
    const dot = document.getElementById('ledgerFilterDot');
    if (dot) dot.classList.toggle('hidden', wrap.children.length === 0);
}

function renderHistoryList() {
    // Reset sort to default (Added desc) on each open
    _ledgerSort = _LEDGER_SORT_OPTIONS[0];
    const lbl = document.getElementById('ledgerSortLabel');
    if (lbl) lbl.textContent = _ledgerSort.label;

    // Always reset date pickers to current cycle on open
    initLedgerMonthSelector();


    const catFilter = document.getElementById("historyFilterCategory");
    catFilter.innerHTML = '<option value="">All Categories</option>';
    state.categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        catFilter.appendChild(opt);
    });

    const payFilter = document.getElementById("historyFilterPayment");
    payFilter.innerHTML = '<option value="">All Accounts</option>';
    state.payments.forEach(pay => {
        const opt = document.createElement("option");
        opt.value = pay.id;
        opt.textContent = pay.name;
        payFilter.appendChild(opt);
    });

    filterHistory();
}

/* ═══════════════════════════════════════════════════════
   LEDGER DATE RANGE SELECTOR
═══════════════════════════════════════════════════════ */
function initLedgerMonthSelector() {
    const cycle = calculateActiveCycleRange();
    const pad = n => String(n).padStart(2, "0");
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    document.getElementById("ledgerDateFrom").value = fmt(cycle.startDate);
    document.getElementById("ledgerDateTo").value   = fmt(cycle.endDate);
}

function resetLedgerToCycle() {
    initLedgerMonthSelector();
    filterHistory();
}

function getLedgerDateRange() {
    return {
        from: document.getElementById("ledgerDateFrom").value || "1900-01-01",
        to:   document.getElementById("ledgerDateTo").value   || getTodayISO()
    };
}

function openLedgerWithDate(dateISO) {
    // Called from heatmap — switch screen first (resets sort + cycle dates), then override to single day
    switchScreen("history");
    document.getElementById("ledgerDateFrom").value = dateISO;
    document.getElementById("ledgerDateTo").value   = dateISO;
    filterHistory();
}

function filterHistory() {
    const searchInput = document.getElementById("historySearchInput");
    if (searchInput) searchInput.placeholder = dp('dinoMode') ? "Search the fossil record…" : "Search transactions…";
    const historyTitle = document.getElementById("historyViewTitle");
    if (historyTitle) historyTitle.textContent = dp('dinoMode') ? "Fossil Record" : "Transaction History";
    const search = searchInput ? searchInput.value.toLowerCase() : "";
    const catId = document.getElementById("historyFilterCategory").value;
    const payId = document.getElementById("historyFilterPayment").value;
    const container = document.getElementById("allHistoryList");
    container.innerHTML = "";

    // Get date range from month selector
    const { from, to } = getLedgerDateRange();

    let items = state.transactions.filter(t => {
        const matchesCat  = !catId || t.categoryId === catId;
        const matchesPay  = !payId || t.paymentId  === payId;
        const matchesDate = t.date >= from && t.date <= to;

        const categoryObj = state.categories.find(c => c.id === t.categoryId) || { name: "" };
        const paymentObj  = state.payments.find(p => p.id === t.paymentId)    || { name: "" };

        const matchesText = !search ||
                            (t.note && t.note.toLowerCase().includes(search)) ||
                            categoryObj.name.toLowerCase().includes(search) ||
                            paymentObj.name.toLowerCase().includes(search) ||
                            t.amount.toString().includes(search);

        return matchesCat && matchesPay && matchesDate && matchesText;
    });

    // Dynamic sort
    items.sort((a, b) => {
        let va, vb;
        if (_ledgerSort.field === 'amount') {
            va = parseFloat(a.amount) || 0;
            vb = parseFloat(b.amount) || 0;
        } else {
            va = new Date(a.date).getTime();
            vb = new Date(b.date).getTime();
        }
        return _ledgerSort.dir === 'desc' ? vb - va : va - vb;
    });

    // Active filter chips + search clear button
    _renderLedgerChips(catId, payId, from, to);
    const clearBtn = document.getElementById('ledgerSearchClear');
    if (clearBtn) clearBtn.classList.toggle('hidden', !search);

    // Update summary bar
    const total = items.reduce((s, t) => s + t.amount, 0);
    const countEl = document.getElementById("ledgerTxCount");
    const totalEl = document.getElementById("ledgerPeriodTotal");
    if (countEl) countEl.textContent = `${items.length} transaction${items.length !== 1 ? "s" : ""}`;
    if (totalEl) totalEl.textContent  = items.length ? `${state.currencySymbol}${total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}` : "—";

    if (items.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 text-center py-12">${t("No matching transactions found.", "🦴 No fossils match your search.")}</p>`;
        return;
    }

    items.forEach(t => {
        const cat = state.categories.find(c => c.id === t.categoryId) || { name: "Other", color: "#64748b" };
        const pay = state.payments.find(p => p.id === t.paymentId) || { name: "Cash" };
        const dateStr = formatDateReadable(new Date(t.date), { year: '2-digit' });
        const recurringBadge = (t.source === "recurring" || t.isRecurring)
            ? `<span class="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-950 text-violet-400 font-bold uppercase shrink-0" title="${t.sourceName || 'Recurring'}">Recurring</span>`
            : "";
        const tripBadge = t.tripRef
            ? `<span class="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-400 font-bold uppercase shrink-0">${t.tripType === "pre" ? "Pre-Trip" : "Trip"}</span>`
            : "";

        const card = document.createElement("div");
        card.id = `tx-row-${t.id}`;
        card.className = "bg-slate-900 border border-slate-850 rounded-2xl px-3 py-3 flex justify-between items-stretch gap-2 transition-all";

        const actionButtons = t.tripRef
            ? `<span class="p-1 text-slate-700" title="Managed via Trip"><i data-lucide="lock" class="w-3.5 h-3.5"></i></span>`
            : `<button onclick="loadExpenseToFormForEdit('${t.id}')" class="p-1 text-slate-600 hover:text-indigo-400 rounded hover:bg-slate-950 transition-all" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteTransaction('${t.id}')" class="p-1 text-slate-600 hover:text-rose-400 rounded hover:bg-slate-950 transition-all" title="Delete">
                        <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                    </button>`;

        const clickHandler = t.tripRef ? "" : `onclick="loadExpenseToFormForEdit('${t.id}')"`;

        card.innerHTML = `
            <div class="flex items-stretch gap-2.5 min-w-0 flex-1 ${t.tripRef ? "cursor-default" : "cursor-pointer active:scale-95"}" ${clickHandler}>
                <span class="w-1 self-stretch rounded-full shrink-0" style="background-color: ${cat.color}"></span>
                <div class="min-w-0 flex-1 space-y-1 py-0.5">
                    <div class="flex items-center gap-1.5 min-w-0">
                        <span class="text-[11px] font-bold text-slate-200 truncate">${t.note || cat.name}</span>
                        ${recurringBadge}
                        ${tripBadge}
                    </div>
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0" style="background-color:${cat.color}22; color:${cat.color}">
                            <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color:${cat.color}"></span>
                            <span class="truncate max-w-[72px]">${cat.name}</span>
                        </span>
                        <span class="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 shrink-0">
                            <svg class="w-2.5 h-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="14" height="10" rx="2"/><path d="M1 7h14"/><path d="M5 1v3M11 1v3"/></svg>
                            <span class="truncate max-w-[72px]">${pay.name}</span>
                        </span>
                        <span class="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-950 text-slate-500 shrink-0">
                            <svg class="w-2.5 h-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="2" width="14" height="13" rx="2"/><path d="M1 6h14"/><path d="M5 1v2M11 1v2"/></svg>
                            ${dateStr}
                        </span>
                    </div>
                </div>
            </div>
            <div class="flex flex-col items-end gap-1.5 shrink-0 ml-1">
                <span class="text-xs font-black text-indigo-300">${state.currencySymbol}${t.amount.toLocaleString()}</span>
                <div class="flex items-center gap-1">
                    ${actionButtons}
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    initLucideIcons();
}

async function deleteTransaction(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (tx && tx.tripRef) { showNotification(t("Edit this expense inside the Trip.", "This fossil belongs to a trip. Edit it there.")); return; }
    const label = tx ? (tx.note ? `"${tx.note}"` : `₹${tx.amount}`) : "this transaction";
    if (!await customConfirm(t(`Delete ${label}? This cannot be undone.`, `Send ${label} extinct? This cannot be undone.`), t("Delete this?", "Send it extinct?"), t("Delete", "Extinct it"))) return;

    const row = document.getElementById(`tx-row-${id}`);
    if (row && dp('dinoMode')) {
        row.classList.add('going-extinct');
        await new Promise(r => setTimeout(r, 380));
    }

    state.transactions = state.transactions.filter(t => t.id !== id);
    saveStateToLocalStorage();
    playSound(S.DELETE);
    showNotification(t("Deleted.", "🦴 Gone extinct."));
    filterHistory();
    refreshCreditCardViews();
    updateAppDashboardView();
}
