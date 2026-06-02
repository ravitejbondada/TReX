/**
 * goals-trips.js — Saving Goals & Trips
 * TReX — Devour Your Expenses
 *
 * Saving goals list, goal accordion, contribution editor, goal funding,
 * trips list, trip create/edit/detail/delete, trip expense add/edit/delete,
 * trip-to-ledger sync, active trip banner, trip emoji picker.
 *
 * Dependencies: core.js must load before all other modules.
 * Global state: window.state (defined in core.js)
 */

function calcGoalProjectedDate(goal) {
    if (goal.completed) return null;
    if (!goal.contributions || goal.contributions.length === 0) return null;
    const remaining = goal.target - goal.current;
    if (remaining <= 0) return null;

    const sorted = goal.contributions.slice().sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = new Date(sorted[0].date + "T00:00:00");
    const lastDate  = new Date(sorted[sorted.length - 1].date + "T00:00:00");
    const totalContributed = sorted.reduce((s, c) => s + c.amount, 0);

    const spanDays = Math.max(1, Math.round((lastDate - firstDate) / 86400000));
    const dayRate  = totalContributed / spanDays;

    if (dayRate <= 0) return null;

    const daysNeeded = Math.ceil(remaining / dayRate);
    const projected  = new Date();
    projected.setDate(projected.getDate() + daysNeeded);
    return projected;
}


function getActiveGoalsTripsTab() {
    const tripsPanel = document.getElementById("tripsPanel");
    return tripsPanel && !tripsPanel.classList.contains("hidden") ? "trips" : "goals";
}

function openGoalsTripsInfo() {
    const existing = document.getElementById("goalsTripsInfoModal");
    if (existing) existing.remove();

    const activeTab = getActiveGoalsTripsTab();
    const isTrips = activeTab === "trips";
    const accent = isTrips ? "amber" : "indigo";
    const title = isTrips ? "Trips" : "Goals";
    const icon = isTrips ? "plane" : "piggy-bank";
    const rows = isTrips
        ? [
            ["Organised by status", "Your trips are automatically grouped into Upcoming, Active, and Past based on the travel dates you set — no manual sorting needed."],
            ["Expenses flow to your ledger", "Every expense you log on a trip is also recorded in your main ledger with a trip tag, so your overall spending stays accurate and searchable."],
            ["Budget at a glance", "Each trip card shows your planned budget vs. actual spend. Past trips are kept so you can look back and plan smarter next time."]
        ]
        : [
            ["Set a target & track progress", "Create a goal with a name, target amount, and an optional deadline. Your progress bar updates automatically as you add contributions."],
            ["Log contributions anytime", "Add each deposit with an amount, date, and optional note. TReX uses your contribution history to project when you'll reach your goal at your current pace."],
            ["Flexible completion controls", "You can mark goals complete early when you hit targets, manually archive incomplete targets whenever you are satisfied, or let the system auto-complete expired goals."]
        ];

    const div = document.createElement("div");
    div.id = "goalsTripsInfoModal";
    div.className = "fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[240] flex items-center justify-center p-4";
    div.innerHTML = `
        <div class="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-9 h-9 rounded-xl bg-${accent}-950/50 border border-${accent}-500/25 text-${accent}-300 flex items-center justify-center shrink-0">
                        <i data-lucide="${icon}" class="w-4 h-4"></i>
                    </span>
                    <div class="min-w-0">
                        <h3 class="text-xs font-extrabold text-white uppercase tracking-widest">${title}</h3>
                        <p class="text-[10px] text-slate-500 mt-0.5">${isTrips ? "Plan, track, and review your travels" : "Save towards what matters most"}</p>
                    </div>
                </div>
                <button type="button" onclick="closeGoalsTripsInfo()" class="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="space-y-2.5">
                ${rows.map(([heading, body]) => `
                    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                        <p class="text-[10px] font-extrabold text-slate-200">${heading}</p>
                        <p class="text-[10px] text-slate-500 leading-relaxed mt-1">${body}</p>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
    document.body.appendChild(div);
    initLucideIcons(div);
}

function closeGoalsTripsInfo() {
    const modal = document.getElementById("goalsTripsInfoModal");
    if (modal) modal.remove();
}

function showGoalDateReachedChoice(goal) {
    return new Promise(resolve => {
        const existing = document.getElementById("goalDateReachedModal");
        if (existing) existing.remove();
        const div = document.createElement("div");
        div.id = "goalDateReachedModal";
        div.className = "fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[245] flex items-center justify-center p-4";
        div.innerHTML = `
            <div class="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
                <div class="flex items-start gap-3">
                    <span class="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-500/25 text-indigo-300 flex items-center justify-center shrink-0">
                        <i data-lucide="calendar-clock" class="w-4 h-4"></i>
                    </span>
                    <div class="min-w-0">
                        <h3 class="text-xs font-extrabold text-white uppercase tracking-widest">Goal Date Reached</h3>
                        <p class="text-[11px] text-slate-400 leading-relaxed mt-1">The target date for "${goal.name}" has arrived. You can keep it completed, or extend the goal and continue saving.</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" data-choice="complete" class="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3 rounded-xl text-xs active:scale-95 transition-all">Mark Complete</button>
                    <button type="button" data-choice="extend" class="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-xl text-xs active:scale-95 transition-all">Extend Goal</button>
                </div>
            </div>`;
        document.body.appendChild(div);
        initLucideIcons(div);
        div.querySelectorAll("[data-choice]").forEach(btn => {
            btn.addEventListener("click", () => {
                const choice = btn.getAttribute("data-choice");
                div.remove();
                resolve(choice);
            });
        });
    });
}

/**
 * iv. Auto-close system verification once target date is reached.
 * Returns true if state changed, so we can save and trigger re-render.
 */
function verifyAndAutocloseGoals() {
    let changed = false;
    const todayStr = getTodayISO();
    
    (state.savingGoals || []).forEach(g => {
        if (!g.completed && g.targetDate && g.targetDate < todayStr) {
            g.completed = true;
            g.completedReason = "expired"; // Auto-closed because target date passed
            changed = true;
            
            setTimeout(async () => {
                const choice = await showGoalDateReachedChoice(g);
                if (choice === "extend") {
                    g.completed = false;
                    delete g.completedReason;
                    saveStateToLocalStorage();
                    renderSavingGoalsDedicated();
                    setTimeout(() => {
                        toggleGoalAccordion(g.id);
                        toggleGoalEdit(g.id);
                    }, 50);
                }
            }, 100);
        }
    });
    
    return changed;
}

function openNewGoalModal() {
    const existing = document.getElementById("newGoalModal");
    if (existing) existing.remove();
    const div = document.createElement("div");
    div.id = "newGoalModal";
    div.className = "fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[240] flex items-center justify-center p-4";
    div.innerHTML = `
        <div class="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div class="flex items-center justify-between gap-3">
                <h3 class="text-xs font-extrabold text-white uppercase tracking-widest flex items-center gap-2"><i data-lucide="target" class="w-4 h-4 text-indigo-400"></i> New Goal</h3>
                <button type="button" onclick="closeNewGoalModal()" class="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
            <div class="space-y-3">
                <label class="block space-y-1.5"><span class="text-[9px] text-slate-500 font-extrabold uppercase">Target Name</span><input type="text" id="newGoalNameDedicated" placeholder="e.g., New TV" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none" /></label>
                <div class="grid grid-cols-2 gap-2">
                    <label class="block space-y-1.5"><span class="text-[9px] text-slate-500 font-extrabold uppercase">Amount</span><input type="number" id="newGoalTargetDedicated" placeholder="50000" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none" /></label>
                    <label class="block space-y-1.5"><span class="text-[9px] text-slate-500 font-extrabold uppercase">Date</span><input type="date" id="newGoalDateDedicated" class="date-compact w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none" /></label>
                </div>
            </div>
            <button type="button" onclick="createNewSavingGoalDedicated()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition-all">Create Goal</button>
        </div>`;
    document.body.appendChild(div);
    initLucideIcons(div);
}
function closeNewGoalModal() { const modal = document.getElementById("newGoalModal"); if (modal) modal.remove(); }

function openNewTripModal() {
    const existing = document.getElementById("newTripModal");
    if (existing) existing.remove();
    const div = document.createElement("div");
    div.id = "newTripModal";
    div.className = "fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[240] flex items-center justify-center p-4";
    div.innerHTML = `
        <div class="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div class="flex items-center justify-between gap-3">
                <h3 class="text-xs font-extrabold text-white uppercase tracking-widest flex items-center gap-2"><i data-lucide="plane" class="w-4 h-4 text-amber-400"></i> New Trip</h3>
                <button type="button" onclick="closeNewTripModal()" class="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
            <div class="space-y-3">
                <div class="grid grid-cols-[4rem_1fr] gap-2">
                    <label class="block space-y-1.5"><span class="text-[9px] text-slate-500 font-extrabold uppercase">Emoji</span><input type="text" id="newTripEmoji" value="??" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none text-center" /></label>
                    <label class="block space-y-1.5"><span class="text-[9px] text-slate-500 font-extrabold uppercase">Trip Name</span><input type="text" id="newTripName" placeholder="e.g., Goa Jan 2026" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none" /></label>
                </div>
                <label class="block space-y-1.5"><span class="text-[9px] text-slate-500 font-extrabold uppercase">Budget</span><input type="number" id="newTripBudget" placeholder="Total budget amount" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none" /></label>
                <div class="grid grid-cols-2 gap-2">
                    <label class="block space-y-1.5"><span class="text-[9px] text-slate-500 font-extrabold uppercase">Start</span><input type="date" id="newTripStart" class="date-compact w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none" /></label>
                    <label class="block space-y-1.5"><span class="text-[9px] text-slate-500 font-extrabold uppercase">End</span><input type="date" id="newTripEnd" class="date-compact w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none" /></label>
                </div>
            </div>
            <button id="createTripButton" type="button" onclick="createNewTrip()" class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"><i data-lucide="plane" class="w-3.5 h-3.5"></i> Create Trip</button>
        </div>`;
    document.body.appendChild(div);
    initLucideIcons(div);
}
function closeNewTripModal() { const modal = document.getElementById("newTripModal"); if (modal) modal.remove(); }
function renderSavingGoalsDedicated() {
    // Check auto-close criteria first
    const autoClosedAny = verifyAndAutocloseGoals();
    if (autoClosedAny) {
        saveStateToLocalStorage();
    }

    const container = document.getElementById("dedicatedSavingGoalsListContainer");
    const completedContainer = document.getElementById("completedSavingGoalsListContainer");
    const completedSection = document.getElementById("completedGoalsSection");
    container.innerHTML = "";
    if (completedContainer) completedContainer.innerHTML = "";

    const activeGoals = (state.savingGoals || []).filter(g => !g.completed);
    const completedGoals = (state.savingGoals || []).filter(g => g.completed);
    const countLabel = document.getElementById("goalsSummaryCount");
    if (countLabel) countLabel.textContent = `${activeGoals.length} Target${activeGoals.length !== 1 ? 's' : ''}`;
    const completedCountLabel = document.getElementById("completedGoalsSummaryCount");
    if (completedCountLabel) completedCountLabel.textContent = `${completedGoals.length} Done`;
    if (completedSection) completedSection.classList.toggle("hidden", completedGoals.length === 0);

    if (activeGoals.length === 0) {
        container.innerHTML = `<p class="text-[11px] text-slate-500 text-center py-6 italic">${t("No active savings targets defined.", "No active savings targets yet.")}</p>`;
    }

    (state.savingGoals || []).forEach(g => {
        if (!g.contributions) g.contributions = [];
        const percent = Math.min(100, (g.current / g.target) * 100);
        const eggHtml = dp('dinoMode') ? `<span class="goal-egg-icon" id="goal-egg-${g.id}">${getEggSvg(percent)}</span>` : '';

        let badgeHtml = "";
        if (g.completed) {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 rounded-lg text-[9px] font-extrabold uppercase"><i data-lucide="check-circle-2" class="w-3 h-3 text-emerald-400"></i>Completed</span>`;
        } else if (percent >= 100) {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-extrabold uppercase"><i data-lucide="trophy" class="w-3 h-3"></i>Fully Funded</span>`;
        } else if (percent >= 75) {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-950/80 border border-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-extrabold uppercase"><i data-lucide="sparkles" class="w-3 h-3"></i>Almost There</span>`;
        } else if (percent >= 50) {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950/80 border border-amber-500/20 text-amber-500 rounded-lg text-[9px] font-extrabold uppercase"><i data-lucide="target" class="w-3 h-3"></i>Halfway</span>`;
        } else {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-500 rounded-lg text-[9px] font-bold uppercase"><i data-lucide="flag" class="w-3 h-3"></i>Initiated</span>`;
        }

        // Build contributions HTML
        const contribRows = g.contributions.length === 0
            ? `<p class="text-[10px] text-slate-600 italic text-center py-3">${t("No contributions yet - fund this goal below.", "No nest offerings yet - feed this egg below.")}</p>`
            : g.contributions.slice().reverse().map(c => `
                <div class="flex items-center gap-2 bg-slate-950/60 rounded-xl px-2.5 py-2" id="contrib-row-${c.id}">
                    <div class="flex-1 min-w-0">
                        <div id="contrib-view-${c.id}" class="flex items-center gap-2">
                            <span class="text-[10px] font-bold text-emerald-400 shrink-0">${state.currencySymbol}${parseFloat(c.amount).toLocaleString()}</span>
                            <span class="text-[9px] text-slate-400 truncate">${c.note || '—'}</span>
                            <span class="text-[9px] text-slate-600 shrink-0 ml-auto">${formatDateReadable(new Date(c.date), { year: '2-digit' })}</span>
                        </div>
                        <div id="contrib-edit-${c.id}" class="hidden flex items-center gap-1.5 flex-wrap">
                            <input type="number" value="${c.amount}" id="contrib-amt-${c.id}" class="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none" />
                            <input type="text" value="${c.note || ''}" placeholder="Note" id="contrib-note-${c.id}" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none" />
                            <input type="date" value="${c.date}" id="contrib-date-${c.id}" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none" />
                            <button onclick="saveGoalContribution('${g.id}','${c.id}')" class="text-[9px] font-bold px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg active:scale-95">Save</button>
                            <button onclick="cancelEditContribution('${c.id}')" class="text-[9px] font-bold px-2 py-1 bg-slate-800 text-slate-400 rounded-lg">Cancel</button>
                        </div>
                    </div>
                    ${g.completed ? '' : `
                    <div class="flex gap-1 shrink-0">
                        <button onclick="editGoalContribution('${c.id}')" class="p-1 text-slate-600 hover:text-indigo-400 rounded transition-all"><i data-lucide="pencil" class="w-3 h-3"></i></button>
                        <button onclick="deleteGoalContribution('${g.id}','${c.id}')" class="p-1 text-slate-600 hover:text-rose-400 rounded transition-all"><i data-lucide="trash" class="w-3 h-3"></i></button>
                    </div>`}
                </div>`).join("");

        const item = document.createElement("div");
        item.className = `bg-slate-900 border rounded-2xl overflow-hidden text-xs transition-all duration-300 ${g.completed ? 'border-slate-800/40 opacity-75' : 'border-slate-800/80'}`;
        
        let completionActionBtn = "";
        if (!g.completed) {
            // iii. Add a Direct Manual Complete action
            completionActionBtn = `
                <button onclick="manuallyCompleteGoal('${g.id}')" class="flex items-center gap-1 text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-all px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 shadow-sm" title="Mark this goal complete">
                    <i data-lucide="check" class="w-3.5 h-3.5"></i> Complete Goal
                </button>
            `;
        } else {
            // Option to reopen the goal
            completionActionBtn = `
                <button onclick="reopenSavingGoal('${g.id}')" class="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-indigo-400 transition-all px-2.5 py-1.5 rounded-lg bg-slate-850 border border-slate-800" title="Re-open this goal to continue saving">
                    <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reopen Goal
                </button>
            `;
        }

        item.innerHTML = `
            <!-- Clickable header -->
            <div class="p-4 cursor-pointer select-none" onclick="toggleGoalAccordion('${g.id}')">
                <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <span class="p-1.5 rounded-lg ${g.completed ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'} shrink-0">
                                <i data-lucide="${g.completed ? 'check-circle' : 'target'}" class="w-3.5 h-3.5"></i>
                            </span>
                            ${eggHtml}
                            <span class="font-extrabold ${g.completed ? 'text-slate-400 line-through' : 'text-slate-100'} block truncate text-[11px]">${g.name}</span>
                            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-200" id="goal-chevron-${g.id}"></i>
                        </div>
                        <div class="mt-2 flex items-center gap-1.5 flex-wrap">${badgeHtml}</div>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="text-[11px] font-extrabold text-slate-300">${state.currencySymbol}${g.current.toLocaleString()}</span>
                        <span class="text-[9px] text-slate-600 block mt-0.5">of ${state.currencySymbol}${g.target.toLocaleString()}</span>
                    </div>
                </div>
                <div class="mt-3 w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                    <div class="h-full rounded-full transition-all duration-500 ${g.completed ? 'bg-emerald-600' : 'bg-gradient-to-r from-indigo-600 to-violet-400'}" style="width:${percent}%"></div>
                </div>
                <div class="flex items-center justify-between mt-1">
                    <p class="text-[9px] text-slate-500 font-bold">${Math.round(percent)}% · ${state.currencySymbol}${Math.max(0, g.target - g.current).toLocaleString()} remaining</p>
                    ${g.targetDate ? `<p class="text-[9px] text-slate-600 font-bold flex items-center gap-1"><i data-lucide="calendar" class="w-2.5 h-2.5"></i>${formatDateReadable(new Date(g.targetDate), { year: '2-digit' })}${g.completedReason === 'expired' ? ' (Expired)' : ''}</p>` : ""}
                </div>
                ${(() => {
                    if (g.completed) return '';
                    if (percent >= 100) return '';
                    const proj = calcGoalProjectedDate(g);
                    if (!proj) return '';
                    const projLabel = proj.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                    const targetOk = g.targetDate && proj <= new Date(g.targetDate + "T23:59:59");
                    const targetLate = g.targetDate && proj > new Date(g.targetDate + "T23:59:59");
                    const color = targetLate ? "text-rose-400" : targetOk ? "text-emerald-400" : "text-slate-500";
                    return `<p class="goal-projected ${color}"><i data-lucide="trending-up" class="w-2.5 h-2.5 inline-block mr-0.5" style="vertical-align:-1px"></i>Projected: <strong>${projLabel}</strong></p>`;
                })()}
            </div>

            <!-- Expandable panel -->
            <div id="goal-panel-${g.id}" class="hidden border-t border-slate-800 bg-slate-950/40">
                <!-- Contributions list -->
                <div class="p-3 space-y-1.5">
                    <p class="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <i data-lucide="history" class="w-3 h-3"></i> Contribution History
                        <span class="ml-auto text-slate-600">${g.contributions.length} entries</span>
                    </p>
                    <div class="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                        ${contribRows}
                    </div>
                </div>

                <!-- Fund inputs (only visible when not completed) -->
                ${g.completed ? '' : `
                <div class="px-3 pb-3 pt-2 space-y-2 border-t border-slate-800/60">
                    <!-- Row 1: Amount + Date -->
                    <div class="flex gap-2">
                        <div class="flex-1 min-w-0">
                            <label class="text-[8px] text-slate-600 font-extrabold uppercase block mb-1">Amount</label>
                            <input type="number" id="depositInputDedicated_${g.id}" placeholder="e.g. 5000" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <label class="text-[8px] text-slate-600 font-extrabold uppercase block mb-1">Date</label>
                            <input type="date" id="depositDateInput_${g.id}" value="${new Date().toISOString().split("T")[0]}" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none" />
                        </div>
                    </div>
                    <!-- Row 2: Note + Add button -->
                    <div class="flex gap-2">
                        <input type="text" id="depositNoteInput_${g.id}" placeholder="Note (optional)" class="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none min-w-0" />
                        <button onclick="fundSavingGoalDedicated('${g.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-[10px] transition-all active:scale-95 flex items-center gap-1 shrink-0">
                            <i data-lucide="plus" class="w-3 h-3"></i> Add
                        </button>
                    </div>
                </div>`}

                <!-- Goal controls & edit/delete section -->
                <div class="px-3 pb-3 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1.5 flex-wrap">
                    <div class="flex items-center gap-1.5">
                        <button onclick="toggleGoalEdit('${g.id}')" class="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-indigo-400 transition-all px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                            <i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit Goal
                        </button>
                        ${completionActionBtn}
                    </div>
                    <button onclick="removeSavingGoalDedicated('${g.id}')" class="p-1.5 text-slate-600 hover:text-rose-400 transition-all rounded-lg" title="Delete goal">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>

                <!-- Edit goal panel (hidden by default) -->
                <div id="goal-edit-panel-${g.id}" class="hidden border-t border-slate-800 bg-slate-950/60 px-3 py-3 space-y-2">
                    <p class="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <i data-lucide="pencil" class="w-3 h-3"></i> Edit Goal
                    </p>
                    <div class="flex gap-2">
                        <div class="flex-1 min-w-0">
                            <label class="text-[8px] text-slate-600 font-extrabold uppercase block mb-1">Goal Name</label>
                            <input type="text" id="goal-edit-name-${g.id}" value="${g.name}" placeholder="Goal name" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none" />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <div class="flex-1 min-w-0">
                            <label class="text-[8px] text-slate-600 font-extrabold uppercase block mb-1">Target Amount</label>
                            <input type="number" id="goal-edit-target-${g.id}" value="${g.target}" placeholder="e.g. 50000" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <label class="text-[8px] text-slate-600 font-extrabold uppercase block mb-1">Target Date</label>
                            <input type="date" id="goal-edit-date-${g.id}" value="${g.targetDate || ''}" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none" />
                        </div>
                    </div>
                    <div class="flex gap-2 pt-1">
                        <button onclick="saveGoalEdit('${g.id}')" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-all active:scale-95 flex items-center justify-center gap-1">
                            <i data-lucide="check" class="w-3 h-3"></i> Save
                        </button>
                        <button onclick="cancelGoalEdit('${g.id}')" class="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400 hover:text-slate-200 transition-all">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        (g.completed && completedContainer ? completedContainer : container).appendChild(item);
    });

    initLucideIcons(container); if (completedContainer) initLucideIcons(completedContainer);
}

function toggleGoalAccordion(id) {
    const panel   = document.getElementById(`goal-panel-${id}`);
    const chevron = document.getElementById(`goal-chevron-${id}`);
    const isOpen  = !panel.classList.contains("hidden");
    // Close all first
    document.querySelectorAll('[id^="goal-panel-"]').forEach(p => p.classList.add("hidden"));
    document.querySelectorAll('[id^="goal-chevron-"]').forEach(c => c.style.transform = "");
    if (!isOpen) {
        panel.classList.remove("hidden");
        chevron.style.transform = "rotate(180deg)";
    }
}

function toggleGoalEdit(id) {
    const panel = document.getElementById(`goal-edit-panel-${id}`);
    if (!panel) return;
    const isHidden = panel.classList.contains("hidden");
    // Close any other open edit panels first
    document.querySelectorAll('[id^="goal-edit-panel-"]').forEach(p => p.classList.add("hidden"));
    if (isHidden) panel.classList.remove("hidden");
}

function cancelGoalEdit(id) {
    const panel = document.getElementById(`goal-edit-panel-${id}`);
    if (panel) panel.classList.add("hidden");
}

async function saveGoalEdit(id) {
    const nameInput   = document.getElementById(`goal-edit-name-${id}`);
    const targetInput = document.getElementById(`goal-edit-target-${id}`);
    const dateInput   = document.getElementById(`goal-edit-date-${id}`);

    const newName   = nameInput ? nameInput.value.trim() : "";
    const newTarget = parseFloat(targetInput ? targetInput.value : "");
    const newDate   = dateInput ? dateInput.value : "";

    if (!newName)                         { showNotification(t("Please enter a goal name.", "Every egg needs a name.")); return; }
    if (isNaN(newTarget) || newTarget <= 0) { showNotification(t("Please enter a valid target amount.", "TReX needs a real target.")); return; }

    const idx = state.savingGoals.findIndex(g => g.id === id);
    if (idx === -1) return;
    
    const goal = state.savingGoals[idx];
    const todayStr = getTodayISO();

    // ii. If user updates targetDate < current date, ask if they want to complete the goal irrespective of the target amount reached or not.
    let askToCompleteDueToPastDate = false;
    if (newDate && newDate < todayStr && (!goal.completed)) {
        askToCompleteDueToPastDate = true;
    }

    goal.name       = newName;
    goal.target     = newTarget;
    goal.targetDate = newDate || "";

    if (askToCompleteDueToPastDate) {
        const wantsComplete = await customConfirm(
            t(`You updated the target date to a past date. Do you want to mark "${newName}" as fully completed anyway, irrespective of whether the full target amount of ${state.currencySymbol}${newTarget} is reached?`,
              `The deadline selected is in the past! Do you want to finalize this hunt anyway, regardless of the target remaining?`),
            t("Complete Goal?", "Complete Hunt?"),
            t("Yes, Complete", "Finalize Hunt")
        );
        if (wantsComplete) {
            goal.completed = true;
            goal.completedReason = "manual_date_change";
        }
    }

    saveStateToLocalStorage();
    renderSavingGoalsDedicated();
    // Re-open the accordion after re-render so the user stays in context
    setTimeout(() => toggleGoalAccordion(id), 10);
    playSound(S.SAVE);
    showNotification(t("Goal updated.", "Goal updated."));
}

function editGoalContribution(cid) {
    document.getElementById(`contrib-view-${cid}`).classList.add("hidden");
    document.getElementById(`contrib-edit-${cid}`).classList.remove("hidden");
}

function cancelEditContribution(cid) {
    document.getElementById(`contrib-view-${cid}`).classList.remove("hidden");
    document.getElementById(`contrib-edit-${cid}`).classList.add("hidden");
}

function saveGoalContribution(goalId, cid) {
    const newAmt  = parseFloat(document.getElementById(`contrib-amt-${cid}`).value);
    const newNote = document.getElementById(`contrib-note-${cid}`).value.trim();
    const newDate = document.getElementById(`contrib-date-${cid}`).value;

    if (isNaN(newAmt) || newAmt <= 0) { showNotification(t("Enter a valid amount.", "Feed the nest a real amount.")); return; }

    const g = state.savingGoals.find(g => g.id === goalId);
    if (!g) return;
    const c = g.contributions.find(c => c.id === cid);
    if (!c) return;

    const diff = newAmt - c.amount;
    c.amount = newAmt;
    c.note   = newNote;
    c.date   = newDate;
    g.current = Math.max(0, g.current + diff);

    saveStateToLocalStorage();
    renderSavingGoalsDedicated();
    // Re-open the accordion after re-render
    setTimeout(() => toggleGoalAccordion(goalId), 10);
    showNotification(t("Contribution updated.", "Nest contribution updated."));
}

async function deleteGoalContribution(goalId, cid) {
    const g = state.savingGoals.find(g => g.id === goalId);
    if (!g) return;
    const c = g.contributions.find(c => c.id === cid);
    if (!c) return;
    if (!await customConfirm(t(`Remove this contribution of ${state.currencySymbol}${c.amount} from "${g.name}"? This cannot be undone.`, `Remove this nest offering of ${state.currencySymbol}${c.amount} from "${g.name}"? This cannot be undone.`), t("Remove Contribution", "Remove nest offering?"), t("Remove", "Remove offering"))) return;
    g.current = Math.max(0, g.current - c.amount);
    g.contributions = g.contributions.filter(c => c.id !== cid);
    saveStateToLocalStorage();
    renderSavingGoalsDedicated();
    setTimeout(() => toggleGoalAccordion(goalId), 10);
    playSound(S.DELETE);
    showNotification(t("Contribution removed.", "Nest offering removed."));
}

function createNewSavingGoalDedicated() {
    const name   = document.getElementById("newGoalNameDedicated").value.trim();
    const target = parseFloat(document.getElementById("newGoalTargetDedicated").value);
    const dateEl = document.getElementById("newGoalDateDedicated");
    const targetDate = dateEl ? dateEl.value : "";
    if (!name || isNaN(target) || target <= 0) { showNotification(t("Please provide valid goal parameters.", "This egg needs a name and a real target.")); return; }
    
    const newGoal = { 
        id: "goal_" + Date.now(), 
        name, 
        target, 
        current: 0, 
        targetDate: targetDate || "", 
        contributions: [],
        completed: false
    };
    
    state.savingGoals.push(newGoal);
    saveStateToLocalStorage();
    document.getElementById("newGoalNameDedicated").value = "";
    document.getElementById("newGoalTargetDedicated").value = "";
    if (dateEl) dateEl.value = "";
    closeNewGoalModal();
    renderSavingGoalsDedicated();
    playSound(S.SAVE);
    showNotification(t("Goal created.", "🥚 New egg in the nest."));
}

// iii. Direct manual complete option
async function manuallyCompleteGoal(id) {
    const idx = state.savingGoals.findIndex(g => g.id === id);
    if (idx === -1) return;
    const goal = state.savingGoals[idx];
    
    const textMsg = goal.current >= goal.target
        ? t(`Mark "${goal.name}" as completed?`, `Harvest "${goal.name}"?`)
        : t(`Mark "${goal.name}" as completed even though you haven't saved the full target amount yet?`, `Harvest "${goal.name}" early even though the egg is not fully nurtured?`);

    if (await customConfirm(textMsg, t("Complete Goal?", "Complete Hunt?"), t("Yes, Complete", "Harvest"))) {
        goal.completed = true;
        goal.completedReason = "manual_force";
        saveStateToLocalStorage();
        renderSavingGoalsDedicated();
        playSound(S.GOAL_HATCHED);
        showNotification(t(`Goal "${goal.name}" marked complete.`, `Hunt "${goal.name}" finalized.`));
    }
}

// Option to reopen goal
function reopenSavingGoal(id) {
    const idx = state.savingGoals.findIndex(g => g.id === id);
    if (idx === -1) return;
    state.savingGoals[idx].completed = false;
    delete state.savingGoals[idx].completedReason;
    saveStateToLocalStorage();
    renderSavingGoalsDedicated();
    playSound(S.SYSTEM);
    showNotification(t("Goal reopened.", "Goal reopened."));
}

async function fundSavingGoalDedicated(id) {
    const amtInput  = document.getElementById(`depositInputDedicated_${id}`);
    const noteInput = document.getElementById(`depositNoteInput_${id}`);
    const depositVal = parseFloat(amtInput.value);
    if (isNaN(depositVal) || depositVal <= 0) { showNotification(t("Please enter a valid amount.", "TReX needs a real amount.")); return; }

    const idx = state.savingGoals.findIndex(g => g.id === id);
    if (idx === -1) return;
    const goal = state.savingGoals[idx];
    if (!goal.contributions) goal.contributions = [];

    const dateInput = document.getElementById(`depositDateInput_${id}`);
    const depositDate = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split("T")[0];
    const prevPercent = (goal.current / goal.target) * 100;
    
    goal.current += depositVal;
    goal.contributions.push({
        id:     "c_" + Date.now(),
        amount: depositVal,
        note:   noteInput ? noteInput.value.trim() : "",
        date:   depositDate
    });
    const newPercent = (goal.current / goal.target) * 100;

    saveStateToLocalStorage();
    renderSavingGoalsDedicated();
    setTimeout(() => toggleGoalAccordion(id), 10);

    // Phase 9 — egg crack animation on tier upgrade
    if (dp('dinoMode')) {
        const oldTier = Math.floor(Math.min(prevPercent, 99) / 25);
        const newTier = Math.floor(Math.min(newPercent, 100) / 25);
        if (newTier > oldTier) {
            setTimeout(() => {
                const eggEl = document.getElementById(`goal-egg-${id}`);
                if (eggEl) {
                    eggEl.classList.add('egg-crack-transition');
                    setTimeout(() => eggEl.classList.remove('egg-crack-transition'), 650);
                }
            }, 50);
        }
    }

    if (newPercent >= 100 && prevPercent < 100) {
        playSound(S.GOAL_HATCHED);
        
        // i. Ask if the goal should be marked as complete or wait till target date
        if (goal.targetDate) {
            setTimeout(async () => {
                const optComplete = await customConfirm(
                    t(`Awesome! You have fully funded "${goal.name}". Would you like to mark it as Complete now, or wait until your target date of ${formatDateReadable(new Date(goal.targetDate))}?`,
                      `Incredible! Nurture cycle completed. Do you want to finalize this goal now or wait until your target date?`),
                    t("Goal Fully Funded! 🎉", "Hunt Successful! 🎉"),
                    t("Complete Now", "Complete Now")
                );
                if (optComplete) {
                    goal.completed = true;
                    goal.completedReason = "fully_funded_early";
                    saveStateToLocalStorage();
                    renderSavingGoalsDedicated();
                }
            }, 50);
        } else {
            goal.completed = true;
            goal.completedReason = "fully_funded_completed";
            saveStateToLocalStorage();
            renderSavingGoalsDedicated();
            showNotification(t("Goal fully funded & marked complete! 🎉", "🥚 Goal hatched! TReX is proud."));
        }
    } else {
        playSound(S.SAVE);
        showNotification(t("Contribution added.", "Egg fed."));
    }
}

async function removeSavingGoalDedicated(id) {
    const g = state.savingGoals.find(g => g.id === id);
    const label = g ? `"${g.name}"` : "this goal";
    if (!await customConfirm(t(`Delete goal ${label}? All contributions will be lost.`, `Abandon hunt ${label}? All nest offerings will be lost.`), t("Delete goal?", "Abandon the hunt?"), t("Delete", "Abandon"))) return;
    state.savingGoals = state.savingGoals.filter(g => g.id !== id);
    saveStateToLocalStorage();
    renderSavingGoalsDedicated();
    playSound(S.DELETE);
    showNotification(t("Goal removed.", "Egg removed from the nest."));
}

/* ═══════════════════════════════════════════════════════
   ACTIVE TRIP DASHBOARD BANNER
═══════════════════════════════════════════════════════ */

function getActiveTrip() {
    const today = getTodayISO();
    return (state.trips || [])
        .filter(t => t.startDate && t.endDate && today >= t.startDate && today <= t.endDate)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

function renderActiveTripBanner() {
    const banner = document.getElementById("activeTripBanner");
    if (!banner) return;
    const trip = getActiveTrip();
    if (!trip) { banner.classList.add("hidden"); banner.innerHTML = ""; return; }

    const sym      = state.currencySymbol || "₹";
    const today    = getTodayISO();
    const todaySpent = (trip.expenses || [])
        .filter(e => e.type === "on" && e.date === today)
        .reduce((s, e) => s + e.amount, 0);
    const totalSpent = getTripTotalSpent(trip);
    const remaining  = Math.max(0, (trip.budget || 0) - totalSpent);
    const pct        = trip.budget > 0 ? Math.min((totalSpent / trip.budget) * 100, 100) : 0;
    const daysLeft   = Math.max(0, Math.round((new Date(trip.endDate) - new Date(today)) / 86400000));

    banner.classList.remove("hidden");
    const isOver  = trip.budget > 0 && totalSpent > trip.budget;
    const overAmt = isOver ? totalSpent - trip.budget : 0;
    const bannerBorder = isOver ? "border-rose-500/50" : "border-amber-500/30";
    const bannerBg     = isOver ? "from-rose-950/60 to-slate-950" : "from-amber-950/70 to-slate-950";
    banner.innerHTML = `
        <div class="bg-gradient-to-br ${bannerBg} border ${bannerBorder} rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-xl">${trip.emoji || "✈️"}</span>
                    <div>
                        <p class="text-xs font-extrabold text-white">${trip.name}</p>
                        <p class="text-[9px] ${isOver ? "text-rose-400" : "text-amber-400"} font-bold">${isOver ? `⚠️ Over budget by ${sym}${overAmt.toLocaleString()}` : daysLeft === 0 ? "Last day!" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    <button onclick="openTripQuickAdd('${trip.id}')" class="flex items-center gap-1 text-[9px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 rounded-full transition-all active:scale-95">
                        <i data-lucide="plus" class="w-3 h-3"></i> Add
                    </button>
                    <button onclick="bannerSyncTrip('${trip.id}')" class="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1.5 rounded-full hover:bg-emerald-900/40 transition-all active:scale-95">
                        <i data-lucide="refresh-cw" class="w-3 h-3"></i> Sync
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center">
                <div class="bg-black/20 rounded-xl p-2">
                    <p class="text-[8px] text-slate-500 uppercase font-bold">Today</p>
                    <p class="text-[11px] font-black text-amber-300">${sym}${todaySpent.toLocaleString()}</p>
                </div>
                <div class="bg-black/20 rounded-xl p-2">
                    <p class="text-[8px] text-slate-500 uppercase font-bold">Spent</p>
                    <p class="text-[11px] font-black ${isOver ? "text-rose-400" : "text-white"}">${sym}${totalSpent.toLocaleString()}</p>
                </div>
                <div class="bg-black/20 rounded-xl p-2">
                    <p class="text-[8px] text-slate-500 uppercase font-bold">${isOver ? "Over" : "Left"}</p>
                    <p class="text-[11px] font-black ${isOver ? "text-rose-400" : remaining > 0 ? "text-emerald-400" : "text-rose-400"}">${isOver ? sym + overAmt.toLocaleString() : sym + remaining.toLocaleString()}</p>
                </div>
            </div>
            <div class="space-y-1">
                <div class="h-1.5 bg-black/30 rounded-full overflow-hidden">
                    <div class="h-full rounded-full ${isOver ? "bg-rose-500" : "bg-amber-500"} transition-all" style="width:${pct}%"></div>
                </div>
                <p class="text-[8px] text-slate-600 text-right">${pct.toFixed(0)}% of ${sym}${(trip.budget || 0).toLocaleString()} used</p>
            </div>
        </div>`;
    initLucideIcons();
}

function openTripQuickAdd(tripId) {
    const sheet = document.getElementById("tripQuickAddSheet");
    const trip  = (state.trips || []).find(t => t.id === tripId);
    if (!sheet || !trip) return;
    // Populate dropdowns
    document.getElementById("tripQuickCategoryId").innerHTML =
        state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    document.getElementById("tripQuickPaymentId").innerHTML =
        state.payments.map(p => `<option value="${p.id}">${p.name} · ${p.type}</option>`).join("");
    const quickDateEl = document.getElementById("tripQuickDate");
    quickDateEl.value = getTodayISO();
    quickDateEl.max = getTodayISO();
    document.getElementById("tripQuickDesc").value = "";
    document.getElementById("tripQuickAmount").value = "";
    document.getElementById("tripQuickAddTitle").textContent = `${trip.emoji || "✈️"} ${trip.name}`;
    sheet.dataset.tripId = tripId;
    sheet.classList.remove("hidden");
    initLucideIcons();
}

function closeTripQuickAdd() {
    const sheet = document.getElementById("tripQuickAddSheet");
    if (sheet) sheet.classList.add("hidden");
}

function submitTripQuickAdd() {
    const sheet      = document.getElementById("tripQuickAddSheet");
    const tripId     = sheet?.dataset.tripId;
    const desc       = document.getElementById("tripQuickDesc").value.trim();
    const amount     = parseFloat(document.getElementById("tripQuickAmount").value);
    const date       = document.getElementById("tripQuickDate").value;
    const categoryId = document.getElementById("tripQuickCategoryId").value;
    const paymentId  = document.getElementById("tripQuickPaymentId").value;
    if (!tripId)                      { showNotification(t("No active trip.", "No active migration right now.")); return; }
    if (isNaN(amount) || amount <= 0) { showNotification(t("Please enter a valid amount.", "TReX needs a real amount.")); return; }
    if (!date)                        { showNotification(t("Please select a date.", "Pick a date for this fossil.")); return; }
    if (date > getTodayISO())         { showNotification(t("Expense date cannot be in the future.", "TReX cannot hunt in tomorrow yet.")); return; }

    const idx = state.trips.findIndex(t => t.id === tripId);
    if (idx === -1) return;
    if (!state.trips[idx].expenses) state.trips[idx].expenses = [];
    const trip = state.trips[idx];
    const expenseLabel = desc || (document.getElementById("tripQuickCategoryId")?.selectedOptions?.[0]?.textContent || t("Trip expense", "Migration fossil"));
    // determine type based on date
    const det = determineTripExpenseType(trip, date);
    if (det.error) { showNotification(t(det.error, det.error)); return; }
    const type = det.type;
    let ledgerTxId = null;
    if (type === 'pre') {
        const txId = 'tx_pre_' + Date.now();
        state.transactions.push({
            id: txId,
            amount, categoryId, paymentId, date,
            note: `${trip.emoji || '✈️'} ${trip.name} · ${expenseLabel}`,
            tripId: trip.id,
            tripType: 'pre',
            tripRef: true,
            isRecurring: false,
            recurringId: '',
            createdAt: new Date().toISOString()
        });
        ledgerTxId = txId;
    }
    state.trips[idx].expenses.push({
        id: "te_" + Date.now(),
        desc, amount, date, categoryId, paymentId,
        type, ledgerTxId, createdAt: getTodayISO()
    });
    saveStateToLocalStorage();
    closeTripQuickAdd();
    renderActiveTripBanner();
    showNotification(t(`"${expenseLabel}" added to ${state.trips[idx].name}.${type === 'pre' ? ' Logged to ledger.' : ''}`, `"${expenseLabel}" packed into ${state.trips[idx].name}.${type === 'pre' ? ' Fossil logged to ledger.' : ''}`));
}

function bannerSyncTrip(tripId) {
    const prevActive = activeTripId;
    activeTripId = tripId;
    syncTripToLedger();
    activeTripId = prevActive;
    updateAppDashboardView();
}

/* ═══════════════════════════════════════════════════════
   TRIP TRACKER MODULE
═══════════════════════════════════════════════════════ */

let activeTripId = null;
let editingTripId = null;
let editingTripExpenseId = null;
let activeTripExpenseType = "pre"; // "pre" | "on"

const TRIP_EMOJIS = ["🏖️","✈️","⛺","🏔️","🗺️","🚢","🎒","🏝️","🚗","🌆","🍽️","💼"];

function renderNewTripEmojiPicker() {
    // No-op: emoji selection handled by select dropdown
}

function pickTripEmoji(btn, emoji) {
    const el = document.getElementById('newTripEmoji');
    if (el) el.value = emoji;
}

function selectNewTripEmoji(e) {
    const el = document.getElementById('newTripEmoji');
    if (el) el.value = e;
}

function updateNewTripEmojiPickerUI() {
    // No-op: select menu updates itself automatically
}

function getSelectedNewTripEmoji() {
    return document.getElementById('newTripEmoji')?.value || '✈️';
}

function switchGoalsTab(tab) {
    const goalsPanel = document.getElementById("goalsPanel");
    const tripsPanel = document.getElementById("tripsPanel");
    const goalsBtn   = document.getElementById("goalsTabBtn");
    const tripsBtn   = document.getElementById("tripsTabBtn");
    const activeClass   = "flex-1 py-2 rounded-xl text-[11px] font-bold transition-all bg-indigo-600 text-white flex items-center justify-center gap-1.5";
    const inactiveClass = "flex-1 py-2 rounded-xl text-[11px] font-bold transition-all text-slate-400 hover:text-white flex items-center justify-center gap-1.5";
    if (tab === "goals") {
        goalsPanel.classList.remove("hidden");
        tripsPanel.classList.add("hidden");
        goalsBtn.className = activeClass;
        tripsBtn.className = inactiveClass;
    } else {
        goalsPanel.classList.add("hidden");
        tripsPanel.classList.remove("hidden");
        goalsBtn.className = inactiveClass;
        tripsBtn.className = activeClass;
        renderTripsList();
    }
    initLucideIcons();
}

function getTripStatus(trip) {
    const today = getTodayISO();
    if (!trip.startDate || today < trip.startDate) return "planning";
    if (!trip.endDate || today <= trip.endDate) return "active";
    return "completed";
}

function getTripTotalSpent(trip) {
    return (trip.expenses || []).reduce((s, e) => s + e.amount, 0);
}

function getTripPreSpent(trip) {
    return (trip.expenses || []).filter(e => e.type === "pre").reduce((s, e) => s + e.amount, 0);
}

function getTripOnSpent(trip) {
    return (trip.expenses || []).filter(e => e.type === "on").reduce((s, e) => s + e.amount, 0);
}

function renderTripsList() {
    const container   = document.getElementById("tripsListContainer");
    const emptyState  = document.getElementById("tripsEmptyState");
    const countLabel  = document.getElementById("tripsSummaryCount");
    if (!container) return;

    const trips = state.trips || [];
    countLabel.textContent = `${trips.length} Trip${trips.length !== 1 ? "s" : ""}`;

    if (trips.length === 0) {
        container.innerHTML = "";
        emptyState.textContent = t("No trips planned yet.", "🦖 No migrations planned. Add a trip.");
        emptyState.classList.remove("hidden");
        return;
    }
    emptyState.classList.add("hidden");

    container.innerHTML = trips.map(trip => {
        const spent   = getTripTotalSpent(trip);
        const pct     = trip.budget > 0 ? Math.min((spent / trip.budget) * 100, 100) : 0;
        const isOver  = trip.budget > 0 && spent > trip.budget;
        const overAmt = isOver ? spent - trip.budget : 0;
        const status  = getTripStatus(trip);
        const statusColors = { planning: "text-violet-400 bg-violet-950/50 border-violet-500/30", active: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30", completed: "text-slate-400 bg-slate-800/50 border-slate-700/30" };
        const dinoStatusLabels = { planning: "🥚 Hatching", active: "🦖 On the Hunt", completed: "🏆 Conquered" };
        const neutralStatusLabels = { planning: "PLANNING", active: "ACTIVE", completed: "COMPLETED" };
        const statusLabel = dp('dinoMode') ? (dinoStatusLabels[status] || status.toUpperCase()) : (neutralStatusLabels[status] || status.toUpperCase());
        const barColors    = { planning: "bg-violet-500", active: "bg-amber-500", completed: "bg-slate-500" };
        const spentLabel = dp('dinoMode') ? "Devoured" : "Spent";
        const sym = state.currencySymbol || "₹";
        const cardBorder = isOver ? "border-rose-500/60 shadow-rose-500/10 shadow-lg" : "border-slate-800";
        const cardBg     = isOver ? "bg-rose-950/20" : "bg-slate-900/60";
        return `
        <div class="${cardBg} border ${cardBorder} rounded-2xl p-4 space-y-3 cursor-pointer active:scale-[0.98] transition-all" onclick="openTripDetail('${trip.id}')">
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-2.5">
                    <span class="text-2xl">${trip.emoji || "✈️"}</span>
                    <div>
                        <p class="text-xs font-extrabold text-white">${trip.name}</p>
                        <p class="text-[10px] text-slate-500">${trip.startDate || "?"} → ${trip.endDate || "?"}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    ${isOver ? `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full border text-rose-400 bg-rose-950/60 border-rose-500/40 flex items-center gap-1">⚠️ Over</span>` : `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors[status]}">${statusLabel}</span>`}
                </div>
            </div>
            <div class="space-y-1.5">
                <div class="flex justify-between text-[10px]">
                    <span class="text-slate-400">${spentLabel}: <span class="font-bold ${isOver ? "text-rose-400" : "text-white"}">${sym}${spent.toLocaleString()}</span></span>
                    <span class="text-slate-400">Budget: <span class="font-bold text-amber-400">${sym}${(trip.budget || 0).toLocaleString()}</span></span>
                </div>
                <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all ${isOver ? "bg-rose-500" : barColors[status]}" style="width:${pct}%"></div>
                </div>
                ${isOver ? `<p class="text-[9px] font-bold text-rose-400 text-right">Over by ${sym}${overAmt.toLocaleString()}</p>` : `
                <div class="flex justify-between text-[9px] text-slate-600">
                    <span>Pre-trip: ${sym}${getTripPreSpent(trip).toLocaleString()}</span>
                    <span>On-trip: ${sym}${getTripOnSpent(trip).toLocaleString()}</span>
                </div>`}
            </div>
        </div>`;
    }).join("");
    initLucideIcons();
}

function createNewTrip() {
    const emoji  = document.getElementById("newTripEmoji").value.trim() || "✈️";
    const name   = document.getElementById("newTripName").value.trim();
    const budget = parseFloat(document.getElementById("newTripBudget").value);
    const start  = document.getElementById("newTripStart").value;
    const end    = document.getElementById("newTripEnd").value;
    if (!name)           { showNotification(t("Please enter a trip name.", "Name this migration.")); return; }
    if (isNaN(budget) || budget <= 0) { showNotification(t("Please enter a valid budget.", "This migration needs a real budget.")); return; }
    const trip = { id: "trip_" + Date.now(), emoji, name, budget, startDate: start || null, endDate: end || null, expenses: [], createdAt: getTodayISO() };
    if (!state.trips) state.trips = [];
    state.trips.unshift(trip);
    saveStateToLocalStorage();
    document.getElementById("newTripEmoji").value  = "✈️";
    try { updateNewTripEmojiPickerUI(); } catch(e){}
    document.getElementById("newTripName").value   = "";
    document.getElementById("newTripBudget").value = "";
    document.getElementById("newTripStart").value  = "";
    document.getElementById("newTripEnd").value    = "";
    closeNewTripModal();
    renderTripsList();
    renderActiveTripBanner();
    playSound(S.SAVE);
    showNotification(t(`Trip "${name}" created!`, `Migration "${name}" planned!`));
}

function openTripEdit() {
    if (!activeTripId) { showNotification(t("No trip selected to edit.", "No migration selected to edit.")); return; }
    const trip = (state.trips || []).find(t => t.id === activeTripId);
    if (!trip) return;
    editingTripId = trip.id;
    // Switch to Goals -> Trips where the create form lives
    switchScreen('goals');
    switchGoalsTab('trips');
    openNewTripModal();
    // Prefill form
    document.getElementById('newTripEmoji').value  = trip.emoji || '✈️';
    try { updateNewTripEmojiPickerUI(); } catch(e){}
    document.getElementById('newTripName').value   = trip.name || '';
    document.getElementById('newTripBudget').value = trip.budget || '';
    document.getElementById('newTripStart').value  = trip.startDate || '';
    document.getElementById('newTripEnd').value    = trip.endDate || '';
    try { updateNewTripEmojiPickerUI(); } catch(e){}
    // Change create button to save edits
    const btn = document.getElementById('createTripButton');
    if (btn) {
        btn.textContent = '';
        btn.innerHTML = `<i data-lucide="edit-2" class="w-3.5 h-3.5"></i> Save Changes`;
        btn.onclick = saveEditedTrip;
    }
    initLucideIcons();
}

function saveEditedTrip() {
    if (!editingTripId) { showNotification(t("No trip in edit mode.", "No migration is being edited.")); return; }
    const emoji  = document.getElementById('newTripEmoji').value.trim() || '✈️';
    const name   = document.getElementById('newTripName').value.trim();
    const budget = parseFloat(document.getElementById('newTripBudget').value);
    const start  = document.getElementById('newTripStart').value;
    const end    = document.getElementById('newTripEnd').value;
    if (!name)           { showNotification(t("Please enter a trip name.", "Name this migration.")); return; }
    if (isNaN(budget) || budget <= 0) { showNotification(t("Please enter a valid budget.", "This migration needs a real budget.")); return; }
    const idx = state.trips.findIndex(t => t.id === editingTripId);
    if (idx === -1) { showNotification(t("Trip not found.", "Migration not found.")); editingTripId = null; return; }
    state.trips[idx] = {
        ...state.trips[idx],
        emoji, name, budget, startDate: start || null, endDate: end || null, updatedAt: new Date().toISOString()
    };
    saveStateToLocalStorage();
    renderActiveTripBanner();
    renderTripsList();
    showNotification(t(`Trip "${name}" updated.`, `Migration "${name}" updated.`));
    // restore create button
    const btn = document.getElementById('createTripButton');
    if (btn) {
        btn.innerHTML = `<i data-lucide="plane" class="w-3.5 h-3.5"></i> Create Trip`;
        btn.onclick = createNewTrip;
    }
    editingTripId = null;
    closeNewTripModal();
    // open detail for updated trip
    openTripDetail(state.trips[idx].id);
}

function openTripDetail(tripId) {
    activeTripId = tripId;
    const trip = (state.trips || []).find(t => t.id === tripId);
    if (!trip) return;
    document.querySelectorAll(".view-panel").forEach(p => p.classList.add("hidden"));
    document.getElementById("tripDetailView").classList.remove("hidden");
    document.getElementById("tripDetailTitle").textContent = `${trip.emoji || "✈️"} ${trip.name}`;
    // Show start/end dates in header banner
    const datesEl = document.getElementById('tripDetailDates');
    if (datesEl) {
        const s = trip.startDate ? new Date(trip.startDate) : null;
        const e = trip.endDate ? new Date(trip.endDate) : null;
        if (s && e && s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
            datesEl.textContent = `${formatDateReadable(s)} - ${e.getDate()}`;
        } else if (s && e) {
            const sameYear = s.getFullYear() === e.getFullYear();
            datesEl.textContent = sameYear
                ? `${formatDateReadable(s)} - ${formatDateReadable(e)}`
                : `${formatDateReadable(s, { year: 'numeric' })} - ${formatDateReadable(e, { year: 'numeric' })}`;
        } else if (s) {
            datesEl.textContent = `${formatDateReadable(s)}`;
        } else {
            datesEl.textContent = '';
        }
    }
    document.getElementById("screenContainer").scrollTop = 0;
    // Set default expense date to today
    const tripExpDateEl = document.getElementById("tripExpenseDate");
    tripExpDateEl.value = getTodayISO();
    tripExpDateEl.max = getTodayISO();
    // Wire date field to preview Pre/On-Trip classification live
    const tripDateInput = document.getElementById("tripExpenseDate");
    tripDateInput.onchange = function() {
        const t = (state.trips || []).find(t => t.id === activeTripId);
        if (!t || !this.value) return;
        const det = determineTripExpenseType(t, this.value);
        if (!det.error) setTripExpenseType(det.type);
    };
    // Show initial type label
    const initTrip = (state.trips || []).find(t => t.id === tripId);
    if (initTrip) { const det = determineTripExpenseType(initTrip, getTodayISO()); if (!det.error) setTripExpenseType(det.type); }
    populateTripExpenseDropdowns();
    switchTripTab("pre");
    renderTripDetailStats();
    renderTripExpenses();
    initLucideIcons();
}

function closeTripDetail() {
    activeTripId = null;
    editingTripExpenseId = null;
    switchScreen("goals");
    switchGoalsTab("trips");
}

function renderTripDetailStats() {
    const trip = (state.trips || []).find(t => t.id === activeTripId);
    if (!trip) return;
    const sym     = state.currencySymbol || "₹";
    const spent   = getTripTotalSpent(trip);
    const preSpent = getTripPreSpent(trip);
    const onSpent  = getTripOnSpent(trip);
    const remaining = Math.max(0, (trip.budget || 0) - spent);
    const isOver   = trip.budget > 0 && spent > trip.budget;
    const overAmt  = isOver ? spent - trip.budget : 0;
    const rawPct   = trip.budget > 0 ? (spent / trip.budget) * 100 : 0;
    const pct      = Math.min(rawPct, 100);
    const status   = getTripStatus(trip);
    const barColor = isOver ? "bg-rose-500" : status === "active" ? "bg-amber-500" : status === "completed" ? "bg-slate-500" : "bg-violet-500";
    const card = document.getElementById("tripDetailStatsCard");
    if (!card) return;

    // Update card border to signal over-budget
    card.className = isOver
        ? "border border-rose-500/40 bg-rose-950/15 rounded-2xl p-4 space-y-3"
        : "bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/20 rounded-2xl p-4 space-y-3";

    card.innerHTML = `
        ${isOver ? `
        <div class="flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 rounded-xl px-3 py-2">
            <span class="text-base">⚠️</span>
            <div class="flex-1">
                <span class="text-[10px] font-extrabold text-rose-400 uppercase tracking-wide">Over Budget</span>
                <span class="text-xs font-black text-rose-300 ml-1.5">by ${sym}${overAmt.toLocaleString()}</span>
            </div>
            <span class="text-[9px] text-rose-500 font-bold">${rawPct.toFixed(0)}% used</span>
        </div>` : ""}
        <div class="flex items-center justify-between">
            <div>
                <p class="text-[9px] font-black uppercase tracking-widest ${isOver ? "text-rose-400" : "text-amber-400"}">Total Budget</p>
                <p class="text-xl font-black ${isOver ? "text-rose-300" : "text-white"}">${sym}${(trip.budget || 0).toLocaleString()}</p>
            </div>
            <div class="text-right">
                <p class="text-[9px] font-black uppercase tracking-widest text-slate-500">${isOver ? "Overspent" : "Remaining"}</p>
                <p class="text-lg font-black ${isOver ? "text-rose-400" : remaining > 0 ? "text-emerald-400" : "text-rose-400"}">${isOver ? "-" : ""}${sym}${isOver ? overAmt.toLocaleString() : remaining.toLocaleString()}</p>
            </div>
        </div>
        <div class="space-y-1">
            <div class="flex justify-between text-[10px] text-slate-400">
                <span>Spent: <span class="font-bold ${isOver ? "text-rose-300" : "text-white"}">${sym}${spent.toLocaleString()}</span></span>
                <span>${pct.toFixed(0)}%</span>
            </div>
            <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all ${barColor}" style="width:${pct}%"></div>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-slate-800/50 rounded-xl p-2">
                <p class="text-[8px] text-slate-500 uppercase font-bold">Pre-Trip</p>
                <p class="text-xs font-black text-violet-400">${sym}${preSpent.toLocaleString()}</p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-2">
                <p class="text-[8px] text-slate-500 uppercase font-bold">On-Trip</p>
                <p class="text-xs font-black text-amber-400">${sym}${onSpent.toLocaleString()}</p>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-2">
                <p class="text-[8px] text-slate-500 uppercase font-bold">Days</p>
                <p class="text-xs font-black text-white">${getTripDaysCount(trip)}</p>
            </div>
        </div>
        ${trip.lastSyncedAt ? `<p class="text-[9px] text-slate-600 text-right">Last synced: ${formatDateTime(new Date(trip.lastSyncedAt))}</p>` : `<p class="text-[9px] text-slate-600 text-right">On-trip not yet synced to ledger</p>`}`;

    renderTripDailyBreakdown(trip);
}

function getTripDaysCount(trip) {
    if (!trip.startDate || !trip.endDate) return "—";
    const s = new Date(trip.startDate), e = new Date(trip.endDate);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : "—";
}

function renderTripDailyBreakdown(trip) {
    const container = document.getElementById("tripDailyBreakdown");
    if (!container) return;

    const onExpenses = (trip.expenses || []).filter(e => e.type === "on");
    const hasStart   = trip.startDate && trip.endDate;
    const totalDays  = hasStart ? getTripDaysCount(trip) : null;
    const dailyBudget = (trip.budget > 0 && typeof totalDays === "number" && totalDays > 0)
        ? trip.budget / totalDays : null;
    const sym = state.currencySymbol || "₹";

    if (onExpenses.length === 0) {
        container.innerHTML = "";
        return;
    }

    const byDay = {};
    onExpenses.forEach(e => {
        if (!byDay[e.date]) byDay[e.date] = 0;
        byDay[e.date] += e.amount;
    });

    const days = Object.keys(byDay).sort();

    const rows = days.map(day => {
        const actual = byDay[day];
        const isOver = dailyBudget !== null && actual > dailyBudget;
        const pct    = dailyBudget !== null ? Math.min((actual / dailyBudget) * 100, 100) : 100;
        const barColor = isOver ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500";
        const amtColor = isOver ? "text-rose-400" : "text-slate-200";
        const dateLabel = (() => {
            const d = new Date(day + "T00:00:00");
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        })();

        return `
        <div class="trip-daily-row">
            <div class="flex items-center justify-between mb-0.5">
                <span class="text-[9px] text-slate-400 font-bold">${dateLabel}</span>
                <div class="flex items-center gap-1.5">
                    <span class="text-[9px] font-extrabold ${amtColor}">${sym}${actual.toLocaleString()}</span>
                    ${dailyBudget !== null ? `<span class="text-[8px] text-slate-600">/ ${sym}${Math.round(dailyBudget).toLocaleString()}</span>` : ""}
                    ${isOver ? `<span class="trip-daily-over-badge">+${sym}${Math.round(actual - dailyBudget).toLocaleString()}</span>` : ""}
                </div>
            </div>
            <div class="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all ${barColor}" style="width:${pct}%"></div>
            </div>
        </div>`;
    }).join("");

    const overCount = dailyBudget !== null ? days.filter(d => byDay[d] > dailyBudget).length : 0;
    const totalOnSpent = days.reduce((s, d) => s + byDay[d], 0);

    container.innerHTML = `
    <div class="trip-daily-breakdown-card">
        <div class="flex items-center justify-between mb-2.5">
            <p class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <i data-lucide="calendar-days" class="w-3 h-3"></i> Daily Breakdown
            </p>
            <div class="flex items-center gap-2">
                ${dailyBudget !== null ? `<span class="text-[8px] text-slate-500">${sym}${Math.round(dailyBudget).toLocaleString()}/day</span>` : ""}
                ${overCount > 0 ? `<span class="text-[8px] font-bold text-rose-400 bg-rose-950/50 border border-rose-500/30 px-1.5 py-0.5 rounded-full">${overCount} over</span>` : ""}
            </div>
        </div>
        <div class="space-y-2">${rows}</div>
        <div class="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-800/60">
            <span class="text-[9px] text-slate-500">${days.length} day${days.length !== 1 ? "s" : ""} with spend</span>
            <span class="text-[9px] font-extrabold text-amber-400">${sym}${totalOnSpent.toLocaleString()} on-trip total</span>
        </div>
    </div>`;
    initLucideIcons(container);
}

function renderTripExpenses() {
    const trip = (state.trips || []).find(t => t.id === activeTripId);
    if (!trip) return;
    const sym = state.currencySymbol || "₹";
    const expenses = trip.expenses || [];

    const catName  = id => (state.categories.find(c => c.id === id) || {}).name || "—";
    const catColor = id => (state.categories.find(c => c.id === id) || {}).color || "#6366f1";
    const payName  = id => (state.payments.find(p => p.id === id)   || {}).name || "—";

    // PRE-TRIP LIST
    const preList  = document.getElementById("tripPreExpensesList");
    const preEmpty = document.getElementById("tripPreEmpty");
    const preItems = expenses.filter(e => e.type === "pre").sort((a,b) => a.date.localeCompare(b.date));
    if (preItems.length === 0) {
        if (preEmpty) preEmpty.textContent = t("No pre-trip expenses", "No pre-migration fossils yet");
        preList.innerHTML = ""; preEmpty.classList.remove("hidden");
    } else {
        preEmpty.classList.add("hidden");
        preList.innerHTML = preItems.map(e => `
            <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-white truncate">${e.desc || catName(e.categoryId)}</p>
                    <p class="text-[9px] text-slate-500">${e.date} · <span style="color:${catColor(e.categoryId)}">${catName(e.categoryId)}</span> · ${payName(e.paymentId)}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <p class="text-xs font-black text-violet-400">${sym}${e.amount.toLocaleString()}</p>
                    <button onclick="openEditTripExpense('${e.id}')" class="p-1 text-slate-600 hover:text-indigo-400 rounded transition-all"><i data-lucide="pencil" class="w-3 h-3"></i></button>
                    <button onclick="deleteTripExpense('${e.id}')" class="p-1 text-slate-600 hover:text-rose-400 rounded transition-all"><i data-lucide="trash" class="w-3 h-3"></i></button>
                </div>
            </div>`).join("");
    }

    // ON-TRIP: group by day
    const onItems  = expenses.filter(e => e.type === "on").sort((a,b) => a.date.localeCompare(b.date));
    const onList   = document.getElementById("tripDaysList");
    const onEmpty  = document.getElementById("tripOnEmpty");
    if (onItems.length === 0) {
        if (onEmpty) onEmpty.textContent = t("No on-trip expenses", "No on-migration fossils yet");
        onList.innerHTML = ""; onEmpty.classList.remove("hidden");
    } else {
        onEmpty.classList.add("hidden");
        // Check which dates have been synced to ledger
        const trip = (state.trips || []).find(t => t.id === activeTripId);
        const syncedDates = new Set(
            state.transactions
                .filter(t => t.tripId === activeTripId && t.tripType === "on")
                .map(t => t.date)
        );
        const byDay = {};
        onItems.forEach(e => { if (!byDay[e.date]) byDay[e.date] = []; byDay[e.date].push(e); });
        onList.innerHTML = Object.keys(byDay).sort().map(day => {
            const dayTotal  = byDay[day].reduce((s, e) => s + e.amount, 0);
            const isSynced  = syncedDates.has(day);
            // Compute rollup groups for this day
            const rollups = {};
            byDay[day].forEach(e => {
                const k = `${e.categoryId}||${e.paymentId}`;
                if (!rollups[k]) rollups[k] = { categoryId: e.categoryId, paymentId: e.paymentId, total: 0 };
                rollups[k].total += e.amount;
            });
            const rollupRows = Object.values(rollups).map(r => `
                <div class="flex items-center justify-between gap-2 py-1 border-t border-slate-800/60">
                    <div class="flex items-center gap-1.5 min-w-0">
                        <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color:${catColor(r.categoryId)}"></span>
                        <span class="text-[9px] text-slate-400 truncate">${catName(r.categoryId)} · ${payName(r.paymentId)}</span>
                    </div>
                    <span class="text-[9px] font-bold text-slate-300 shrink-0">${sym}${r.total.toLocaleString()}</span>
                </div>`).join("");
            return `
            <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 bg-slate-800/40">
                    <div>
                        <p class="text-[11px] font-extrabold text-white">${day}</p>
                        <p class="text-[9px] text-slate-500">${byDay[day].length} item${byDay[day].length !== 1 ? "s" : ""} · ${Object.keys(rollups).length} rollup${Object.keys(rollups).length !== 1 ? "s" : ""}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <p class="text-xs font-black text-amber-400">${sym}${dayTotal.toLocaleString()}</p>
                        ${isSynced ? `<span class="text-[8px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">✓ Synced</span>` : `<span class="text-[8px] font-bold text-slate-500 bg-slate-800/50 border border-slate-700/30 px-1.5 py-0.5 rounded-full">Pending</span>`}
                    </div>
                </div>
                <div class="p-3 space-y-1.5">
                    ${byDay[day].map(e => `
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <p class="text-[10px] font-bold text-white truncate">${e.desc || catName(e.categoryId)}</p>
                            <p class="text-[9px] text-slate-500"><span style="color:${catColor(e.categoryId)}">${catName(e.categoryId)}</span> · ${payName(e.paymentId)}</p>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <p class="text-[11px] font-bold text-slate-300">${sym}${e.amount.toLocaleString()}</p>
                            <button onclick="openEditTripExpense('${e.id}')" class="p-1 text-slate-600 hover:text-indigo-400 rounded transition-all"><i data-lucide="pencil" class="w-3 h-3"></i></button>
                            <button onclick="deleteTripExpense('${e.id}')" class="p-1 text-slate-600 hover:text-rose-400 rounded transition-all"><i data-lucide="trash" class="w-3 h-3"></i></button>
                        </div>
                    </div>`).join("")}
                    <div class="mt-2 space-y-0">${rollupRows}</div>
                </div>
            </div>`;
        }).join("");
    }
    initLucideIcons();
}

function switchTripTab(tab) {
    const prePanel = document.getElementById("tripPrePanel");
    const onPanel  = document.getElementById("tripOnPanel");
    const addPanel = document.getElementById("tripAddPanel");
    const preBtn   = document.getElementById("tripTabPreBtn");
    const onBtn    = document.getElementById("tripTabOnBtn");
    const addBtn   = document.getElementById("tripTabAddBtn");
    const active   = "flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all text-white";
    const inactive = "flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all text-slate-400 hover:text-white";
    prePanel.classList.add("hidden"); onPanel.classList.add("hidden"); addPanel.classList.add("hidden");
    preBtn.className = inactive; onBtn.className = inactive; addBtn.className = inactive;
    if (tab === "pre")  { prePanel.classList.remove("hidden"); preBtn.className = active + " bg-violet-600"; }
    if (tab === "on")   { onPanel.classList.remove("hidden");  onBtn.className  = active + " bg-amber-600"; }
    if (tab === "add")  { addPanel.classList.remove("hidden"); addBtn.className = active + " bg-indigo-600"; }
}

function populateTripExpenseDropdowns() {
    const catSel = document.getElementById("tripExpenseCategoryId");
    const paySel = document.getElementById("tripExpensePaymentId");
    if (!catSel || !paySel) return;
    catSel.innerHTML = state.categories.map(c =>
        `<option value="${c.id}">${c.name}</option>`).join("");
    paySel.innerHTML = state.payments.filter(p => !p.archived).map(p =>
        `<option value="${p.id}">${p.name} · ${p.type}</option>`).join("");
}

function determineTripExpenseType(trip, dateStr) {
    if (!trip) return { error: t("No trip selected.", "No migration selected.") };
    const d = parseISODate(dateStr);
    let s = trip.startDate ? parseISODate(trip.startDate) : null;
    let e = trip.endDate ? parseISODate(trip.endDate) : null;
    // normalize times
    if (s) { s.setHours(0,0,0,0); }
    if (e) { e.setHours(23,59,59,999); }

    if (s && d < s) return { type: 'pre' };
    if (e && d > e) return { error: t("Cannot add expense beyond trip end date.", "This fossil is beyond the migration trail.") };
    return { type: 'on' };
}

function setTripExpenseType(type) {
    activeTripExpenseType = type;
    const preBtn = document.getElementById("tripTypePreBtn");
    const onBtn  = document.getElementById("tripTypeOnBtn");
    if (!preBtn || !onBtn) {
        // No toggle buttons — update the label badge instead
        const lbl = document.getElementById("tripExpenseTypeLabel");
        if (lbl) lbl.textContent = type === "pre" ? "→ Pre-Trip" : "→ On-Trip";
    } else {
        if (type === "pre") {
            preBtn.className = "py-2 rounded-xl text-[10px] font-bold bg-violet-600 text-white transition-all";
            onBtn.className  = "py-2 rounded-xl text-[10px] font-bold bg-slate-800 text-slate-400 transition-all";
        } else {
            preBtn.className = "py-2 rounded-xl text-[10px] font-bold bg-slate-800 text-slate-400 transition-all";
            onBtn.className  = "py-2 rounded-xl text-[10px] font-bold bg-amber-600 text-white transition-all";
        }
    }
}

function addTripExpense() {
    if (!activeTripId) return;
    const desc       = document.getElementById("tripExpenseDesc").value.trim();
    const amount     = parseFloat(document.getElementById("tripExpenseAmount").value);
    const date       = document.getElementById("tripExpenseDate").value;
    const categoryId = document.getElementById("tripExpenseCategoryId").value;
    const paymentId  = document.getElementById("tripExpensePaymentId").value;
    if (isNaN(amount) || amount <= 0) { showNotification(t("Please enter a valid amount.", "TReX needs a real amount.")); return; }
    if (!date)                        { showNotification(t("Please select a date.", "Pick a date for this fossil.")); return; }
    if (date > getTodayISO())         { showNotification(t("Expense date cannot be in the future.", "TReX cannot hunt in tomorrow yet.")); return; }
    if (!categoryId)                  { showNotification(t("Please select a category.", "Pick a territory for this fossil.")); return; }
    if (!paymentId)                   { showNotification(t("Please select a payment method.", "Pick a hunting weapon for this fossil.")); return; }

    const idx = state.trips.findIndex(t => t.id === activeTripId);
    if (idx === -1) return;
    const trip = state.trips[idx];
    const expenseLabel = desc || (document.getElementById("tripExpenseCategoryId")?.selectedOptions?.[0]?.textContent || t("Trip expense", "Migration fossil"));
    if (!trip.expenses) trip.expenses = [];

    // Determine expense type based on chosen date relative to trip dates
    const det = determineTripExpenseType(trip, date);
    if (det.error) { showNotification(t(det.error, det.error)); return; }
    const type = det.type;
    setTripExpenseType(type);

    // ── EDIT MODE ────────────────────────────────────────────────────
    if (editingTripExpenseId) {
        const expIdx = trip.expenses.findIndex(e => e.id === editingTripExpenseId);
        if (expIdx === -1) { showNotification(t("Expense not found.", "Fossil not found.")); cancelEditTripExpense(); return; }
        const existing = trip.expenses[expIdx];

        // If it was a pre-trip expense with a ledger entry, update that too
        if (existing.type === "pre" && existing.ledgerTxId) {
            const txIdx = state.transactions.findIndex(t => t.id === existing.ledgerTxId);
            if (txIdx !== -1) {
                state.transactions[txIdx].amount     = amount;
                state.transactions[txIdx].categoryId = categoryId;
                state.transactions[txIdx].paymentId  = paymentId;
                state.transactions[txIdx].date       = date;
                state.transactions[txIdx].note       = `${trip.emoji || "✈️"} ${trip.name} · ${expenseLabel}`;
            }
        }
        // If type changed from pre→on, remove the old ledger entry
        if (existing.type === "pre" && type === "on" && existing.ledgerTxId) {
            state.transactions = state.transactions.filter(t => t.id !== existing.ledgerTxId);
            existing.ledgerTxId = null;
        }
        // If type changed from on→pre, create a new ledger entry
        let ledgerTxId = existing.ledgerTxId || null;
        if (existing.type === "on" && type === "pre") {
            const txId = "tx_pre_" + Date.now();
            state.transactions.push({
                id: txId, amount, categoryId, paymentId, date,
                note: `${trip.emoji || "✈️"} ${trip.name} · ${expenseLabel}`,
                tripId: trip.id, tripType: "pre", tripRef: true,
                isRecurring: false, recurringId: "",
                createdAt: new Date().toISOString()
            });
            ledgerTxId = txId;
        }

        trip.expenses[expIdx] = { ...existing, desc, amount, date, categoryId, paymentId, type, ledgerTxId };
        saveStateToLocalStorage();
        cancelEditTripExpense();
        renderTripDetailStats();
        renderTripExpenses();
        playSound(S.SYSTEM);
        showNotification(t(`Expense "${expenseLabel}" updated.`, `Fossil "${expenseLabel}" updated.`));
        switchTripTab(type === "pre" ? "pre" : "on");
        return;
    }

    // ── ADD MODE ─────────────────────────────────────────────────────
    let ledgerTxId = null;
    if (type === "pre") {
        const txId = "tx_pre_" + Date.now();
        state.transactions.push({
            id: txId,
            amount, categoryId, paymentId, date,
            note: `${trip.emoji || "✈️"} ${trip.name} · ${expenseLabel}`,
            tripId:   trip.id,
            tripType: "pre",
            tripRef:  true,
            isRecurring: false,
            recurringId: "",
            createdAt: new Date().toISOString()
        });
        ledgerTxId = txId;
    }

    trip.expenses.push({
        id: "te_" + Date.now(),
        desc, amount, date,
        categoryId, paymentId,
        type: type,
        ledgerTxId,
        createdAt: getTodayISO()
    });

    saveStateToLocalStorage();
    document.getElementById("tripExpenseDesc").value   = "";
    document.getElementById("tripExpenseAmount").value = "";
    renderTripDetailStats();
    renderTripExpenses();
    playSound(S.SAVE);
    showNotification(t(`Expense "${expenseLabel}" added${type === "pre" ? " & logged to ledger" : ""}.`, `Fossil "${expenseLabel}" added${type === "pre" ? " and etched into the ledger" : ""}.`));
    switchTripTab(type === "pre" ? "pre" : "on");
}

async function deleteTripExpense(expenseId) {
    const idx = state.trips.findIndex(t => t.id === activeTripId);
    if (idx === -1) return;
    const exp = (state.trips[idx].expenses || []).find(e => e.id === expenseId);
    const labelText = exp ? (exp.desc || ((state.categories.find(c => c.id === exp.categoryId) || {}).name) || "this expense") : "this expense";
    const label = exp ? `"${labelText}"` : "this expense";
    if (!await customConfirm(t(`Delete ${label}?${exp && exp.type === 'pre' ? ' Its ledger entry will also be removed.' : ''} This cannot be undone.`, `Send ${label} extinct?${exp && exp.type === 'pre' ? ' Its ledger fossil will also be removed.' : ''} This cannot be undone.`), t("Delete expense?", "Send this fossil extinct?"), t("Delete", "Extinct it"))) return;
    if (exp && exp.type === "pre" && exp.ledgerTxId) {
        state.transactions = state.transactions.filter(t => t.id !== exp.ledgerTxId);
    }
    state.trips[idx].expenses = state.trips[idx].expenses.filter(e => e.id !== expenseId);
    saveStateToLocalStorage();
    renderTripDetailStats();
    renderTripExpenses();
    playSound(S.DELETE);
    showNotification(t("Expense removed.", "Fossil removed."));
}

function openEditTripExpense(expenseId) {
    const idx = state.trips.findIndex(t => t.id === activeTripId);
    if (idx === -1) return;
    const exp = (state.trips[idx].expenses || []).find(e => e.id === expenseId);
    if (!exp) { showNotification(t("Expense not found.", "Fossil not found.")); return; }

    editingTripExpenseId = expenseId;
    populateTripExpenseDropdowns();
    switchTripTab("add");

    // Pre-fill fields
    document.getElementById("tripExpenseDesc").value       = exp.desc || "";
    document.getElementById("tripExpenseAmount").value     = exp.amount || "";
    document.getElementById("tripExpenseDate").value       = exp.date || "";
    document.getElementById("tripExpenseCategoryId").value = exp.categoryId || "";
    document.getElementById("tripExpensePaymentId").value  = exp.paymentId  || "";

    // Show edit-mode UI
    const banner = document.getElementById("tripExpenseEditBanner");
    if (banner) { banner.classList.remove("hidden"); banner.classList.add("flex"); }
    const title = document.getElementById("tripAddPanelTitle");
    if (title) title.textContent = "Edit Trip Expense";
    const btn = document.getElementById("tripExpenseSaveBtn");
    if (btn) { btn.textContent = "Save Changes"; btn.className = "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-95"; }
    initLucideIcons();
}

function cancelEditTripExpense() {
    editingTripExpenseId = null;
    document.getElementById("tripExpenseDesc").value   = "";
    document.getElementById("tripExpenseAmount").value = "";
    const banner = document.getElementById("tripExpenseEditBanner");
    if (banner) { banner.classList.add("hidden"); banner.classList.remove("flex"); }
    const title = document.getElementById("tripAddPanelTitle");
    if (title) title.textContent = "Log Trip Expense";
    const btn = document.getElementById("tripExpenseSaveBtn");
    if (btn) { btn.textContent = "Add Expense"; btn.className = "w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-95"; }
}

function syncTripToLedger() {
    if (!activeTripId) return;
    const idx = state.trips.findIndex(t => t.id === activeTripId);
    if (idx === -1) return;
    const trip = state.trips[idx];
    const sym  = state.currencySymbol || "₹";

    // 1. Wipe all existing on-trip rolled-up ledger entries for this trip
    state.transactions = state.transactions.filter(
        t => !(t.tripId === trip.id && t.tripType === "on")
    );

    // 2. Get all on-trip expenses
    const onExpenses = (trip.expenses || []).filter(e => e.type === "on");
    if (onExpenses.length === 0) {
        showNotification(t("No on-trip expenses to sync.", "No on-migration fossils to sync."));
        return;
    }

    // 3. Rollup: group by date + categoryId + paymentId
    const groups = {};
    onExpenses.forEach(e => {
        const key = `${e.date}||${e.categoryId}||${e.paymentId}`;
        if (!groups[key]) groups[key] = { date: e.date, categoryId: e.categoryId, paymentId: e.paymentId, total: 0, count: 0 };
        groups[key].total += e.amount;
        groups[key].count++;
    });

    // 4. Write one ledger tx per group
    const catName = id => (state.categories.find(c => c.id === id) || {}).name || "Expense";
    let txCount = 0;
    Object.values(groups).forEach(g => {
        state.transactions.push({
            id: "tx_on_" + Date.now() + "_" + (txCount++),
            amount:      g.total,
            categoryId:  g.categoryId,
            paymentId:   g.paymentId,
            date:        g.date,
            note:        `${trip.emoji || "✈️"} ${trip.name} · ${catName(g.categoryId)}`,
            tripId:      trip.id,
            tripType:    "on",
            tripRef:     true,
            isRecurring: false,
            recurringId: "",
            createdAt:   new Date().toISOString()
        });
    });

    // 5. Record last sync timestamp on the trip
    state.trips[idx].lastSyncedAt = new Date().toISOString();
    saveStateToLocalStorage();

    // 6. Update sync status label
    const statusEl = document.getElementById("tripSyncStatus");
    if (statusEl) {
        statusEl.textContent = `✓ Synced ${txCount} rollup entr${txCount === 1 ? "y" : "ies"} — ${new Date().toLocaleTimeString()}`;
        statusEl.classList.remove("hidden");
    }
    renderTripDetailStats();
    showNotification(t(`Synced ${txCount} rollup entr${txCount === 1 ? "y" : "ies"} to ledger.`, `Synced ${txCount} migration fossil${txCount === 1 ? "" : "s"} to ledger.`));
}

async function deleteTripConfirm() {
    if (!activeTripId) return;
    const trip = (state.trips || []).find(t => t.id === activeTripId);
    if (!trip) return;
    if (!await customConfirm(t(`Delete trip "${trip.name}"? All expenses and ledger entries will be removed.`, `Cancel migration "${trip.name}"? All expenses and ledger fossils will be removed.`), t("Delete trip?", "Cancel the migration?"), t("Delete", "Cancel trip"))) return;
    // Remove all ledger transactions linked to this trip
    state.transactions = state.transactions.filter(t => t.tripId !== activeTripId);
    state.trips = state.trips.filter(t => t.id !== activeTripId);
    saveStateToLocalStorage();
    renderActiveTripBanner();
    playSound(S.DELETE);
    showNotification(t(`Trip "${trip.name}" deleted.`, `Migration "${trip.name}" went extinct.`));
    closeTripDetail();
}


/* === PHASE 9 — EGG HATCHING GOALS === */

function getEggSvg(pct) {
    if (pct >= 100) return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="color:#4ade80"><ellipse cx="12" cy="14" rx="7" ry="8"/><ellipse cx="16" cy="7" rx="4" ry="3.5"/><circle cx="17.5" cy="6" r="1" fill="#1a1a2e"/><ellipse cx="9" cy="17" rx="2" ry="1.5" opacity=".6"/></svg>`;
    if (pct >= 75)  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="color:#a3e635"><ellipse cx="12" cy="13" rx="7" ry="8"/><path d="M12,5 L10,9 L13,11" stroke="#1a1a2e" stroke-width="1.2" fill="none"/><circle cx="12" cy="5" r="1.5"/></svg>`;
    if (pct >= 50)  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="color:#f59e0b"><ellipse cx="12" cy="13" rx="7" ry="9"/><path d="M11,6 L10,10 L13,12 L11,16" stroke="#1a1a2e" stroke-width="1" fill="none"/></svg>`;
    if (pct >= 25)  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="color:#94a3b8"><ellipse cx="12" cy="13" rx="7" ry="9"/><path d="M13,8 L12,11" stroke="#1a1a2e" stroke-width="1" fill="none"/></svg>`;
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="color:#64748b"><ellipse cx="12" cy="13" rx="7" ry="9"/></svg>`;
}



