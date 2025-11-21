// Arquivo: api.js

const Api = {
    // Helper para tratar respostas HTTP
    _handle: async (res) => {
        const data = await res.json();
        if (res.status !== 200) throw new Error(data.body || data.message || "Erro na requisição");
        return data;
    },

    // --- AUTENTICAÇÃO ---
    signUp: async (email, password) => {
        const res = await fetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
        return Api._handle(res);
    },
    confirmSignUp: async (email, code) => {
        const res = await fetch('/api/auth/confirm', { method: 'POST', body: JSON.stringify({ email, code }) });
        return Api._handle(res);
    },
    signIn: async (email, password) => {
        const res = await fetch('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
        const data = await Api._handle(res);
        localStorage.setItem("sortashort_session", JSON.stringify(data));
        return data;
    },
    signOut: () => { localStorage.removeItem("sortashort_session"); },
    
    getCurrentUser: () => {
        const sess = localStorage.getItem("sortashort_session");
        return sess ? JSON.parse(sess) : null;
    },
    updateLocalUser: (newUsername) => {
        const sess = Api.getCurrentUser();
        if(sess) { sess.username = newUsername; localStorage.setItem("sortashort_session", JSON.stringify(sess)); }
    },
    
    // --- DADOS (Com Anti-Cache) ---
    getProfile: async (email) => {
        try {
            // Adiciona timestamp para evitar cache do navegador
            const res = await fetch(`/api/history?email=${email}&_t=${Date.now()}`);
            return await res.json();
        } catch (e) { return { watched: [], reviews: [], username: null }; }
    },
    saveMovie: async (email, movieId) => {
        try { await fetch('/api/history', { method: 'POST', body: JSON.stringify({ email, movie_id: movieId }) }); } catch (e) {}
    },
    saveUsername: async (email, username) => {
        const res = await fetch('/api/username', { method: 'POST', body: JSON.stringify({ email, username }) });
        return Api._handle(res);
    },
    saveRating: async (email, movieId, rating, review) => {
        const res = await fetch('/api/rating', { method: 'POST', body: JSON.stringify({ email, movie_id: movieId, rating, review }) });
        return res.json();
    }
};

// Expõe a API para o resto do site
window.Api = Api;