// ARQUIVO: src/components/CollectionCard.js
// --------------------------------------------------------------------------
// Card retangular que exibe o progresso de uma coleção na lista.
// --------------------------------------------------------------------------

const React = window.React;
const { createElement } = React;
import RewardStack from './RewardStack.js'; // Reutiliza o componente de pilha

export default function CollectionCard({ collection, watchedList, onClick }) {
    const allMovies = collection.allMovies || [];
    const total = allMovies.length;
    const watchedCount = allMovies.filter(id => watchedList.includes(id)).length;
    
    // Lógica de Níveis para a barra de progresso
    const levels = collection.levels || [];
    let nextLevel = levels.find(lvl => lvl.required > watchedCount);
    let currentTarget = nextLevel ? nextLevel.required : total;
    
    const progress = currentTarget > 0 ? (watchedCount / currentTarget) * 100 : 0;
    const isComplete = total > 0 && watchedCount >= total;
    
    // Pega recompensas do primeiro nível para mostrar no card
    const firstLevel = levels.length > 0 ? levels[0] : null;
    const rewards = firstLevel ? firstLevel.rewards : [];

    return createElement('div', { 
        className: `collection-card ${isComplete ? 'completed' : ''}`, 
        onClick: onClick 
    },
        // Header (Título + Rewards)
        createElement('div', { className: 'col-header' },
            createElement('div', {},
                createElement('h3', { className: 'col-title' }, collection.title),
                createElement('div', { className: 'col-desc' }, collection.desc)
            ),
            // Aqui usamos o componente RewardStack que importamos
            createElement(RewardStack, { rewards: rewards, limit: 3, size: 'small', unlocked: isComplete })
        ),

        // Barra de Progresso
        createElement('div', { className: 'progress-track' },
            createElement('div', { 
                className: 'progress-fill', 
                style: { width: `${isComplete ? 100 : progress}%` } 
            })
        ),

        // Status Texto
        createElement('div', { className: 'col-status' },
            createElement('span', {}, `${watchedCount} de ${currentTarget} filmes`),
            isComplete 
                ? createElement('span', { className: 'done' }, 'COMPLETO')
                : createElement('span', {}, 'Ver detalhes →')
        )
    );
}