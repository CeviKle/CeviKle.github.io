const Submissions = (() => {
    async function finishAndShowResults(reasonLabel) {
        await Autosave.flush();
        Timer.stop();
        const results = await Session.finish();
        render(results, reasonLabel);
        return results;
    }

    function render(results, reasonLabel) {
        UI.showScreen('screen-results');
        document.getElementById('resultsCandidateLine').textContent =
            `${Auth.getState().candidateName} — ${reasonLabel || 'Submitted'}`;
        document.getElementById('resultsTotalScore').innerHTML =
            `${results.total_score}<span>/${results.max_possible_score}</span>`;

        const breakdown = document.getElementById('resultsBreakdown');
        breakdown.innerHTML = '';
        results.per_question.forEach((r) => {
            const row = document.createElement('div');
            row.className = 'score-row';
            row.innerHTML = `<span class="title">${UI.escapeHtml(r.title)}</span><span class="score">${r.best_score} / ${r.points} pts</span>`;
            breakdown.appendChild(row);
        });

        const t = Security.getTelemetry();
        document.getElementById('resultsTelemetry').innerHTML =
            `<strong>Session telemetry (recorded for academic integrity review):</strong><br>` +
            `Tab switches: ${t.tabSwitches} &middot; Paste attempts blocked: ${t.pasteAttempts} &middot; ` +
            `Fullscreen exits: ${t.fullscreenExits} &middot; Blocked shortcuts: ${t.blockedShortcuts}`;

        if (Security.isFullscreen()) Security.exitFullscreen();
    }

    return { finishAndShowResults, render };
})();
