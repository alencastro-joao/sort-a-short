const React = window.React;
const { createElement } = React;
import RewardStack from './RewardStack.js';

export default function CollectionDetail({ collection, watchedList, catalog, onBack }) {
    const allMovies = collection.allMovies || [];
    const total = allMovies.length;
    const watchedCount = allMovies.filter(id => watchedList.includes(id)).length;
    const isComplete = total > 0 && watchedCount >= total;
    const levels = collection.levels || [];
    
    let nextLevel = levels.find(lvl => lvl.required > watchedCount);
    let currentTarget = nextLevel ? nextLevel.required : total;
    const progress = currentTarget > 0 ? (watchedCount / currentTarget) * 100 : 0;

    return createElement('div', { style: { animation: 'fadeIn 0.3s' } }, [
        createElement('button', { 
            key: 'btn-back',
            onClick: onBack, 
            style: { background:'none', border:'none', color:'#666', cursor:'pointer', marginBottom: 15, fontSize:'0.8rem' } 
        }, '← VOLTAR'),

        createElement('div', { key: 'header', className: 'col-detail-header' }, [
            createElement('h2', { key: 't', className: 'col-detail-title' }, collection.title),
            createElement('div', { key: 'd', className: 'col-detail-desc' }, collection.desc),
            createElement('div', { key: 'track', className: 'progress-track', style: { marginTop: 15 } },
                createElement('div', { 
                    className: 'progress-fill', 
                    style: { width: `${isComplete ? 100 : progress}%`, background: isComplete ? 'var(--success)' : 'var(--highlight)' } 
                })
            ),
            createElement('div', { key: 'stat', style: { textAlign:'right', fontSize:'0.7rem', color: isComplete ? 'var(--success)' : '#666', marginTop: 5 } }, 
                `${Math.round(isComplete ? 100 : progress)}% CONCLUÍDO`
            )
        ]),

        createElement('div', { key: 'list', className: 'col-movie-list' }, 
            allMovies.map(movieId => {
                const movie = catalog[movieId] || { titulo: "Carregando..." };
                const isWatched = watchedList.includes(movieId);
                return createElement('div', { key: movieId, className: `col-movie-item ${isWatched ? 'watched' : ''}` }, [
                    createElement('span', { key: 't' }, movie.titulo),
                    !isWatched && createElement('span', { key: 'p', style: { fontSize:'0.6rem', border:'1px solid #333', padding:'2px 5px' } }, 'PENDENTE')
                ]);
            })
        ),

        createElement('div', { key: 'rewards', className: 'col-rewards-sec' }, [
            createElement('div', { key: 'rt', className: 'col-rewards-title' }, 'RECOMPENSAS POR NÍVEL'),
            levels.map((lvl, idx) => {
                const lvlUnlocked = watchedCount >= lvl.required;
                return createElement('div', { key: idx, className: 'col-level-block' }, [
                    createElement('div', { key: 'st', className: `level-status ${lvlUnlocked ? 'done' : ''}` }, 
                        lvlUnlocked ? 'DESBLOQUEADO' : `NÍVEL ${idx+1} (Assista ${lvl.required})`
                    ),
                    createElement('div', { key: 'rw', className: 'col-rewards-center' }, 
                        createElement(RewardStack, { rewards: lvl.rewards, limit: 99, size: 'large', unlocked: lvlUnlocked })
                    )
                ]);
            })
        ])
    ]);
}