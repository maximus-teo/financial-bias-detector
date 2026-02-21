const BASE_URL = 'http://localhost:8000'

async function request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || `HTTP ${res.status}`)
    }
    return res.json()
}

export const api = {
    // Upload
    uploadFile: (file) => {
        const form = new FormData()
        form.append('file', file)
        return fetch(`${BASE_URL}/upload`, { method: 'POST', body: form }).then(r => {
            if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.detail)))
            return r.json()
        })
    },

    uploadManual: (trades, sessionId = null) =>
        request('/upload/manual', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, trades }),
        }),

    // Analysis
    analyze: (sessionId) =>
        request(`/analyze/${sessionId}`, { method: 'POST' }),

    getReport: (sessionId) =>
        request(`/report/${sessionId}`),

    // Chat
    chat: (sessionId, message, history = []) =>
        request('/chat', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, message, history }),
        }),

    // Onboarding
    getOnboardingStatus: (sessionId) =>
        request(`/session/${sessionId}/onboarding_status`),
}
