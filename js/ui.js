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

    // Custom in-page confirm modal — NOT window.confirm(). Native confirm()/alert()
    // dialogs cause Chromium/Firefox to automatically exit fullscreen mode (a
    // deliberate browser anti-phishing measure), which the security module would
    // then wrongly record as a fullscreen violation on every single confirm() call.
    // This modal is plain DOM/CSS, so it never touches the Fullscreen API at all.
    function confirmModal(title, message, confirmLabel = 'Confirm') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box">
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(message)}</p>
                    <div class="modal-actions">
                        <button class="btn" data-action="cancel">Cancel</button>
                        <button class="btn btn-primary" data-action="confirm">${escapeHtml(confirmLabel)}</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            function finish(result) {
                overlay.remove();
                resolve(result);
            }
            overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => finish(true));
            overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => finish(false));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
        });
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

    return { escapeHtml, toast, showScreen, formatDuration, confirmModal };
})();
