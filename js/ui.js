const UI = (() => {
    function escapeHtml(str) {
        const d = document.createElement('div');
        d.innerText = str === null || str === undefined ? '' : String(str);
        return d.innerHTML;
    }

    function toast(message, variant = 'default') {
        const el = document.createElement('div');
        el.className = 'toast' + (variant === 'danger' ? ' toast-danger' : '');
        el.textContent = message;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 250);
        }, 2600);
    }

    function showScreen(id) {
        document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
    }

    function formatDuration(ms) {
        if (ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const pad = (n) => String(n).padStart(2, '0');
        return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    }

    return { escapeHtml, toast, showScreen, formatDuration };
})();
