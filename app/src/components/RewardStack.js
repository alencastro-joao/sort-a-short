// ARQUIVO: src/components/RewardStack.js
// --------------------------------------------------------------------------
// Exibe uma lista de avatares empilhados (overlap).
// Usado nos Cards de Coleção e no Detalhe da Coleção.
// --------------------------------------------------------------------------

const React = window.React;
const { createElement } = React;

export default function RewardStack({ rewards, limit = 3, size = 'small', unlocked = false }) {
    const count = rewards ? rewards.length : 0;
    if (count === 0) return null;
    
    const showCount = Math.min(count, limit);
    const visibleRewards = rewards.slice(0, showCount);
    const remaining = count - showCount;

    // Mapeia os avatares visíveis
    const avatarElements = visibleRewards.map((rId, index) => {
        return createElement('div', {
            key: index,
            className: `reward-item ${unlocked ? 'unlocked' : ''}`,
            style: { zIndex: 10 - index }
        }, [
            createElement('img', {
                key: 'img',
                src: `/avatars/${rId}.png`,
                onError: (e) => e.target.src = '/icon.png'
            }),
            // Se não estiver desbloqueado, mostra o cadeado
            !unlocked && createElement('div', { key: 'lock', className: 'lock-overlay-mini' }, '🔒')
        ]);
    });

    // Se sobrar avatares (ex: +2), adiciona a bolinha de contagem
    if (remaining > 0) {
        avatarElements.push(
            createElement('div', {
                key: 'counter',
                className: 'reward-item counter',
                style: { zIndex: 0 }
            }, `+${remaining}`)
        );
    }

    return createElement('div', { className: `reward-stack ${size}` }, avatarElements);
}