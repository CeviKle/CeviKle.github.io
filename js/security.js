const Security = (() => {
    const LOCK_AFTER_EXITS = 5;

    let fullscreenExits = 0;
    let tabSwitches = 0;
    let pasteAttempts = 0;
    let blockedShortcuts = 0;
    let active = false; // true once the workspace screen is live
    let onForceSubmit = null;

    const gateOverlay = () => document.getElementById('fsGateOverlay');
    const warningOverlay = () => document.getElementById('fsWarningOverlay');
    const warningText = () => document.getElementById('fsWarningText');

    function requestFullscreen() {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (req) req.call(el);
    }

    function exitFullscreen() {
        const ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (ex) ex.call(document);
    }

    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement ||
                  document.mozFullScreenElement || document.msFullscreenElement);
    }

    function handleFullscreenChange() {
        if (!active) return;
        if (isFullscreen()) {
            warningOverlay().hidden = true;
            return;
        }
        fullscreenExits++;
        Session.logSecurityEvent('fullscreen_exit', { count: fullscreenExits });

        if (fullscreenExits >= LOCK_AFTER_EXITS) {
            warningText().innerHTML = `Your session has been flagged and locked after ${fullscreenExits} fullscreen exits. Your current answers are being submitted for grading.`;
            document.getElementById('fsResumeBtn').hidden = true;
            warningOverlay().classList.add('danger');
            warningOverlay().hidden = false;
            active = false;
            if (onForceSubmit) onForceSubmit('Auto-locked: exceeded fullscreen exit limit');
            return;
        }

        const severity = fullscreenExits >= 3 ? 'This is a repeated violation and has been flagged for review.'
            : 'This has been logged.';
        warningText().textContent = `You exited fullscreen mode (${fullscreenExits}/${LOCK_AFTER_EXITS}). ${severity}`;
        warningOverlay().hidden = false;
    }

    function handleVisibilityChange() {
        if (!active || !document.hidden) return;
        tabSwitches++;
        Session.logSecurityEvent('tab_hidden', { count: tabSwitches });
        UI.toast('Tab switch detected — this has been logged.', 'danger');
    }

    function handleBlur() {
        if (!active) return;
        if (warningOverlay() && !warningOverlay().hidden) return;
        Session.logSecurityEvent('window_blur');
    }

    function handleGlobalKeydown(e) {
        if (!active) return;
        const k = (e.key || '').toLowerCase();
        const blocked =
            ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'u'].includes(k)) ||
            (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
            k === 'f12';
        if (blocked) {
            e.preventDefault();
            blockedShortcuts++;
            Session.logSecurityEvent('blocked_shortcut', { key: k });
        }
    }

    function handleGlobalClipboard(e) {
        if (!active) return;
        e.preventDefault();
        if (e.type === 'paste') {
            pasteAttempts++;
            Session.logSecurityEvent('paste_attempt');
            UI.toast('Paste is disabled during the assessment.', 'danger');
        }
    }

    function init({ onForceSubmit: cb }) {
        onForceSubmit = cb;
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('keydown', handleGlobalKeydown, true);
        document.addEventListener('paste', handleGlobalClipboard, true);
        document.addEventListener('copy', handleGlobalClipboard, true);
        document.addEventListener('cut', handleGlobalClipboard, true);
        document.addEventListener('contextmenu', (e) => { if (active) e.preventDefault(); }, true);
    }

    function setActive(value) {
        active = value;
    }

    function getTelemetry() {
        return { fullscreenExits, tabSwitches, pasteAttempts, blockedShortcuts };
    }

    return { init, requestFullscreen, exitFullscreen, isFullscreen, setActive, getTelemetry, gateOverlay, warningOverlay };
})();
