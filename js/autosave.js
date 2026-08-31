const Autosave = (() => {
    const AUTOSAVE_INTERVAL_MS = 15000;
    let dirtyQuestionIds = new Set();
    let inFlight = false;
    let intervalId = null;

    function markDirty(questionId) {
        dirtyQuestionIds.add(questionId);
    }

    async function flush() {
        if (inFlight || dirtyQuestionIds.size === 0) return;
        inFlight = true;
        const ids = Array.from(dirtyQuestionIds);
        dirtyQuestionIds.clear();
        try {
            for (const qid of ids) {
                const code = Editor.getCode(qid);
                await Session.saveCode(qid, code).catch(() => {
                    dirtyQuestionIds.add(qid); // retry on next flush
                });
            }
        } finally {
            inFlight = false;
        }
    }

    function start() {
        stop();
        intervalId = setInterval(flush, AUTOSAVE_INTERVAL_MS);
        window.addEventListener('blur', flush);
        document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    return { markDirty, flush, start, stop };
})();
