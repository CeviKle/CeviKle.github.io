// ============================================================================
// API base URL — points at the Cloudflare Tunnel in front of the FastAPI
// backend on phoenix. Override window.__API_BASE_OVERRIDE__ before this
// script loads (e.g. in a local test harness) to point elsewhere, such as
// http://localhost:8000/api for local dev against `docker compose up`.
// ============================================================================
const API_BASE = window.__API_BASE_OVERRIDE__ || 'https://viss2026.nikhilakalwadi.me/api';

const Auth = (() => {
    const STORAGE_KEY = 'viss_a2_auth';
    let state = null; // { token, candidateName, assessmentId, assessmentTitle, durationMinutes }

    function load() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) state = JSON.parse(raw);
        } catch (e) {
            state = null;
        }
        return state;
    }

    function persist() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* ignore quota errors */ }
    }

    function clear() {
        state = null;
        try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    }

    async function verify(usn, email) {
        const res = await fetch(`${API_BASE}/candidates/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usn, email }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new ApiError(res.status, body.detail || 'Verification failed');
        }
        const data = await res.json();
        state = {
            token: data.access_token,
            candidateName: data.candidate_name,
            assessmentId: data.assessment_id,
            assessmentTitle: data.assessment_title,
            durationMinutes: data.duration_minutes,
        };
        persist();
        return state;
    }

    function getState() {
        return state;
    }

    class ApiError extends Error {
        constructor(status, detail) {
            super(detail);
            this.status = status;
            this.detail = detail;
        }
    }

    async function apiFetch(path, options = {}) {
        if (!state || !state.token) throw new ApiError(401, 'Not authenticated');
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${state.token}`,
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...(options.headers || {}),
            },
        });
        if (res.status === 204) return null;
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new ApiError(res.status, body.detail || `Request failed (${res.status})`);
        }
        return body;
    }

    load();
    return { verify, getState, clear, apiFetch, ApiError };
})();
