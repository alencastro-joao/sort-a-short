// ARQUIVO: src/utils.js
// --------------------------------------------------------------------------
// Este arquivo contém utilitários globais, constantes e funções auxiliares
// puras (que não dependem de estado do React) para serem reutilizadas.
// --------------------------------------------------------------------------

// Capturamos o React do objeto global (window) pois estamos usando via CDN.
// Isso é necessário para usar a função 'createElement' dentro do helper visual.
const React = window.React;
const { createElement } = React;

/**
 * URL base do seu Bucket S3 onde ficam os vídeos e o arquivo JSON.
 * Atualmente vazio pois estamos usando caminhos relativos ou locais.
 */
export const BUCKET_URL = ""; 

/**
 * Quantidade total de avatares (imagens PNG) disponíveis na pasta /avatars/.
 * Usado para gerar os loops de seleção de imagem.
 */
export const AVATAR_COUNT = 6; 

/**
 * Lista de cores hexadecimais (estilo Material Design) usadas para:
 * 1. O fundo do avatar de letra (quando o usuário não tem foto).
 * 2. A cor da borda ou detalhes do perfil.
 */
export const AVATAR_COLORS = [
    '#d32f2f', // Vermelho
    '#7b1fa2', // Roxo
    '#303f9f', // Azul Indigo
    '#0288d1', // Azul Claro
    '#00796b', // Verde Teal
    '#388e3c', // Verde
    '#fbc02d', // Amarelo
    '#f57c00', // Laranja
    '#5d4037', // Marrom
    '#455a64'  // Cinza Azulado
];

/**
 * Função Helper: getAvatarUI
 * --------------------------
 * Responsável por decidir o que mostrar no lugar da foto do usuário.
 * * Lógica:
 * - Se o avatarId for 0 ou inválido -> Mostra um círculo colorido com a inicial do nome.
 * - Se o avatarId for > 0 -> Mostra a imagem PNG correspondente da pasta /avatars/.
 * * @param {number} avatarId - O número do avatar (ex: 1, 2, 3...). 0 significa sem avatar.
 * @param {string} username - O nome do usuário (usado para pegar a primeira letra).
 * @param {string} color - A cor de fundo preferida do usuário (para o avatar de letra).
 * @param {string} sizeClass - Classe CSS para definir o tamanho ('avatar-large', 'user-avatar-mini', etc).
 * * @returns {ReactElement} Retorna um elemento React (div ou img).
 */
export const getAvatarUI = (avatarId, username, color, sizeClass) => {
    // Pega a primeira letra do nome e transforma em maiúscula. Se não tiver nome, usa '?'.
    const letter = username ? username.charAt(0).toUpperCase() : '?';
    
    // Define a cor de fundo. Se o usuário não tiver cor salva, usa cinza escuro (#333).
    const bgColor = color || '#333';
    
    // CASO 1: Usuário sem foto (Avatar 0 ou null)
    // Retorna uma <div class="avatar-base avatar-letter ...">LETRA</div>
    if (!avatarId || avatarId === 0) {
        return createElement('div', { 
            className: `avatar-base avatar-letter ${sizeClass}`, 
            style: { background: bgColor } 
        }, letter);
    }

    // CASO 2: Usuário com foto
    // Retorna uma <img src="/avatars/X.png" ... />
    return createElement('img', {
        src: `/avatars/${avatarId}.png`,
        className: `avatar-base ${sizeClass}`,
        // Tratamento de erro: Se a imagem não carregar (404), esconde ela.
        // (Em um cenário ideal, poderíamos mostrar a letra como fallback aqui também)
        onError: (e) => { 
            e.target.style.display = 'none'; 
        }
    });
};