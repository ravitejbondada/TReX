# TReX — Full Implementation Plan
## UI Revamp + Dino Theme + Logo Tap + Smiley Tap + Sound Design

**Rule:** After every phase, the app must be **fully stable** — no broken screens, no missing data, no JS errors. Each phase ships independently.

---

## Overview — 9 Phases

| Phase | Name | What ships | Risk |
|---|---|---|---|
| 1 | Settings Architecture Revamp | Drawer + clean Settings | Medium |
| 2 | State & Preferences Foundation | `dinoPrefs` state + Settings UI for all new toggles | Low |
| 3 | Dino Copy & Micro-text | All toast/confirm/empty-state text | Low |
| 4 | Dino Animations & CSS | All CSS keyframes + animation triggers | Low–Medium |
| 5 | Dino Visual Layer | Living dino character, nav icons, sync egg, PIN footprints | Medium |
| 6 | Logo Tap Interactions | Tap counter, stats sheet, easter egg | Low |
| 7 | Smiley / Dino Tap Interactions | Budget character tap system, deep-dive overlay | Medium |
| 8 | Sound Engine | `sounds.js`, all sound calls across the app | Medium |
| 9 | Polish & Fossil Mode | Fossil Mode theme, heatmap footprints, egg hatching goals | Low–Medium |

---

# PHASE 1 — Settings Architecture Revamp

**Goal:** Introduce the hamburger side drawer. Move all data-management items out of Settings. Settings becomes purely a settings screen. App must still function identically — nothing is deleted, just relocated.

## 1.1 — Information Architecture Decision

### New Side Drawer — "Manage" Panel
Triggered by a hamburger icon (☰) in the **top-left** of the header. Slides in from the left with a backdrop overlay.

**Drawer structure:**
```
╔══════════════════════════════╗
║  [Avatar placeholder]        ║
║  TReX                        ║  ← App name / profile area
║  ● Synced  /  ○ Offline      ║  ← Sync status pill
╠══════════════════════════════╣
║  BUDGET                      ║
║  ▸ Budget & Cycle            ║
╠══════════════════════════════╣
║  ORGANIZE                    ║
║  ▸ Categories                ║
║  ▸ Payment Methods           ║
║  ▸ Credit Cards              ║  ← CC mode toggle lives here now
╠══════════════════════════════╣
║  AUTOMATION                  ║
║  ▸ Recurring Expenses        ║
║  ▸ EMIs                      ║
╠══════════════════════════════╣
║  PLANNING                    ║
║  ▸ Goals                     ║  ← navigates to goalsView (Goals tab)
║  ▸ Trips                     ║  ← navigates to goalsView (Trips tab)
╠══════════════════════════════╣
║  DATA                        ║
║  ▸ Export Backup (JSON)      ║
║  ▸ Export Backup (CSV)       ║
║  ▸ Import Backup             ║
╠══════════════════════════════╣
║  ⚙️  Settings                ║  ← Opens clean settings screen
╚══════════════════════════════╝
```

### Clean Settings Screen — 5 sections only
```
APPEARANCE
  · Theme (dark / light toggle)
  · Currency selector

PERSONALITY  ← New section (placeholder for Phase 2)
  · [Dino prefs will land here in Phase 2]

SECURITY
  · PIN lock (toggle + change PIN button)
  · Biometric unlock (toggle + status)

NOTIFICATIONS
  · Daily reminder (toggle + time picker)
  · Budget alerts (toggle + threshold)

SYNC
  · Google Drive status
  · Connect / Disconnect / Sync Now buttons
  · Custom OAuth Client ID (collapsed by default)

DANGER ZONE
  · Reset Cloud Sync Only
  · Full Reset: Cloud + Local
```

## 1.2 — Files Modified

### `index.html`
**Add:**
- `#sideDrawer` — left-slide drawer div (full structure above)
- `#drawerBackdrop` — semi-transparent tap-to-close overlay
- `#hamburgerBtn` — top-left header button (☰ icon)
- Restructure `#settingsView` — remove all data-management sections, keep only the 5 clean sections above
- Keep all the existing modal HTML (edit-category modal, edit-payment modal, recurring modal, EMI modal, etc.) — they are still referenced by their functions

**Move within HTML (not delete):**
- Budget & Cycle form → drawer panel content area (rendered dynamically on open)
- Categories list → rendered in drawer when "Categories" tapped
- Payments list → rendered in drawer when "Payment Methods" tapped
- Recurring list → rendered in drawer when "Recurring Expenses" tapped
- EMI list → rendered in drawer when "EMIs" tapped
- Backup buttons → drawer DATA section links

**Header changes:**
- Add `#hamburgerBtn` (top-left, ☰)
- Existing layout: hamburgerBtn | [TReX logo] | [sync icon] [lock icon]

### `styles.css`
**Add:**
```css
/* Side Drawer */
#sideDrawer {
  position: fixed;
  top: 0; left: 0;
  width: min(320px, 85vw);
  height: 100%;
  z-index: 200;
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  background: var(--surface-elevated);  /* uses existing CSS vars */
  border-right: 1px solid var(--border);
}
#sideDrawer.open { transform: translateX(0); }

#drawerBackdrop {
  position: fixed; inset: 0;
  z-index: 199;
  background: rgba(0,0,0,0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
#drawerBackdrop.open { opacity: 1; pointer-events: all; }

.drawer-section-header {
  font-size: 0.65rem; font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: 16px 20px 6px;
  text-transform: uppercase;
}

.drawer-item {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 20px;
  cursor: pointer;
  border-radius: 8px;
  margin: 1px 8px;
  transition: background 0.15s;
}
.drawer-item:hover, .drawer-item:active {
  background: var(--surface-hover);
}
.drawer-item-icon { width: 20px; text-align: center; }
.drawer-item-label { font-size: 0.9rem; font-weight: 500; }
```

### `core.js`
**Add functions:**
```js
function openDrawer() {
  document.getElementById('sideDrawer').classList.add('open');
  document.getElementById('drawerBackdrop').classList.add('open');
}
function closeDrawer() {
  document.getElementById('sideDrawer').classList.remove('open');
  document.getElementById('drawerBackdrop').classList.remove('open');
}
```

**Update `switchScreen()`:** call `closeDrawer()` at the top of switchScreen so navigating always closes the drawer.

### `settings.js`
**Update `renderSettingsLists()`:** This function currently renders categories, payments, recurring, and EMI lists into Settings. After this phase it should still render them — but into a `#drawerContentArea` div inside the drawer instead of the settings screen.

**Add `openDrawerSection(sectionName)`:** switches which content is shown inside the drawer's content area when a drawer item is tapped. For Budget & Cycle / Categories / Payments / Recurring / EMIs — renders the existing form/list HTML into the drawer content panel (the same HTML as before, just hosted differently).

**Approach:** The drawer has two layers:
1. **Nav layer** — always visible list of items (the menu above)
2. **Content layer** — a sub-panel that slides over the nav when an item is tapped, showing the form/list, with a back arrow

This keeps the drawer from becoming a full-page screen — it stays "drawer-like."

## 1.3 — Drawer Sub-panel Pattern

```
[☰ Drawer open]
  → [Nav list visible]
  → User taps "Categories"
  → Drawer content panel slides right-to-left over nav
  → Shows categories list (same HTML/rendering as before)
  → Back arrow "←" in drawer header slides back to nav list
```

CSS for this:
```css
#drawerNav { transition: transform 0.25s ease; }
#drawerContent {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0;
  transform: translateX(100%);
  transition: transform 0.25s ease;
  overflow-y: auto;
  padding: 0 0 80px;
}
#drawerContent.open {
  transform: translateX(0);
}
#drawerNav.hidden { transform: translateX(-100%); }
```

## 1.4 — What Stays in Settings View

Only the clean 5-section form. `syncSettingsFormFields()` still populates all its inputs. `renderSyncControls()` still renders into its existing container. The danger zone still renders via `renderResetDangerZone()`. Zero functional logic changes.

## 1.5 — Stability Checklist (Phase 1 done when:)
- [ ] Drawer opens/closes with no JS errors
- [ ] All drawer nav items navigate correctly
- [ ] Categories, Payments, Recurring, EMI lists render in drawer sub-panel
- [ ] All modals (edit category, edit payment, etc.) still function from drawer
- [ ] Budget & Cycle form saves correctly from drawer
- [ ] Settings screen shows only the 5 clean sections
- [ ] All existing nav tabs (dashboard, ledger, reports, cards, goals) work unchanged
- [ ] Sync controls, danger zone, PIN, biometrics all work in new Settings layout
- [ ] No function renames — only new wrappers and relocated HTML

---

# PHASE 2 — State & Preferences Foundation

**Goal:** Add `dinoPrefs` to state, add the "Personality" section in Settings with all toggles. No visual changes yet — just the plumbing.

## 2.1 — New State Fields

**In `core.js`, add to default state:**
```js
dinoPrefs: {
  dinoMode: true,           // Full dino personality (copy + animations)
  roarSounds: false,        // Audio micro-feedback (default OFF — never surprise users with sound)
  soundVolume: 0.6,         // Master volume scalar (0.0–1.0)
  fossilMode: false,        // Fossil color theme (amber/charcoal)
  extinctionWarnings: true, // Dramatic overspend language
  dinoFootprints: true,     // Heatmap footprint markers
  herdMode: true,           // Sync copy uses "herd" metaphors
  recentActivityLabel: 'dino', // 'dino' = "Recent Kills" / 'neutral' = "Recent Transactions"
}
```

**Migration:** `saveStateToLocalStorage()` already handles missing fields gracefully via spread defaults. Add `dinoPrefs` to the `normalizeImportedState()` and `normalizeSyncState()` default fills.

## 2.2 — Settings Personality Section

**In `index.html`, add inside `#settingsView` after Appearance section:**

```html
<!-- PERSONALITY SECTION -->
<div class="settings-section">
  <h3 class="settings-section-title">Personality</h3>
  
  <!-- Dino Mode master toggle -->
  <div class="settings-row">
    <div>
      <div class="settings-label">🦖 Dino Mode</div>
      <div class="settings-sub">Full dino copy, flavor text &amp; animations</div>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="dinoModeToggle" onchange="toggleDinoMode()">
      <span class="toggle-slider"></span>
    </label>
  </div>

  <!-- Roar Sounds -->
  <div class="settings-row">
    <div>
      <div class="settings-label">🔊 Roar Sounds</div>
      <div class="settings-sub">Audio micro-feedback on actions</div>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="roarSoundsToggle" onchange="toggleRoarSounds()">
      <span class="toggle-slider"></span>
    </label>
  </div>

  <!-- Volume slider — visible only when sounds enabled -->
  <div class="settings-row" id="soundVolumeRow" style="display:none">
    <div class="settings-label">Volume</div>
    <input type="range" min="0" max="100" id="soundVolumeSlider" 
           oninput="saveSoundVolume()" class="app-range">
  </div>

  <!-- Fossil Mode -->
  <div class="settings-row">
    <div>
      <div class="settings-label">🦴 Fossil Mode</div>
      <div class="settings-sub">Dark amber &amp; charcoal color theme</div>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="fossilModeToggle" onchange="toggleFossilMode()">
      <span class="toggle-slider"></span>
    </label>
  </div>

  <!-- Dino Footprints on Heatmap -->
  <div class="settings-row">
    <div>
      <div class="settings-label">🦶 Dino Footprints</div>
      <div class="settings-sub">Mark high-spend days on the calendar</div>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="dinoFootprintsToggle" onchange="toggleDinoFootprints()">
      <span class="toggle-slider"></span>
    </label>
  </div>

  <!-- Extinction Warnings -->
  <div class="settings-row">
    <div>
      <div class="settings-label">☄️ Extinction Warnings</div>
      <div class="settings-sub">Dramatic language when over budget</div>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="extinctionWarningsToggle" onchange="toggleExtinctionWarnings()">
      <span class="toggle-slider"></span>
    </label>
  </div>

</div>
```

## 2.3 — New Functions in `settings.js`

```js
function syncPersonalitySettings() {
  // Called from syncSettingsFormFields()
  const p = state.dinoPrefs || {};
  document.getElementById('dinoModeToggle').checked = p.dinoMode ?? true;
  document.getElementById('roarSoundsToggle').checked = p.roarSounds ?? false;
  document.getElementById('soundVolumeSlider').value = Math.round((p.soundVolume ?? 0.6) * 100);
  document.getElementById('soundVolumeRow').style.display = p.roarSounds ? 'flex' : 'none';
  document.getElementById('fossilModeToggle').checked = p.fossilMode ?? false;
  document.getElementById('dinoFootprintsToggle').checked = p.dinoFootprints ?? true;
  document.getElementById('extinctionWarningsToggle').checked = p.extinctionWarnings ?? true;
}

function toggleDinoMode() {
  state.dinoPrefs.dinoMode = document.getElementById('dinoModeToggle').checked;
  saveStateToLocalStorage();
  // Phase 3+ will react to this. For now just saves.
  showNotification('Personality updated.');
}

function toggleRoarSounds() {
  state.dinoPrefs.roarSounds = document.getElementById('roarSoundsToggle').checked;
  document.getElementById('soundVolumeRow').style.display = state.dinoPrefs.roarSounds ? 'flex' : 'none';
  saveStateToLocalStorage();
}

function saveSoundVolume() {
  state.dinoPrefs.soundVolume = document.getElementById('soundVolumeSlider').value / 100;
  saveStateToLocalStorage();
}

function toggleFossilMode() {
  state.dinoPrefs.fossilMode = document.getElementById('fossilModeToggle').checked;
  applyTheme(state.theme, state.dinoPrefs.fossilMode);  // Phase 9 will fully implement
  saveStateToLocalStorage();
}

function toggleDinoFootprints() {
  state.dinoPrefs.dinoFootprints = document.getElementById('dinoFootprintsToggle').checked;
  saveStateToLocalStorage();
  renderSpendHeatmap();
}

function toggleExtinctionWarnings() {
  state.dinoPrefs.extinctionWarnings = document.getElementById('extinctionWarningsToggle').checked;
  saveStateToLocalStorage();
}
```

## 2.4 — Helper added to `core.js`

```js
// Convenience — read dinoPrefs safely
function dp(key) {
  return (state.dinoPrefs || {})[key];
}
// Usage: dp('dinoMode') — returns true/false/undefined
```

## 2.5 — Stability Checklist
- [ ] All 5 toggles save correctly and persist across page reload
- [ ] Volume slider shows/hides based on Roar Sounds toggle
- [ ] `syncPersonalitySettings()` is called from `syncSettingsFormFields()`
- [ ] `normalizeImportedState()` and `normalizeSyncState()` fill `dinoPrefs` defaults
- [ ] No other functionality changes — toggles save state but don't yet change the UI

---

# PHASE 3 — Dino Copy & Micro-text

**Goal:** Every toast, confirm dialog, empty state, and contextual label gets dino-flavored copy. Controlled by `dp('dinoMode')`. Zero CSS or structural changes.

## 3.1 — Pattern

All copy functions use a helper:
```js
// In core.js
function t(neutral, dino) {
  return dp('dinoMode') ? dino : neutral;
}
// Usage: t("Expense saved", "🦖 Devoured! Expense saved.")
```

## 3.2 — `showNotification()` call sites — `core.js` + all modules

Replace each hardcoded string at the call site:

| Call site (function) | File | New call |
|---|---|---|
| Expense saved | `transactions.js` | `showNotification(t("Expense saved", "🦖 Devoured! Expense saved."))` |
| Settings saved | `settings.js` | `showNotification(t("Settings saved", "🦖 Stomped it. Settings saved."))` |
| Transaction deleted | `transactions.js` | `showNotification(t("Deleted.", "🦴 Gone extinct."))` |
| Category saved | `settings.js` | `showNotification(t("Category saved.", "🦕 New territory claimed."))` |
| Payment saved | `settings.js` | `showNotification(t("Payment method saved.", "🦖 Hunting weapon added."))` |
| Backup exported | `backup.js` | `showNotification(t("Backup exported.", "🥚 Fossilized! Backup ready."))` |
| Backup imported | `backup.js` | `showNotification(t("Data restored.", "🦖 Unearthed! Data restored."))` |
| Reminder set | `dashboard.js` | `showNotification(t("Reminder saved.", "⏰ TReX will remember. (Short-armed but sharp-minded.)"))` |
| PIN changed | `auth.js` | `showNotification(t("PIN changed.", "🔒 Lair secured."))` |
| Sync complete | `sync.js` | `showNotification(t("Synced.", "☁️ Herd synced across devices."))` |
| Sync failed | `sync.js` | `showNotification(t("Sync failed.", "🌋 Sync blocked. Meteorite incoming?"))` |
| Goal created | `goals-trips.js` | `showNotification(t("Goal created.", "🥚 New egg in the nest."))` |
| Recurring saved | `recurring.js` | `showNotification(t("Schedule saved.", "🔁 Stampede scheduled."))` |
| EMI saved | `recurring.js` | `showNotification(t("EMI saved.", "📅 Installment plan locked in."))` |

## 3.3 — `customConfirm()` call sites

Replace title/okLabel at each call:

| Action | File | Title | OK label |
|---|---|---|---|
| Delete transaction | `transactions.js` | `t("Delete this?","Send it extinct?")` | `t("Delete","Extinct it")` |
| Delete category | `settings.js` | `t("Delete category?","Wipe this territory?")` | `t("Delete","Wipe it")` |
| Delete payment | `settings.js` | `t("Delete payment?","Fossilize this?")` | `t("Delete","Fossilize")` |
| Delete recurring | `recurring.js` | `t("Stop this schedule?","Stop the stampede?")` | `t("Stop","Stop it")` |
| Delete goal | `goals-trips.js` | `t("Delete goal?","Abandon the hunt?")` | `t("Delete","Abandon")` |
| Delete trip | `goals-trips.js` | `t("Delete trip?","Cancel the migration?")` | `t("Delete","Cancel trip")` |
| Full reset | `sync.js` | `t("Reset everything?","Trigger the meteor?")` | `t("Wipe everything","Wipe everything")` |
| Reset sync | `sync.js` | `t("Reset cloud sync?","Forget the herd?")` | `t("Disconnect","Disconnect")` |

## 3.4 — Empty States

In each render function, replace the empty-state HTML string:

| Function | File | Dino empty state |
|---|---|---|
| `renderHistoryList()` | `transactions.js` | `🦕 Nothing here yet. Start the hunt!` |
| `renderSavingGoalsDedicated()` | `goals-trips.js` | `🥚 No eggs in the nest yet. Create a goal.` |
| `renderTripsList()` | `goals-trips.js` | `🦖 No migrations planned. Add a trip.` |
| `renderHistoricalMonthReport()` | `reports.js` | `🦴 Fossil-free zone. Add expenses to see reports.` |
| `renderRecurringExpenses()` | `recurring.js` | `🔁 No stampedes scheduled yet.` |
| `renderEMIsList()` | `recurring.js` | `📅 No EMI schedules yet.` |
| `renderCreditCardsView()` | `credit-cards.js` | `💳 No credit cards configured.` |

## 3.5 — `getDailyReminderBody()` — `dashboard.js`

```js
function getDailyReminderBody() {
  if (!dp('dinoMode')) return "Don't forget to log today's expenses.";
  const lines = [
    "TReX is hungry — feed it today's expenses 🦖",
    "Short arms, long memory. Log your spending.",
    "Don't let expenses go extinct untracked.",
    "The herd is waiting. Sync your expenses.",
    "A T-Rex never forgets. Did you log today?",
  ];
  return lines[new Date().getDay() % lines.length];
}
```

## 3.6 — `checkBudgetAlerts()` — `dashboard.js`

```js
// Replace the notification body strings:
const pct = metrics.spent / metrics.budget * 100;
if (pct >= 120 && dp('extinctionWarnings')) {
  body = t(`You're ₹${over} over budget!`, `🌋 METEOR STRIKE. You're ₹${over} over budget.`);
} else if (pct >= 100) {
  body = t("Budget reached! No more spending.", `💥 Budget extinct! You've hit your limit.`);
} else if (pct >= 80) {
  body = t("80% of budget used.", `🦖 TReX is getting hungry — 80% of budget devoured.`);
}
```

## 3.7 — Forecast Card Copy — `renderForecastCard()` — `dashboard.js`

```js
const forecastCopy = dp('dinoMode') ? {
  good:  "🦕 Budget healthy. TReX approves.",
  warn:  "🦖 TReX is restless. Slow the spending.",
  over:  "💥 Budget devoured. Brace for impact.",
} : {
  good:  "On track for the month.",
  warn:  "Getting tight — watch your spending.",
  over:  "Over budget this cycle.",
};
```

## 3.8 — Goals & Trips labels — `goals-trips.js`

When `dp('dinoMode')`:
- Goal card: "Target" → "Hunt Target", "Saved" → "Devoured So Far"
- Trip card: "Total Spent" → "Total Devoured"
- Trip status chips: "Upcoming" → "🥚 Hatching", "Active" → "🦖 On the Hunt", "Completed" → "🏆 Conquered"
- Active trip banner prefix: add 🦖

## 3.9 — Ledger copy — `transactions.js`

```js
// Search bar placeholder
searchInput.placeholder = dp('dinoMode') ? "Search the fossil record…" : "Search transactions…";

// Section/page title
historyTitle.textContent = dp('dinoMode') ? "Fossil Record" : "Transaction History";

// No-results empty state
emptyEl.innerHTML = dp('dinoMode') ? "🦴 No fossils match your search." : "No transactions found.";
```

## 3.10 — Reports labels — `reports.js`

When `dp('dinoMode')`:
- MoM: "Previous Period" → "Last Hunt", "Current Period" → "This Hunt", "Change" → "Evolution"
- PDF footer: append "🦖 Devour Your Expenses"

## 3.11 — Sync copy — `sync.js`

When `dp('dinoMode')` (or `dp('herdMode')`):
- `showOnboardingModal()` opening line: "🦖 TReX stores your data locally — like fossils in rock. Connect Google Drive to protect your herd across devices."
- Migration "Merge" button: "Merge the Herds"
- Migration "Fresh Start" button: "Start a New Era"
- Danger zone heading: "☄️ Danger Zone — The Meteor"

## 3.12 — Lock screen copy — `index.html` / `auth.js`

- Biometric button label: `dp('dinoMode') ? "Unlock with Claw 🦖" : "Use Biometrics"`
- PIN screen subtitle (already has "Devour Your Expenses" in some builds — confirm or add)

## 3.13 — Stability Checklist
- [ ] `t()` helper is in `core.js` and accessible globally
- [ ] All notification strings updated
- [ ] All confirm titles/labels updated
- [ ] All empty states updated
- [ ] Toggle Dino Mode OFF → all copy returns to neutral
- [ ] Toggle Dino Mode ON → all dino copy appears
- [ ] No animation or CSS changes in this phase

---

# PHASE 4 — Dino Animations & CSS

**Goal:** Add all CSS keyframes and their JS triggers. No new visual components yet — existing elements get animated.

## 4.1 — CSS Block in `styles.css`

Add the entire `/* === DINO ANIMATIONS === */` block at the end of `styles.css`:

```css
/* === DINO ANIMATIONS === */

/* Wrong PIN — shake */
@keyframes trex-shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-8px); }
  40%       { transform: translateX(8px); }
  60%       { transform: translateX(-5px); }
  80%       { transform: translateX(5px); }
}
.pin-shake { animation: trex-shake 0.4s ease; }

/* Unlock — screen exits with stomp */
@keyframes trex-stomp {
  0%   { transform: translateY(0) scale(1); }
  40%  { transform: translateY(4px) scale(1.01); }
  100% { transform: translateY(100%) scale(1); }
}
.lock-screen-exit {
  animation: trex-stomp 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
}

/* Budget bar danger pulse */
@keyframes trex-hungry-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
}
.budget-danger { animation: trex-hungry-pulse 1.5s ease infinite; }

/* Quick log bite */
@keyframes dino-bite {
  0%   { transform: scale(1); }
  30%  { transform: scale(0.88); }
  70%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}
.dino-bite { animation: dino-bite 0.25s ease; }

/* Expense form chomp on save */
@keyframes dino-chomp {
  0%   { transform: scaleY(1) scaleX(1); opacity: 1; }
  40%  { transform: scaleY(0.05) scaleX(1.1); opacity: 0.6; }
  100% { transform: scaleY(0) scaleX(1); opacity: 0; }
}
.expense-chomp { animation: dino-chomp 0.3s ease forwards; }

/* Transaction delete — extinction */
@keyframes go-extinct {
  0%   { transform: translateX(0); opacity: 1; max-height: 80px; }
  70%  { transform: translateX(110%); opacity: 0; max-height: 80px; }
  100% { transform: translateX(110%); opacity: 0; max-height: 0; padding: 0; margin: 0; }
}
.going-extinct { animation: go-extinct 0.35s ease forwards; overflow: hidden; }

/* Smiley/dino tap animations */
@keyframes smiley-thrive {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.3); }
  60%  { transform: scale(0.9); }
  80%  { transform: scale(1.05); }
  100% { transform: scale(1); }
}
@keyframes smiley-cruise {
  0%, 100% { transform: rotate(0deg); }
  25%       { transform: rotate(-8deg); }
  75%       { transform: rotate(8deg); }
}
@keyframes smiley-cautious {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-5px); }
  40%       { transform: translateX(5px); }
  60%       { transform: translateX(-3px); }
  80%       { transform: translateX(3px); }
}
@keyframes smiley-stressed {
  0%, 100% { transform: translateX(0); }
  10%       { transform: translateX(-6px) rotate(-2deg); }
  30%       { transform: translateX(6px) rotate(2deg); }
  50%       { transform: translateX(-4px) rotate(-1deg); }
  70%       { transform: translateX(4px) rotate(1deg); }
  90%       { transform: translateX(-2px); }
}
@keyframes smiley-extinct {
  0%   { transform: rotate(0deg) scale(1); opacity: 1; }
  60%  { transform: rotate(720deg) scale(0); opacity: 0; }
  61%  { transform: rotate(0deg) scale(0); opacity: 0; }
  100% { transform: rotate(0deg) scale(1); opacity: 1; }
}
@keyframes dino-tail-whip {
  0%, 100% { transform: skewX(0deg); }
  25%       { transform: skewX(-6deg); }
  75%       { transform: skewX(6deg); }
}
.dino-turned-away {
  transform: scaleX(-1) !important;
  transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
  filter: grayscale(0.3);
}

/* Speech bubble */
.budget-speech-bubble {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 0.78rem;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  animation: bubble-pop 0.2s cubic-bezier(0.34,1.56,0.64,1);
  pointer-events: none;
  z-index: 10;
}
.budget-speech-bubble::after {
  content: '';
  position: absolute;
  top: 100%; left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--border);
}
@keyframes bubble-pop {
  0%   { transform: translateX(-50%) scale(0.5); opacity: 0; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

/* Logo micro-bounce */
@keyframes logo-bounce {
  0%   { transform: scale(1); }
  30%  { transform: scale(0.93); }
  65%  { transform: scale(1.05); }
  100% { transform: scale(1); }
}
.logo-bounce { animation: logo-bounce 0.2s ease-out; }

/* Dino idle bob (used in budget panel) */
@keyframes dino-idle-bob {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-3px); }
}
.dino-idle { animation: dino-idle-bob 2s ease-in-out infinite; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .dino-bite, .pin-shake, .lock-screen-exit,
  .expense-chomp, .going-extinct, .budget-danger,
  .dino-idle, .logo-bounce {
    animation: none !important;
    transition: none !important;
  }
}
```

## 4.2 — JS Triggers

### Wrong PIN shake — `auth.js` — `pressPin()`
```js
// After wrong PIN detected:
if (dp('dinoMode')) {
  const dots = document.getElementById('pinDots');
  dots.classList.add('pin-shake');
  setTimeout(() => dots.classList.remove('pin-shake'), 450);
}
```

### Unlock stomp — `auth.js` — `unlockApp()`
```js
if (dp('dinoMode')) {
  const lockScreen = document.getElementById('lockScreen');
  lockScreen.classList.add('lock-screen-exit');
  setTimeout(() => {
    lockScreen.classList.remove('lock-screen-exit');
    lockScreen.style.display = 'none'; // or existing hide logic
  }, 380);
} else {
  // existing hide logic immediately
}
```

### Budget danger pulse — `dashboard.js` — `renderForecastCard()`
```js
const pct = metrics.spent / (metrics.budget || 1) * 100;
const bar = document.getElementById('budgetProgressBar'); // adjust ID
if (bar) {
  bar.classList.toggle('budget-danger', pct >= 80 && dp('dinoMode'));
}
```

### Quick log bite — `dashboard.js` — `triggerQuickLog()`
```js
// Add class to the tapped button before the transaction:
const btn = event.currentTarget; // ensure event is passed
if (dp('dinoMode')) {
  btn.classList.add('dino-bite');
  setTimeout(() => btn.classList.remove('dino-bite'), 300);
}
```

### Expense form chomp on save — `transactions.js` — `handleExpenseSubmit()`
```js
if (dp('dinoMode') && !isEditing) {
  const formCard = document.getElementById('addExpenseView');
  formCard.classList.add('expense-chomp');
  setTimeout(() => {
    formCard.classList.remove('expense-chomp');
    switchScreen('dashboard'); // or history
  }, 320);
} else {
  switchScreen('dashboard');
}
```

### Transaction delete extinction — `transactions.js` — `deleteTransaction()`
```js
const row = document.getElementById(`tx-row-${id}`); // ensure rows have IDs
if (row && dp('dinoMode')) {
  row.classList.add('going-extinct');
  await new Promise(r => setTimeout(r, 380));
}
// then proceed with state mutation
```

## 4.3 — Stability Checklist
- [ ] All CSS keyframes load without errors
- [ ] Wrong PIN shakes the dot row in Dino Mode, nothing in Normal Mode
- [ ] Unlock has stomp exit in Dino Mode, instant hide in Normal Mode
- [ ] Budget bar pulses when >= 80% in Dino Mode
- [ ] Quick log button bounces on tap in Dino Mode
- [ ] Expense save has chomp in Dino Mode (screen switches after animation)
- [ ] Transaction delete has extinction slide in Dino Mode
- [ ] `prefers-reduced-motion` disables all animations
- [ ] All animations are clean with no residual states

---

# PHASE 5 — Dino Visual Layer

**Goal:** The biggest visual changes. Living dino SVG on budget panel, nav icon swaps, sync egg indicator, PIN dots as footprints. Each is a self-contained unit that can be built and tested independently.

## 5.1 — Living Dino in Budget Panel (⭐⭐⭐⭐⭐)

**File:** `dashboard.js` — `renderForecastCard()`

Five hunger states map to 5 CSS classes on a container `<div>` holding an inline SVG dino character.

**Dino SVG** — one base SVG, expression changes via CSS classes:
```html
<div id="budgetDinoWrap" class="budget-dino-container">
  <svg id="budgetDinoSvg" viewBox="0 0 80 80" width="64" height="64">
    <!-- Base body — simple rounded T-Rex silhouette -->
    <ellipse cx="42" cy="50" rx="22" ry="18" fill="currentColor"/>  <!-- body -->
    <ellipse cx="55" cy="35" rx="14" ry="12" fill="currentColor"/>  <!-- head -->
    <path class="dino-mouth" d="M55,40 Q62,44 68,40"/>              <!-- mouth -->
    <circle class="dino-eye" cx="60" cy="30" r="3" fill="#1a1a2e"/> <!-- eye -->
    <ellipse cx="30" cy="58" rx="8" ry="5" fill="currentColor" opacity="0.7"/> <!-- tail -->
    <ellipse cx="46" cy="64" rx="5" ry="8" fill="currentColor"/>    <!-- leg L -->
    <ellipse cx="54" cy="64" rx="5" ry="8" fill="currentColor"/>    <!-- leg R -->
    <ellipse cx="37" cy="44" rx="4" ry="3" fill="currentColor"/>    <!-- arm -->
  </svg>
  <div id="budgetSpeechBubble" class="budget-speech-bubble" style="display:none"></div>
</div>
```

**State classes applied to `#budgetDinoWrap`:**
```css
.dino-fed      { color: #4ade80; }  /* green */
.dino-prowl    { color: #a3e635; }  /* lime */
.dino-hungry   { color: #fb923c; }  /* amber */
.dino-ravenous { color: #f87171; }  /* red-orange */
.dino-extinct  { color: #dc2626; animation: trex-hungry-pulse 0.8s ease infinite; }

/* Mouth path changes per state */
.dino-fed      .dino-mouth { d: path("M55,40 Q62,38 68,40"); }   /* smile */
.dino-prowl    .dino-mouth { d: path("M55,41 Q62,41 68,41"); }   /* neutral */
.dino-hungry   .dino-mouth { d: path("M55,40 Q62,45 68,40"); }   /* frown */
.dino-ravenous .dino-mouth { d: path("M53,38 Q62,48 70,38"); }   /* open jaw */
.dino-extinct  .dino-mouth { d: path("M53,36 Q62,50 70,36"); }   /* wide open */
```

**In `renderForecastCard()`:**
```js
function getDinoState(pct) {
  if (pct <= 30)  return 'dino-fed';
  if (pct <= 60)  return 'dino-prowl';
  if (pct <= 80)  return 'dino-hungry';
  if (pct < 100)  return 'dino-ravenous';
  return 'dino-extinct';
}

const wrap = document.getElementById('budgetDinoWrap');
if (wrap && dp('dinoMode')) {
  wrap.className = `budget-dino-container dino-idle ${getDinoState(pct)}`;
} else if (wrap) {
  // Normal Mode — show existing smiley (keep as-is, just hide the dino wrap)
}
```

The dino has `.dino-idle` class always → gentle 2s bob animation.

## 5.2 — Nav Bar Icon Swap (⭐⭐⭐⭐)

**File:** `core.js`

Small inline SVG strings for each dino nav icon, stored in a map:

```js
const DINO_NAV_ICONS = {
  dashboard:   `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><!-- T-Rex silhouette --></svg>`,
  addExpense:  `<svg><!-- Open jaw / chomp --></svg>`,
  history:     `<svg><!-- Bone stack --></svg>`,
  reports:     `<svg><!-- Footprint trail --></svg>`,
  goals:       `<svg><!-- Egg + nest --></svg>`,
  cards:       `<svg><!-- Bone with chip --></svg>`,
};
```

In `switchScreen()`, after the existing nav tab logic:
```js
if (dp('dinoMode')) {
  document.querySelectorAll('[data-nav-icon]').forEach(el => {
    const key = el.dataset.navIcon;
    if (DINO_NAV_ICONS[key]) el.innerHTML = DINO_NAV_ICONS[key];
  });
} else {
  // Re-run initLucideIcons() to restore Lucide icons
  initLucideIcons();
}
```

Add `data-nav-icon="dashboard"` etc. to the nav icon elements in `index.html`.

## 5.3 — Sync Egg Indicator (⭐⭐⭐⭐⭐)

**File:** `sync.js` — `updateHeaderSyncIcon()`

In Dino Mode, replace the Lucide cloud icon with a tiny animated SVG egg:

```html
<!-- The egg SVG — inline, 18×20px -->
<svg id="syncEggSvg" viewBox="0 0 18 20" width="18" height="20">
  <ellipse cx="9" cy="11" rx="7" ry="9" fill="currentColor"/>
  <!-- crack line — shown in offline/error states -->
  <path id="syncEggCrack" d="M9,5 L7,9 L10,11 L8,15" 
        stroke="#1a1a2e" stroke-width="1.2" fill="none" opacity="0"/>
</svg>
```

State → egg behavior:
```css
/* Idle/synced — soft green glow pulse */
.sync-egg-idle { color: #4ade80; animation: sync-egg-glow 2.5s ease-in-out infinite; }
@keyframes sync-egg-glow {
  0%, 100% { filter: drop-shadow(0 0 2px #4ade8060); }
  50%       { filter: drop-shadow(0 0 6px #4ade8099); }
}

/* Syncing — rocks side to side */
.sync-egg-syncing { color: #818cf8; animation: sync-egg-rock 0.5s ease-in-out infinite; }
@keyframes sync-egg-rock {
  0%, 100% { transform: rotate(-10deg); }
  50%       { transform: rotate(10deg); }
}

/* Offline — grey */
.sync-egg-offline { color: #64748b; }

/* Error — red tint + show crack */
.sync-egg-error { color: #f87171; }
.sync-egg-error #syncEggCrack { opacity: 1; }
```

In `updateHeaderSyncIcon()`:
```js
const btn = document.getElementById('headerSyncBtn');
if (dp('dinoMode')) {
  // Inject egg SVG, apply state class
  btn.innerHTML = `[egg SVG HTML]`;
  const eggEl = btn.querySelector('#syncEggSvg') || btn;
  eggEl.className = {
    idle:    'sync-egg-idle',
    syncing: 'sync-egg-syncing',
    offline: 'sync-egg-offline',
    error:   'sync-egg-error',
  }[state.syncStatus] || 'sync-egg-offline';
} else {
  // Existing Lucide icon logic (unchanged)
}
```

## 5.4 — PIN Dots as Footprints (⭐⭐⭐⭐)

**File:** `auth.js` — `updatePinVisualDots()`

Footprint SVG (inline, ~16px):
```js
const FOOTPRINT_SVG = `<svg viewBox="0 0 16 20" width="14" height="18">
  <ellipse cx="8" cy="14" rx="5" ry="6" fill="currentColor"/>
  <ellipse cx="4" cy="6" rx="2" ry="2.5" fill="currentColor"/>
  <ellipse cx="8" cy="4" rx="2" ry="2.5" fill="currentColor"/>
  <ellipse cx="12" cy="6" rx="2" ry="2.5" fill="currentColor"/>
</svg>`;

const EMPTY_DOT = `<div style="width:14px;height:18px;border-radius:50%;border:2px solid currentColor;opacity:0.4"></div>`;
```

```js
function updatePinVisualDots() {
  const filled = pinAttemptBuffer.length;
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => {
    if (dp('dinoMode')) {
      dot.innerHTML = i < filled ? FOOTPRINT_SVG : EMPTY_DOT;
      dot.style.color = i < filled ? '#4ade80' : '';
    } else {
      // existing behavior
      dot.classList.toggle('filled', i < filled);
    }
  });
}
```

## 5.5 — Stability Checklist
- [ ] Budget dino renders in 5 states based on spend %
- [ ] Dino idle bob animation runs continuously
- [ ] Dino does NOT render when Dino Mode is OFF (smiley/existing UI shows)
- [ ] Nav icons swap in Dino Mode, restore in Normal Mode
- [ ] Sync egg reflects all 4 sync states correctly
- [ ] PIN dots show footprints in Dino Mode, circles in Normal Mode
- [ ] All SVGs render at correct sizes on mobile
- [ ] No layout shifts from icon swaps

---

# PHASE 6 — Logo Tap Interactions

**Goal:** Tap counter system on the app header logo. 3 interactions. All logic in `core.js` and `dashboard.js`.

## 6.1 — Tap Counter Setup — `core.js`

```js
let _logoTapCount = 0;
let _logoTapTimer = null;
let _logoLongPressTimer = null;

function initLogoTapHandler() {
  const logo = document.getElementById('appHeaderLogo'); // add this ID to index.html
  if (!logo) return;

  logo.addEventListener('pointerdown', () => {
    _logoLongPressTimer = setTimeout(() => {
      _logoLongPressTimer = null;
      handleLogoLongPress();
    }, 500);
  });

  logo.addEventListener('pointerup', () => {
    if (!_logoLongPressTimer) return; // was long press
    clearTimeout(_logoLongPressTimer);
    _logoLongPressTimer = null;
    
    // Always micro-bounce
    logo.classList.add('logo-bounce');
    setTimeout(() => logo.classList.remove('logo-bounce'), 220);

    _logoTapCount++;
    clearTimeout(_logoTapTimer);
    _logoTapTimer = setTimeout(() => {
      if      (_logoTapCount === 1) switchScreen('dashboard');
      else if (_logoTapCount === 2) showDinoStatsSheet();
      else if (_logoTapCount >= 5) triggerLogoEasterEgg();
      _logoTapCount = 0;
    }, 600);
  });

  logo.addEventListener('pointercancel', () => {
    clearTimeout(_logoLongPressTimer);
    _logoLongPressTimer = null;
  });
}

function handleLogoLongPress() {
  if (dp('dinoMode')) {
    // Roar animation
    const logo = document.getElementById('appHeaderLogo');
    logo.style.transform = 'scale(1.15)';
    setTimeout(() => logo.style.transform = '', 300);
    if (dp('roarSounds')) playSound(S.RESET); // reuse dramatic sound for now; Phase 8 adds proper roar
    showNotification('ROARRR 🦖');
  } else {
    toggleThemeSetting();
    showNotification('Theme switched.');
  }
}
```

Call `initLogoTapHandler()` from `window.onload` in `core.js`.

## 6.2 — Stats Sheet — `dashboard.js` — `showDinoStatsSheet()`

```js
function showDinoStatsSheet() {
  const metrics = calculateCycleMetrics();
  const today = getTodayLocalISO();
  const todayTxs = state.transactions.filter(tx => tx.date === today);
  const todaySpent = todayTxs.reduce((s, tx) => s + tx.amount, 0);
  const todayCatId = todayTxs.length ? /* most frequent category */ null : null;
  const todayCat = state.categories.find(c => c.id === todayCatId);
  const sym = state.currencySymbol;

  const isDino = dp('dinoMode');

  const html = isDino ? `
    <div class="stats-sheet-header">
      <span class="stats-sheet-icon">🦖</span>
      <div>
        <div class="stats-sheet-title">TReX Daily Digest</div>
        <div class="stats-sheet-sub">"The hunt so far…"</div>
      </div>
    </div>
    <div class="stats-sheet-rows">
      <div class="stats-row"><span>🦷 Devoured today</span><span>${sym}${todaySpent.toLocaleString('en-IN')}</span></div>
      <div class="stats-row"><span>💀 Total devoured</span><span>${sym}${metrics.spent.toLocaleString('en-IN')}</span></div>
      <div class="stats-row"><span>🥩 Still available</span><span>${sym}${Math.max(0,metrics.remaining).toLocaleString('en-IN')}</span></div>
      <div class="stats-row"><span>📅 Days of hunt left</span><span>${metrics.daysLeft}</span></div>
      <div class="stats-row"><span>⚖️ Safe daily chomp</span><span>${sym}${Math.max(0,metrics.safeDaily).toLocaleString('en-IN')}</span></div>
      ${todayCat ? `<div class="stats-row"><span>Biggest prey today</span><span>${todayCat.name}</span></div>` : ''}
      <div class="stats-row"><span>Kills today</span><span>${todayTxs.length}</span></div>
    </div>
    <button class="stats-sheet-cta" onclick="switchScreen('reports'); closeStatsSheet()">See the Fossil Record</button>
  ` : `
    <div class="stats-sheet-header">
      <span class="stats-sheet-icon">📊</span>
      <div class="stats-sheet-title">Today's Summary</div>
    </div>
    <div class="stats-sheet-rows">
      <div class="stats-row"><span>Spent today</span><span>${sym}${todaySpent.toLocaleString('en-IN')}</span></div>
      <div class="stats-row"><span>Cycle spent</span><span>${sym}${metrics.spent.toLocaleString('en-IN')}</span></div>
      <div class="stats-row"><span>Remaining</span><span>${sym}${Math.max(0,metrics.remaining).toLocaleString('en-IN')}</span></div>
      <div class="stats-row"><span>Days left</span><span>${metrics.daysLeft}</span></div>
      <div class="stats-row"><span>Safe daily spend</span><span>${sym}${Math.max(0,metrics.safeDaily).toLocaleString('en-IN')}/day</span></div>
      ${todayCat ? `<div class="stats-row"><span>Top category today</span><span>${todayCat.name}</span></div>` : ''}
      <div class="stats-row"><span>Transactions today</span><span>${todayTxs.length}</span></div>
    </div>
    <button class="stats-sheet-cta" onclick="switchScreen('reports'); closeStatsSheet()">View Full Report</button>
  `;

  let sheet = document.getElementById('statsBottomSheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'statsBottomSheet';
    sheet.className = 'bottom-sheet';
    sheet.innerHTML = `<div class="bottom-sheet-panel" id="statsSheetPanel"></div>
                       <div class="bottom-sheet-backdrop" onclick="closeStatsSheet()"></div>`;
    document.body.appendChild(sheet);
  }
  document.getElementById('statsSheetPanel').innerHTML = html;
  sheet.classList.add('open');
}

function closeStatsSheet() {
  const sheet = document.getElementById('statsBottomSheet');
  if (sheet) sheet.classList.remove('open');
}
```

**CSS for bottom sheet** (in `styles.css`):
```css
.bottom-sheet { position: fixed; inset: 0; z-index: 150; pointer-events: none; }
.bottom-sheet.open { pointer-events: all; }
.bottom-sheet-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.5);
  opacity: 0; transition: opacity 0.3s;
}
.bottom-sheet.open .bottom-sheet-backdrop { opacity: 1; }
.bottom-sheet-panel {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: var(--surface-elevated);
  border-radius: 20px 20px 0 0;
  padding: 24px 20px 40px;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
  max-height: 80vh; overflow-y: auto;
}
.bottom-sheet.open .bottom-sheet-panel { transform: translateY(0); }
.stats-sheet-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.stats-sheet-title { font-size: 1.1rem; font-weight: 700; }
.stats-sheet-sub { font-size: 0.8rem; color: var(--text-muted); }
.stats-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
.stats-sheet-cta { width: 100%; margin-top: 20px; padding: 14px; border-radius: 12px; background: var(--primary); color: white; font-weight: 600; border: none; cursor: pointer; font-size: 0.95rem; }
```

## 6.3 — Easter Egg — `core.js` — `triggerLogoEasterEgg()`

```js
function triggerLogoEasterEgg() {
  // Calculate real stats
  const txCount = state.transactions.length;
  const allTimeSpent = state.transactions.reduce((s,tx) => s+tx.amount, 0);
  const firstTx = state.transactions.slice().sort((a,b) => a.date.localeCompare(b.date))[0];
  const daysSince = firstTx 
    ? Math.floor((Date.now() - new Date(firstTx.date)) / 86400000) 
    : 0;
  const sym = state.currencySymbol;
  const ver = '3.4';

  if (!dp('dinoMode')) {
    // Typewriter terminal modal
    showTerminalEasterEgg({ txCount, allTimeSpent, daysSince, sym, ver });
  } else {
    // Cinematic panels
    showCinematicOriginStory({ txCount, allTimeSpent, daysSince, sym });
  }
}

function showTerminalEasterEgg({ txCount, allTimeSpent, daysSince, sym, ver }) {
  const lines = [
    `> TReX v${ver}`,
    `> Local-first finance PWA`,
    `> Built with ☕ and stubbornness`,
    `> No servers. No ads. No BS.`,
    `> Your data stays yours.`,
    `>`,
    `> Total expenses tracked:  ${txCount}`,
    `> Total devoured:   ${sym} ${allTimeSpent.toLocaleString('en-IN')}`,
    `> Days using TReX:         ${daysSince}`,
    `> Sync status:  ${state.syncEnabled ? 'Active ✓' : 'Local only'}`,
    `>`,
    `> Thank you for using TReX.`,
  ];
  // Inject modal, typewriter-animate lines at 40ms/char, then pause then close on tap
}

function showCinematicOriginStory({ txCount, allTimeSpent, daysSince, sym }) {
  const panels = [
    { delay: 0,    content: `🌍  65 million years ago...` },
    { delay: 1500, content: `☄️  A meteor hit.\n    Expenses went extinct.` },
    { delay: 3000, content: `🦖  But one T-Rex survived.\n    Armed with a spreadsheet.` },
    { delay: 4500, content: `💰  TReX — Track Expenses.\n    Devour Your Budget.\n    Never go extinct again.` },
    { delay: 6000, content: `Your lair. Your data.\n\nTotal hunted:  ${sym} ${allTimeSpent.toLocaleString('en-IN')}\nKills logged:  ${txCount} expenses\nDays hunting:  ${daysSince}` },
  ];
  // Full-screen overlay, each panel fades in at its delay, auto-dismiss at 9s, skip button
}
```

## 6.4 — Stability Checklist
- [ ] Single tap → Dashboard (already on dashboard → scroll to top)
- [ ] Double tap → Stats sheet slides up with real numbers
- [ ] 5 taps → Easter egg modal appears (terminal or cinematic)
- [ ] Long press → theme toggle (Normal) or roar animation (Dino)
- [ ] Logo micro-bounce on every tap
- [ ] Stats sheet closes on backdrop tap
- [ ] Easter egg dismisses on tap or after timeout
- [ ] `calculateCycleMetrics()` is the single source for all numbers in the sheet

---

# PHASE 7 — Smiley / Dino Tap Interactions

**Goal:** Full tap system on the budget character. Most complex phase — tap counter, 5 mood states, speech bubbles, annoyance counter, long-press deep dive. All in `dashboard.js`.

## 7.1 — Module-level State

```js
// Add to dashboard.js (module-level)
let _smileyTapCount = 0;
let _smileyTapTimer = null;
let _smileyAnnoyanceCount = 0;
let _smileyTurnedAway = false;
let _smileyTurnedAwayTimer = null;
```

## 7.2 — `attachSmileyTapHandler(el, metrics)` — called from `renderForecastCard()`

```js
function attachSmileyTapHandler(el, metrics) {
  let pressTimer = null;
  const pct = metrics.budget > 0 ? (metrics.spent / metrics.budget * 100) : 0;

  el.addEventListener('pointerdown', () => {
    pressTimer = setTimeout(() => {
      pressTimer = null;
      showBudgetDeepDive(metrics);
    }, 600);
  });

  el.addEventListener('pointerup', () => {
    if (!pressTimer) return;
    clearTimeout(pressTimer);
    pressTimer = null;
    if (_smileyTurnedAway) return; // dino is ignoring you

    _smileyTapCount++;
    clearTimeout(_smileyTapTimer);
    _smileyTapTimer = setTimeout(() => {
      const count = _smileyTapCount;
      _smileyTapCount = 0;
      if (count === 1)      handleSmiley1Tap(el, pct, metrics);
      else if (count === 2) handleSmiley2Tap(el, pct, metrics);
      else                  handleSmileyAnnoyance(el, pct, metrics, count);
    }, 350);
  });

  el.addEventListener('pointercancel', () => clearTimeout(pressTimer));
}
```

## 7.3 — `handleSmiley1Tap(el, pct, metrics)` — single tap

```js
const SMILEY_1TAP = {
  // [animation-class, normal-text, dino-text]
  thriving:  ['smiley-thrive',  "All good! Keep it up.",    "Fed and fearless. 🦖"],
  cruising:  ['smiley-cruise',  "Decent. Watch the pace.",  "Hunt is going fine."],
  cautious:  ['smiley-cautious',"Bit tight. Be careful.",   "Getting hungry..."],
  stressed:  ['smiley-stressed',"This is not great.",       "I need to eat. Now."],
  extinct:   ['smiley-extinct', "We don't talk about this.","...I may have blacked out."],
};

function handleSmiley1Tap(el, pct, metrics) {
  const state = getPctState(pct);
  const [anim, normalTxt, dinoTxt] = SMILEY_1TAP[state];
  
  el.classList.add(anim);
  setTimeout(() => el.classList.remove(anim), 500);
  showSpeechBubble(el, dp('dinoMode') ? dinoTxt : normalTxt, 2000);
  
  if (dp('roarSounds')) playSound(S.SAVE); // Phase 8 maps to correct sound per state
}
```

## 7.4 — `handleSmiley2Tap(el, pct, metrics)` — double tap with real numbers

```js
function handleSmiley2Tap(el, pct, metrics) {
  const s = getPctState(pct);
  const sym = state.currencySymbol;
  const r = Math.max(0, metrics.remaining);
  const over = Math.abs(metrics.remaining);
  const sd = Math.max(0, metrics.safeDaily);
  const dl = metrics.daysLeft;
  const dr = Math.round(metrics.spent / Math.max(1, metrics.daysGone || 1));

  const texts = {
    thriving: [
      `₹${r.toLocaleString('en-IN')} left with ${dl} days to go. You're sailing.`,
      `🦖 ₹${r.toLocaleString('en-IN')} left in the hunting ground. ${dl} days of feast ahead.`
    ],
    cruising: [
      `₹${dr}/day so far. Safe to spend ₹${sd}/day from here.`,
      `Consuming ₹${dr}/day. Safe chomp: ₹${sd}.`
    ],
    cautious: [
      `Only ₹${r.toLocaleString('en-IN')} left. That's ₹${sd}/day — tighter than ideal.`,
      `Only ₹${r.toLocaleString('en-IN')} remains. Ration the hunt — ₹${sd}/day max.`
    ],
    stressed: [
      `₹${r.toLocaleString('en-IN')} for ${dl} days. That's ₹${sd}/day. Doable, barely.`,
      `The herd is thinning. ₹${sd}/day is all that's left. Hunt wisely.`
    ],
    extinct: [
      `Over by ₹${over.toLocaleString('en-IN')}. ${dl} days left in the cycle.`,
      `☄️ Budget extinct. Over by ₹${over.toLocaleString('en-IN')}. Survive ${dl} more days.`
    ],
  };

  const txt = texts[s][dp('dinoMode') ? 1 : 0];
  showNotification(txt); // or a larger toast for 3.5s
}
```

## 7.5 — `handleSmileyAnnoyance(el, pct, metrics, tapCount)`

```js
function handleSmileyAnnoyance(el, pct, metrics, tapCount) {
  _smileyAnnoyanceCount++;
  const ac = _smileyAnnoyanceCount;
  const sym = state.currencySymbol;
  const spent = metrics.spent;
  const isDino = dp('dinoMode');

  if (ac === 1) { // 3rd tap
    const msg = isDino ? "I said what I said. 🦖" : "I already told you.";
    el.classList.add('smiley-cautious');
    setTimeout(() => el.classList.remove('smiley-cautious'), 400);
    showSpeechBubble(el, msg, 1800);
  } else if (ac === 2) { // 4th tap
    const msg = isDino ? "You are testing a predator." : "Seriously.";
    if (isDino) el.style.filter = 'hue-rotate(20deg)';
    showSpeechBubble(el, msg, 1800);
  } else if (ac >= 3) { // 5th tap+
    if (isDino) {
      el.classList.add('smiley-stressed');
      setTimeout(() => el.classList.remove('smiley-stressed'), 500);
      showSpeechBubble(el, `ROARR. ${sym}${spent.toLocaleString('en-IN')}. THERE.`, 2200);
      if (dp('roarSounds')) playSound(S.RESET); // Roar sound in Phase 8
      // After 5th tap, dino turns away for 10s
      _smileyTurnedAway = true;
      el.classList.add('dino-turned-away');
      clearTimeout(_smileyTurnedAwayTimer);
      _smileyTurnedAwayTimer = setTimeout(() => {
        _smileyTurnedAway = false;
        el.classList.remove('dino-turned-away');
        el.style.filter = '';
        _smileyAnnoyanceCount = 0;
      }, 10000);
    } else {
      el.classList.add('smiley-extinct');
      setTimeout(() => el.classList.remove('smiley-extinct'), 600);
      showSpeechBubble(el, `FINE. ${sym}${spent.toLocaleString('en-IN')} spent. Happy now?`, 2500);
    }
  }
}
```

## 7.6 — `showSpeechBubble(el, text, duration)`

```js
function showSpeechBubble(el, text, duration = 2000) {
  let bubble = el.parentElement.querySelector('.budget-speech-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.className = 'budget-speech-bubble';
    el.parentElement.style.position = 'relative';
    el.parentElement.appendChild(bubble);
  }
  bubble.textContent = text;
  bubble.style.display = 'block';
  clearTimeout(bubble._hideTimer);
  bubble._hideTimer = setTimeout(() => { bubble.style.display = 'none'; }, duration);
}
```

## 7.7 — `showBudgetDeepDive(metrics)` — long press overlay

```js
function showBudgetDeepDive(metrics) {
  const pct = metrics.budget > 0 ? metrics.spent / metrics.budget * 100 : 0;
  const sym = state.currencySymbol;
  const bigCat = getBiggestCategory(metrics.startDate, metrics.endDate);
  const bigPay = getBiggestPayment(metrics.startDate, metrics.endDate);
  const isDino = dp('dinoMode');

  const title = isDino ? '🦖  Hunt Status Report' : 'Budget Health Check';
  const sub = isDino ? '"The territory this cycle"' : '';
  // ... construct full HTML as per spec
  
  let overlay = document.getElementById('budgetDeepDiveOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'budgetDeepDiveOverlay';
    overlay.className = 'deep-dive-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `[full HTML]`;
  overlay.classList.add('open');
  if (dp('roarSounds')) playSound(S.BUDGET_ALERT); // bass drop in Phase 8
}
```

## 7.8 — `getPctState(pct)` helper

```js
function getPctState(pct) {
  if (pct <= 30)  return 'thriving';
  if (pct <= 60)  return 'cruising';
  if (pct <= 80)  return 'cautious';
  if (pct < 100)  return 'stressed';
  return 'extinct';
}
```

## 7.9 — Stability Checklist
- [ ] 1-tap → animation + speech bubble (correct per state + mode)
- [ ] 2-tap → real numbers in notification/toast (correct per state + mode)
- [ ] 3rd tap → "I already told you" / "I said what I said"
- [ ] 4th tap → red tint / narrowed eyes response
- [ ] 5th tap → spin/roar, then dino turns away for 10s
- [ ] While turned away, further taps do nothing
- [ ] Dino resets when forecast card re-renders (next expense or screen switch)
- [ ] Long press → deep dive overlay with all real numbers
- [ ] Deep dive has "Go to Reports" / "See Fossil Record" CTA
- [ ] Annoyance count resets on next render
- [ ] Works correctly in both Dino Mode and Normal Mode

---

# PHASE 8 — Sound Engine

**Goal:** Full `sounds.js` module. Wire `playSound()` calls across all action sites. Default OFF — users must explicitly enable in Settings.

## 8.1 — New File: `js/sounds.js`

Load order: add `<script src="js/sounds.js"></script>` between `core.js` and `auth.js` in `index.html`.

**File structure:**
```js
// js/sounds.js
'use strict';

const S = {
  SAVE:             'save',
  SAVE_QUICK:       'save_quick',
  DELETE:           'delete',
  DELETE_SMALL:     'delete_small',
  UNLOCK_PIN:       'unlock_pin',
  UNLOCK_BIO:       'unlock_bio',
  LOCK:             'lock',
  PIN_TAP:          'pin_tap',
  PIN_BACK:         'pin_back',
  PIN_WRONG:        'pin_wrong',
  SYNC_START:       'sync_start',
  SYNC_DONE:        'sync_done',
  SYNC_ERROR:       'sync_error',
  DRIVE_CONNECT:    'drive_connect',
  DRIVE_DISCONNECT: 'drive_disconnect',
  SYSTEM:           'system',
  ERROR:            'error',
  GOAL_HATCHED:     'goal_hatched',
  BUDGET_ALERT:     'budget_alert',
  RESET:            'reset',
  TEST_REMINDER:    'test_reminder',
};

let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

// --- Helpers ---
function sineNote(hz, start, dur, vol) { /* ... */ }
function noiseBuffer(dur, vol) { /* ... */ }
function sawNote(hz, start, dur, vol) { /* ... */ }

// --- Normal Mode Sounds ---
const NORMAL_SOUNDS = { /* ... all 20 functions ... */ };

// --- Dino Mode Sounds ---
const DINO_SOUNDS = { /* ... all 20 functions ... */ };

// --- Public API ---
function playSound(id) {
  if (!state?.dinoPrefs?.roarSounds) return;
  const VOL = state.dinoPrefs?.soundVolume ?? 0.6;
  const fn = state.dinoPrefs?.dinoMode ? DINO_SOUNDS[id] : NORMAL_SOUNDS[id];
  if (fn) {
    try { fn(VOL); } catch(e) { /* silently fail */ }
  }
}
```

## 8.2 — Sound Call Sites

**Every function below gets a single `playSound(S.XXX)` line added.** The call is always one line — never branches on mode (the engine handles that).

| File | Function | Sound ID |
|---|---|---|
| `transactions.js` | `handleExpenseSubmit` (save, not edit) | `S.SAVE` |
| `transactions.js` | `handleExpenseSubmit` (edit) | `S.SYSTEM` |
| `transactions.js` | `deleteTransaction` | `S.DELETE` |
| `transactions.js` | `saveInlineCategory` | `S.SAVE` |
| `transactions.js` | `saveInlinePayment` | `S.SAVE` |
| `dashboard.js` | `triggerQuickLog` | `S.SAVE_QUICK` |
| `auth.js` | `submitLockedQuickExpense` | `S.SAVE` |
| `auth.js` | `lockApp` | `S.LOCK` |
| `auth.js` | `unlockApp` | `S.UNLOCK_PIN` |
| `auth.js` | `simulateBiometrics` (success) | `S.UNLOCK_BIO` |
| `auth.js` | `pressPin` (each digit) | `S.PIN_TAP` |
| `auth.js` | `clearPin` | `S.PIN_BACK` |
| `auth.js` | `pressPin` (wrong PIN) | `S.PIN_WRONG` |
| `settings.js` | `saveEditCategory` | `S.SYSTEM` |
| `settings.js` | `deleteCategory` | `S.DELETE` |
| `settings.js` | `saveEditPayment` | `S.SYSTEM` |
| `settings.js` | `deletePaymentMethod` | `S.DELETE` |
| `settings.js` | `saveBudgetAndCycleSettings` | `S.SYSTEM` |
| `settings.js` | `changePin` | `S.UNLOCK_PIN` |
| `settings.js` | `toggleThemeSetting` | `S.SYSTEM` |
| `goals-trips.js` | `createNewSavingGoalDedicated` | `S.SAVE` |
| `goals-trips.js` | `fundSavingGoalDedicated` | `S.SAVE` |
| `goals-trips.js` | `fundSavingGoalDedicated` (if 100%) | `S.GOAL_HATCHED` |
| `goals-trips.js` | `removeSavingGoalDedicated` | `S.DELETE` |
| `goals-trips.js` | `createNewTrip` | `S.SAVE` |
| `goals-trips.js` | `addTripExpense` | `S.SAVE` |
| `goals-trips.js` | `deleteTripConfirm` | `S.DELETE` |
| `recurring.js` | `saveRecurring` | `S.SAVE` |
| `recurring.js` | `deleteRecurring` | `S.DELETE` |
| `recurring.js` | `saveEMI` | `S.SAVE` |
| `recurring.js` | `deleteEMI` | `S.DELETE` |
| `backup.js` | `exportDataToJSON` | `S.SYSTEM` |
| `backup.js` | `exportDataToCSV` | `S.SYSTEM` |
| `backup.js` | `importBackupFile` | `S.DRIVE_CONNECT` |
| `sync.js` | `connectGoogleSync` (success) | `S.DRIVE_CONNECT` |
| `sync.js` | `disconnectGoogleSync` | `S.DRIVE_DISCONNECT` |
| `sync.js` | `triggerManualSync` | `S.SYNC_START` |
| `sync.js` | inside `syncFromDrive` (done) | `S.SYNC_DONE` |
| `sync.js` | inside `syncFromDrive` (error) | `S.SYNC_ERROR` |
| `sync.js` | `resetAllData` | `S.RESET` |
| `sync.js` | `resetSyncData` | `S.DRIVE_DISCONNECT` |
| `dashboard.js` | `checkBudgetAlerts` | `S.BUDGET_ALERT` |
| `dashboard.js` | `sendTestReminderNotification` | `S.TEST_REMINDER` |

## 8.3 — Sound Test Button in Settings

Under the Personality section, next to the Roar Sounds toggle:
```html
<button onclick="playSound(S.SAVE); playSound(S.DELETE);" 
        style="font-size:0.8rem; padding:4px 10px;">
  Test Sounds
</button>
```

## 8.4 — Stability Checklist
- [ ] `sounds.js` loads without errors (add to `index.html` load order)
- [ ] `playSound()` is globally accessible
- [ ] With Roar Sounds OFF → no sounds anywhere
- [ ] With Roar Sounds ON + Normal Mode → clean UI tones
- [ ] With Roar Sounds ON + Dino Mode → dino sounds
- [ ] PIN taps play in real-time (no delay)
- [ ] Unlock plays correctly
- [ ] Reset plays the dramatic meteor sound (Dino) or sweep (Normal)
- [ ] Goal hatched triggers the special fanfare
- [ ] No AudioContext errors on mobile (lazy init on first gesture)
- [ ] Master volume slider scales all sounds

---

# PHASE 9 — Polish & Fossil Mode

**Goal:** Final layer. Fossil Mode color theme, heatmap footprints, egg hatching goals. Lower risk, high visual reward.

## 9.1 — Fossil Mode Theme

**In `styles.css`, add after dark theme block:**
```css
html[data-theme="fossil"] {
  --bg:              #1a1612;
  --surface:         #2a221c;
  --surface-elevated:#332a22;
  --surface-hover:   #3d3025;
  --primary:         #d97706;
  --primary-light:   #f59e0b;
  --text:            #f5f0e8;
  --text-muted:      #a8956e;
  --border:          #3d3025;
  --danger:          #dc2626;
  --success:         #86efac;
  --accent:          #86efac;
}
```

**In `core.js` — `applyTheme()`:**
```js
function applyTheme(theme, fossilMode) {
  const html = document.documentElement;
  if (fossilMode && dp('fossilMode')) {
    html.setAttribute('data-theme', 'fossil');
  } else if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    html.removeAttribute('data-theme');
  }
  state.theme = theme;
}
```

Call `applyTheme(state.theme, state.dinoPrefs?.fossilMode)` at boot in `window.onload`.

## 9.2 — Heatmap Footprints

**In `dashboard.js` — `renderSpendHeatmap()`:**

After calculating each day's spend tier:
```js
// Existing color logic continues. Append footprint:
if (dp('dinoFootprints')) {
  const topThreshold = sortedAmounts[Math.floor(sortedAmounts.length * 0.75)] || 0;
  const midThreshold = sortedAmounts[Math.floor(sortedAmounts.length * 0.40)] || 0;
  
  if (daySpend === 0) {
    dayEl.innerHTML += `<span class="heatmap-egg">🥚</span>`;
  } else if (daySpend >= topThreshold) {
    dayEl.innerHTML += `<span class="heatmap-foot">🦶</span>`;
  } else if (daySpend >= midThreshold) {
    dayEl.innerHTML += `<span class="heatmap-paw">·</span>`; // subtle dot
  }
}
```

```css
.heatmap-egg, .heatmap-foot {
  position: absolute; bottom: 1px; right: 1px;
  font-size: 0.5rem; line-height: 1;
  pointer-events: none;
}
```

## 9.3 — Egg Hatching Goals

**In `goals-trips.js` — `renderSavingGoalsDedicated()`:**

5 SVG egg states rendered as a small icon next to each goal's progress:

```js
function getEggSvg(pct) {
  // Returns one of 5 inline SVG strings
  if (pct >= 100) return `<!-- baby dino hatched SVG -->`;
  if (pct >= 75)  return `<!-- dino head emerging SVG -->`;
  if (pct >= 50)  return `<!-- egg with big crack SVG -->`;
  if (pct >= 25)  return `<!-- egg with small crack SVG -->`;
  return `<!-- whole egg SVG -->`;
}

// When contribution pushes into next tier:
const oldTier = Math.floor(oldPct / 25);
const newTier = Math.floor(newPct / 25);
if (newTier > oldTier && dp('dinoMode')) {
  // Add CSS crack animation class to the egg element
  eggEl.classList.add('egg-crack-transition');
  setTimeout(() => eggEl.classList.remove('egg-crack-transition'), 600);
}

// At 100% — special celebration
if (newPct >= 100 && dp('dinoMode')) {
  showNotification('🥚 Goal hatched! TReX is proud.');
  playSound(S.GOAL_HATCHED);
}
```

```css
@keyframes egg-crack {
  0%   { transform: scale(1) rotate(0deg); }
  25%  { transform: scale(1.1) rotate(-5deg); }
  50%  { transform: scale(1.15) rotate(5deg); }
  75%  { transform: scale(1.05) rotate(-2deg); }
  100% { transform: scale(1) rotate(0deg); }
}
.egg-crack-transition { animation: egg-crack 0.6s ease; }
```

## 9.4 — Recent Activity Label Toggle

**In `dashboard.js` — `renderRecentActivityList()`:**
```js
const sectionTitle = dp('dinoMode') && dp('recentActivityLabel') === 'dino' 
  ? "Recent Kills 🦴" 
  : "Recent Transactions";
```

## 9.5 — Stability Checklist
- [ ] Fossil Mode applies correct color palette on toggle
- [ ] Switching from Fossil → Dark → Light all work correctly
- [ ] Fossil Mode is device-local (not overridden by sync)
- [ ] Heatmap footprints toggle on/off correctly
- [ ] Egg SVGs render at all 5 tiers
- [ ] Egg crack animation fires only on tier upgrade
- [ ] Goal 100% shows special hatched state + celebration notification
- [ ] "Recent Kills" label only shows when Dino Mode ON
- [ ] All Phase 1–8 functionality still intact

---

# New Settings Fields Summary

Settings screen "Personality" section (Phase 2) introduces these new `state.dinoPrefs` fields. All must flow through backup/restore and sync:

| Field | Type | Default | UI |
|---|---|---|---|
| `dinoMode` | bool | `true` | Toggle |
| `roarSounds` | bool | `false` | Toggle |
| `soundVolume` | float 0–1 | `0.6` | Slider (visible when roarSounds=true) |
| `fossilMode` | bool | `false` | Toggle |
| `extinctionWarnings` | bool | `true` | Toggle |
| `dinoFootprints` | bool | `true` | Toggle |
| `herdMode` | bool | `true` | Toggle |
| `recentActivityLabel` | string | `'dino'` | Hidden — driven by dinoMode |

---

# New Functions Summary

| Phase | File | New Functions |
|---|---|---|
| 1 | `core.js` | `openDrawer()`, `closeDrawer()` |
| 1 | `settings.js` | `openDrawerSection()`, `closeDrawerSection()` |
| 2 | `core.js` | `dp(key)` |
| 2 | `settings.js` | `syncPersonalitySettings()`, `toggleDinoMode()`, `toggleRoarSounds()`, `saveSoundVolume()`, `toggleFossilMode()`, `toggleDinoFootprints()`, `toggleExtinctionWarnings()` |
| 3 | `core.js` | `t(neutral, dino)` |
| 5 | `dashboard.js` | `getDinoState(pct)` |
| 6 | `core.js` | `initLogoTapHandler()`, `handleLogoLongPress()`, `triggerLogoEasterEgg()`, `showTerminalEasterEgg()`, `showCinematicOriginStory()` |
| 6 | `dashboard.js` | `showDinoStatsSheet()`, `closeStatsSheet()` |
| 7 | `dashboard.js` | `attachSmileyTapHandler()`, `handleSmiley1Tap()`, `handleSmiley2Tap()`, `handleSmileyAnnoyance()`, `showSpeechBubble()`, `showBudgetDeepDive()`, `getPctState()`, `getBiggestCategory()`, `getBiggestPayment()` |
| 8 | `sounds.js` | `getAudioCtx()`, `playSound()`, `sineNote()`, `noiseBuffer()`, `sawNote()` + all sound generators |
| 9 | `goals-trips.js` | `getEggSvg(pct)` |

---

# New Files

| File | Phase | Purpose |
|---|---|---|
| `js/sounds.js` | 8 | Entire sound engine; load after `core.js` |

---

# ARCHITECTURE.md Additions Needed

After Phase 1 completes, ARCHITECTURE.md needs:
- Drawer section: `openDrawer()` / `closeDrawer()` / `openDrawerSection()`
- `#sideDrawer`, `#drawerBackdrop`, `#hamburgerBtn` element IDs
- `dinoPrefs` state object documented in Global State section

After Phase 8:
- `js/sounds.js` added to the JS load order table (position 2, after `core.js`)
- `playSound(id)` and `S` constants documented

---

# FUNCTIONS.md Additions Needed

After each phase, add the new functions to the relevant module section. Phases 6–8 add the most functions.

---

# Phase Dependency Map

```
Phase 1 (Drawer)
    └── Phase 2 (State) ← must have before any dino features
            ├── Phase 3 (Copy) ← no dependencies after Phase 2
            ├── Phase 4 (CSS) ← no dependencies after Phase 2
            │       └── Phase 5 (Visual) ← needs Phase 4 CSS
            ├── Phase 6 (Logo tap) ← needs Phase 2 (dp helper)
            ├── Phase 7 (Smiley tap) ← needs Phase 4 + Phase 5
            ├── Phase 8 (Sounds) ← needs Phase 2 (roarSounds flag)
            └── Phase 9 (Polish) ← needs Phase 4 + Phase 5 + Phase 8
```

Phases 3, 4, 6 can run in parallel after Phase 2.
Phase 7 needs Phase 4 CSS and Phase 5 dino SVG.
Phase 8 is standalone but ideally after Phase 3 (so call sites are already touched).

---

# Estimated Effort

| Phase | Complexity | Est. hours |
|---|---|---|
| 1 — Drawer revamp | Medium | 6–8h |
| 2 — State foundation | Low | 2–3h |
| 3 — Copy & micro-text | Low | 3–4h |
| 4 — CSS animations | Low | 2–3h |
| 5 — Visual layer (SVGs) | Medium–High | 8–10h |
| 6 — Logo tap | Low–Medium | 4–5h |
| 7 — Smiley tap | Medium | 5–7h |
| 8 — Sound engine | Medium | 6–8h |
| 9 — Polish | Low | 3–4h |
| **Total** | | **39–52h** |

---

*This document is the single source of truth for the TReX revamp. Update CHANGELOG.md and working.md after each phase ships.*

---

# Dev Session Protocol

How every coding session should run, without exception.

---

## Before Starting Any Session

1. **State what phase and sub-step you are on.** e.g. "Starting Phase 1, Step 2 — CSS."
2. **Upload the files that will be touched in that step.** Don't upload the whole project — only the files being edited. This keeps context clean and avoids stale references.
3. **Confirm the stability checklist from the previous step passed** before moving to the next one. If anything was broken and fixed, note it.

---

## File Upload Order Per Phase

Each phase has a fixed set of files. Upload them at the start of that phase, not before.

| Phase | Upload these files |
|---|---|
| 1 — Drawer | `index.html`, `styles.css`, `js/core.js`, `js/settings.js` |
| 2 — State | `js/core.js`, `js/settings.js`, `js/backup.js`, `js/sync.js` |
| 3 — Copy | `js/core.js`, `js/transactions.js`, `js/dashboard.js`, `js/settings.js`, `js/goals-trips.js`, `js/recurring.js`, `js/reports.js`, `js/sync.js`, `js/auth.js`, `js/backup.js`, `js/credit-cards.js` |
| 4 — CSS | `styles.css`, `js/auth.js`, `js/dashboard.js`, `js/transactions.js` |
| 5 — Visual | `js/dashboard.js`, `js/core.js`, `js/sync.js`, `js/auth.js`, `styles.css`, `index.html` |
| 6 — Logo tap | `js/core.js`, `js/dashboard.js`, `index.html`, `styles.css` |
| 7 — Smiley tap | `js/dashboard.js`, `styles.css` |
| 8 — Sounds | All JS files (sounds.js is new; every other file gets one line added) |
| 9 — Polish | `styles.css`, `js/core.js`, `js/dashboard.js`, `js/goals-trips.js` |

---

## Within Each Phase — Step Execution Order

Every phase follows the same internal order:

```
1. HTML structure changes (index.html)
      ↓
2. CSS additions (styles.css)
      ↓
3. State / data changes (core.js first, then dependent modules)
      ↓
4. Logic / function changes (module JS files)
      ↓
5. Wire-up (event handlers, onload calls, switchScreen hooks)
      ↓
6. Smoke test against the stability checklist for that phase
```

Never skip to step 4 before steps 1–3 are done. A function that references an HTML element that doesn't exist yet will throw on load.

---

## Coding Session Rules

**One sub-step at a time.** Complete a sub-step fully, confirm it works, then move on. Do not batch multiple sub-steps into one code drop unless they are trivially small (e.g. two one-line additions to the same file).

**Never rename existing functions or IDs.** Only add new ones. Renames break every other file that references the old name and are hard to track down.

**Never delete HTML.** Move it or hide it with CSS/JS, but keep all existing modal and form HTML in `index.html`. Modals are referenced by many functions across many files.

**Every file edit is a complete file, not a diff.** Claude will return the full updated file content, not a patch. This avoids partial-apply mistakes. Copy-paste the whole file to replace.

**The stability checklist is the exit condition.** A phase is not done until every item on its checklist is manually verified in the browser. Do not start the next phase until the current one passes.

---

## What to Say to Resume a Session

When starting a new Claude session to continue work, open with:

```
TReX dev session resume.
Current phase: [X]
Current step: [description]
Last completed: [what passed the checklist]
Uploading: [list of files]
```

Then upload only the files for that phase. Claude will read this plan file (re-upload it too if starting a new conversation) and pick up exactly where things left off.

---

## After Each Phase Completes

Before moving to the next phase:

1. **Update `CHANGELOG.md`** — add a `[v3.X]` entry describing what shipped.
2. **Update `working.md`** — mark completed checklist items, note any deviations from this plan.
3. **Update `ARCHITECTURE.md`** — if new HTML element IDs, new state fields, or new JS load order entries were added.
4. **Update `FUNCTIONS.md`** — add any new functions introduced in the phase.
5. **Commit to git** with a message matching the phase name.

This document (`TREX_IMPLEMENTATION_PLAN.md`) is read-only — do not edit it mid-build unless the plan itself needs to change, and if it does, note the change clearly at the top under a `## Plan Amendments` heading.

---

## Plan Amendments

*(None yet — this section is updated only when the plan itself changes, not when code deviates slightly from it.)*
