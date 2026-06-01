/**
 * recurring.js — Recurring Expenses & EMIs
 * TReX � Devour Your Expenses
 *
 * Date utility helpers (getTodayISO, parseISODate, formatISODate),
 * recurring expense modal, save/delete/process recurring entries,
 * EMI modal, EMI schedule preview, EMI calculations, EMI processing,
 * post-entry helpers for both recurring and EMI transactions.
 *
 * Dependencies: core.js must load before all other modules.
 * Global state: window.state (defined in core.js)
 */

function getTodayISO() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return formatISODate(d);
}

function parseISODate(str) {
    const [y, m, day] = str.split("-").map(Number);
    return new Date(y, m - 1, day);
}

function formatISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function addDaysISO(dateStr, days) {
    const d = parseISODate(dateStr);
    d.setDate(d.getDate() + days);
    return formatISODate(d);
}

function getMonthLastDay(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
}

function isRecurringDateDue(rec, dateStr) {
    if (rec.paused || !rec.startDate || dateStr < rec.startDate) return false;
    if (rec.freq === "daily") return true;

    const start = parseISODate(rec.startDate);
    const date = parseISODate(dateStr);
    if (rec.freq === "weekly") {
        const diffDays = Math.round((date - start) / 86400000);
        return diffDays >= 0 && diffDays % 7 === 0;
    }

    const desiredDay = start.getDate();
    const dueDay = Math.min(desiredDay, getMonthLastDay(date.getFullYear(), date.getMonth()));
    return date.getDate() === dueDay;
}

function getRecurringDueDates(rec, upToDate = getTodayISO()) {
    if (rec.paused || !rec.startDate) return [];
    const dates = [];
    let cursor = rec.lastPostedDate ? addDaysISO(rec.lastPostedDate, 1) : rec.startDate;
    while (cursor <= upToDate) {
        if (isRecurringDateDue(rec, cursor)) dates.push(cursor);
        cursor = addDaysISO(cursor, 1);
    }
    return dates;
}

function isRecurringDueToday(rec) {
    return getRecurringDueDates(rec).length > 0;
}

function toggleRecurringPause(id) {
    const rec = state.recurringExpenses.find(r => r.id === id);
    if (!rec) return;

    if (rec.paused) {
        const today = getTodayISO();
        const minDate = rec.lastPostedDate ? addDaysISO(rec.lastPostedDate, 1) : rec.startDate;
        const resumeDate = (window.prompt("Resume from date (YYYY-MM-DD)", today) || "").trim();
        if (!resumeDate) return;
        if (resumeDate < minDate || resumeDate > today) {
            showNotification(t(`Resume date must be between ${minDate} and ${today}.`, `Resume trail must be between ${minDate} and ${today}.`));
            return;
        }
        rec.paused = false;
        rec.lastPostedDate = addDaysISO(resumeDate, -1);
    } else {
        rec.paused = true;
    }

    rec.updatedAt = new Date().toISOString();
    saveStateToLocalStorage();
    processRecurringExpenses();
    renderRecurringExpenses();
    playSound(S.SYSTEM);
    showNotification(t(rec.paused ? "Schedule paused." : "Schedule resumed.", rec.paused ? "Stampede paused." : "Stampede resumed."));
}

function openRecurringModal(editId) {
    if (typeof closeDrawer === "function") closeDrawer();
    const modal = document.getElementById("recurringModal");
    modal.classList.remove("hidden");

    const catSel = document.getElementById("recurringCategory");
    const paySel = document.getElementById("recurringPayment");
    catSel.innerHTML = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    paySel.innerHTML = state.payments.filter(p => !p.archived).map(p => `<option value="${p.id}">${p.name}</option>`).join("");

    if (editId) {
        const rec = state.recurringExpenses.find(r => r.id === editId);
        if (rec) {
            document.getElementById("recurringModalTitle").textContent = "Edit Recurring Expense";
            document.getElementById("recurringEditId").value = rec.id;
            document.getElementById("recurringName").value = rec.name;
            document.getElementById("recurringAmount").value = rec.amount;
            document.getElementById("recurringFreq").value = rec.freq;
            document.getElementById("recurringStartDate").value = rec.startDate || getTodayISO();
            document.getElementById("recurringNote").value = rec.note || "";
            catSel.value = rec.categoryId;
            paySel.value = rec.paymentId;
        }
    } else {
        document.getElementById("recurringModalTitle").textContent = "New Recurring Expense";
        document.getElementById("recurringEditId").value = "";
        document.getElementById("recurringName").value = "";
        document.getElementById("recurringAmount").value = "";
        document.getElementById("recurringFreq").value = "monthly";
        document.getElementById("recurringStartDate").value = getTodayISO();
        document.getElementById("recurringNote").value = "";
    }

    initLucideIcons(document.getElementById("recurringModal"));
}

function closeRecurringModal() {
    document.getElementById("recurringModal").classList.add("hidden");
}

function saveRecurring() {
    const name = document.getElementById("recurringName").value.trim();
    const amount = parseFloat(document.getElementById("recurringAmount").value);
    const freq = document.getElementById("recurringFreq").value;
    const startDate = document.getElementById("recurringStartDate").value;
    const categoryId = document.getElementById("recurringCategory").value;
    const paymentId = document.getElementById("recurringPayment").value;
    const note = document.getElementById("recurringNote").value.trim();
    const editId = document.getElementById("recurringEditId").value;

    if (!name || isNaN(amount) || amount <= 0 || !startDate) {
        showNotification(t("Please provide a name, amount, and start date.", "This stampede needs a name, amount, and start date."));
        return;
    }

    if (!state.recurringExpenses) state.recurringExpenses = [];

    if (editId) {
        const idx = state.recurringExpenses.findIndex(r => r.id === editId);
        if (idx !== -1) {
            const existing = state.recurringExpenses[idx];
            const startChanged = existing.startDate !== startDate;
            state.recurringExpenses[idx] = {
                ...existing,
                name, amount, freq, startDate, categoryId, paymentId, note,
                paused: existing.paused || false,
                lastPostedDate: startChanged ? null : (existing.lastPostedDate || null),
                updatedAt: new Date().toISOString()
            };
            playSound(S.SYSTEM);
        showNotification(t(`Recurring schedule "${name}" updated.`, `Stampede "${name}" redirected.`));
        }
    } else {
        const newRec = {
            id: "rec_" + Date.now(),
            name, amount, freq, startDate, categoryId, paymentId, note,
            paused: false,
            lastPostedDate: null,
            createdAt: new Date().toISOString()
        };
        state.recurringExpenses.push(newRec);
        playSound(S.SAVE);
    showNotification(t("Schedule saved.", "🔁 Stampede scheduled."));
    }

    saveStateToLocalStorage();
    closeRecurringModal();
    renderRecurringExpenses();
    processRecurringExpenses();
}

async function deleteRecurring(id) {
    const rec = state.recurringExpenses.find(r => r.id === id);
    if (!rec) return;
    const label = rec.note ? `"${rec.note}"` : "this recurring schedule";
    if (!await customConfirm(t(`Delete ${label}? Past entries remain in ledger.`, `Stop ${label}? Past entries remain in ledger.`), t("Stop this schedule?", "Stop the stampede?"), t("Stop", "Stop it"))) return;
    state.recurringExpenses = state.recurringExpenses.filter(r => r.id !== id);
    saveStateToLocalStorage();
    renderRecurringExpenses();
    updateAppDashboardView();
    playSound(S.DELETE);
    showNotification(t("Recurring schedule removed.", "Stampede stopped."));
}

function renderRecurringExpenses() {
    if (!state.recurringExpenses) state.recurringExpenses = [];
    const list = [...state.recurringExpenses].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    const symbol = state.currencySymbol;

    const dashContainer = document.getElementById("dashboardRecurringList");
    const dashEmpty = document.getElementById("dashboardRecurringEmpty");
    const countBadge = document.getElementById("recurringCountBadge");
    if (countBadge) {
        if (list.length > 0) {
            countBadge.textContent = list.length;
            countBadge.classList.remove("hidden");
        } else {
            countBadge.classList.add("hidden");
        }
    }
    if (dashContainer) {
        if (list.length === 0) {
            dashContainer.innerHTML = "";
            if (dashEmpty) {
                dashEmpty.textContent = t("No recurring expenses configured.", "🔁 No stampedes scheduled yet.");
                dashEmpty.classList.remove("hidden");
            }
        } else {
            if (dashEmpty) dashEmpty.classList.add("hidden");
            dashContainer.innerHTML = list.map(r => {
                const cat = state.categories.find(c => c.id === r.categoryId);
                const freqColors = { daily: "text-amber-400", weekly: "text-cyan-400", monthly: "text-violet-400" };
                const freqColor = freqColors[r.freq] || "text-slate-400";
                return `
                <div class="${r.paused ? 'bg-slate-950 border border-slate-800 opacity-60' : 'bg-slate-950 border border-slate-850'} p-3.5 rounded-xl flex justify-between items-center">
                    <div class="min-w-0 pr-2">
                        <span class="text-xs font-bold text-slate-100 block truncate">${r.name}${r.paused ? ' <span style=\"font-size:8px;color:#f59e0b;font-weight:700\">PAUSED</span>' : ''}</span>
                        <span class="text-[9px] ${freqColor} uppercase font-bold block mt-0.5">${r.freq} &bull; from ${r.startDate || "—"}</span>
                        ${cat ? `<span class="text-[9px] text-slate-500 block mt-0.5">Folder: ${cat.name}</span>` : ""}
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0 ml-2">
                        <span class="text-xs font-extrabold text-indigo-400">${symbol}${r.amount.toLocaleString()}</span>
                        <button onclick="toggleRecurringPause('${r.id}')" class="p-1 hover:bg-slate-800 rounded-lg transition-all ${r.paused ? 'text-amber-400' : 'text-slate-500'} hover:text-amber-400" title="${r.paused ? 'Resume' : 'Pause'}">
                            <i data-lucide="${r.paused ? 'play' : 'pause'}" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="openRecurringModal('${r.id}')" class="p-1 hover:bg-slate-800 rounded-lg transition-all text-slate-500 hover:text-indigo-400">
                            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="deleteRecurring('${r.id}')" class="p-1 hover:bg-slate-800 rounded-lg transition-all text-slate-500 hover:text-rose-400">
                            <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>`;
            }).join("");
        }
    }

    const settContainer = document.getElementById("settingsRecurringList");
    const settEmpty = document.getElementById("settingsRecurringEmpty");
    const settBadge = document.getElementById("settingsRecurringCountBadge");
    if (settBadge) {
        if (list.length > 0) { settBadge.textContent = list.length; settBadge.classList.remove("hidden"); }
        else settBadge.classList.add("hidden");
    }
    if (settContainer) {
        if (list.length === 0) {
            settContainer.innerHTML = "";
            if (settEmpty) {
                settEmpty.textContent = t("No recurring expenses configured.", "🔁 No stampedes scheduled yet.");
                settEmpty.classList.remove("hidden");
            }
        } else {
            if (settEmpty) settEmpty.classList.add("hidden");
            settContainer.innerHTML = list.map(r => {
                const cat = state.categories.find(c => c.id === r.categoryId);
                const pay = state.payments.find(p => p.id === r.paymentId);
                const freqColors = { daily: "text-amber-400", weekly: "text-cyan-400", monthly: "text-violet-400" };
                const freqColor = freqColors[r.freq] || "text-slate-400";
                return `
                <div class="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-[11px] font-bold text-slate-100 block">${r.name}</span>
                            <div class="flex gap-1.5 mt-1.5 flex-wrap">
                                <span class="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 ${freqColor} font-bold uppercase">${r.freq}</span>
                                <span class="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-500">from ${r.startDate || "—"}</span>
                                ${cat ? `<span class="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400">${cat.name}</span>` : ""}
                                ${pay ? `<span class="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400">${pay.name}</span>` : ""}
                            </div>
                        </div>
                        <span class="text-xs font-extrabold text-indigo-400 shrink-0">${symbol}${r.amount.toLocaleString()}</span>
                    </div>
                    <div class="flex gap-2 pt-0.5">
                        <button onclick="toggleRecurringPause('${r.id}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-[10px] ${r.paused ? 'text-amber-400' : 'text-slate-400'} font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1">
                            <i data-lucide="${r.paused ? 'play' : 'pause'}" class="w-3 h-3"></i> ${r.paused ? 'Resume' : 'Pause'}
                        </button>
                        <button onclick="openRecurringModal('${r.id}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-indigo-400 font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1">
                            <i data-lucide="pencil" class="w-3 h-3"></i> Edit
                        </button>
                        <button onclick="deleteRecurring('${r.id}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-rose-400 font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1">
                            <i data-lucide="trash" class="w-3 h-3"></i> Delete
                        </button>
                    </div>
                </div>`;
            }).join("");
        }
    }

    initLucideIcons();
}

function processRecurringExpenses() {
    if (!state.recurringExpenses || state.recurringExpenses.length === 0) return;
    const today = getTodayISO();
    let anyPosted = false;

    state.recurringExpenses.forEach(rec => {
        const dueDates = getRecurringDueDates(rec, today);
        if (dueDates.length === 0) return;
        dueDates.forEach(dateStr => postRecurringEntry(rec, dateStr));
        rec.lastPostedDate = dueDates[dueDates.length - 1];
        rec.updatedAt = new Date().toISOString();
        anyPosted = true;
    });

    if (anyPosted) {
        saveStateToLocalStorage();
        updateAppDashboardView();
    }
}

function postRecurringEntry(rec, dateStr) {
    // Use end-of-day on dateStr as createdAt so catch-up batches sort correctly
    // (multiple entries posted at once would otherwise share the same "now" timestamp)
    const [y, m, d] = dateStr.split("-").map(Number);
    const entryTs = new Date(y, m - 1, d, 23, 59, 59, 0).toISOString();
    const newTx = {
        id: "tx_rec_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        amount: rec.amount,
        categoryId: rec.categoryId,
        paymentId: rec.paymentId,
        date: dateStr,
        note: (rec.note ? rec.note + " " : "") + `[Auto: ${rec.name}]`,
        source: "recurring",
        sourceName: rec.name,
        createdAt: entryTs
    };
    state.transactions.push(newTx);
}

/* ═══════════════════════════════════════════════════════
   EMI FUNCTIONS (P0)
═══════════════════════════════════════════════════════ */
function openEMIFromCreditCard() {
    if (!activeCreditCardId) return;
    emiFormPaymentLockId = activeCreditCardId;
    openEMIModal();
}

function openEMIModal(emiId = "") {
    if (typeof closeDrawer === "function") closeDrawer();
    const catSel = document.getElementById("emiCategory");
    const paySel = document.getElementById("emiPayment");
    if (!catSel || !paySel) return;

    // Categories
    catSel.innerHTML = "";
    state.categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        catSel.appendChild(opt);
    });

    // Credit Cards only
    paySel.innerHTML = "";
    const ccCards = state.payments.filter(p => !p.archived && (p.type === "Credit Card" || p.type === "CC"));
    if (ccCards.length === 0) {
        showNotification(t("Please add a Credit Card payment method first.", "Add a credit card cave before creating an EMI."));
        return;
    }
    ccCards.forEach(pay => {
        const opt = document.createElement("option");
        opt.value = pay.id;
        opt.textContent = pay.name;
        paySel.appendChild(opt);
    });

    if (emiId) {
        const emi = state.emis.find(e => e.id === emiId);
        if (emi) {
            document.getElementById("emiModalTitle").textContent = "Edit Credit Card EMI";
            document.getElementById("emiEditId").value = emi.id;
            document.getElementById("emiName").value = emi.name;
            document.getElementById("emiPrincipal").value = emi.principal;
            document.getElementById("emiProcessingFee").value = emi.processingFee || 0;
            document.getElementById("emiInterestRate").value = emi.interestRate;
            document.getElementById("emiTenure").value = emi.tenure;
            document.getElementById("emiStartDate").value = emi.startDate || getTodayISO();
            document.getElementById("emiNote").value = emi.note || "";
            catSel.value = emi.categoryId;
            paySel.value = emi.paymentId;
        }
    } else {
        document.getElementById("emiModalTitle").textContent = "New Credit Card EMI";
        document.getElementById("emiEditId").value = "";
        document.getElementById("emiName").value = "";
        document.getElementById("emiPrincipal").value = "";
        document.getElementById("emiProcessingFee").value = "";
        document.getElementById("emiInterestRate").value = "";
        document.getElementById("emiTenure").value = "12";
        document.getElementById("emiStartDate").value = getTodayISO();
        document.getElementById("emiNote").value = "";
    }

    // Handle payment dropdown disable state
    const paymentAddBtn = document.getElementById("emiPaymentAddBtn");
    const paymentLockNote = document.getElementById("emiPaymentLockNote");
    
    if (emiFormPaymentLockId) {
        // Locked to a specific card
        paySel.value = emiFormPaymentLockId;
        paySel.disabled = true;
        paySel.classList.add("opacity-75", "cursor-not-allowed", "bg-slate-900");
        if (paymentAddBtn) paymentAddBtn.classList.add("hidden");
        if (paymentLockNote) paymentLockNote.classList.remove("hidden");
    } else {
        // Free selection in settings
        paySel.disabled = false;
        paySel.classList.remove("opacity-75", "cursor-not-allowed", "bg-slate-900");
        if (paymentAddBtn) paymentAddBtn.classList.remove("hidden");
        if (paymentLockNote) paymentLockNote.classList.add("hidden");
    }

    calculateEMILivePreview();
    document.getElementById("emiModal").classList.remove("hidden");
    initLucideIcons(document.getElementById("emiModal"));
}

function closeEMIModal() {
    emiFormPaymentLockId = "";
    document.getElementById("emiModal").classList.add("hidden");
}

function openEMIScheduleModal(emiId) {
    const emi = (state.emis || []).find(e => e.id === emiId);
    if (!emi) return;

    const sym = state.currencySymbol || "₹";
    const principal = emi.principal || 0;
    const rateYear = emi.interestRate || 0;
    const tenure = emi.tenure || 0;
    const startDate = emi.startDate ? new Date(emi.startDate) : new Date();
    startDate.setHours(0, 0, 0, 0);

    // Build per-row amortisation
    const r = rateYear > 0 ? (rateYear / 12) / 100 : 0;
    const emiAmt = emi.emiAmount || 0;
    const paidInstallments = new Set(emi.postedInstallments || []);

    const schedule = [];
    let balance = principal;
    for (let i = 1; i <= tenure; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + (i - 1));
        const dueDateStr = toLocalISODate(dueDate);

        const interestPart = r > 0 ? parseFloat((balance * r).toFixed(2)) : 0;
        const principalPart = parseFloat(Math.min(balance, emiAmt - interestPart).toFixed(2));
        balance = parseFloat(Math.max(0, balance - principalPart).toFixed(2));
        const isPaid = paidInstallments.has(dueDateStr);

        schedule.push({ num: i, date: dueDateStr, emi: emiAmt, principal: principalPart, interest: interestPart, balance, isPaid });
    }

    // Header
    const pay = state.payments.find(p => p.id === emi.paymentId);
    document.getElementById("emiScheduleTitle").textContent = emi.name;
    document.getElementById("emiScheduleMeta").textContent =
        (pay ? pay.name + " · " : "") +
        (rateYear > 0 ? rateYear + "% p.a. · " : "0% (No-cost) · ") +
        tenure + " months · from " + (emi.startDate || "—");

    // Summary strip
    const paidCount = emi.postedInstallments ? emi.postedInstallments.length : 0;
    const totalInterest = schedule.reduce((a, row) => a + row.interest, 0);
    const totalPayable = emiAmt * tenure;
    const remaining = Math.max(0, totalPayable - emiAmt * paidCount);
    document.getElementById("emiScheduleSummary").innerHTML = `
        <div class="flex-1 min-w-[4rem]">
            <p class="text-[8px] text-slate-500 uppercase font-black tracking-wider">Principal</p>
            <p class="text-[11px] font-black text-slate-200">${sym}${principal.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
        </div>
        <div class="flex-1 min-w-[4rem]">
            <p class="text-[8px] text-slate-500 uppercase font-black tracking-wider">Interest</p>
            <p class="text-[11px] font-black text-amber-400">${sym}${totalInterest.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
        </div>
        <div class="flex-1 min-w-[4rem]">
            <p class="text-[8px] text-slate-500 uppercase font-black tracking-wider">Total</p>
            <p class="text-[11px] font-black text-white">${sym}${totalPayable.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
        </div>
        <div class="flex-1 min-w-[4rem]">
            <p class="text-[8px] text-slate-500 uppercase font-black tracking-wider">Remaining</p>
            <p class="text-[11px] font-black text-rose-400">${sym}${remaining.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
        </div>`;

    // Rows
    const fmt2 = v => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById("emiScheduleRows").innerHTML = schedule.map(row => {
        const dot = row.isPaid
            ? `<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>`
            : `<span class="inline-block w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0"></span>`;
        const rowBg = row.isPaid ? "bg-slate-950/20 opacity-50" : "bg-slate-950/60";
        const dateDisp = row.date.slice(8) + "/" + row.date.slice(5,7) + "/" + row.date.slice(2,4);
        return `<div class="grid grid-cols-5 gap-1 px-2 py-2.5 rounded-lg ${rowBg} items-center">
            <span class="flex items-center justify-center gap-1 text-[9px] text-slate-400 font-bold">${dot}${row.num}</span>
            <span class="text-center text-[9px] text-slate-300 font-medium">${dateDisp}</span>
            <span class="text-right text-[9px] text-indigo-300 font-bold">${fmt2(row.emi)}</span>
            <span class="text-right text-[9px] text-teal-300 font-bold">${fmt2(row.principal)}</span>
            <span class="text-right text-[9px] text-amber-400 font-bold">${fmt2(row.interest)}</span>
        </div>`;
    }).join("");

    const modal = document.getElementById("emiScheduleModal");
    modal.classList.remove("hidden");
    initLucideIcons(modal);
}

function closeEMIScheduleModal() {
    document.getElementById("emiScheduleModal").classList.add("hidden");
}

function calcEMIOutstandingPrincipal(emi, asOfDate = getTodayISO()) {
    const principal = Number(emi.principal || 0);
    const tenure = Number(emi.tenure || 0);
    const emiAmount = Number(emi.emiAmount || calculateEMIDetails(principal, emi.interestRate || 0, tenure).emiAmount || 0);
    const rateYear = Number(emi.interestRate || 0);
    const monthlyRate = rateYear > 0 ? (rateYear / 12) / 100 : 0;
    const start = emi.startDate ? parseISODate(emi.startDate) : parseISODate(getTodayISO());
    const asOf = typeof asOfDate === "string" ? parseISODate(asOfDate) : new Date(asOfDate);
    start.setHours(0, 0, 0, 0);
    asOf.setHours(0, 0, 0, 0);

    let balance = principal;
    let interestPaid = 0;
    let principalPaid = 0;
    let monthsCompleted = 0;

    for (let i = 0; i < tenure; i++) {
        const due = new Date(start);
        due.setMonth(start.getMonth() + i);
        due.setHours(0, 0, 0, 0);
        if (due > asOf || balance <= 0) break;

        const interestPart = monthlyRate > 0 ? Math.min(balance, balance * monthlyRate) : 0;
        const principalPart = Math.min(balance, Math.max(0, emiAmount - interestPart));
        balance = Math.max(0, balance - principalPart);
        interestPaid += interestPart;
        principalPaid += principalPart;
        monthsCompleted++;
    }

    return {
        outstandingPrincipal: parseFloat(balance.toFixed(2)),
        interestPaid: parseFloat(interestPaid.toFixed(2)),
        principalPaid: parseFloat(principalPaid.toFixed(2)),
        monthsCompleted
    };
}

function _updateEMIPrepayTotals(emiId) {
    const emi = state.emis.find(e => e.id === emiId);
    if (!emi) return;
    const calc = calcEMIOutstandingPrincipal(emi, getTodayISO());
    const pct = parseFloat(document.getElementById("foreclosureChargePct")?.value) || 0;
    const charge = Math.max(0, calc.outstandingPrincipal * (pct / 100));
    const total = calc.outstandingPrincipal + charge;
    const sym = state.currencySymbol || "\u20B9";
    const fmt = v => `${sym}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const chargeEl = document.getElementById("emiForeclosureChargeAmount");
    const payoffEl = document.getElementById("emiPayoff");
    if (chargeEl) chargeEl.textContent = fmt(charge);
    if (payoffEl) payoffEl.textContent = fmt(total);
}

function openEMIPrepayModal(emiId) {
    const emi = state.emis.find(e => e.id === emiId);
    if (!emi) return;
    const existing = document.getElementById("emiPrepayModal");
    if (existing) existing.remove();

    const calc = calcEMIOutstandingPrincipal(emi, getTodayISO());
    const sym = state.currencySymbol || "\u20B9";
    const fmt = v => `${sym}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const safeName = typeof _escapeHtml === "function" ? _escapeHtml(emi.name) : String(emi.name || "EMI");
    const div = document.createElement("div");
    div.id = "emiPrepayModal";
    div.className = "fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[110] flex items-end justify-center p-0";
    div.innerHTML = `
        <div class="bg-slate-900 border border-slate-800 rounded-t-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <h3 class="text-xs font-extrabold uppercase tracking-wider text-white">Prepay / Foreclose EMI</h3>
                    <p class="text-[10px] text-slate-500 mt-1">${safeName} - ${calc.monthsCompleted}/${emi.tenure} months posted</p>
                </div>
                <button type="button" onclick="closeEMIPrepayModal()" class="p-1 text-slate-500 hover:text-slate-300">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div class="emi-prepay-stat"><span>Outstanding Principal</span><strong id="emiOutstanding">${fmt(calc.outstandingPrincipal)}</strong></div>
                <div class="emi-prepay-stat"><span>Principal Paid</span><strong>${fmt(calc.principalPaid)}</strong></div>
            </div>
            <label class="block space-y-1.5">
                <span class="text-[9px] uppercase tracking-widest font-extrabold text-slate-500">Foreclosure Charge %</span>
                <input type="number" id="foreclosureChargePct" value="0" min="0" step="0.1" inputmode="decimal"
                    oninput="_updateEMIPrepayTotals('${emi.id}')"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </label>
            <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2">
                <div class="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Foreclosure charge</span><strong id="emiForeclosureChargeAmount" class="text-amber-300">${fmt(0)}</strong>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Payoff</span>
                    <strong id="emiPayoff" class="text-base text-white">${fmt(calc.outstandingPrincipal)}</strong>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <button type="button" onclick="closeEMIPrepayModal()" class="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold py-3 rounded-xl text-xs active:scale-95 transition-all">Cancel</button>
                <button type="button" onclick="confirmEMIForeclosure('${emi.id}')" class="bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 rounded-xl text-xs active:scale-95 transition-all">Confirm & Record</button>
            </div>
        </div>`;
    document.body.appendChild(div);
    initLucideIcons(div);
}

function closeEMIPrepayModal() {
    const el = document.getElementById("emiPrepayModal");
    if (el) el.remove();
}

async function confirmEMIForeclosure(emiId) {
    const emi = state.emis.find(e => e.id === emiId);
    if (!emi || emi.foreclosed) return;
    const calc = calcEMIOutstandingPrincipal(emi, getTodayISO());
    const pct = parseFloat(document.getElementById("foreclosureChargePct")?.value) || 0;
    const charge = parseFloat(Math.max(0, calc.outstandingPrincipal * (pct / 100)).toFixed(2));
    const payoff = parseFloat((calc.outstandingPrincipal + charge).toFixed(2));
    const sym = state.currencySymbol || "\u20B9";
    const label = `${sym}${payoff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (!await customConfirm(`Record ${label} as final payoff for "${emi.name}"? Future EMI postings will stop.`, "Foreclose EMI?", "Record Payoff")) return;

    const today = getTodayISO();
    state.transactions.push({
        id: "tx_emi_foreclose_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        amount: payoff,
        categoryId: emi.categoryId,
        paymentId: emi.paymentId,
        date: today,
        note: `EMI Foreclosure: ${emi.name}`,
        isEMI: true,
        emiId: emi.id,
        isEMIForeclosure: true,
        tags: ["emi", "foreclosure"],
        createdAt: new Date().toISOString()
    });
    emi.foreclosed = true;
    emi.foreclosedDate = today;
    emi.foreclosureCharge = charge;
    emi.foreclosureChargePct = pct;
    removeFutureEMITransactions(emi.id, today);
    saveStateToLocalStorage();
    closeEMIPrepayModal();
    renderEMIsList();
    filterHistory();
    refreshCreditCardViews();
    updateAppDashboardView();
    playSound(S.SAVE);
    showNotification("EMI foreclosed and payoff recorded.");
}
function calculateEMILivePreview() {
    const principal = parseFloat(document.getElementById("emiPrincipal").value) || 0;
    const processingFee = parseFloat(document.getElementById("emiProcessingFee").value) || 0;
    const rateYear = parseFloat(document.getElementById("emiInterestRate").value) || 0;
    const tenure = parseInt(document.getElementById("emiTenure").value) || 12;

    const calc = calculateEMIDetails(principal, rateYear, tenure);
    const sym = state.currencySymbol || "₹";

    document.getElementById("emiPreviewFee").textContent = processingFee > 0 ? `${sym}${processingFee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "—";
    document.getElementById("emiPreviewAmount").textContent = principal > 0 ? `${sym}${calc.emiAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}/mo` : "—";
    document.getElementById("emiPreviewInterest").textContent = principal > 0 ? `${sym}${calc.totalInterest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "—";
    document.getElementById("emiPreviewTotal").textContent = principal > 0 ? `${sym}${calc.totalPayable.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "—";
}

function calculateEMIDetails(principal, rateYear, tenure) {
    if (principal <= 0 || tenure <= 0) {
        return { emiAmount: 0, totalInterest: 0, totalPayable: 0 };
    }
    if (rateYear <= 0) {
        // No cost EMI
        const emiAmount = principal / tenure;
        return { emiAmount, totalInterest: 0, totalPayable: principal };
    }
    const r = (rateYear / 12) / 100;
    const emiAmount = (principal * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
    const totalPayable = emiAmount * tenure;
    const totalInterest = totalPayable - principal;

    return { emiAmount, totalInterest, totalPayable };
}

function saveEMI() {
    const name = document.getElementById("emiName").value.trim();
    const principal = parseFloat(document.getElementById("emiPrincipal").value);
    const processingFee = parseFloat(document.getElementById("emiProcessingFee").value) || 0;
    const rateYear = parseFloat(document.getElementById("emiInterestRate").value) || 0;
    const tenure = parseInt(document.getElementById("emiTenure").value);
    const startDate = document.getElementById("emiStartDate").value;
    const categoryId = document.getElementById("emiCategory").value;
    const paymentId = document.getElementById("emiPayment").value;
    const note = document.getElementById("emiNote").value.trim();
    const editId = document.getElementById("emiEditId").value;

    if (!name || isNaN(principal) || principal <= 0 || !startDate) {
        showNotification(t("Please provide an item name, principal amount, and start date.", "This EMI trail needs an item, principal, and start date."));
        return;
    }

    if (!state.emis) state.emis = [];

    const calc = calculateEMIDetails(principal, rateYear, tenure);

    if (editId) {
        // Remove existing posted EMI entries for this EMI if we edit start date/amount
        removeFutureEMITransactions(editId);
        const idx = state.emis.findIndex(e => e.id === editId);
        if (idx !== -1) {
            state.emis[idx] = {
                ...state.emis[idx],
                name, principal, processingFee, interestRate: rateYear, tenure, startDate, categoryId, paymentId, note,
                emiAmount: calc.emiAmount,
                totalInterest: calc.totalInterest,
                totalPayable: calc.totalPayable,
                foreclosed: false,
                foreclosedDate: null,
                foreclosureCharge: 0,
                updatedAt: new Date().toISOString()
            };
            playSound(S.SYSTEM);
            showNotification(t(`EMI schedule "${name}" updated.`, `EMI trail "${name}" updated.`));
        }
    } else {
        const newEMI = {
            id: "emi_" + Date.now(),
            name, principal, processingFee, interestRate: rateYear, tenure, startDate, categoryId, paymentId, note,
            emiAmount: calc.emiAmount,
            totalInterest: calc.totalInterest,
            totalPayable: calc.totalPayable,
            postedInstallments: [],
            foreclosed: false,
            foreclosedDate: null,
            foreclosureCharge: 0,
            createdAt: new Date().toISOString()
        };
        state.emis.push(newEMI);
        playSound(S.SAVE);
        showNotification(t("EMI saved.", "📅 Installment plan locked in."));
    }

    saveStateToLocalStorage();
    closeEMIModal();
    renderEMIsList();
    processEMIs();
    refreshCreditCardViews();
}

async function deleteEMI(id) {
    const emi = state.emis.find(e => e.id === id);
    if (!emi) return;
    if (!await customConfirm(t(`Cancel and pre-close EMI "${emi.name}"? Future installment postings will be cancelled.`, `Collapse EMI trail "${emi.name}"? Future tracks will be cancelled.`), t("Cancel EMI?", "Collapse this EMI trail?"), t("Cancel EMI", "Collapse trail"))) return;
    removeFutureEMITransactions(id);
    state.emis = state.emis.filter(e => e.id !== id);
    saveStateToLocalStorage();
    renderEMIsList();
    refreshCreditCardViews();
    updateAppDashboardView();
    playSound(S.DELETE);
    showNotification(t(`EMI "${emi.name}" cancelled.`, `EMI trail "${emi.name}" collapsed.`));
}

function removeFutureEMITransactions(emiId, afterDate = "") {
    state.transactions = state.transactions.filter(tx => {
        if (!(tx.isEMI && tx.emiId === emiId)) return true;
        if (!afterDate) return false;
        if (tx.isEMIForeclosure) return true;
        return tx.date <= afterDate;
    });
}

function renderEMIsList() {
    if (!state.emis) state.emis = [];
    const list = [...state.emis].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    const symbol = state.currencySymbol;

    const badge = document.getElementById("settingsEMICountBadge");
    if (badge) {
        if (list.length > 0) {
            badge.textContent = list.length;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    }

    const container = document.getElementById("settingsEMIList");
    const empty = document.getElementById("settingsEMIEmpty");
    if (container) {
        if (list.length === 0) {
            container.innerHTML = "";
            if (empty) {
                empty.textContent = t("No EMI schedules yet.", "📅 No EMI schedules yet.");
                empty.classList.remove("hidden");
            }
        } else {
            if (empty) empty.classList.add("hidden");
            container.innerHTML = list.map(e => {
                const cat = state.categories.find(c => c.id === e.categoryId);
                const pay = state.payments.find(p => p.id === e.paymentId);
                const paidCount = e.postedInstallments ? e.postedInstallments.length : 0;
                const statusBadge = e.foreclosed
                    ? `<span class="text-[9px] px-2 py-0.5 rounded-full bg-rose-950/70 text-rose-300 font-bold uppercase">Foreclosed ${e.foreclosedDate || ""}</span>`
                    : `<span class="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 text-rose-400 font-bold uppercase">${paidCount}/${e.tenure} Months</span>`;
                return `
                <div class="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-[11px] font-bold text-slate-100 block">${e.name}</span>
                            <div class="flex gap-1.5 mt-1.5 flex-wrap">
                                ${statusBadge}
                                <span class="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-500">from ${e.startDate || "—"}</span>
                                ${cat ? `<span class="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400">${cat.name}</span>` : ""}
                                ${pay ? `<span class="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400">${pay.name}</span>` : ""}
                            </div>
                        </div>
                        <span class="text-xs font-extrabold text-indigo-400 shrink-0">${symbol}${e.emiAmount.toLocaleString(undefined, {maximumFractionDigits:0})}/mo</span>
                    </div>
                    <div class="flex gap-2 pt-0.5">
                        <button onclick="openEMIScheduleModal('${e.id}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-indigo-300 font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1">
                            <i data-lucide="calendar-days" class="w-3 h-3"></i> Schedule
                        </button>
                        ${!e.foreclosed ? `<button onclick="openEMIPrepayModal('${e.id}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-amber-300 font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1">
                            <i data-lucide="badge-indian-rupee" class="w-3 h-3"></i> Foreclose
                        </button>` : ""}
                        <button onclick="openEMIModal('${e.id}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-indigo-400 font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1">
                            <i data-lucide="pencil" class="w-3 h-3"></i> Edit
                        </button>
                        <button onclick="deleteEMI('${e.id}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-rose-400 font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1">
                            <i data-lucide="trash" class="w-3 h-3"></i> Delete
                        </button>
                    </div>
                </div>`;
            }).join("");
        }
    }
    initLucideIcons();
}

function processEMIs() {
    if (!state.emis || state.emis.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let anyPosted = false;

    state.emis.forEach(emi => {
        if (emi.foreclosed) return;
        const dueDates = getEMIOccurrenceDates(emi, today);
        dueDates.forEach((dateStr, index) => {
            const monthNumber = index + 1;
            if (!emi.postedInstallments) emi.postedInstallments = [];
            if (!hasEMITxOnDate(emi.id, dateStr)) {
                postEMIEntry(emi, dateStr, monthNumber);
                if (!emi.postedInstallments.includes(dateStr)) {
                    emi.postedInstallments.push(dateStr);
                }
                anyPosted = true;
            }
        });
    });

    if (anyPosted) {
        saveStateToLocalStorage();
        updateAppDashboardView();
    }
}

function getEMIOccurrenceDates(emi, today) {
    const dates = [];
    const start = new Date(emi.startDate);
    start.setHours(0, 0, 0, 0);
    const tenure = emi.tenure || 12;

    for (let i = 0; i < tenure; i++) {
        const currentOccur = new Date(start);
        currentOccur.setMonth(start.getMonth() + i);
        if (currentOccur > today) break;
        dates.push(toLocalISODate(currentOccur));
    }
    return dates;
}

function hasEMITxOnDate(emiId, dateStr) {
    return state.transactions.some(t => t.isEMI && t.emiId === emiId && t.date === dateStr);
}

function postEMIEntry(emi, dateStr, monthNumber) {
    const newTx = {
        id: "tx_emi_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        amount: emi.emiAmount,
        categoryId: emi.categoryId,
        paymentId: emi.paymentId,
        date: dateStr,
        note: `EMI: ${emi.name} (Month ${monthNumber}/${emi.tenure})`,
        isEMI: true,
        emiId: emi.id,
        createdAt: new Date().toISOString()
    };
    state.transactions.push(newTx);
    
    // Post processing fee as separate transaction on first month only
    if (monthNumber === 1 && emi.processingFee > 0) {
        const feeTx = {
            id: "tx_emi_fee_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
            amount: emi.processingFee,
            categoryId: emi.categoryId,
            paymentId: emi.paymentId,
            date: dateStr,
            note: `Processing Fee: ${emi.name}`,
            isEMI: true,
            emiId: emi.id,
            isProcessingFee: true,
            createdAt: new Date().toISOString()
        };
        state.transactions.push(feeTx);
    }
}

