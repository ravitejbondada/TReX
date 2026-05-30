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

function lockApp() {
    if (!state.pinEnabled) {
        showNotification("Enable Security PIN in Settings first.");
        return;
    }

    pinAttemptBuffer = "";
    updatePinVisualDots();

    const lock = document.getElementById("simulatedLockScreen");
    lock.classList.remove("hidden", "opacity-0", "pointer-events-none");
    syncBiometricLockUI();

    document.querySelectorAll("#recurringModal, #pinSuccessModal, #inlineCategoryModal, #inlinePaymentModal, #editCategoryModal, #editPaymentModal")
        .forEach(el => el.classList.add("hidden"));

    showNotification("App protected. PIN required.");
    initLucideIcons();
}

function unlockApp() {
    document.getElementById("simulatedLockScreen").classList.add("opacity-0", "pointer-events-none");
    setTimeout(() => {
        document.getElementById("simulatedLockScreen").classList.add("hidden");
    }, 500);
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
    showNotification(state.pinEnabled ? "Passcode lock activated." : "Passcode lock deactivated.");
}

async function registerBiometricCredential() {
    if (!state.pinEnabled) {
        showNotification("Enable Security PIN before biometric unlock.");
        return false;
    }
    if (!await isBiometricUnlockSupported()) {
        showNotification("Biometric unlock is not available on this device/browser.");
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
        showNotification("Biometric unlock enabled on this device.");
        return true;
    } catch (e) {
        console.warn("Biometric registration failed:", e);
        showNotification("Biometric setup was cancelled or failed.");
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
        showNotification("Biometric unlock disabled.");
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
        updatePinVisualDots();
    }

    if (pinAttemptBuffer.length === 4) {
        setTimeout(() => {
            if (pinAttemptBuffer === (state.pinCode || "1234")) {
                unlockApp();
                showNotification("Passcode verified. Storage unlocked.");
                pinAttemptBuffer = "";
            } else {
                showNotification("Incorrect passcode. Try again.");
                clearPin();
            }
        }, 200);
    }
}

function clearPin() {
    pinAttemptBuffer = "";
    updatePinVisualDots();
}

async function simulateBiometrics() {
    if (!state.biometricEnabled || !state.biometricCredentialId) {
        showNotification("Enable biometric unlock in Settings first.");
        return;
    }
    if (!await isBiometricUnlockSupported()) {
        showNotification("Biometric unlock is not available in this browser.");
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

        unlockApp();
        showNotification("Unlocked with biometrics.");
        pinAttemptBuffer = "";
        updatePinVisualDots();
    } catch (e) {
        console.warn("Biometric unlock failed:", e);
        showNotification("Biometric unlock failed. Use PIN instead.");
    }
}

function updatePinVisualDots() {
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById("pinDot" + i);
        if (i <= pinAttemptBuffer.length) {
            dot.className = "w-4 h-4 rounded-full bg-indigo-500 border-2 border-indigo-400 scale-110 transition-all duration-200 shadow-md shadow-indigo-500/30";
        } else {
            dot.className = "w-4 h-4 rounded-full border-2 border-slate-800 bg-transparent transition-all duration-200";
        }
    }
}
function changePin() {
    const currentPin = document.getElementById("currentPinInput").value;
    const newPin = document.getElementById("newPinInput").value;
    const confirmPin = document.getElementById("confirmPinInput").value;

    const storedPin = state.pinCode || "1234";

    if (currentPin !== storedPin) {
        showNotification("Current PIN is incorrect.");
        document.getElementById("currentPinInput").value = "";
        return;
    }

    if (!/^\d{4}$/.test(newPin)) {
        showNotification("New PIN must be exactly 4 digits.");
        return;
    }

    if (newPin !== confirmPin) {
        showNotification("Confirm PIN does not match.");
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
    showNotification("PIN updated successfully.");
    showPinChangeSuccess();
}
