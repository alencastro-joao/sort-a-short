// ARQUIVO: src/utils.js
const React = window.React;
const { createElement } = React;

// --- CONFIGURAÇÃO ---
// CORREÇÃO: Deixamos vazio para usar caminhos relativos (servidos pela Lambda)
export const BUCKET_URL = ""; 

export const AVATAR_COUNT = 6; 

export const AVATAR_COLORS = [
    '#d32f2f', '#7b1fa2', '#303f9f', '#0288d1', '#00796b', 
    '#388e3c', '#fbc02d', '#f57c00', '#5d4037', '#455a64'
];

// --- HELPERS VISUAIS ---

export const getAvatarUI = (avatarId, username, color, sizeClass) => {
    const letter = username ? username.charAt(0).toUpperCase() : '?';
    const bgColor = color || '#333';
    
    if (!avatarId || avatarId === 0) {
        return createElement('div', { 
            className: `avatar-base avatar-letter ${sizeClass}`, 
            style: { background: bgColor } 
        }, letter);
    }

    return createElement('img', {
        src: `/avatars/${avatarId}.png`,
        className: `avatar-base ${sizeClass}`,
        onError: (e) => { e.target.style.display = 'none'; }
    });
};

// --- HELPERS DE FORMATAÇÃO ---

export const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    }) + ' ' + d.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

export const formatRichText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
        if (!line.trim()) return createElement('br', { key: `br-${i}` });
        
        const parts = line.split('**');
        const formattedLine = parts.map((part, index) => {
            // Índices ímpares estão entre asteriscos -> Negrito
            if (index % 2 === 1) {
                return createElement('strong', { key: `b-${index}`, style: { color: '#fff' } }, part);
            }
            return createElement('span', { key: `s-${index}` }, part);
        });

        return createElement('p', { key: `p-${i}`, style: { margin: '0 0 10px 0' } }, formattedLine);
    });
};