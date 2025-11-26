// ARQUIVO: src/components/CollectionDetail.js
const React = window.React;
const { createElement, useState } = React;
import RewardStack from './RewardStack.js';
import { BUCKET_URL } from '../utils.js';

export default function CollectionDetail({ collection, watchedList, catalog, onBack, onMovieClick }) {
    const allMovies = collection.allMovies || [];
    const total = allMovies.length;
    const watchedCount = allMovies.filter(id => watchedList.includes(id)).length;
    const isComplete = total > 0 && watchedCount >= total;
    const levels = collection.levels || [];
    let nextLevel = levels.find(lvl => lvl.required > watchedCount);
    let currentTarget = nextLevel ? nextLevel.required : total;
    const progress = currentTarget > 0 ? (watchedCount / currentTarget) * 100 : 0;
    const [hoverId, setHoverId] = useState(null);

    return createElement('div', { style: { animation: 'fadeIn 0.3s', position: 'relative' } }, [
        // PADRÃO: VOLTAR NA ESQUERDA
        createElement('button', { className: 'btn-back-box', onClick: onBack }, '←'),

        createElement('div', { key: 'header', className: 'col-detail-header', style: { paddingTop: 50 } }, [
            createElement('h2', { key: 't', className: 'col-detail-title' }, collection.title),
            createElement('div', { key: 'd', className: 'col-detail-desc' }, collection.desc),
            createElement('div', { key: 'track', className: 'progress-track', style: { marginTop: 15 } },
                createElement('div', { className: 'progress-fill', style: { width: `${isComplete ? 100 : progress}%`, background: isComplete ? 'var(--success)' : 'var(--highlight)' } })
            ),
            createElement('div', { key: 'stat', style: { textAlign:'right', fontSize:'0.7rem', color: isComplete ? 'var(--success)' : '#666', marginTop: 5 } }, `${Math.round(isComplete ? 100 : progress)}% CONCLUÍDO`)
        ]),

        createElement('div', { key: 'movie-ribbon', style: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '30px 0', overflowX: 'auto', minHeight: '220px' } }, 
            allMovies.map((movieId, index) => {
                const isWatched = watchedList.includes(movieId);
                const isHovered = hoverId === movieId;
                const posterUrl = `${BUCKET_URL}/posters/${movieId}.jpg`;
                return createElement('div', {
                    key: movieId, onClick: () => onMovieClick && onMovieClick(movieId),
                    onMouseEnter: () => setHoverId(movieId), onMouseLeave: () => setHoverId(null),
                    title: catalog[movieId] ? catalog[movieId].titulo : movieId,
                    style: {
                        width: '120px', height: '180px', borderRadius: '6px', border: isWatched ? '1px solid #555' : '1px solid #222', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', overflow: 'hidden', position: 'relative', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', marginLeft: index === 0 ? 0 : '-40px', zIndex: isHovered ? 100 : index, transform: isHovered ? 'translateY(-15px) scale(1.1) rotate(0deg)' : `scale(1) rotate(${index % 2 === 0 ? '2deg' : '-2deg'})`, cursor: 'pointer', backgroundColor: '#000'
                    }
                }, [
                    createElement('img', { src: posterUrl, style: { width: '100%', height: '100%', objectFit: 'cover', filter: isWatched ? 'none' : 'grayscale(100%) brightness(0.4)', opacity: isWatched ? 1 : 0.6 }, onError: (e) => e.target.style.display = 'none' }),
                    isWatched && createElement('div', { style: { position: 'absolute', bottom: 5, right: 5, background: 'var(--success)', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' } }, '✓')
                ]);
            })
        ),

        createElement('div', { key: 'rewards', className: 'col-rewards-sec', style: { marginTop: 20 } }, [
            createElement('div', { key: 'rt', className: 'col-rewards-title' }, 'RECOMPENSAS POR NÍVEL'),
            levels.map((lvl, idx) => {
                const lvlUnlocked = watchedCount >= lvl.required;
                return createElement('div', { key: idx, className: 'col-level-block' }, [
                    createElement('div', { key: 'st', className: `level-status ${lvlUnlocked ? 'done' : ''}` }, lvlUnlocked ? 'DESBLOQUEADO' : `NÍVEL ${idx+1} (Assista ${lvl.required})`),
                    createElement('div', { key: 'rw', className: 'col-rewards-center' }, createElement(RewardStack, { rewards: lvl.rewards, limit: 99, size: 'large', unlocked: lvlUnlocked }))
                ]);
            })
        ])
    ]);
}