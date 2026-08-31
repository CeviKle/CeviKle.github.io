const Session = (() => {
    let sessionId = null;

    async function createOrResume() {
        const data = await Auth.apiFetch('/sessions', { method: 'POST', body: '{}' });
        sessionId = data.session_id;
        return data; // { session_id, status, start_time, end_time, server_time }
    }

    function getSessionId() {
        return sessionId;
    }

    async function getQuestions() {
        return Auth.apiFetch(`/sessions/${sessionId}/questions`);
    }

    async function getAutosaved() {
        return Auth.apiFetch(`/sessions/${sessionId}/autosave`);
    }

    async function saveCode(questionId, code) {
        return Auth.apiFetch(`/sessions/${sessionId}/questions/${questionId}/autosave`, {
            method: 'PUT',
            body: JSON.stringify({ code }),
        });
    }

    async function finish() {
        return Auth.apiFetch(`/sessions/${sessionId}/finish`, { method: 'POST', body: '{}' });
    }

    async function getResults() {
        return Auth.apiFetch(`/sessions/${sessionId}/results`);
    }

    function logSecurityEvent(eventType, eventData) {
        if (!sessionId) return;
        Auth.apiFetch(`/sessions/${sessionId}/security-events`, {
            method: 'POST',
            body: JSON.stringify({
                event_type: eventType,
                event_data: eventData || null,
                client_timestamp: new Date().toISOString(),
            }),
        }).catch(() => { /* best-effort; never blocks the exam UI */ });
    }

    return { createOrResume, getSessionId, getQuestions, getAutosaved, saveCode, finish, getResults, logSecurityEvent };
})();
