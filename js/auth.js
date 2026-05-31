/**
 * auth.js - PIN & App Lock
 * TReX - Devour Your Expenses
 *
 * PIN lock screen: lock/unlock app, PIN entry buffer, WebAuthn biometric
 * unlock, visual dot indicators, PIN change flow, lock button header state.
 *
 * Dependencies: core.js
 */

function closePinSuccessModal() {
    document.getElementById("pinSuccessModal").classList.add("hidden");
}

function showPinChangeSuccess() {
    document.getElementById("pinSuccessModal").classList.remove("hidden");
    initLucideIcons();
}

/* SECURITY LOCK MODULES */
function isAppLocked() {
    const lock = document.getElementById("simulatedLockScreen");
    return lock && !lock.classList.contains("hidden") && !lock.classList.contains("opacity-0");
}

function updateAppLockButton() {
    const btn = document.getElementById("appLockButton");
    if (!btn) return;
    if (state.pinEnabled) {
        btn.classList.remove("hidden");
    } else {
        btn.classList.add("hidden");
    }
}

function biometricBufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function biometricBase64UrlToBuffer(value) {
    const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

function createBiometricChallenge() {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    return challenge;
}

function createBiometricUserId() {
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);
    return userId;
}

function isBiometricApiAvailable() {
    return !!(window.isSecureContext && window.PublicKeyCredential && navigator.credentials && crypto && crypto.getRandomValues);
}

async function isBiometricUnlockSupported() {
    if (!isBiometricApiAvailable()) return false;
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function") return true;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
        return false;
    }
}

async function syncBiometricSettingsUI() {
    const toggle = document.getElementById("settingBiometricEnabled");
    const status = document.getElementById("biometricStatusText");
    if (!toggle && !status) return;

    const supported = await isBiometricUnlockSupported();
    const registered = !!(state.biometricEnabled && state.biometricCredentialId);

    if (toggle) {
        toggle.checked = registered;
        toggle.disabled = !supported;
        toggle.classList.toggle("opacity-50", !supported);
        toggle.classList.toggle("cursor-not-allowed", !supported);
    }

    if (status) {
        if (!window.isSecureContext) {
            status.textContent = "Available only on HTTPS or localhost.";
            status.className = "text-[9px] text-amber-400 mt-0.5";
        } else if (!supported) {
            status.textContent = "No platform biometric/passkey authenticator found on this device.";
            status.className = "text-[9px] text-slate-500 mt-0.5";
        } else if (registered) {
            const when = state.biometricRegisteredAt ? new Date(state.biometricRegisteredAt).toLocaleDateString() : "this device";
            status.textContent = `Enabled on ${when}. PIN remains available as fallback.`;
            status.className = "text-[9px] text-emerald-400 mt-0.5";
        } else {
            status.textContent = "Available on this device. Enable to register Face ID, fingerprint, or device passkey.";
            status.className = "text-[9px] text-slate-500 mt-0.5";
        }
    }

    syncBiometricLockUI();
}

function syncBiometricLockUI() {
    const btn = document.getElementById("biometricUnlockBtn");
    if (!btn) return;

    const ready = !!(state.pinEnabled && state.biometricEnabled && state.biometricCredentialId);
    btn.disabled = !ready;
    btn.title = ready ? "Unlock with biometrics" : "Enable biometric unlock in Settings";
    btn.classList.toggle("opacity-35", !ready);
    btn.classList.toggle("cursor-not-allowed", !ready);
    btn.classList.toggle("hover:bg-indigo-900/60", ready);
}

// ── Locked Expense Sheet ────────────────────────────────────────────────────

function openLockedExpenseSheet() {
    const sheet = document.getElementById("lockedExpenseSheet");
    if (!sheet) return;

    // Populate selects
    populateLockedQuickExpenseForm();

    // Pre-fill today's date
    const dateEl = document.getElementById("lockedExpenseDate");
    if (dateEl) dateEl.value = getTodayISO();

    // Reset amount + note
    const amountEl = document.getElementById("lockedExpenseAmount");
    const noteEl   = document.getElementById("lockedExpenseNote");
    if (amountEl) amountEl.value = "";
    if (noteEl)   noteEl.value   = "";

    // Show active trip badge if applicable
    const activeTrip = typeof getActiveTrip === "function" ? getActiveTrip() : null;
    const badge    = document.getElementById("lockedExpenseTripBadge");
    const tripName = document.getElementById("lockedExpenseTripName");
    if (badge && tripName) {
        if (activeTrip) {
            tripName.textContent = `Will be saved to: ${activeTrip.name}`;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    }

    sheet.classList.remove("hidden");
    if (typeof initLucideIcons === "function") initLucideIcons(sheet);
    setTimeout(() => { if (amountEl) amountEl.focus(); }, 150);
}

function closeLockedExpenseSheet() {
    const sheet = document.getElementById("lockedExpenseSheet");
    if (sheet) sheet.classList.add("hidden");
}

function closeLockedExpenseSheetOutside(event) {
    // Close only when tapping the backdrop (not the panel itself)
    if (event.target === document.getElementById("lockedExpenseSheet")) {
        closeLockedExpenseSheet();
    }
}

function populateLockedQuickExpenseForm() {
    const catSelect = document.getElementById("lockedExpenseCategory");
    const paySelect = document.getElementById("lockedExpensePayment");
    if (!catSelect || !paySelect) return;

    catSelect.innerHTML = "";
    paySelect.innerHTML = "";

    const categories = [...(state.categories || [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    const payments   = (state.payments || [])
        .filter(pay => !pay.archived)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        catSelect.appendChild(opt);
    });

    payments.forEach(pay => {
        const opt = document.createElement("option");
        opt.value = pay.id;
        opt.textContent = `${pay.name} (${pay.type})`;
        paySelect.appendChild(opt);
    });

    const disabled = categories.length === 0 || payments.length === 0;
    catSelect.disabled = disabled;
    paySelect.disabled = disabled;

    applyLockedCategoryDefaultPayment();
}

function applyLockedCategoryDefaultPayment() {
    const catSelect = document.getElementById("lockedExpenseCategory");
    const paySelect = document.getElementById("lockedExpensePayment");
    if (!catSelect || !paySelect) return;
    const cat = (state.categories || []).find(item => item.id === catSelect.value);
    if (!cat || !cat.defaultPaymentId) return;
    const targetPay = (state.payments || []).find(pay => pay.id === cat.defaultPaymentId && !pay.archived);
    if (targetPay) paySelect.value = targetPay.id;
}

function submitLockedQuickExpense(event) {
    if (event) event.preventDefault();

    const amountEl  = document.getElementById("lockedExpenseAmount");
    const noteEl    = document.getElementById("lockedExpenseNote");
    const catSelect = document.getElementById("lockedExpenseCategory");
    const paySelect = document.getElementById("lockedExpensePayment");
    const dateEl    = document.getElementById("lockedExpenseDate");
    if (!amountEl || !noteEl || !catSelect || !paySelect) return;

    const amount     = parseFloat(amountEl.value);
    const categoryId = catSelect.value;
    const paymentId  = paySelect.value;
    const note       = noteEl.value.trim();
    const date       = (dateEl && dateEl.value) ? dateEl.value : getTodayISO();

    if (isNaN(amount) || amount <= 0) {
        showNotification(t("Please enter a valid amount.", "🦖 TReX needs a real amount to chomp."));
        return;
    }
    if (!categoryId || !paymentId) {
        showNotification(t("Choose a category and payment method.", "Pick a hunting ground and payment claw."));
        return;
    }

    const activeTrip = typeof getActiveTrip === "function" ? getActiveTrip() : null;
    if (activeTrip) {
        // Save as trip expense
        if (!activeTrip.expenses) activeTrip.expenses = [];
        activeTrip.expenses.push({
            id: "te_lock_" + Date.now(),
            desc: note || "Quick expense",
            amount,
            date,
            categoryId,
            paymentId,
            type: "on",
            ledgerTxId: null,
            createdAt: getTodayISO(),
            lockedQuickAdd: true
        });
        saveStateToLocalStorage();
        closeLockedExpenseSheet();
        try { renderActiveTripBanner(); } catch (e) {}
        try { renderTripDetailStats(); } catch (e) {}
        try { renderTripExpenses(); } catch (e) {}
        showNotification(t(`Added to ${activeTrip.name}.`, `🦖 Packed into ${activeTrip.name}.`));
    } else {
        // Save as normal ledger expense
        const tx = {
            id: "tx_lock_" + Date.now(),
            desc: note || "Quick expense",
            amount,
            date,
            categoryId,
            paymentId,
            type: "expense",
            createdAt: new Date().toISOString(),
            lockedQuickAdd: true
        };
        if (!state.transactions) state.transactions = [];
        state.transactions.push(tx);
        saveStateToLocalStorage();
        closeLockedExpenseSheet();
        try { renderDashboard(); } catch (e) {}
        try { renderHistory(); } catch (e) {}
        playSound(S.SAVE);
        showNotification(t("Expense saved.", "🦖 Devoured! Expense saved."));
    }
}

function lockApp() {
    if (!state.pinEnabled) {
        showNotification(t("Enable Security PIN in Settings first.", "Secure the lair in Settings first."));
        return;
    }

    pinAttemptBuffer = "";
    updatePinVisualDots();

    const lock = document.getElementById("simulatedLockScreen");
    lock.classList.remove("hidden", "opacity-0", "pointer-events-none");
    syncBiometricLockUI();

    // Close the expense sheet if it was open before locking
    closeLockedExpenseSheet();

    document.querySelectorAll("#recurringModal, #pinSuccessModal, #inlineCategoryModal, #inlinePaymentModal, #editCategoryModal, #editPaymentModal")
        .forEach(el => el.classList.add("hidden"));

    playSound(S.LOCK);
    showNotification(t("App protected. PIN required.", "🦖 Lair sealed. PIN required."));
    initLucideIcons();
}

function unlockApp(silent = false) {
    const lockScreen = document.getElementById("simulatedLockScreen");
    if (dp('dinoMode')) {
        lockScreen.classList.add('lock-screen-exit');
        setTimeout(() => {
            lockScreen.classList.remove('lock-screen-exit');
            lockScreen.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => lockScreen.classList.add('hidden'), 50);
        }, 380);
    } else {
        lockScreen.classList.add("opacity-0", "pointer-events-none");
        setTimeout(() => lockScreen.classList.add("hidden"), 500);
    }
    closeLockedExpenseSheet();
    if (!silent) playSound(S.UNLOCK_PIN);
    pinAttemptBuffer = "";
    updatePinVisualDots();
}

function clearBiometricState() {
    state.biometricEnabled = false;
    state.biometricCredentialId = "";
    state.biometricUserId = "";
    state.biometricLabel = "";
    state.biometricRegisteredAt = "";
}

function togglePinSetting() {
    state.pinEnabled = document.getElementById("settingPinEnabled").checked;
    const lock = document.getElementById("simulatedLockScreen");
    if (state.pinEnabled) {
        lock.classList.remove("hidden");
    } else {
        clearBiometricState();
        lock.classList.add("hidden");
        unlockApp();
    }
    updateAppLockButton();
    saveStateToLocalStorage();
    syncBiometricSettingsUI();
    showNotification(state.pinEnabled
        ? t("Passcode lock activated.", "🔒 Lair lock activated.")
        : t("Passcode lock deactivated.", "Lair lock relaxed."));
}

async function registerBiometricCredential() {
    if (!state.pinEnabled) {
        showNotification(t("Enable Security PIN before biometric unlock.", "Set the lair PIN before adding a clawprint."));
        return false;
    }
    if (!await isBiometricUnlockSupported()) {
        showNotification(t("Biometric unlock is not available on this device/browser.", "This device has no usable clawprint scanner."));
        return false;
    }

    const userId = createBiometricUserId();
    const publicKey = {
        challenge: createBiometricChallenge(),
        rp: { name: "TReX" },
        user: {
            id: userId,
            name: "trex-local-user",
            displayName: "TReX Local User"
        },
        pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 }
        ],
        authenticatorSelection: {
            authenticatorAttachment: "platform",
            residentKey: "preferred",
            userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
    };

    try {
        const credential = await navigator.credentials.create({ publicKey });
        if (!credential || !credential.rawId) throw new Error("No credential returned");

        state.biometricEnabled = true;
        state.biometricCredentialId = biometricBufferToBase64Url(credential.rawId);
        state.biometricUserId = biometricBufferToBase64Url(userId.buffer);
        state.biometricLabel = "Platform authenticator";
        state.biometricRegisteredAt = new Date().toISOString();
        saveStateToLocalStorage();
        await syncBiometricSettingsUI();
        showNotification(t("Biometric unlock enabled on this device.", "🦖 Clawprint unlock registered."));
        return true;
    } catch (e) {
        console.warn("Biometric registration failed:", e);
        showNotification(t("Biometric setup was cancelled or failed.", "Clawprint setup wandered off."));
        return false;
    }
}

async function toggleBiometricSetting() {
    const toggle = document.getElementById("settingBiometricEnabled");
    if (!toggle) return;

    if (!toggle.checked) {
        clearBiometricState();
        saveStateToLocalStorage();
        await syncBiometricSettingsUI();
        showNotification(t("Biometric unlock disabled.", "Clawprint unlock retired."));
        return;
    }

    const ok = await registerBiometricCredential();
    if (!ok) {
        clearBiometricState();
        toggle.checked = false;
        saveStateToLocalStorage();
        await syncBiometricSettingsUI();
    }
}

function pressPin(char) {
    if (pinAttemptBuffer.length < 4) {
        pinAttemptBuffer += char;
        playSound(S.PIN_TAP);
        updatePinVisualDots();
    }

    if (pinAttemptBuffer.length === 4) {
        setTimeout(() => {
            if (pinAttemptBuffer === (state.pinCode || "1234")) {
                unlockApp();
                showNotification(t("Passcode verified. Storage unlocked.", "🦖 Lair opened. Welcome back."));
                pinAttemptBuffer = "";
            } else {
                playSound(S.PIN_WRONG);
                showNotification(t("Incorrect passcode. Try again.", "Wrong roar. Try the PIN again."));
                if (dp('dinoMode')) {
                    const dots = document.getElementById('pinDots');
                    if (dots) {
                        dots.classList.add('pin-shake');
                        setTimeout(() => dots.classList.remove('pin-shake'), 450);
                    }
                }
                clearPin(true);
            }
        }, 200);
    }
}

function clearPin(silent = false) {
    if (!silent) playSound(S.PIN_BACK);
    pinAttemptBuffer = "";
    updatePinVisualDots();
}

async function simulateBiometrics() {
    if (!state.biometricEnabled || !state.biometricCredentialId) {
        showNotification(t("Enable biometric unlock in Settings first.", "Register a clawprint in Settings first."));
        return;
    }
    if (!await isBiometricUnlockSupported()) {
        showNotification(t("Biometric unlock is not available in this browser.", "This browser cannot read clawprints."));
        return;
    }

    try {
        const credentialId = biometricBase64UrlToBuffer(state.biometricCredentialId);
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: createBiometricChallenge(),
                allowCredentials: [{ type: "public-key", id: credentialId }],
                userVerification: "required",
                timeout: 60000
            }
        });
        if (!assertion) throw new Error("No assertion returned");

        playSound(S.UNLOCK_BIO);
        unlockApp(true);
        showNotification(t("Unlocked with biometrics.", "🦖 Clawprint accepted."));
        pinAttemptBuffer = "";
        updatePinVisualDots();
    } catch (e) {
        console.warn("Biometric unlock failed:", e);
        showNotification(t("Biometric unlock failed. Use PIN instead.", "Clawprint missed. Use the lair PIN."));
    }
}

const FOOTPRINT_SVG = `<svg viewBox="0 0 20 24" width="14" height="18" fill="currentColor"><ellipse cx="10" cy="17" rx="6.5" ry="6"/><ellipse cx="4" cy="8" rx="2.8" ry="3"/><ellipse cx="10" cy="5.5" rx="2.8" ry="3"/><ellipse cx="16" cy="8" rx="2.8" ry="3"/></svg>`;
const EMPTY_FOOTPRINT = `<div style="width:14px;height:18px;border-radius:50%;border:2px solid currentColor;opacity:0.4"></div>`;

function updatePinVisualDots() {
    const filled = pinAttemptBuffer.length;
    if (dp('dinoMode')) {
        document.querySelectorAll('.pin-dot').forEach((dot, i) => {
            dot.innerHTML = i < filled ? FOOTPRINT_SVG : EMPTY_FOOTPRINT;
            dot.style.color = i < filled ? '#4ade80' : '#475569';
        });
    } else {
        for (let i = 1; i <= 4; i++) {
            const dot = document.getElementById("pinDot" + i);
            if (!dot) continue;
            dot.innerHTML = "";
            dot.style.color = "";
            if (i <= filled) {
                dot.className = "pin-dot w-4 h-4 rounded-full bg-indigo-500 border-2 border-indigo-400 scale-110 transition-all duration-200 shadow-md shadow-indigo-500/30";
            } else {
                dot.className = "pin-dot w-4 h-4 rounded-full border-2 border-slate-800 bg-transparent transition-all duration-200";
            }
        }
    }
}
function changePin() {
    const currentPin = document.getElementById("currentPinInput").value;
    const newPin = document.getElementById("newPinInput").value;
    const confirmPin = document.getElementById("confirmPinInput").value;

    const storedPin = state.pinCode || "1234";

    if (currentPin !== storedPin) {
        showNotification(t("Current PIN is incorrect.", "That old lair code is not right."));
        document.getElementById("currentPinInput").value = "";
        return;
    }

    if (!/^\d{4}$/.test(newPin)) {
        showNotification(t("New PIN must be exactly 4 digits.", "The new lair code needs exactly 4 digits."));
        return;
    }

    if (newPin !== confirmPin) {
        showNotification(t("Confirm PIN does not match.", "The second lair code does not match."));
        document.getElementById("confirmPinInput").value = "";
        return;
    }

    state.pinCode = newPin;
    saveStateToLocalStorage();

    const lockHint = document.getElementById("lockScreenPinHint");
    if (lockHint) lockHint.textContent = newPin;
    initLucideIcons();

    document.getElementById("currentPinInput").value = "";
    document.getElementById("newPinInput").value = "";
    document.getElementById("confirmPinInput").value = "";
    showNotification(t("PIN changed.", "🔒 Lair secured."));
    showPinChangeSuccess();
}
