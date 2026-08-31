const Judge = (() => {
    async function run(questionId, code) {
        return Auth.apiFetch(`/sessions/${Session.getSessionId()}/questions/${questionId}/run`, {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    }

    async function submit(questionId, code) {
        return Auth.apiFetch(`/sessions/${Session.getSessionId()}/questions/${questionId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    }

    function renderRunResults(containerEl, result) {
        if (result.compile_error) {
            containerEl.innerHTML = `
                <div class="rp-title">Test Results</div>
                <div class="test-row fail">
                    <div class="t-head">&#10007; Your code did not run</div>
                    <div class="t-detail">${UI.escapeHtml(result.compile_error)}</div>
                </div>`;
            return;
        }
        let html = `<div class="rp-title">Sample Test Results (${result.passed_count}/${result.total_count} passed)</div>`;
        result.results.forEach((r) => {
            html += `
                <div class="test-row ${r.passed ? 'pass' : 'fail'}">
                    <div class="t-head">${r.passed ? '&#10003;' : '&#10007;'} Test ${r.index + 1} ${r.passed ? 'Passed' : 'Failed'}</div>
                    ${r.passed ? '' : `<div class="t-detail">Expected: ${UI.escapeHtml(JSON.stringify(r.expected))}\nGot: ${UI.escapeHtml(r.error ? r.error : JSON.stringify(r.actual))}</div>`}
                </div>`;
        });
        containerEl.innerHTML = html;
    }

    function renderSubmitResults(containerEl, questionPoints, result) {
        let html = `<div class="rp-title">Submission Result — Score: ${result.score} / ${questionPoints}</div>`;
        html += `<div class="test-row ${result.visible.passed === result.visible.total ? 'pass' : 'fail'}">
            <div class="t-head">Visible tests: ${result.visible.passed}/${result.visible.total} passed</div>
        </div>`;
        result.visible.results.forEach((r) => {
            html += `
                <div class="test-row ${r.passed ? 'pass' : 'fail'}">
                    <div class="t-head">${r.passed ? '&#10003;' : '&#10007;'} Test ${r.index + 1} ${r.passed ? 'Passed' : 'Failed'}</div>
                    ${r.passed ? '' : `<div class="t-detail">Expected: ${UI.escapeHtml(JSON.stringify(r.expected))}\nGot: ${UI.escapeHtml(r.error ? r.error : JSON.stringify(r.actual))}</div>`}
                </div>`;
        });
        html += `<div class="test-row ${result.hidden.passed === result.hidden.total ? 'pass' : 'fail'}">
            <div class="t-head">Hidden tests: ${result.hidden.passed}/${result.hidden.total} passed</div>
        </div>`;
        containerEl.innerHTML = html;
    }

    function renderPlaceholder(containerEl) {
        containerEl.innerHTML = `
            <div class="rp-title">Test Results</div>
            <div class="placeholder">Click "Run Sample Tests" to check your solution against the visible examples.</div>`;
    }

    return { run, submit, renderRunResults, renderSubmitResults, renderPlaceholder };
})();
