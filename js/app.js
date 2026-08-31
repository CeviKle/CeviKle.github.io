document.addEventListener('DOMContentLoaded', () => {
    let currentQuestionId = null;
    let initialCodeByQuestion = {};
    let isFinishing = false;

    // ---------------- bootstrap ----------------
    Security.init({ onForceSubmit: (reason) => forceSubmit(reason) });

    if (Auth.getState()) {
        // Existing token in sessionStorage (e.g. page reload) — skip straight to the
        // fullscreen gate and attempt to resume, rather than re-asking for identity.
        showFullscreenGate(true);
    } else {
        UI.showScreen('screen-verify');
    }

    // ---------------- verify screen ----------------
    const verifyForm = document.getElementById('verifyForm');
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('verifyBtn');
        const errorEl = document.getElementById('verifyError');
        errorEl.textContent = '';
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Verifying…';
        try {
            const state = await Auth.verify(
                document.getElementById('usnInput').value.trim(),
                document.getElementById('emailInput').value.trim(),
            );
            renderInstructions(state);
            UI.showScreen('screen-instructions');
        } catch (err) {
            errorEl.textContent = err.detail || 'Verification failed. Check your USN and email.';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Continue';
        }
    });

    function renderInstructions(state) {
        document.getElementById('instrTitle').textContent = state.assessmentTitle;
        document.getElementById('instrDuration').textContent = `${state.durationMinutes} minutes`;
        document.getElementById('instrCandidate').textContent = state.candidateName;
    }

    // ---------------- instructions -> fullscreen gate ----------------
    document.getElementById('beginBtn').addEventListener('click', () => showFullscreenGate(false));

    function showFullscreenGate(isResume) {
        document.getElementById('fsGateResumeNote').hidden = !isResume;
        Security.gateOverlay().hidden = false;
    }

    document.getElementById('fsGateBtn').addEventListener('click', async () => {
        Security.requestFullscreen();
        Security.gateOverlay().hidden = true;
        await startOrResumeWorkspace();
    });

    document.getElementById('fsResumeBtn').addEventListener('click', () => {
        Security.requestFullscreen();
    });

    // ---------------- session start / resume ----------------
    async function startOrResumeWorkspace() {
        let session;
        try {
            session = await Session.createOrResume();
        } catch (err) {
            if (err.detail === 'already_attempted') {
                showLockedScreen('Submission Received', 'You have already completed this assessment.');
            } else if (err.status === 403) {
                showLockedScreen('Assessment Closed', 'The time window for this assessment has ended.');
            } else {
                UI.toast(err.detail || 'Could not start the assessment. Please retry.', 'danger');
            }
            return;
        }

        const [questions, autosaved] = await Promise.all([
            Session.getQuestions(),
            Session.getAutosaved(),
        ]);
        Questions.setData(questions);

        initialCodeByQuestion = {};
        questions.forEach((q) => { initialCodeByQuestion[q.id] = q.starter_code; });
        autosaved.forEach((a) => {
            initialCodeByQuestion[a.question_id] = a.code;
            Questions.setStatus(a.question_id, a.code.trim() !== '' ? 'attempted' : 'unattempted');
        });

        if (!document.getElementById('monaco-container').dataset.initialized) {
            await Editor.init('monaco-container');
            document.getElementById('monaco-container').dataset.initialized = '1';
            Editor.blockClipboard((evt) => {
                if (evt === 'paste') UI.toast('Paste is disabled during the assessment.', 'danger');
            });
            Editor.onChange((qid) => {
                Autosave.markDirty(qid);
                if (Questions.getStatus(qid) !== 'solved') Questions.setStatus(qid, 'attempted');
                renderNav();
            });
        }

        document.getElementById('candidateTag').textContent = Auth.getState().candidateName;
        UI.showScreen('screen-workspace');
        selectQuestion(questions[0].id);
        Autosave.start();
        Security.setActive(true);

        Timer.start(session.end_time, session.server_time, onTimerTick, () => forceSubmit('Auto-submitted: time expired'));
    }

    function onTimerTick(remainingMs) {
        const el = document.getElementById('timerDisplay');
        el.textContent = UI.formatDuration(remainingMs);
        el.classList.toggle('warn', remainingMs > 0 && remainingMs < 10 * 60 * 1000);
        el.classList.toggle('critical', remainingMs > 0 && remainingMs < 5 * 60 * 1000);
    }

    // ---------------- question navigation ----------------
    function selectQuestion(questionId) {
        currentQuestionId = questionId;
        const q = Questions.getById(questionId);
        Editor.setActiveQuestion(questionId, initialCodeByQuestion[questionId] || q.starter_code);
        document.getElementById('sigLabel').textContent = q.signature;
        Questions.renderDescription(document.getElementById('descPanel'), q);
        Judge.renderPlaceholder(document.getElementById('resultsPanel'));
        renderNav();
    }

    function renderNav() {
        Questions.renderNav(document.getElementById('questionNav'), currentQuestionId, (qid) => {
            if (qid === currentQuestionId) return;
            Autosave.markDirty(currentQuestionId);
            Autosave.flush();
            selectQuestion(qid);
        });
    }

    // ---------------- run / reset ----------------
    document.getElementById('runBtn').addEventListener('click', async () => {
        const btn = document.getElementById('runBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Running…';
        document.getElementById('resultsPanel').innerHTML = '<div class="rp-title">Test Results</div><div class="placeholder">Executing against sample tests…</div>';
        try {
            const code = Editor.getCurrentCode();
            const result = await Judge.run(currentQuestionId, code);
            Judge.renderRunResults(document.getElementById('resultsPanel'), result);
        } catch (err) {
            document.getElementById('resultsPanel').innerHTML =
                `<div class="rp-title">Test Results</div><div class="placeholder">Error: ${UI.escapeHtml(err.detail || 'Run failed, please retry.')}</div>`;
        } finally {
            btn.disabled = false;
            btn.textContent = '▶ Run Sample Tests';
        }
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        const q = Questions.getById(currentQuestionId);
        if (!confirm(`Reset "${q.title}" to the starter code? Your current solution for this problem will be discarded.`)) return;
        Editor.resetQuestion(currentQuestionId, q.starter_code);
        Autosave.markDirty(currentQuestionId);
    });

    // ---------------- submit solution (per question — grades against hidden tests too) ----------------
    document.getElementById('submitQuestionBtn').addEventListener('click', async () => {
        const q = Questions.getById(currentQuestionId);
        if (!confirm(`Submit your solution for "${q.title}"? This grades it against all test cases, including hidden ones. You can submit again later to improve your score — the best attempt counts.`)) return;
        const btn = document.getElementById('submitQuestionBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Grading…';
        document.getElementById('resultsPanel').innerHTML = '<div class="rp-title">Test Results</div><div class="placeholder">Grading against all test cases…</div>';
        try {
            const code = Editor.getCurrentCode();
            const result = await Judge.submit(currentQuestionId, code);
            Judge.renderSubmitResults(document.getElementById('resultsPanel'), q.points, result);
            Questions.setStatus(currentQuestionId, result.score === q.points ? 'solved' : 'attempted');
            renderNav();
        } catch (err) {
            document.getElementById('resultsPanel').innerHTML =
                `<div class="rp-title">Test Results</div><div class="placeholder">Error: ${UI.escapeHtml(err.detail || 'Submission failed, please retry.')}</div>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Submit Solution';
        }
    });

    // ---------------- submit assessment ----------------
    document.getElementById('submitAssessmentBtn').addEventListener('click', async () => {
        if (!confirm('Submit the assessment? This grades every problem against all test cases (including hidden ones), locks your code, and cannot be undone.')) return;
        await forceSubmit('Submitted manually');
    });

    async function forceSubmit(reason) {
        if (isFinishing) return;
        isFinishing = true;
        Security.setActive(false);
        Autosave.stop();
        document.getElementById('submitAssessmentBtn').disabled = true;
        document.getElementById('submitAssessmentBtn').innerHTML = '<span class="spinner"></span> Grading…';
        try {
            await Submissions.finishAndShowResults(reason);
        } catch (err) {
            UI.toast(err.detail || 'Could not submit. Please check your connection and try again.', 'danger');
            isFinishing = false;
            Security.setActive(true);
            document.getElementById('submitAssessmentBtn').disabled = false;
            document.getElementById('submitAssessmentBtn').textContent = 'Submit Assessment';
        }
    }

    function showLockedScreen(title, message) {
        UI.showScreen('screen-locked');
        document.getElementById('lockedTitle').textContent = title;
        document.getElementById('lockedMessage').textContent = message;
    }
});
