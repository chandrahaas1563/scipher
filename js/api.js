// ============================================================
// scipher/js/api.js
// Add this file to your frontend repo at js/api.js
// Then add <script src="./js/api.js"></script> to every HTML page
// ============================================================

const API_URL = 'https://scipher-backend-production.up.railway.app'; // ← Replace with your Render URL after deploy

const SipherAPI = {

    // ── Auth ────────────────────────────────────────────────

    async register(username, email, password) {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        return res.json();
    },

    async login(username, password) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return res.json();
    },

    async getMe() {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: this._authHeaders()
        });
        return res.json();
    },

    // ── Leaderboard ─────────────────────────────────────────

    async getWeeklyLeaderboard() {
        const res = await fetch(`${API_URL}/leaderboard/weekly`);
        return res.json();
    },

    async getAllTimeLeaderboard() {
        const res = await fetch(`${API_URL}/leaderboard/alltime`);
        return res.json();
    },

    async getMyRank() {
        const res = await fetch(`${API_URL}/leaderboard/me`, {
            headers: this._authHeaders()
        });
        return res.json();
    },

    // ── Stats ───────────────────────────────────────────────

    async getUserStats(username) {
        const res = await fetch(`${API_URL}/stats/${username}`);
        return res.json();
    },

    async saveGameResult(roomId, roomName, wordsRevealed, cluesGiven, result) {
        const res = await fetch(`${API_URL}/stats/game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this._authHeaders() },
            body: JSON.stringify({ room_id: roomId, room_name: roomName, words_revealed: wordsRevealed, clues_given: cluesGiven, result })
        });
        return res.json();
    },

    // ── Rooms ────────────────────────────────────────────────

    async createRoom(name, type, options = {}) {
        const res = await fetch(`${API_URL}/rooms/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this._authHeaders() },
            body: JSON.stringify({ name, type, ...options })
        });
        return res.json();
    },

    async getRoom(code) {
        const res = await fetch(`${API_URL}/rooms/${code}`);
        return res.json();
    },

    // ── Session helpers ──────────────────────────────────────

    saveSession(token, user) {
        localStorage.setItem('scipher_token', token);
        localStorage.setItem('scipher_user', JSON.stringify(user));
    },

    getUser() {
        const u = localStorage.getItem('scipher_user');
        return u ? JSON.parse(u) : null;
    },

    getToken() {
        return localStorage.getItem('scipher_token');
    },

    logout() {
        localStorage.removeItem('scipher_token');
        localStorage.removeItem('scipher_user');
        window.location.href = './login.html';
    },

    isLoggedIn() {
        return !!this.getToken() && !!this.getUser();
    },

    _authHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};
