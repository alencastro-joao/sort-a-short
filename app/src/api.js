// ARQUIVO: src/api.js
// --------------------------------------------------------------------------
// Camada de Serviço (API Service).
// Centraliza todas as requisições HTTP para o backend (Lambda Function).
// Nenhuma lógica visual (React) deve ficar aqui, apenas dados puros.
// --------------------------------------------------------------------------

export const Api = {

    // --- AUTENTICAÇÃO (AWS COGNITO) ---

    /**
     * Cria uma nova conta de usuário.
     * @param {string} email 
     * @param {string} password 
     */
    signUp: async (email, password) => {
        const res = await fetch('/api/auth/signup', { 
            method: 'POST', 
            body: JSON.stringify({ email, password }) 
        });
        const data = await res.json();
        // Se der erro (ex: senha fraca, email já existe), lançamos uma exceção para a UI tratar
        if(res.status !== 200) throw new Error(data.body); 
        return data;
    },

    /**
     * Confirma o código enviado por email (MFA/Verificação).
     * @param {string} email 
     * @param {string} code - Código numérico recebido
     */
    confirmSignUp: async (email, code) => {
        const res = await fetch('/api/auth/confirm', { 
            method: 'POST', 
            body: JSON.stringify({ email, code }) 
        });
        const data = await res.json();
        if(res.status !== 200) throw new Error(data.body); 
        return data;
    },

    /**
     * Faz o login e salva a sessão no navegador.
     * @param {string} email 
     * @param {string} password 
     */
    signIn: async (email, password) => {
        const res = await fetch('/api/auth/signin', { 
            method: 'POST', 
            body: JSON.stringify({ email, password }) 
        });
        const data = await res.json();
        if(res.status !== 200) throw new Error(data.body);
        
        // Salva o token e dados básicos no LocalStorage para persistir o login ao recarregar a página
        localStorage.setItem("sortashort_session", JSON.stringify(data));
        return data;
    },

    /**
     * Faz logout apagando a sessão local.
     */
    signOut: () => { 
        localStorage.removeItem("sortashort_session"); 
    },

    /**
     * Recupera o usuário logado diretamente da memória do navegador (sem ir no servidor).
     * Útil para checar se está logado ao abrir o site.
     * @returns {Object|null} Objeto do usuário ou null se não estiver logado.
     */
    getCurrentUser: () => {
        const sess = localStorage.getItem("sortashort_session");
        return sess ? JSON.parse(sess) : null;
    },

    /**
     * Atualiza os dados do usuário no LocalStorage (Cache Local).
     * Importante para a UI atualizar o nome/foto instantaneamente sem esperar o refresh.
     */
    updateLocalUser: (newUsername, newAvatar, newColor) => {
        const sess = Api.getCurrentUser();
        if(sess) { 
            sess.username = newUsername; 
            if(newAvatar !== undefined) sess.avatar = newAvatar;
            if(newColor) sess.color = newColor;
            localStorage.setItem("sortashort_session", JSON.stringify(sess)); 
        }
    },

    // --- FUNCIONALIDADES DO APP ---

    /**
     * Salva que o usuário assistiu um filme.
     * CONSOME 1 ENERGIA NO BACKEND.
     * @param {string} email 
     * @param {string} movieId 
     */
    saveMovie: async (email, movieId) => {
        const res = await fetch('/api/history', { 
            method: 'POST', 
            body: JSON.stringify({ email, movie_id: movieId }) 
        });
        
        // Erro 403 significa que a energia acabou (regra de negócio no Python)
        if(res.status === 403) throw new Error("Sem energia");
        
        return res.json();
    },

    /**
     * Busca o perfil completo do usuário (Histórico, Reviews, Energia, Amigos).
     * @param {string} email 
     */
    getProfile: async (email) => {
        try {
            // Adicionamos _t=Date.now() para evitar que o navegador use cache antigo
            const res = await fetch(`/api/history?email=${email}&_t=${Date.now()}`);
            const data = await res.json(); 
            return data;
        } catch (e) { 
            // Fallback seguro em caso de erro de rede
            return { watched: [], reviews: [], username: null, avatar: 0, color: '#333', energy: 3 }; 
        }
    },

    /**
     * Salva as edições do perfil (Nome, Avatar e Cor).
     */
    saveProfile: async (email, username, avatar, color) => {
        const res = await fetch('/api/profile', { 
            method: 'POST', 
            body: JSON.stringify({ email, username, avatar, color }) 
        });
        const data = await res.json(); 
        if(res.status !== 200) throw new Error(data.body); 
        return data;
    },

    /**
     * Envia uma avaliação (Estrelas + Texto) para um filme.
     */
    saveRating: async (email, movieId, rating, review) => {
        const res = await fetch('/api/rating', { 
            method: 'POST', 
            body: JSON.stringify({ email, movie_id: movieId, rating, review }) 
        });
        return res.json();
    },

    // --- SOCIAL (AMIGOS E PESQUISA) ---

    /**
     * Pesquisa usuários pelo nome ou código.
     * @param {string} query - Termo da busca
     */
    searchUsers: async (query) => {
        try {
            const res = await fetch(`/api/users/search?q=${query}`);
            return await res.json();
        } catch (e) { return []; }
    },

    /**
     * Adiciona um amigo à lista.
     */
    addFriend: async (userEmail, friendCode) => {
         // Esta função será usada dentro do componente AddFriends.js futuramente
         // Por enquanto o AddFriends.js faz o fetch direto, mas idealmente moveremos para cá.
         // Vou deixar preparado:
         const res = await fetch('/api/friends/add', {
            method: 'POST',
            body: JSON.stringify({ email: userEmail, friend_code: friendCode })
        });
        return res;
    },

    // --- FERRAMENTAS DE DESENVOLVIMENTO ---

    /**
     * Rota de Trapaça: Recarrega a energia para 3 imediatamente.
     * (Deve ser removida em produção).
     */
    devRefill: async (email) => {
        await fetch('/api/dev/refill', { 
            method: 'POST', 
            body: JSON.stringify({ email }) 
        });
    }
};