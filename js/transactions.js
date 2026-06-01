/**
 * transactions.js — Expense Form & Ledger
 * TReX — Devour Your Expenses
 *
 * Add/edit expense form setup, form submission, category/payment dropdowns,
 * inline category & payment modals, history list renderer, ledger date
 * range selector, filter/search, transaction delete.
 *
 * Dependencies: core.js must load before all other modules.
 * Global state: window.state (defined in core.js)
 */

let ledgerSelectMode = false;
let ledgerSelectedIds = new Set();
let ledgerAmountMin = null;
let ledgerAmountMax = null;
let activeTagFilter = "";
let openSwipeRowEl = null;

let _splitMode = false;
let _splitRowCounter = 0;
let _expenseTags = [];

function _escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeTag(raw) {
    return String(raw || "")
        .trim()
        .replace(/^#+/, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .slice(0, 28);
}

function getKnownTags() {
    const all = [
        ...((state.knownTags || []).map(normalizeTag)),
        ...((state.transactions || []).flatMap(tx => Array.isArray(tx.tags) ? tx.tags.map(normalizeTag) : []))
    ].filter(Boolean);
    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
}

function getExpenseTags() {
    return [..._expenseTags];
}

function rememberTags(tags) {
    const merged = new Set([...(state.knownTags || []).map(normalizeTag)]);
    (tags || []).map(normalizeTag).filter(Boolean).forEach(tag => merged.add(tag));
    state.knownTags = [...merged].sort((a, b) => a.localeCompare(b));
}

function renderTagSuggestions(partial = "") {
    const input = document.getElementById("expenseTagDraft");
    const host = document.getElementById("expenseTagSuggestions");
    if (!input || !host) return;
    const normalized = normalizeTag(partial);
    const matches = getKnownTags()
        .filter(tag => tag && tag !== normalized && (!normalized || tag.includes(normalized)))
        .slice(0, 6);
    if (!matches.length || !document.activeElement || document.activeElement !== input) {
        host.innerHTML = "";
        host.classList.add("hidden");
        return;
    }
    host.innerHTML = matches.map(tag => `
        <button type="button" onclick="addExpenseTag('${_escapeHtml(tag)}')"
            class="tag-suggestion-item">${_escapeHtml(tag)}</button>
    `).join("");
    host.classList.remove("hidden");
}

function addExpenseTag(raw) {
    const tag = normalizeTag(raw || document.getElementById("expenseTagDraft")?.value);
    if (!tag || _expenseTags.includes(tag)) return;
    _expenseTags.push(tag);
    renderTagInput("tagInputContainer", _expenseTags);
}

function removeExpenseTag(tag) {
    const normalized = normalizeTag(tag);
    _expenseTags = _expenseTags.filter(t => t !== normalized);
    renderTagInput("tagInputContainer", _expenseTags);
}

function renderTagInput(containerId, initialTags = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    _expenseTags = Array.from(new Set((initialTags || []).map(normalizeTag).filter(Boolean)));
    container.innerHTML = `
        <label class="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Tags</label>
        <div class="tag-input-wrap">
            <div class="tag-chip-row">
                ${_expenseTags.map(tag => `
                    <span class="tag-chip">
                        <span>#${_escapeHtml(tag)}</span>
                        <button type="button" class="tag-remove" onclick="removeExpenseTag('${_escapeHtml(tag)}')" aria-label="Remove ${_escapeHtml(tag)}">x</button>
                    </span>
                `).join("")}
                <input id="expenseTagDraft" type="text" inputmode="text" autocomplete="off"
                    placeholder="${_expenseTags.length ? 'Add tag' : 'weekend, family'}"
                    class="tag-input-field"
                    oninput="renderTagSuggestions(this.value)"
                    onkeydown="if(event.key==='Enter'||event.key===','){event.preventDefault();addExpenseTag(this.value)}" />
            </div>
            <div id="expenseTagSuggestions" class="tag-suggestions hidden"></div>
        </div>
    `;
}

function applyTagFilter() {
    activeTagFilter = normalizeTag(document.getElementById("tagFilterInput")?.value || "");
    filterHistory();
}

function _renderTxTagChips(tags, extraClass = "") {
    const clean = Array.from(new Set((tags || []).map(normalizeTag).filter(Boolean)));
    if (!clean.length) return "";
    return `<div class="tx-tag-row ${extraClass}">${clean.map(tag => `<span class="tx-tag-chip">#${_escapeHtml(tag)}</span>`).join("")}</div>`;
}

function _buildSplitCategoryOptions(selectedId) {
    const sorted = [...state.categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return sorted.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`).join('');
}

function _updateSplitTotal() {
    const rows = document.querySelectorAll('.split-row-item');
    let total = 0;
    rows.forEach(row => {
        const amt = parseFloat(row.querySelector('.split-row-amount').value) || 0;
        total += amt;
    });
    const display = document.getElementById('splitTotalDisplay');
    const mainAmtInput = document.getElementById('expenseAmount');
    const target = mainAmtInput ? parseFloat(mainAmtInput.value) : NaN;
    if (display) {
        const totalLabel = `${state.currencySymbol}${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
        const targetLabel = Number.isFinite(target) && target > 0
            ? `${state.currencySymbol}${target.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : "target";
        display.textContent = `${totalLabel} / ${targetLabel}`;
        display.classList.toggle('hidden', !_splitMode);
        display.classList.toggle('text-emerald-300', Number.isFinite(target) && Math.abs(total - target) < 0.01);
        display.classList.toggle('text-indigo-300', !Number.isFinite(target) || Math.abs(total - target) >= 0.01);
    }
}

function validateSplitRows() {
    const validMsg = document.getElementById('splitValidationMsg');
    const target = parseFloat(document.getElementById("expenseAmount").value);
    const rows = [...document.querySelectorAll('.split-row-item')];

    const fail = message => {
        if (validMsg) {
            validMsg.textContent = message;
            validMsg.classList.remove('hidden');
        }
        return { valid: false, parts: [], target: 0, total: 0 };
    };

    if (!Number.isFinite(target) || target <= 0) {
        return fail("Enter the total amount before saving a split.");
    }
    if (rows.length < 2) {
        return fail("Add at least two split rows.");
    }

    const parts = rows.map(row => ({
        catId: row.querySelector('.split-row-cat').value,
        amount: parseFloat(row.querySelector('.split-row-amount').value)
    }));
    if (parts.some(p => !p.catId || isNaN(p.amount) || p.amount <= 0)) {
        return fail("Every split row needs a category and positive amount.");
    }

    const total = parts.reduce((sum, part) => sum + part.amount, 0);
    if (Math.abs(total - target) >= 0.01) {
        return fail(`Split rows must total ${state.currencySymbol}${target.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`);
    }

    if (validMsg) validMsg.classList.add('hidden');
    return { valid: true, parts, target, total };
}

function addSplitRow(catId, amount) {
    const list = document.getElementById('splitRowsList');
    if (!list) return;
    const rowId = 'srow_' + (++_splitRowCounter);
    const defaultCatId = catId || (state.categories.length > 0 ? state.categories[0].id : '');
    const div = document.createElement('div');
    div.className = 'split-row-item flex items-center gap-2';
    div.id = rowId;
    div.innerHTML = `
        <div class="flex-1 min-w-0">
            <select class="split-row-cat w-full app-dropdown rounded-lg text-[10px] focus:outline-none"
                data-picker-skip-wrap="true"
                onchange="_updateSplitTotal()">
                ${_buildSplitCategoryOptions(defaultCatId)}
            </select>
        </div>
        <div class="flex items-center gap-1 shrink-0">
            <span class="text-[10px] text-slate-500 font-bold">${state.currencySymbol}</span>
            <input type="number" step="any" min="0.01" placeholder="0"
                class="split-row-amount w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right"
                value="${amount || ''}"
                oninput="_updateSplitTotal()" />
        </div>
        <button type="button" onclick="removeSplitRow('${rowId}')"
            class="p-1 text-slate-600 hover:text-rose-400 transition-all shrink-0">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>`;
    list.appendChild(div);
    initLucideIcons(div);
    wrapAllSelects(div);
    _updateSplitTotal();
}

function removeSplitRow(rowId) {
    const el = document.getElementById(rowId);
    if (el) el.remove();
    const rows = document.querySelectorAll('.split-row-item');
    if (rows.length === 0 && _splitMode) toggleSplitMode();
    else _updateSplitTotal();
}

function toggleSplitMode() {
    _splitMode = !_splitMode;
    const container = document.getElementById('splitRowsContainer');
    const btn = document.getElementById('splitModeToggleBtn');
    const label = document.getElementById('splitModeToggleLabel');
    const display = document.getElementById('splitTotalDisplay');
    const amountPanel = document.getElementById('expenseAmount')?.closest('.bg-slate-950');
    const validMsg = document.getElementById('splitValidationMsg');

    if (_splitMode) {
        container.classList.remove('hidden');
        if (amountPanel) amountPanel.classList.remove('hidden');
        if (label) label.textContent = 'Cancel split';
        if (btn) btn.classList.add('text-rose-400');
        if (btn) btn.classList.remove('text-slate-400');
        if (display) display.classList.remove('hidden');
        if (validMsg) validMsg.classList.add('hidden');
        // Pre-populate two rows
        const list = document.getElementById('splitRowsList');
        if (list) list.innerHTML = '';
        _splitRowCounter = 0;
        addSplitRow();
        addSplitRow();
    } else {
        _splitMode = false;
        container.classList.add('hidden');
        if (amountPanel) amountPanel.classList.remove('hidden');
        if (label) label.textContent = 'Split across categories';
        if (btn) btn.classList.remove('text-rose-400');
        if (btn) btn.classList.add('text-slate-400');
        if (display) display.classList.add('hidden');
        if (validMsg) validMsg.classList.add('hidden');
        const list = document.getElementById('splitRowsList');
        if (list) list.innerHTML = '';
    }
}

function _exitSplitMode() {
    if (!_splitMode) return;
    _splitMode = false;
    const container = document.getElementById('splitRowsContainer');
    const label = document.getElementById('splitModeToggleLabel');
    const btn = document.getElementById('splitModeToggleBtn');
    const display = document.getElementById('splitTotalDisplay');
    const amountPanel = document.getElementById('expenseAmount')?.closest('.bg-slate-950');
    const validMsg = document.getElementById('splitValidationMsg');
    if (container) container.classList.add('hidden');
    if (amountPanel) amountPanel.classList.remove('hidden');
    if (label) label.textContent = 'Split across categories';
    if (btn) { btn.classList.remove('text-rose-400'); btn.classList.add('text-slate-400'); }
    if (display) display.classList.add('hidden');
    if (validMsg) validMsg.classList.add('hidden');
    const list = document.getElementById('splitRowsList');
    if (list) list.innerHTML = '';
    _splitRowCounter = 0;
}

function setupExpenseFormForAdd() {
    _exitSplitMode();
    document.getElementById("expenseFormTitle").textContent = "Record Expense";
    document.getElementById("editExpenseId").value = "";
    document.getElementById("expenseAmount").value = "";
    const todayISO = getTodayISO();
    const dateEl = document.getElementById("expenseDate");
    dateEl.value = todayISO;
    dateEl.max = todayISO;
    document.getElementById("expenseNote").value = "";
    renderTagInput("tagInputContainer", []);

    populateExpenseFormDropdowns();
    clearExpensePaymentLock();
    if (pendingExpensePaymentLockId) {
        applyExpensePaymentLock(pendingExpensePaymentLockId);
        pendingExpensePaymentLockId = "";
    }
    applyCategoryDefaultPayment();
    if (typeof renderTransactionTemplatesBars === "function") renderTransactionTemplatesBars();
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

    // ── Split group edit ─────────────────────────────────────────────────
    if (tx.splitGroupId) {
        const parts = state.transactions
            .filter(t => t.splitGroupId === tx.splitGroupId)
            .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

        document.getElementById("expenseFormTitle").textContent = "Modify Split";
        document.getElementById("editExpenseId").value = tx.id;
        document.getElementById("expenseAmount").value = parts.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const editDateEl = document.getElementById("expenseDate");
        editDateEl.value = tx.date;
        editDateEl.max = getTodayISO();
        document.getElementById("expenseNote").value = tx.note || "";
        renderTagInput("tagInputContainer", tx.tags || []);

        populateExpenseFormDropdowns(tx.paymentId);
        document.getElementById("expensePayment").value = tx.paymentId;

        // Enter split mode and populate rows from existing parts
        if (!_splitMode) {
            const container = document.getElementById('splitRowsContainer');
            const btn = document.getElementById('splitModeToggleBtn');
            const label = document.getElementById('splitModeToggleLabel');
            const display = document.getElementById('splitTotalDisplay');
            const amountPanel = document.getElementById('expenseAmount')?.closest('.bg-slate-950');
            _splitMode = true;
            if (container) container.classList.remove('hidden');
            if (amountPanel) amountPanel.classList.remove('hidden');
            if (label) label.textContent = 'Cancel split';
            if (btn) { btn.classList.add('text-rose-400'); btn.classList.remove('text-slate-400'); }
            if (display) display.classList.remove('hidden');
            const list = document.getElementById('splitRowsList');
            if (list) list.innerHTML = '';
            _splitRowCounter = 0;
        }
        parts.forEach(p => addSplitRow(p.categoryId, p.amount));
        _updateSplitTotal();
        return;
    }

    // ── Normal edit ──────────────────────────────────────────────────────
    document.getElementById("expenseFormTitle").textContent = "Modify Expense";
    document.getElementById("editExpenseId").value = tx.id;
    document.getElementById("expenseAmount").value = tx.amount;
    const editDateEl = document.getElementById("expenseDate");
    editDateEl.value = tx.date;
    editDateEl.max = getTodayISO();
    document.getElementById("expenseNote").value = tx.note || "";
    renderTagInput("tagInputContainer", tx.tags || []);

    populateExpenseFormDropdowns(tx.paymentId);
    document.getElementById("expenseCategory").value = tx.categoryId;
    document.getElementById("expensePayment").value = tx.paymentId;
}

function handleExpenseSubmit(e) {
    e.preventDefault();

    // ── Split mode path ──────────────────────────────────────────────────
    if (_splitMode) {
        const payId = expensePaymentLockId || document.getElementById("expensePayment").value;
        const date  = document.getElementById("expenseDate").value;
        const note  = document.getElementById("expenseNote").value.trim();
        const tags = getExpenseTags();
        const editId = document.getElementById("editExpenseId").value;
        const splitValidation = validateSplitRows();
        if (!splitValidation.valid) return;
        const parts = splitValidation.parts;
        if (date > getTodayISO()) {
            showNotification(t("Expense date cannot be in the future.", "TReX cannot hunt in tomorrow yet."));
            return;
        }

        // If editing an existing split group, replace all its parts
        if (editId) {
            const existingTx = state.transactions.find(t => t.id === editId);
            const groupId = existingTx && existingTx.splitGroupId ? existingTx.splitGroupId : ('split_' + Date.now());
            state.transactions = state.transactions.filter(t => t.splitGroupId !== groupId);
            const now = new Date().toISOString();
            parts.forEach((p, i) => {
                const cat = state.categories.find(c => c.id === p.catId) || { name: '' };
                state.transactions.push({
                    id: `tx_split_${Date.now()}_${i}`,
                    amount: p.amount,
                    categoryId: p.catId,
                    paymentId: payId,
                    date, note,
                    tags,
                    splitGroupId: groupId,
                    splitLabel: cat.name,
                    createdAt: now
                });
            });
            showNotification(t("Split transaction updated.", "Split fossil updated."));
            playSound(S.SYSTEM);
        } else {
            const groupId = 'split_' + Date.now();
            const now = new Date().toISOString();
            parts.forEach((p, i) => {
                const cat = state.categories.find(c => c.id === p.catId) || { name: '' };
                state.transactions.push({
                    id: `tx_split_${Date.now()}_${i}`,
                    amount: p.amount,
                    categoryId: p.catId,
                    paymentId: payId,
                    date, note,
                    tags,
                    splitGroupId: groupId,
                    splitLabel: cat.name,
                    createdAt: now
                });
            });
            playSound(S.SAVE);
            showNotification(t(`Split into ${parts.length} transactions saved.`, `🦖 Devoured in ${parts.length} bites!`));
        }

        rememberTags(tags);
        saveStateToLocalStorage();
        refreshCreditCardViews();
        const returnCardId = expenseFormReturnCardId;
        expenseFormReturnCardId = "";
        _exitSplitMode();

        if (returnCardId) { activeCreditCardId = returnCardId; switchScreen('cards'); }
        else { switchScreen('dashboard'); }
        updateAppDashboardView();
        return;
    }

    // ── Normal single-transaction path ───────────────────────────────────
    const amount = parseFloat(document.getElementById("expenseAmount").value);
    const catId = document.getElementById("expenseCategory").value;
    const payId = expensePaymentLockId || document.getElementById("expensePayment").value;
    const date = document.getElementById("expenseDate").value;
    const note = document.getElementById("expenseNote").value.trim();
    const tags = getExpenseTags();
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
                amount, categoryId: catId, paymentId: payId, date, note, tags,
                createdAt: dateChanged ? new Date().toISOString() : (existing.createdAt || new Date().toISOString())
            };
            showNotification(t("Transaction updated successfully.", "Ledger fossil updated."));
            playSound(S.SYSTEM);
        }
    } else {
        const newTx = {
            id: "tx_" + Date.now(),
            amount, categoryId: catId, paymentId: payId, date, note, tags,
            createdAt: new Date().toISOString()
        };
        state.transactions.push(newTx);
        playSound(S.SAVE);
        showNotification(t("Transaction saved.", "🦖 Devoured! Expense saved."));
    }

    rememberTags(tags);
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
            recurringCatSel.innerHTML = [...state.categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map(c => `<option value="${c.id}">${c.name}</option>`).join("");
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
            recurringPaySel.innerHTML = [...state.payments].filter(p => !p.archived).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map(p => `<option value="${p.id}">${p.name}</option>`).join("");
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
function renderHistoryList() {
    ledgerSelectMode = false;
    ledgerSelectedIds.clear();
    closeOpenSwipeRow();
    // Reset sort to Dated ↓ on every fresh open
    const sortSel = document.getElementById("ledgerSortSelect");
    if (sortSel) { sortSel.value = "date-desc"; }
    const sortLbl = document.getElementById("ledgerSortLabel");
    if (sortLbl) { sortLbl.textContent = "Dated ↓"; }
    // Always seed date pickers with current cycle on fresh open (only if blank)
    const fromEl = document.getElementById("ledgerDateFrom");
    if (!fromEl.value) initLedgerMonthSelector();

    const catFilter = document.getElementById("historyFilterCategory");
    catFilter.innerHTML = '<option value="">All Categories</option>';
    [...state.categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        catFilter.appendChild(opt);
    });

    const payFilter = document.getElementById("historyFilterPayment");
    payFilter.innerHTML = '<option value="">All Accounts</option>';
    [...state.payments].filter(p => !p.archived).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).forEach(pay => {
        const opt = document.createElement("option");
        opt.value = pay.id;
        opt.textContent = pay.name;
        payFilter.appendChild(opt);
    });

    if (typeof renderTransactionTemplatesBars === "function") renderTransactionTemplatesBars();
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
    ledgerAmountMin = null;
    ledgerAmountMax = null;
    activeTagFilter = "";
    const minEl = document.getElementById("ledgerAmountMin");
    const maxEl = document.getElementById("ledgerAmountMax");
    const tagEl = document.getElementById("tagFilterInput");
    if (minEl) minEl.value = "";
    if (maxEl) maxEl.value = "";
    if (tagEl) tagEl.value = "";
    filterHistory();
}

function toggleLedgerFilterSheet() {
    const sheet = document.getElementById("ledgerFilterSheet");
    if (!sheet) return;
    sheet.classList.toggle("hidden");
}

function clearLedgerSearch() {
    const input = document.getElementById("historySearchInput");
    if (input) input.value = "";
    filterHistory();
}

function applyAmountRangeFilter() {
    const minEl = document.getElementById("ledgerAmountMin");
    const maxEl = document.getElementById("ledgerAmountMax");
    const minVal = minEl ? parseFloat(minEl.value) : NaN;
    const maxVal = maxEl ? parseFloat(maxEl.value) : NaN;
    ledgerAmountMin = Number.isFinite(minVal) ? minVal : null;
    ledgerAmountMax = Number.isFinite(maxVal) ? maxVal : null;
    filterHistory();
}

function closeOpenSwipeRow(exceptEl = null) {
    if (openSwipeRowEl && openSwipeRowEl !== exceptEl) {
        openSwipeRowEl.classList.remove("swiped");
        openSwipeRowEl.style.transform = "";
    }
    if (!exceptEl || openSwipeRowEl !== exceptEl) openSwipeRowEl = null;
}

function syncLedgerBulkBar() {
    const bar = document.getElementById("ledgerBulkBar");
    const count = document.getElementById("ledgerSelectCount");
    const selectBtn = document.getElementById("ledgerSelectBtn");
    const deleteBtn = document.getElementById("ledgerBulkDeleteBtn");
    if (bar) bar.classList.toggle("hidden", !ledgerSelectMode);
    if (count) count.textContent = `${ledgerSelectedIds.size} selected`;
    if (selectBtn) {
        selectBtn.classList.toggle("text-indigo-300", ledgerSelectMode);
        selectBtn.classList.toggle("border-indigo-500/40", ledgerSelectMode);
    }
    if (deleteBtn) deleteBtn.disabled = ledgerSelectedIds.size === 0;
}

function toggleLedgerSelectMode(force) {
    ledgerSelectMode = typeof force === "boolean" ? force : !ledgerSelectMode;
    if (!ledgerSelectMode) ledgerSelectedIds.clear();
    closeOpenSwipeRow();
    filterHistory();
}

function toggleLedgerRowSelect(txId) {
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx || tx.tripRef || tx.splitGroupId) return;
    if (ledgerSelectedIds.has(txId)) {
        ledgerSelectedIds.delete(txId);
    } else {
        ledgerSelectedIds.add(txId);
    }
    filterHistory();
}

async function bulkDeleteSelected() {
    const ids = [...ledgerSelectedIds].filter(id => {
        const tx = state.transactions.find(t => t.id === id);
        return tx && !tx.tripRef;
    });
    if (ids.length === 0) return;
    const label = `${ids.length} transaction${ids.length !== 1 ? "s" : ""}`;
    if (!await customConfirm(`Delete ${label}? This cannot be undone.`, "Delete selected?", "Delete")) return;

    state.transactions = state.transactions.filter(t => !ids.includes(t.id));
    ledgerSelectedIds.clear();
    ledgerSelectMode = false;
    saveStateToLocalStorage();
    playSound(S.DELETE);
    showNotification("Selected transactions deleted.");
    filterHistory();
    refreshCreditCardViews();
    updateAppDashboardView();
}

function attachSwipeToDelete(rowEl, txId) {
    if (!rowEl) return;
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let tracking = false;

    rowEl.addEventListener("touchstart", event => {
        if (ledgerSelectMode) return;
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        deltaX = 0;
        tracking = true;
        closeOpenSwipeRow(rowEl);
    }, { passive: true });

    rowEl.addEventListener("touchmove", event => {
        if (!tracking || ledgerSelectMode) return;
        const touch = event.touches[0];
        deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        if (Math.abs(deltaY) > Math.abs(deltaX)) return;
        if (deltaX < 0) {
            event.preventDefault();
            const offset = Math.max(deltaX, -116);
            rowEl.style.transform = `translateX(${offset}px)`;
        }
    }, { passive: false });

    rowEl.addEventListener("touchend", () => {
        if (!tracking || ledgerSelectMode) return;
        tracking = false;
        if (deltaX < -110) {
            rowEl.classList.remove("swiped");
            rowEl.style.transform = "";
            closeOpenSwipeRow();
            deleteTransaction(txId);
        } else if (deltaX < -60) {
            rowEl.classList.add("swiped");
            rowEl.style.transform = "";
            openSwipeRowEl = rowEl;
        } else {
            rowEl.classList.remove("swiped");
            rowEl.style.transform = "";
            if (openSwipeRowEl === rowEl) openSwipeRowEl = null;
        }
    });
}

function _removeLedgerFilter(type) {
    if (type === "category") {
        const el = document.getElementById("historyFilterCategory");
        if (el) el.value = "";
    }
    if (type === "payment") {
        const el = document.getElementById("historyFilterPayment");
        if (el) el.value = "";
    }
    if (type === "date") {
        initLedgerMonthSelector();
    }
    if (type === "amount") {
        ledgerAmountMin = null;
        ledgerAmountMax = null;
        const minEl = document.getElementById("ledgerAmountMin");
        const maxEl = document.getElementById("ledgerAmountMax");
        if (minEl) minEl.value = "";
        if (maxEl) maxEl.value = "";
    }
    if (type === "tag") {
        activeTagFilter = "";
        const el = document.getElementById("tagFilterInput");
        if (el) el.value = "";
    }
    filterHistory();
}

function _renderLedgerChips(catId, payId, from, to) {
    const chipHost = document.getElementById("ledgerActiveChips");
    const dot = document.getElementById("ledgerFilterDot");
    if (!chipHost) return;

    const cycle = calculateActiveCycleRange();
    const pad = n => String(n).padStart(2, "0");
    const cycleFrom = `${cycle.startDate.getFullYear()}-${pad(cycle.startDate.getMonth() + 1)}-${pad(cycle.startDate.getDate())}`;
    const cycleTo = `${cycle.endDate.getFullYear()}-${pad(cycle.endDate.getMonth() + 1)}-${pad(cycle.endDate.getDate())}`;
    const chips = [];

    if (catId) {
        const cat = state.categories.find(c => c.id === catId);
        chips.push({ type: "category", label: cat ? cat.name : "Category" });
    }
    if (payId) {
        const pay = state.payments.find(p => p.id === payId);
        chips.push({ type: "payment", label: pay ? pay.name : "Account" });
    }
    if ((from && from !== cycleFrom) || (to && to !== cycleTo)) {
        chips.push({ type: "date", label: `${from || "Start"} to ${to || "Today"}` });
    }
    if (ledgerAmountMin !== null || ledgerAmountMax !== null) {
        const minLabel = ledgerAmountMin !== null ? `${state.currencySymbol}${ledgerAmountMin}` : "Min";
        const maxLabel = ledgerAmountMax !== null ? `${state.currencySymbol}${ledgerAmountMax}` : "Max";
        chips.push({ type: "amount", label: `${minLabel} to ${maxLabel}` });
    }
    if (activeTagFilter) {
        chips.push({ type: "tag", label: `#${activeTagFilter}` });
    }

    chipHost.innerHTML = chips.map(chip => `
        <button onclick="_removeLedgerFilter('${chip.type}')"
            class="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-800 px-2 py-1 text-[8px] font-bold text-slate-400 max-w-[120px]">
            <span class="truncate">${chip.label}</span>
            <i data-lucide="x" class="w-2.5 h-2.5 shrink-0"></i>
        </button>
    `).join("");
    if (dot) dot.classList.toggle("hidden", chips.length === 0);
    initLucideIcons(chipHost);
}

function getLedgerDateRange() {
    return {
        from: document.getElementById("ledgerDateFrom").value || "1900-01-01",
        to:   document.getElementById("ledgerDateTo").value   || getTodayISO()
    };
}

function openLedgerWithDate(dateISO) {
    // Called from heatmap — set both From and To to a single day
    initLedgerMonthSelector(); // reset first so fields exist
    document.getElementById("ledgerDateFrom").value = dateISO;
    document.getElementById("ledgerDateTo").value   = dateISO;
    switchScreen("history");
}

function filterHistory() {
    const searchInput = document.getElementById("historySearchInput");
    if (searchInput) searchInput.placeholder = dp('dinoMode') ? "Search the fossil record…" : "Search transactions…";
    const historyTitle = document.getElementById("historyViewTitle");
    if (historyTitle) historyTitle.textContent = dp('dinoMode') ? "Fossil Record" : "Transaction History";
    const search = searchInput ? searchInput.value.toLowerCase() : "";
    const catId = (document.getElementById("historyFilterCategory") || {}).value || "";
    const payId = (document.getElementById("historyFilterPayment") || {}).value || "";
    const container = document.getElementById("allHistoryList");
    if (!container) return;
    container.innerHTML = "";

    // Get date range from month selector
    const { from, to } = getLedgerDateRange();
    _renderLedgerChips(catId, payId, from, to);
    const clearBtn = document.getElementById("ledgerSearchClear");
    if (clearBtn) clearBtn.classList.toggle("hidden", !search);

    let items = state.transactions.filter(t => {
        const matchesCat  = !catId || t.categoryId === catId;
        const matchesPay  = !payId || t.paymentId  === payId;
        const matchesDate = t.date >= from && t.date <= to;
        const amount = parseFloat(t.amount || 0);
        const matchesMin = ledgerAmountMin === null || amount >= ledgerAmountMin;
        const matchesMax = ledgerAmountMax === null || amount <= ledgerAmountMax;
        const txTags = Array.isArray(t.tags) ? t.tags.map(normalizeTag) : [];
        const matchesTag = !activeTagFilter || txTags.some(tag => tag.includes(activeTagFilter));

        const categoryObj = state.categories.find(c => c.id === t.categoryId) || { name: "" };
        const paymentObj  = state.payments.find(p => p.id === t.paymentId)    || { name: "" };

        const matchesText = !search ||
                            (t.note && t.note.toLowerCase().includes(search)) ||
                            categoryObj.name.toLowerCase().includes(search) ||
                            paymentObj.name.toLowerCase().includes(search) ||
                            txTags.some(tag => tag.includes(search)) ||
                            t.amount.toString().includes(search);

        return matchesCat && matchesPay && matchesDate && matchesMin && matchesMax && matchesTag && matchesText;
    });

    const sortMode = (document.getElementById("ledgerSortSelect") || {}).value || "date-desc";
    items.sort((a, b) => {
        if (sortMode === "amt-desc") return b.amount - a.amount;
        if (sortMode === "amt-asc")  return a.amount - b.amount;
        // date-desc (default) and date-asc both use createdAt for tiebreak
        const ta = a.createdAt ? new Date(a.createdAt) : new Date(a.date);
        const tb = b.createdAt ? new Date(b.createdAt) : new Date(b.date);
        return sortMode === "date-asc" ? ta - tb : tb - ta;
    });

    const runningById = new Map();
    let runningTotal = 0;
    [...items].sort((a, b) => {
        const da = new Date(a.date || a.createdAt || 0).getTime();
        const db = new Date(b.date || b.createdAt || 0).getTime();
        if (da !== db) return da - db;
        const ca = new Date(a.createdAt || a.date || 0).getTime();
        const cb = new Date(b.createdAt || b.date || 0).getTime();
        return ca - cb;
    }).forEach(tx => {
        runningTotal += Number(tx.amount || 0);
        runningById.set(tx.id, runningTotal);
    });

    // Update summary bar
    const total = items.reduce((s, t) => s + t.amount, 0);
    const countEl = document.getElementById("ledgerTxCount");
    const totalEl = document.getElementById("ledgerPeriodTotal");
    if (countEl) countEl.textContent = `${items.length} transaction${items.length !== 1 ? "s" : ""}`;
    if (totalEl) totalEl.textContent  = items.length ? `${state.currencySymbol}${total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}` : "—";
    syncLedgerBulkBar();

    if (items.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 text-center py-12">${t("No matching transactions found.", "🦴 No fossils match your search.")}</p>`;
        return;
    }

    // Separate split groups from normal transactions
    const renderedSplitGroups = new Set();

    items.forEach(t => {
        // Split group: render once as a parent+children block
        if (t.splitGroupId) {
            if (renderedSplitGroups.has(t.splitGroupId)) return;
            renderedSplitGroups.add(t.splitGroupId);

            // Collect ALL members of this group from filtered items
            const groupParts = items.filter(tx => tx.splitGroupId === t.splitGroupId)
                .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
            const groupTotal = groupParts.reduce((s, tx) => s + tx.amount, 0);
            const groupTags = Array.from(new Set(groupParts.flatMap(tx => Array.isArray(tx.tags) ? tx.tags : []).map(normalizeTag).filter(Boolean)));
            const pay = state.payments.find(p => p.id === t.paymentId) || { name: "Cash" };
            const dateStr = formatDateReadable(new Date(t.date), { year: '2-digit' });

            const groupWrapper = document.createElement("div");
            groupWrapper.className = "split-group-wrapper";
            groupWrapper.id = `split-group-${t.splitGroupId}`;

            // Parent row
            const parentRow = document.createElement("div");
            parentRow.className = "split-group-header bg-slate-900 border border-indigo-500/20 rounded-t-2xl px-3 py-3 flex justify-between items-center gap-2 cursor-pointer active:scale-95 transition-all";
            parentRow.onclick = () => groupWrapper.classList.toggle('split-group-expanded');
            parentRow.innerHTML = `
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <span class="split-badge shrink-0">Split</span>
                    <div class="min-w-0 flex-1">
                        <span class="text-[11px] font-bold text-slate-200 truncate block">${t.note || 'Split Transaction'}</span>
                        <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span class="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 shrink-0">
                                <svg class="w-2.5 h-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="14" height="10" rx="2"/><path d="M1 7h14"/><path d="M5 1v3M11 1v3"/></svg>
                                <span>${pay.name}</span>
                            </span>
                            <span class="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-950 text-slate-500 shrink-0">
                                <svg class="w-2.5 h-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="2" width="14" height="13" rx="2"/><path d="M1 6h14"/><path d="M5 1v2M11 1v2"/></svg>
                                ${dateStr}
                            </span>
                            <span class="text-[8px] text-slate-600">${groupParts.length} parts</span>
                        </div>
                        ${_renderTxTagChips(groupTags)}
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                    <span class="text-xs font-black text-indigo-300">${state.currencySymbol}${groupTotal.toLocaleString()}</span>
                    <span class="running-balance">Spent ${state.currencySymbol}${(runningById.get(t.id) || groupTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <div class="flex items-center gap-1">
                        <button onclick="event.stopPropagation(); loadExpenseToFormForEdit('${t.id}')" class="p-1 text-slate-600 hover:text-indigo-400 rounded hover:bg-slate-950 transition-all" title="Edit split">
                            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="event.stopPropagation(); deleteTransaction('${t.id}')" class="p-1 text-slate-600 hover:text-rose-400 rounded hover:bg-slate-950 transition-all" title="Delete split">
                            <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>`;
            groupWrapper.appendChild(parentRow);

            // Child rows container (collapsed by default)
            const childrenContainer = document.createElement("div");
            childrenContainer.className = "split-group-children border-l border-r border-b border-indigo-500/20 rounded-b-2xl overflow-hidden";
            groupParts.forEach((part, idx) => {
                const cat = state.categories.find(c => c.id === part.categoryId) || { name: "Other", color: "#64748b" };
                const isLast = idx === groupParts.length - 1;
                const child = document.createElement("div");
                child.id = `tx-row-${part.id}`;
                child.className = `split-child-row flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-950/60 ${isLast ? '' : 'border-b border-slate-800/50'}`;
                child.innerHTML = `
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                        <span class="w-0.5 self-stretch rounded-full shrink-0" style="background-color:${cat.color}"></span>
                        <span class="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0" style="background-color:${cat.color}22;color:${cat.color}">
                            <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color:${cat.color}"></span>
                            <span class="truncate max-w-[80px]">${cat.name}</span>
                        </span>
                        <span class="text-[10px] text-slate-500 truncate">${part.note || part.splitLabel || ''}</span>
                    </div>
                    <span class="text-[11px] font-bold text-slate-300 shrink-0">${state.currencySymbol}${part.amount.toLocaleString()}</span>`;
                childrenContainer.appendChild(child);
            });
            groupWrapper.appendChild(childrenContainer);
            container.appendChild(groupWrapper);
            return;
        }

        // Normal transaction rendering
        const cat = state.categories.find(c => c.id === t.categoryId) || { name: "Other", color: "#64748b" };
        const pay = state.payments.find(p => p.id === t.paymentId) || { name: "Cash" };
        const dateStr = formatDateReadable(new Date(t.date), { year: '2-digit' });
        const recurringBadge = (t.source === "recurring" || t.isRecurring)
            ? `<span class="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-950 text-violet-400 font-bold uppercase shrink-0" title="${t.sourceName || 'Recurring'}">Recurring</span>`
            : "";
        const tripBadge = t.tripRef
            ? `<span class="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-400 font-bold uppercase shrink-0">${t.tripType === "pre" ? "Pre-Trip" : "Trip"}</span>`
            : "";
        const tagChips = _renderTxTagChips(t.tags || []);

        const wrapper = document.createElement("div");
        wrapper.className = "swipe-row-wrapper";
        wrapper.id = `tx-wrap-${t.id}`;

        if (!t.tripRef && !ledgerSelectMode) {
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "swipe-delete-btn";
            deleteBtn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i><span>Delete</span>`;
            deleteBtn.onclick = event => {
                event.stopPropagation();
                closeOpenSwipeRow();
                deleteTransaction(t.id);
            };
            wrapper.appendChild(deleteBtn);
        }

        const card = document.createElement("div");
        card.id = `tx-row-${t.id}`;
        const isSelected = ledgerSelectedIds.has(t.id);
        card.className = `tx-row bg-slate-900 border border-slate-850 rounded-2xl px-3 py-3 flex justify-between items-stretch gap-2 transition-all ${isSelected ? "selected" : ""}`;

        const actionButtons = ledgerSelectMode
            ? (t.tripRef
                ? `<span class="p-1 text-slate-700" title="Managed via Trip"><i data-lucide="lock" class="w-3.5 h-3.5"></i></span>`
                : `<span class="text-[8px] font-bold uppercase tracking-wide text-slate-600">Select</span>`)
            : (t.tripRef
            ? `<span class="p-1 text-slate-700" title="Managed via Trip"><i data-lucide="lock" class="w-3.5 h-3.5"></i></span>`
            : `<button onclick="loadExpenseToFormForEdit('${t.id}')" class="p-1 text-slate-600 hover:text-indigo-400 rounded hover:bg-slate-950 transition-all" title="Edit">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteTransaction('${t.id}')" class="p-1 text-slate-600 hover:text-rose-400 rounded hover:bg-slate-950 transition-all" title="Delete">
                        <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                    </button>`);

        const clickHandler = t.tripRef
            ? ""
            : (ledgerSelectMode ? `onclick="toggleLedgerRowSelect('${t.id}')"` : `onclick="loadExpenseToFormForEdit('${t.id}')"`);
        const selectControl = ledgerSelectMode && !t.tripRef
            ? `<button type="button" onclick="event.stopPropagation(); toggleLedgerRowSelect('${t.id}')"
                    class="ledger-select-check ${isSelected ? "active" : ""}" aria-label="${isSelected ? "Deselect" : "Select"} transaction">
                    <i data-lucide="${isSelected ? "check" : "circle"}" class="w-3.5 h-3.5"></i>
                </button>`
            : "";

        const canInlineEdit = !t.tripRef && !ledgerSelectMode;
        const noteSpanHtml = canInlineEdit
            ? `<span id="tx-inline-note-${t.id}" class="text-[11px] font-bold text-slate-200 truncate cursor-pointer hover:text-indigo-300" title="Tap to edit note" onclick="startInlineEdit(event,'${t.id}','note')">${t.note || cat.name}</span>`
            : `<span class="text-[11px] font-bold text-slate-200 truncate">${t.note || cat.name}</span>`;
        const amountSpanHtml = canInlineEdit
            ? `<span id="tx-inline-amount-${t.id}" class="text-xs font-black text-indigo-300 cursor-pointer hover:text-indigo-200 hover:underline" title="Tap to edit amount" onclick="startInlineEdit(event,'${t.id}','amount')">${state.currencySymbol}${t.amount.toLocaleString()}</span>`
            : `<span class="text-xs font-black text-indigo-300">${state.currencySymbol}${t.amount.toLocaleString()}</span>`;

        card.dataset.txId = t.id;
        card.innerHTML = `
            ${selectControl}
            <div class="flex items-stretch gap-2.5 min-w-0 flex-1 ${t.tripRef ? "cursor-default" : "cursor-pointer active:scale-95"}" ${clickHandler}>
                <span class="w-1 self-stretch rounded-full shrink-0" style="background-color: ${cat.color}"></span>
                <div class="min-w-0 flex-1 space-y-1 py-0.5">
                    <div class="flex items-center gap-1.5 min-w-0">
                        ${noteSpanHtml}
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
                    </div>
                    <div class="flex items-center">
                        <span class="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-950 text-slate-500 shrink-0">
                            <svg class="w-2.5 h-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="2" width="14" height="13" rx="2"/><path d="M1 6h14"/><path d="M5 1v2M11 1v2"/></svg>
                            ${dateStr}
                        </span>
                    </div>
                    ${tagChips}
                </div>
            </div>
            <div class="flex flex-col items-end gap-1.5 shrink-0 ml-1">
                ${amountSpanHtml}
                <span class="running-balance">Spent ${state.currencySymbol}${(runningById.get(t.id) || t.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <div class="flex items-center gap-1">
                    ${actionButtons}
                </div>
            </div>
        `;
        wrapper.appendChild(card);
        container.appendChild(wrapper);
        if (!t.tripRef && !ledgerSelectMode) attachSwipeToDelete(card, t.id);
    });

    initLucideIcons();
}

/* === Inline Edit (amount + note) === */
let _inlineEditActive = false;

function startInlineEdit(event, txId, field) {
    event.stopPropagation();
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx || tx.tripRef) return;
    // Prevent two inline edits at once
    if (_inlineEditActive) return;

    const spanId = field === "amount" ? `tx-inline-amount-${txId}` : `tx-inline-note-${txId}`;
    const span = document.getElementById(spanId);
    if (!span) return;

    _inlineEditActive = true;
    const currentVal = field === "amount" ? String(tx.amount) : (tx.note || "");

    const input = document.createElement("input");
    input.type = field === "amount" ? "number" : "text";
    input.value = currentVal;
    input.className = "inline-edit-input";
    if (field === "amount") {
        input.min = "0.01";
        input.step = "any";
        input.style.width = "70px";
    } else {
        input.placeholder = "Add note…";
        input.maxLength = 120;
    }

    span.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
        commitInlineEdit(txId, field, input.value, input);
    };
    const cancel = () => {
        _inlineEditActive = false;
        // Restore original span without saving
        const restoredSpan = _buildInlineSpan(txId, field, tx);
        if (input.parentNode) input.replaceWith(restoredSpan);
    };

    input.addEventListener("blur", commit, { once: true });
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); input.blur(); }
        if (e.key === "Escape") { input.removeEventListener("blur", commit); cancel(); }
    });
}

function _buildInlineSpan(txId, field, tx) {
    const span = document.createElement("span");
    if (field === "amount") {
        span.id = `tx-inline-amount-${txId}`;
        span.className = "text-xs font-black text-indigo-300 cursor-pointer hover:text-indigo-200 hover:underline";
        span.title = "Tap to edit amount";
        span.textContent = `${state.currencySymbol}${tx.amount.toLocaleString()}`;
        span.addEventListener("click", e => startInlineEdit(e, txId, "amount"));
    } else {
        const cat = state.categories.find(c => c.id === tx.categoryId) || { name: "Other" };
        span.id = `tx-inline-note-${txId}`;
        span.className = "text-[11px] font-bold text-slate-200 truncate cursor-pointer hover:text-indigo-300";
        span.title = "Tap to edit note";
        span.textContent = tx.note || cat.name;
        span.addEventListener("click", e => startInlineEdit(e, txId, "note"));
    }
    return span;
}

function commitInlineEdit(txId, field, rawValue, inputEl) {
    _inlineEditActive = false;
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) return;

    if (field === "amount") {
        const parsed = parseFloat(rawValue);
        if (isNaN(parsed) || parsed <= 0) {
            showNotification(t("Amount must be a positive number.", "TReX needs a real amount."));
            // Restore span with original value
            const span = _buildInlineSpan(txId, field, tx);
            if (inputEl.parentNode) inputEl.replaceWith(span);
            return;
        }
        if (parsed === tx.amount) {
            const span = _buildInlineSpan(txId, field, tx);
            if (inputEl.parentNode) inputEl.replaceWith(span);
            return;
        }
        tx.amount = parsed;
    } else {
        const newNote = rawValue.trim();
        if (newNote === (tx.note || "")) {
            const span = _buildInlineSpan(txId, field, tx);
            if (inputEl.parentNode) inputEl.replaceWith(span);
            return;
        }
        tx.note = newNote;
    }

    saveStateToLocalStorage();
    playSound(S.SAVE);

    // Update only the changed span in-place (no full re-render = no scroll jump)
    const span = _buildInlineSpan(txId, field, tx);
    if (inputEl.parentNode) inputEl.replaceWith(span);

    // If note changed, also update the running balance display (amount didn't change, skip)
    if (field === "amount") {
        // Recompute running balances for all visible rows
        _refreshRunningBalances();
    }

    updateAppDashboardView();
}

function _refreshRunningBalances() {
    // Re-compute running totals over the currently rendered rows
    const container = document.getElementById("historyList");
    if (!container) return;
    const rows = [...container.querySelectorAll("[data-tx-id]")];
    const ids = rows.map(r => r.dataset.txId);
    const txMap = new Map(state.transactions.map(t => [t.id, t]));

    // Sort ascending (same logic as renderHistoryList running total)
    const sorted = ids
        .map(id => txMap.get(id))
        .filter(Boolean)
        .sort((a, b) => {
            const da = new Date(a.date || a.createdAt || 0).getTime();
            const db = new Date(b.date || b.createdAt || 0).getTime();
            if (da !== db) return da - db;
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        });

    let running = 0;
    const runningById = new Map();
    sorted.forEach(tx => {
        running += Number(tx.amount || 0);
        runningById.set(tx.id, running);
    });

    ids.forEach(id => {
        const tx = txMap.get(id);
        if (!tx) return;
        const balEl = container.querySelector(`#tx-row-${id} .running-balance`);
        if (balEl) {
            balEl.textContent = `Spent ${state.currencySymbol}${(runningById.get(id) || tx.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        }
    });
}

function chooseSplitDeleteScope(tx, groupParts, total) {
    return new Promise(resolve => {
        const old = document.getElementById("splitDeleteChoiceModal");
        if (old) old.remove();

        const div = document.createElement("div");
        div.id = "splitDeleteChoiceModal";
        div.className = "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[125] flex items-center justify-center p-4";
        div.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4">
                <div class="flex items-start gap-3">
                    <div class="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                        <i data-lucide="split" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h3 class="text-xs font-extrabold text-white uppercase tracking-wider">Delete split?</h3>
                        <p class="text-[10px] text-slate-400 leading-relaxed mt-1">
                            This split has ${groupParts.length} parts totaling ${state.currencySymbol}${total.toLocaleString()}.
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-2">
                    <button type="button" id="splitDeletePartBtn"
                        class="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs active:scale-95">
                        Delete This Part Only
                    </button>
                    <button type="button" id="splitDeleteAllBtn"
                        class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs active:scale-95">
                        Delete All Parts
                    </button>
                    <button type="button" id="splitDeleteCancelBtn"
                        class="w-full text-slate-500 font-bold py-2 rounded-xl text-xs active:scale-95">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        const cleanup = value => {
            div.remove();
            resolve(value);
        };

        document.body.appendChild(div);
        document.getElementById("splitDeletePartBtn").onclick = () => cleanup("part");
        document.getElementById("splitDeleteAllBtn").onclick = () => cleanup("all");
        document.getElementById("splitDeleteCancelBtn").onclick = () => cleanup(null);
        initLucideIcons(div);
    });
}

async function deleteTransaction(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (tx && tx.tripRef) { showNotification(t("Edit this expense inside the Trip.", "This fossil belongs to a trip. Edit it there.")); return; }

    if (tx && tx.splitGroupId) {
        const groupParts = state.transactions.filter(t => t.splitGroupId === tx.splitGroupId);
        const total = groupParts.reduce((s, t) => s + t.amount, 0);
        const scope = await chooseSplitDeleteScope(tx, groupParts, total);
        if (!scope) return;

        const rowEls = (scope === "all" ? groupParts : [tx])
            .map(t => document.getElementById(`tx-row-${t.id}`))
            .filter(Boolean);
        if (dp('dinoMode') && rowEls.length) {
            rowEls.forEach(r => r.classList.add('going-extinct'));
            await new Promise(r => setTimeout(r, 380));
        }

        if (scope === "all") {
            state.transactions = state.transactions.filter(t => t.splitGroupId !== tx.splitGroupId);
            showNotification(t("Split transaction deleted.", "🦴 Split fossils gone extinct."));
        } else {
            state.transactions = state.transactions.filter(t => t.id !== tx.id);
            const remaining = state.transactions.filter(t => t.splitGroupId === tx.splitGroupId);
            if (remaining.length === 1) {
                remaining[0].splitGroupId = null;
                remaining[0].splitLabel = null;
            }
            showNotification(t("Split part deleted.", "🦴 Split fossil gone extinct."));
        }

        saveStateToLocalStorage();
        playSound(S.DELETE);
        filterHistory();
        refreshCreditCardViews();
        updateAppDashboardView();
        return;
    }

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
