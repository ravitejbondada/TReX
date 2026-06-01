/**
 * backup.js — Data Backup & Restore
 * TReX — Devour Your Expenses
 *
 * JSON and CSV export, JSON and CSV import, state validation,
 * full state restore, CSV parsing helpers, backup payload builder.
 * Future: Google Drive sync hooks belong here.
 *
 * Dependencies: core.js
 */

const BACKUP_FORMAT_VERSION = 1;
const BACKUP_APP_ID = "TReX";

function cloneStateSnapshot() {
    return JSON.parse(JSON.stringify(state));
}

function buildBackupPayload() {
    return {
        backupVersion: BACKUP_FORMAT_VERSION,
        app: BACKUP_APP_ID,
        exportedAt: new Date().toISOString(),
        data: cloneStateSnapshot()
    };
}

function normalizeImportedState(raw) {
    const src = (raw && raw.data) ? raw.data : (raw || {});
    const currency = src.currency || "INR";
    const currencySymbol = src.currencySymbol || "\u20B9";

    return {
        currency,
        currencySymbol,
        monthlyBudget: Number(src.monthlyBudget) || 50000,
        cycleType: src.cycleType === "calendar" ? "calendar" : "salary",
        cycleDay: Math.min(31, Math.max(1, parseInt(src.cycleDay, 10) || 5)),
        pinEnabled: src.pinEnabled !== false && src.pinEnabled !== "false",
        pinCode: String(src.pinCode || "1234").replace(/\D/g, "").slice(0, 4) || "1234",
        theme: ["dark", "light", "high-contrast"].includes(src.theme) ? src.theme : "dark",
        categories: Array.isArray(src.categories) && src.categories.length
            ? src.categories.map(c => ({
                id: String(c.id),
                name: String(c.name || "Category"),
                color: c.color || "#6366f1",
                defaultPaymentId: c.defaultPaymentId || ""
            }))
            : [...DEFAULT_CATEGORIES],
        payments: Array.isArray(src.payments) && src.payments.length
            ? src.payments.map(p => ({
                id: String(p.id),
                name: String(p.name || "Payment"),
                type: p.type || "Cash",
                limit: Number(p.limit) || 0,
                color: p.color || "#10b981",
                billingDay: p.billingDay === undefined || p.billingDay === null || p.billingDay === ""
                    ? null
                    : Math.min(28, Math.max(1, parseInt(p.billingDay, 10) || 15))
            }))
            : [...DEFAULT_PAYMENTS],
        transactions: Array.isArray(src.transactions)
            ? src.transactions.map(t => ({
                id: String(t.id),
                amount: parseFloat(t.amount) || 0,
                categoryId: String(t.categoryId || ""),
                paymentId: String(t.paymentId || ""),
                date: String(t.date || ""),
                note: t.note || "",
                isRecurring: !!t.isRecurring,
                recurringId: t.recurringId || "",
                tripId:   t.tripId   || null,
                tripType: t.tripType || null,
                tripRef:  !!t.tripRef,
                splitGroupId: t.splitGroupId || null,
                splitLabel:   t.splitLabel   || null,
                tags: Array.isArray(t.tags) ? t.tags.map(tag => String(tag || "").trim()).filter(Boolean) : []
            }))
            : [],
        knownTags: Array.isArray(src.knownTags)
            ? Array.from(new Set(src.knownTags.map(tag => String(tag || "").trim()).filter(Boolean)))
            : [],
        transactionTemplates: Array.isArray(src.transactionTemplates)
            ? src.transactionTemplates.map(t => ({
                id: String(t.id || `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
                name: String(t.name || "Preset"),
                amount: parseFloat(t.amount) || 0,
                categoryId: String(t.categoryId || ""),
                paymentId: String(t.paymentId || ""),
                note: String(t.note || ""),
                createdAt: t.createdAt || new Date().toISOString()
            })).filter(t => t.amount > 0 && t.categoryId && t.paymentId)
            : [],
        savingGoals: Array.isArray(src.savingGoals)
            ? src.savingGoals.map(g => ({
                id: String(g.id),
                name: String(g.name || "Goal"),
                target: parseFloat(g.target) || 0,
                current: parseFloat(g.current) || 0
            }))
            : [],
        recurringExpenses: Array.isArray(src.recurringExpenses)
            ? src.recurringExpenses.map(r => ({
                id: String(r.id),
                name: String(r.name || "Recurring"),
                amount: parseFloat(r.amount) || 0,
                freq: r.freq || "monthly",
                startDate: r.startDate || "",
                categoryId: String(r.categoryId || ""),
                paymentId: String(r.paymentId || ""),
                note: r.note || "",
                lastProcessed: r.lastProcessed || "",
                createdAt: r.createdAt || "",
                updatedAt: r.updatedAt || ""
            }))
            : [],
        emis: Array.isArray(src.emis)
            ? src.emis.map(e => ({
                ...e,
                id: String(e.id || `emi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
                name: String(e.name || "EMI"),
                principal: parseFloat(e.principal) || 0,
                processingFee: parseFloat(e.processingFee) || 0,
                interestRate: parseFloat(e.interestRate) || 0,
                tenure: parseInt(e.tenure, 10) || 12,
                emiAmount: parseFloat(e.emiAmount) || 0,
                totalInterest: parseFloat(e.totalInterest) || 0,
                totalPayable: parseFloat(e.totalPayable) || 0,
                postedInstallments: Array.isArray(e.postedInstallments) ? e.postedInstallments : [],
                foreclosed: !!e.foreclosed,
                foreclosedDate: e.foreclosedDate || null,
                foreclosureCharge: parseFloat(e.foreclosureCharge) || 0
            }))
            : [],
        trips: Array.isArray(src.trips) ? src.trips.map(trip => ({
            ...trip,
            expenses: Array.isArray(trip.expenses) ? trip.expenses.map(exp => ({
                ...exp,
                categoryId: exp.categoryId || null,
                paymentId:  exp.paymentId  || null,
                type:       exp.type       || "on",
                ledgerTxId: exp.ledgerTxId || null
            })) : []
        })) : [],
        dinoPrefs: (src.dinoPrefs && typeof src.dinoPrefs === "object") ? {
            dinoMode:             src.dinoPrefs.dinoMode             ?? false,
            roarSounds:           src.dinoPrefs.roarSounds           ?? false,
            soundVolume:          src.dinoPrefs.soundVolume          ?? 0.6,
            fossilMode:           src.dinoPrefs.fossilMode           ?? false,
            extinctionWarnings:   src.dinoPrefs.extinctionWarnings   ?? true,
            dinoFootprints:       src.dinoPrefs.dinoFootprints       ?? true,
            herdMode:             src.dinoPrefs.herdMode             ?? true,
            recentActivityLabel:  src.dinoPrefs.recentActivityLabel  ?? "dino"
        } : {
            dinoMode: false, roarSounds: false, soundVolume: 0.6,
            fossilMode: false, extinctionWarnings: true,
            dinoFootprints: true, herdMode: true, recentActivityLabel: "dino"
        }
    };
}

function isValidBackupPayload(parsed) {
    if (!parsed || typeof parsed !== "object") return false;
    const data = parsed.data || parsed;
    return Array.isArray(data.categories)
        && Array.isArray(data.payments)
        && Array.isArray(data.transactions);
}

function applyFullStateRestore(importedRaw) {
    state = normalizeImportedState(importedRaw);

    /* ── v1.01 MIGRATION on restore ── */
    if (!state.trips) state.trips = [];
    state.trips.forEach(trip => {
        if (!trip.expenses) trip.expenses = [];
        trip.expenses.forEach(exp => {
            if (!exp.categoryId) exp.categoryId = null;
            if (!exp.paymentId)  exp.paymentId  = null;
            if (!exp.type)       exp.type        = "on";
            if (!exp.ledgerTxId) exp.ledgerTxId  = null;
        });
    });
    state.transactions.forEach(tx => {
        if (tx.tripId    === undefined) tx.tripId    = null;
        if (tx.tripType  === undefined) tx.tripType  = null;
        if (tx.tripRef   === undefined) tx.tripRef   = false;
        if (tx.splitGroupId === undefined) tx.splitGroupId = null;
        if (tx.splitLabel   === undefined) tx.splitLabel   = null;
        if (!Array.isArray(tx.tags)) tx.tags = [];
    });
    if (state.creditCardsEnabled) {
        backfillMissingCreditCardBillingDays();
    }

    saveStateToLocalStorage();

    const pinCheckbox = document.getElementById("settingPinEnabled");
    if (pinCheckbox) {
        pinCheckbox.checked = state.pinEnabled === true;
    }

    const lockScreen = document.getElementById("simulatedLockScreen");
    if (state.pinEnabled) {
        lockScreen.classList.remove("hidden");
        pinAttemptBuffer = "";
        updatePinVisualDots();
        lockScreen.classList.remove("opacity-0", "pointer-events-none");
    } else {
        lockScreen.classList.add("hidden");
        unlockApp();
    }

    const lockHint = document.getElementById("lockScreenPinHint");
    if (lockHint) lockHint.textContent = state.pinCode;

    buildCurrencySelectorOptions();
    syncSettingsFormFields();
    applyTheme(state.theme || "dark");
    updateAppLockButton();

    processRecurringExpenses();
    updateAppDashboardView();
    renderRecurringExpenses();
    renderSavingGoalsDedicated();

    if (!document.getElementById("settingsView").classList.contains("hidden")) {
        renderSettingsLists();
    }
    if (!document.getElementById("historyView").classList.contains("hidden")) {
        renderHistoryList();
    }
    if (!document.getElementById("reportsView").classList.contains("hidden")) {
        renderHistoricalMonthReport();
    }

    initLucideIcons();
}

function csvEscape(val) {
    const s = val === null || val === undefined ? "" : String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function csvRow(fields) {
    return fields.map(csvEscape).join(",") + "\n";
}

function parseCSVLine(line) {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === "," && !inQuotes) {
            result.push(cur);
            cur = "";
        } else {
            cur += ch;
        }
    }
    result.push(cur);
    return result;
}

function parseBackupCSVSections(text) {
    const sections = {};
    let current = null;
    text.split(/\r?\n/).forEach(rawLine => {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) return;
        const header = line.match(/^\[([A-Z_]+)\]$/);
        if (header) {
            current = header[1];
            sections[current] = [];
            return;
        }
        if (current) sections[current].push(line);
    });
    return sections;
}

function parseSectionTable(sectionLines) {
    if (!sectionLines || sectionLines.length < 2) return [];
    const headers = parseCSVLine(sectionLines[0]);
    const rows = [];
    for (let i = 1; i < sectionLines.length; i++) {
        const cells = parseCSVLine(sectionLines[i]);
        if (!cells.length || cells.every(c => !c)) continue;
        const row = {};
        headers.forEach((h, idx) => { row[h] = cells[idx] !== undefined ? cells[idx] : ""; });
        rows.push(row);
    }
    return rows;
}

function buildStateFromCSVSections(sections) {
    const draft = {
        categories: [],
        payments: [],
        transactions: [],
        transactionTemplates: [],
        savingGoals: [],
        recurringExpenses: []
    };

    const settingsRows = parseSectionTable(sections.SETTINGS);
    settingsRows.forEach(row => {
        const key = row.key;
        const val = row.value;
        if (key === "monthlyBudget") draft.monthlyBudget = Number(val);
        else if (key === "cycleDay") draft.cycleDay = Number(val);
        else if (key === "pinEnabled") draft.pinEnabled = val === "true";
        else if (key === "currency") draft.currency = val;
        else if (key === "currencySymbol") draft.currencySymbol = val;
        else if (key === "cycleType") draft.cycleType = val;
        else if (key === "pinCode") draft.pinCode = val;
        else if (key === "theme") draft.theme = val;
    });

    parseSectionTable(sections.CATEGORIES).forEach(row => {
        draft.categories.push({
            id: row.id,
            name: row.name,
            color: row.color,
            defaultPaymentId: row.defaultPaymentId || ""
        });
    });

    parseSectionTable(sections.PAYMENTS).forEach(row => {
        draft.payments.push({
            id: row.id,
            name: row.name,
            type: row.type,
            limit: Number(row.limit) || 0,
            color: row.color
        });
    });

    parseSectionTable(sections.TRANSACTIONS).forEach(row => {
        draft.transactions.push({
            id: row.id,
            amount: parseFloat(row.amount) || 0,
            categoryId: row.categoryId,
            paymentId: row.paymentId,
            date: row.date,
            note: row.note,
            isRecurring: row.isRecurring === "true",
            recurringId: row.recurringId || "",
            splitGroupId: row.splitGroupId || null,
            splitLabel:   row.splitLabel   || null,
            tags: row.tags ? row.tags.split(";").map(tag => tag.trim()).filter(Boolean) : []
        });
    });

    parseSectionTable(sections.TRANSACTION_TEMPLATES).forEach(row => {
        draft.transactionTemplates.push({
            id: row.id,
            name: row.name,
            amount: parseFloat(row.amount) || 0,
            categoryId: row.categoryId,
            paymentId: row.paymentId,
            note: row.note || "",
            createdAt: row.createdAt || ""
        });
    });

    parseSectionTable(sections.RECURRING_EXPENSES).forEach(row => {
        draft.recurringExpenses.push({
            id: row.id,
            name: row.name,
            amount: parseFloat(row.amount) || 0,
            freq: row.freq || "monthly",
            startDate: row.startDate || "",
            categoryId: row.categoryId,
            paymentId: row.paymentId,
            note: row.note || "",
            lastProcessed: row.lastProcessed || "",
            createdAt: row.createdAt || "",
            updatedAt: row.updatedAt || ""
        });
    });

    parseSectionTable(sections.SAVING_GOALS).forEach(row => {
        draft.savingGoals.push({
            id: row.id,
            name: row.name,
            target: parseFloat(row.target) || 0,
            current: parseFloat(row.current) || 0
        });
    });

    return draft;
}

function downloadBackupFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportDataToJSON() {
    const payload = buildBackupPayload();
    downloadBackupFile(
        `wallet_engine_full_backup_${new Date().toISOString().split("T")[0]}.json`,
        JSON.stringify(payload, null, 2),
        "application/json"
    );
    playSound(S.SYSTEM);
    showNotification(t("Backup exported.", "🥚 Fossilized! Backup ready."));
}

function exportDataToCSV() {
    const date = new Date().toISOString().split("T")[0];
    let csv = `# TReX Full Backup v${BACKUP_FORMAT_VERSION}\n`;
    csv += `# ExportedAt,${new Date().toISOString()}\n\n`;

    csv += "[SETTINGS]\n";
    csv += csvRow(["key", "value"]);
    csv += csvRow(["currency", state.currency]);
    csv += csvRow(["currencySymbol", state.currencySymbol]);
    csv += csvRow(["monthlyBudget", state.monthlyBudget]);
    csv += csvRow(["cycleType", state.cycleType]);
    csv += csvRow(["cycleDay", state.cycleDay]);
    csv += csvRow(["pinEnabled", state.pinEnabled]);
    csv += csvRow(["pinCode", state.pinCode]);
    csv += csvRow(["theme", state.theme || "dark"]);
    csv += "\n";

    csv += "[CATEGORIES]\n";
    csv += csvRow(["id", "name", "color", "defaultPaymentId"]);
    state.categories.forEach(c => {
        csv += csvRow([c.id, c.name, c.color, c.defaultPaymentId || ""]);
    });
    csv += "\n";

    csv += "[PAYMENTS]\n";
    csv += csvRow(["id", "name", "type", "limit", "color"]);
    state.payments.forEach(p => {
        csv += csvRow([p.id, p.name, p.type, p.limit, p.color]);
    });
    csv += "\n";

    csv += "[TRANSACTIONS]\n";
    csv += csvRow(["id", "amount", "categoryId", "paymentId", "date", "note", "isRecurring", "recurringId", "splitGroupId", "splitLabel", "tags"]);
    state.transactions.forEach(t => {
        csv += csvRow([
            t.id, t.amount, t.categoryId, t.paymentId, t.date, t.note || "",
            t.isRecurring ? "true" : "false", t.recurringId || "",
            t.splitGroupId || "", t.splitLabel || "", Array.isArray(t.tags) ? t.tags.join(";") : ""
        ]);
    });
    csv += "\n";

    csv += "[TRANSACTION_TEMPLATES]\n";
    csv += csvRow(["id", "name", "amount", "categoryId", "paymentId", "note", "createdAt"]);
    (state.transactionTemplates || []).forEach(t => {
        csv += csvRow([t.id, t.name, t.amount, t.categoryId, t.paymentId, t.note || "", t.createdAt || ""]);
    });
    csv += "\n";

    csv += "[RECURRING_EXPENSES]\n";
    csv += csvRow(["id", "name", "amount", "freq", "startDate", "categoryId", "paymentId", "note", "lastProcessed", "createdAt", "updatedAt"]);
    (state.recurringExpenses || []).forEach(r => {
        csv += csvRow([
            r.id, r.name, r.amount, r.freq, r.startDate || "", r.categoryId, r.paymentId,
            r.note || "", r.lastProcessed || "", r.createdAt || "", r.updatedAt || ""
        ]);
    });
    csv += "\n";

    csv += "[SAVING_GOALS]\n";
    csv += csvRow(["id", "name", "target", "current", "percentComplete"]);
    (state.savingGoals || []).forEach(g => {
        const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
        csv += csvRow([g.id, g.name, g.target, g.current, pct]);
    });

    downloadBackupFile(`wallet_engine_full_backup_${date}.csv`, csv, "text/csv;charset=utf-8;");
    showNotification(t("Backup exported.", "🥚 Fossilized! Backup ready."));
}

function importBackupFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const text = evt.target.result;
            const lower = file.name.toLowerCase();

            if (lower.endsWith(".json")) {
                const parsed = JSON.parse(text);
                if (!isValidBackupPayload(parsed)) {
                    showNotification(t("Invalid JSON backup file.", "That fossil crate is not valid JSON."));
                    return;
                }
                applyFullStateRestore(parsed);
                playSound(S.DRIVE_CONNECT);
                showNotification(t("Data restored.", "🦖 Unearthed! Data restored."));
            } else if (lower.endsWith(".csv")) {
                const sections = parseBackupCSVSections(text);
                if (!sections.SETTINGS && !sections.CATEGORIES) {
                    showNotification(t("Invalid CSV backup structure.", "That fossil sheet has the wrong CSV bones."));
                    return;
                }
                const draft = buildStateFromCSVSections(sections);
                if (!draft.categories.length && !draft.payments.length) {
                    showNotification(t("Backup lacks categories/payments.", "This fossil crate is missing territories or weapons."));
                    return;
                }
                applyFullStateRestore(draft);
                showNotification(t("Data restored.", "🦖 Unearthed! Data restored."));
            } else {
                showNotification(t("Unsupported file format.", "TReX cannot read that fossil format."));
            }
        } catch (err) {
            console.error(err);
            showNotification(t("Failed to import backup file.", "The fossil dig failed. Try another backup."));
        }
        e.target.value = "";
    };
    reader.readAsText(file);
}
