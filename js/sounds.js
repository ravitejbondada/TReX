"use strict";

const S = {
    SAVE: "save",
    SAVE_QUICK: "save_quick",
    DELETE: "delete",
    UNLOCK_PIN: "unlock_pin",
    UNLOCK_BIO: "unlock_bio",
    LOCK: "lock",
    PIN_TAP: "pin_tap",
    PIN_BACK: "pin_back",
    PIN_WRONG: "pin_wrong",
    SYNC_START: "sync_start",
    SYNC_DONE: "sync_done",
    SYNC_ERROR: "sync_error",
    DRIVE_CONNECT: "drive_connect",
    DRIVE_DISCONNECT: "drive_disconnect",
    SYSTEM: "system",
    ERROR: "error",
    GOAL_HATCHED: "goal_hatched",
    BUDGET_ALERT: "budget_alert",
    RESET: "reset",
    TEST_REMINDER: "test_reminder"
};

let _audioCtx = null;

function getAudioCtx() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!_audioCtx) _audioCtx = new Ctx();
    if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
    return _audioCtx;
}

function tone(hz, start, dur, vol, type = "sine") {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, ctx.currentTime + start);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), ctx.currentTime + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.02);
}

function noise(start, dur, vol) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(vol, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
    src.connect(gain).connect(ctx.destination);
    src.start(ctx.currentTime + start);
}

function chirp(vol, dino = false) {
    tone(dino ? 130 : 720, 0, 0.07, vol * 0.18, dino ? "sawtooth" : "sine");
    tone(dino ? 92 : 960, 0.06, 0.09, vol * 0.13, dino ? "triangle" : "sine");
}

const NORMAL_SOUNDS = {
    save: v => chirp(v),
    save_quick: v => tone(880, 0, 0.06, v * 0.18),
    delete: v => { tone(360, 0, 0.08, v * 0.16); tone(220, 0.06, 0.1, v * 0.12); },
    unlock_pin: v => { tone(660, 0, 0.06, v * 0.14); tone(990, 0.07, 0.08, v * 0.14); },
    unlock_bio: v => { tone(520, 0, 0.06, v * 0.12); tone(780, 0.05, 0.08, v * 0.14); },
    lock: v => tone(180, 0, 0.12, v * 0.14),
    pin_tap: v => tone(620, 0, 0.035, v * 0.08),
    pin_back: v => tone(300, 0, 0.04, v * 0.07),
    pin_wrong: v => { tone(180, 0, 0.07, v * 0.14); tone(150, 0.08, 0.08, v * 0.12); },
    sync_start: v => tone(540, 0, 0.09, v * 0.11),
    sync_done: v => chirp(v),
    sync_error: v => NORMAL_SOUNDS.pin_wrong(v),
    drive_connect: v => chirp(v),
    drive_disconnect: v => NORMAL_SOUNDS.delete(v),
    system: v => tone(640, 0, 0.07, v * 0.1),
    error: v => NORMAL_SOUNDS.pin_wrong(v),
    goal_hatched: v => { tone(660, 0, 0.08, v * 0.16); tone(880, 0.08, 0.1, v * 0.16); tone(1320, 0.17, 0.12, v * 0.14); },
    budget_alert: v => { tone(240, 0, 0.11, v * 0.16); tone(200, 0.11, 0.13, v * 0.12); },
    reset: v => { tone(700, 0, 0.12, v * 0.13, "sawtooth"); tone(220, 0.12, 0.18, v * 0.14); },
    test_reminder: v => chirp(v)
};

const DINO_SOUNDS = {};
Object.keys(NORMAL_SOUNDS).forEach(key => {
    DINO_SOUNDS[key] = v => {
        if (key === "pin_tap") return tone(120, 0, 0.035, v * 0.08, "triangle");
        if (key === "delete" || key === "reset") noise(0, 0.18, v * 0.12);
        if (key === "goal_hatched") noise(0.05, 0.16, v * 0.08);
        chirp(v, true);
    };
});

function playSound(id) {
    if (!state?.dinoPrefs?.roarSounds) return;
    const vol = state.dinoPrefs?.soundVolume ?? 0.6;
    const bank = state.dinoPrefs?.dinoMode ? DINO_SOUNDS : NORMAL_SOUNDS;
    try { (bank[id] || NORMAL_SOUNDS[id])?.(vol); } catch (_) {}
}

window.S = S;
window.playSound = playSound;
