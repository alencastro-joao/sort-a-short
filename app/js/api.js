// Expor BUCKET_URL e Api como variáveis globais para uso sem bundler
window.BUCKET_URL = "";

window.Api = {
    signUp: async (email, password) => {
        const res = await fetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
        const data = await res.json(); if(res.status!==200) throw new Error(data.body); return data;
    },
    confirmSignUp: async (email, code) => {
        const res = await fetch('/api/auth/confirm', { method: 'POST', body: JSON.stringify({ email, code }) });
        const data = await res.json(); if(res.status!==200) throw new Error(data.body); return data;
    },
    signIn: async (email, password) => {
        const res = await fetch('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
        const data = await res.json(); if(res.status!==200) throw new Error(data.body);
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
    saveMovie: async (email, movieId) => {
        try { await fetch('/api/history', { method: 'POST', body: JSON.stringify({ email, movie_id: movieId }) }); } catch (e) {}
    },
    getProfile: async (email) => {
        try {
            const res = await fetch(`/api/history?email=${email}&_t=${Date.now()}`);
            const data = await res.json(); return data;
        } catch (e) { return { watched: [], reviews: [], username: null }; }
    },
    saveUsername: async (email, username) => {
        const res = await fetch('/api/username', { method: 'POST', body: JSON.stringify({ email, username }) });
        const data = await res.json(); if(res.status !== 200) throw new Error(data.body); return data;
    },
    saveRating: async (email, movieId, rating, review) => {
        const res = await fetch('/api/rating', {
                method: 'POST', body: JSON.stringify({ email, movie_id: movieId, rating, review })
        });
        return res.json();
    }
};

// Também manter referência local para compatibilidade
const BUCKET_URL = window.BUCKET_URL;
const Api = window.Api;