// ARQUIVO: src/api.js
export const Api = {

    // --- AUTENTICAÇÃO ---
    signUp: async (email, password) => {
        const res = await fetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if(res.status !== 200) throw new Error(data.body); 
        return data;
    },

    confirmSignUp: async (email, code) => {
        const res = await fetch('/api/auth/confirm', { method: 'POST', body: JSON.stringify({ email, code }) });
        const data = await res.json();
        if(res.status !== 200) throw new Error(data.body); 
        return data;
    },

    signIn: async (email, password) => {
        const res = await fetch('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if(res.status !== 200) throw new Error(data.body);
        localStorage.setItem("sortashort_session", JSON.stringify(data));
        return data;
    },

    signOut: () => { localStorage.removeItem("sortashort_session"); },

    getCurrentUser: () => {
        const sess = localStorage.getItem("sortashort_session");
        return sess ? JSON.parse(sess) : null;
    },

    updateLocalUser: (newUsername, newAvatar, newColor) => {
        const sess = Api.getCurrentUser();
        if(sess) { 
            sess.username = newUsername; 
            if(newAvatar !== undefined) sess.avatar = newAvatar;
            if(newColor) sess.color = newColor;
            localStorage.setItem("sortashort_session", JSON.stringify(sess)); 
        }
    },

    // --- FUNCIONALIDADES ---
    saveMovie: async (email, movieId) => {
        const res = await fetch('/api/history', { method: 'POST', body: JSON.stringify({ email, movie_id: movieId }) });
        if(res.status === 403) throw new Error("Sem energia");
        return res.json();
    },

    getProfile: async (email) => {
        try {
            const res = await fetch(`/api/history?email=${email}&_t=${Date.now()}`);
            return await res.json(); 
        } catch (e) { return { watched: [], reviews: [], energy: 3 }; }
    },

    saveProfile: async (email, username, avatar, color) => {
        const res = await fetch('/api/profile', { method: 'POST', body: JSON.stringify({ email, username, avatar, color }) });
        if(res.status !== 200) throw new Error("Erro ao salvar"); 
        return res.json();
    },

    saveRating: async (email, movieId, rating, review) => {
        const res = await fetch('/api/rating', { method: 'POST', body: JSON.stringify({ email, movie_id: movieId, rating, review }) });
        return res.json();
    },

    // --- SOCIAL ---
    searchUsers: async (query) => {
        try {
            const res = await fetch(`/api/users/search?q=${query}`);
            return await res.json();
        } catch (e) { return []; }
    },

    addFriend: async (userEmail, friendCode) => {
         const res = await fetch('/api/friends/add', {
            method: 'POST',
            body: JSON.stringify({ email: userEmail, friend_code: friendCode })
        });
        return res;
    },

    // *** NOVO ***
    getSocialFeed: async (email) => {
        try {
            const res = await fetch(`/api/social/feed?email=${email}`);
            return await res.json();
        } catch (e) { return []; }
    },

    devRefill: async (email) => {
        await fetch('/api/dev/refill', { method: 'POST', body: JSON.stringify({ email }) });
    }
};