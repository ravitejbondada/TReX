/**
 * ledger-templates.js - Transaction Presets
 * TReX - Devour Your Expenses
 *
 * Saves reusable expense combinations and renders compact apply-to-form chips
 * in Add Expense.
 *
 * Dependencies: core.js, transactions.js
 */

function ensureTransactionTemplates() {
    if (!Array.isArray(state.transactionTemplates)) state.transactionTemplates = [];
    return state.transactionTemplates;
}

function getTemplateMeta(template) {
    const cat = state.categories.find(c => c.id === template.categoryId) || { name: "Category", color: "#64748b" };
    const pay = state.payments.find(p => p.id === template.paymentId) || { name: "Payment" };
    return { cat, pay };
}

function renderTransactionTemplatesBars() {
    const templates = ensureTransactionTemplates();
    const hosts = [document.getElementById("expenseTemplatesPanel")].filter(Boolean);

    hosts.forEach(host => {
        if (!templates.length) {
            host.classList.add("hidden");
            host.innerHTML = "";
            return;
        }
        host.classList.remove("hidden");
        host.innerHTML = `
            <div class="templates-scroll">
                ${templates.map(template => {
                    const { cat } = getTemplateMeta(template);
                    return `
                        <button type="button" onclick="applyTemplateToExpenseForm('${template.id}')"
                            class="template-chip" style="--template-color:${cat.color}">
                            <span class="template-dot"></span>
                            <span class="truncate max-w-[7.5rem]">${template.name}</span>
                            <span class="template-amount">${state.currencySymbol}${Number(template.amount || 0).toLocaleString()}</span>
                        </button>
                    `;
                }).join("")}
                <button type="button" onclick="openTemplatesManager()"
                    class="template-manage-chip" title="Manage presets" aria-label="Manage presets">
                    <i data-lucide="settings-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        `;
    });
    initLucideIcons();
}

function saveCurrentAsTemplate() {
    ensureTransactionTemplates();
    const amount = parseFloat(document.getElementById("expenseAmount").value);
    const categoryId = document.getElementById("expenseCategory").value;
    const paymentId = expensePaymentLockId || document.getElementById("expensePayment").value;
    const note = document.getElementById("expenseNote").value.trim();

    if (!Number.isFinite(amount) || amount <= 0 || !categoryId || !paymentId) {
        showNotification("Enter amount, category, and payment before saving a preset.");
        return;
    }

    const fallbackName = note || (state.categories.find(c => c.id === categoryId) || {}).name || "Preset";
    const name = (prompt("Preset name", fallbackName) || "").trim();
    if (!name) return;

    const existing = state.transactionTemplates.find(t => t.name.toLowerCase() === name.toLowerCase());
    const template = {
        id: existing ? existing.id : `tpl_${Date.now()}`,
        name,
        amount,
        categoryId,
        paymentId,
        note,
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (existing) {
        Object.assign(existing, template);
    } else {
        state.transactionTemplates.unshift(template);
    }
    saveStateToLocalStorage();
    renderTransactionTemplatesBars();
    showNotification("Preset saved.");
}

function applyTemplateToExpenseForm(templateId) {
    const template = ensureTransactionTemplates().find(t => t.id === templateId);
    if (!template) return;
    if (document.getElementById("addExpenseView").classList.contains("hidden")) {
        switchScreen("addExpense");
    }
    setupExpenseFormForAdd();
    document.getElementById("expenseAmount").value = template.amount;
    document.getElementById("expenseCategory").value = template.categoryId;
    applyCategoryDefaultPayment();
    if (!expensePaymentLockId) document.getElementById("expensePayment").value = template.paymentId;
    document.getElementById("expenseNote").value = template.note || "";
}

function openTemplatesManager() {
    ensureTransactionTemplates();
    const existing = document.getElementById("templatesManagerModal");
    if (existing) existing.remove();

    const div = document.createElement("div");
    div.id = "templatesManagerModal";
    div.className = "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4";
    div.innerHTML = `
        <div class="templates-modal">
            <div class="flex items-center justify-between gap-3">
                <h3 class="text-xs font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
                    <i data-lucide="bookmark" class="w-4 h-4 text-indigo-400"></i> Presets
                </h3>
                <button type="button" onclick="closeTemplatesManager()" class="p-2 rounded-xl text-slate-500 hover:text-slate-300">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div id="templatesManagerList" class="space-y-2 max-h-[52vh] overflow-y-auto no-scrollbar"></div>
            <button type="button" onclick="closeTemplatesManager()"
                class="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3 rounded-xl text-xs active:scale-95">
                Done
            </button>
        </div>
    `;
    document.body.appendChild(div);
    renderTemplatesManagerList();
    initLucideIcons(div);
}

function renderTemplatesManagerList() {
    const list = document.getElementById("templatesManagerList");
    if (!list) return;
    const templates = ensureTransactionTemplates();
    if (!templates.length) {
        list.innerHTML = `<p class="text-[11px] text-slate-500 text-center py-6">No presets saved yet.</p>`;
        return;
    }
    list.innerHTML = templates.map(template => {
        const { cat, pay } = getTemplateMeta(template);
        return `
            <div class="template-manager-row">
                <span class="w-1 self-stretch rounded-full shrink-0" style="background:${cat.color}"></span>
                <div class="min-w-0 flex-1">
                    <p class="text-xs font-bold text-slate-200 truncate">${template.name}</p>
                    <p class="text-[9px] text-slate-500 truncate">${state.currencySymbol}${Number(template.amount || 0).toLocaleString()} - ${cat.name} - ${pay.name}</p>
                </div>
                <button type="button" onclick="applyTemplateToExpenseForm('${template.id}'); closeTemplatesManager();"
                    class="p-2 rounded-lg text-indigo-400 bg-indigo-950/30 border border-indigo-500/20" title="Use">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" onclick="deleteTemplate('${template.id}')"
                    class="p-2 rounded-lg text-rose-400 bg-rose-950/30 border border-rose-500/20" title="Delete">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        `;
    }).join("");
    initLucideIcons(list);
}

async function deleteTemplate(templateId) {
    const template = ensureTransactionTemplates().find(t => t.id === templateId);
    if (!template) return;
    if (!await customConfirm(`Delete preset "${template.name}"?`, "Delete preset?", "Delete")) return;
    state.transactionTemplates = state.transactionTemplates.filter(t => t.id !== templateId);
    saveStateToLocalStorage();
    renderTemplatesManagerList();
    renderTransactionTemplatesBars();
}

function closeTemplatesManager() {
    const modal = document.getElementById("templatesManagerModal");
    if (modal) modal.remove();
}
