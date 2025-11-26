// ARQUIVO: src/components/CatalogScreen.js
const React = window.React;
const { useState, createElement } = React;
import { BUCKET_URL } from '../utils.js';

export default function CatalogScreen({ catalog, watchedList, onSelectMovie, onClose }) {
    const [filter, setFilter] = useState("");
    const allMovies = Object.keys(catalog).map(key => ({ id: key, ...catalog[key] }));
    const filteredMovies = allMovies.filter(m => m.titulo.toLowerCase().includes(filter.toLowerCase()) || m.diretor.toLowerCase().includes(filter.toLowerCase()));

    return createElement('div', { 
        className: 'social-screen-container',
        style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', overflow: 'hidden', pointerEvents: 'auto', padding: '0 50px', paddingTop: '80px', position: 'relative' } 
    }, [
        createElement('button', { key: 'close', className: 'btn-close-box', style: {top: 30, right: 30}, onClick: onClose }, '✕'),

        createElement('div', { key: 'h', style: { paddingBottom: 20, borderBottom: '1px solid #333', marginBottom: 20 } }, [
            createElement('h2', { key: 't', style: { margin: 0, color: '#fff', letterSpacing: 2 } }, 'CATÁLOGO'),
            createElement('span', { key: 's', style: { fontSize: '0.7rem', color: '#666' } }, `${watchedList.length} de ${allMovies.length} descobertos`)
        ]),

        createElement('input', { key: 'search', className: 'auth-input', placeholder: 'Filtrar...', value: filter, onChange: e => setFilter(e.target.value), style: { marginBottom: 20 } }),

        createElement('div', { key: 'grid', className: 'profile-grid', style: { overflowY: 'auto', paddingBottom: 50, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' } }, 
            filteredMovies.map(m => {
                const isWatched = watchedList.includes(m.id);
                const posterUrl = `${BUCKET_URL}/posters/${m.id}.jpg`;
                return createElement('div', { 
                    key: m.id, onClick: () => onSelectMovie(m.id),
                    className: 'profile-movie-item',
                    style: { opacity: isWatched ? 1 : 0.3, height: '200px', padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', border: isWatched ? '1px solid var(--success)' : '1px solid #333', overflow: 'hidden', backgroundColor: '#050505', cursor: 'pointer' }
                }, [
                    createElement('img', { src: posterUrl, loading: "lazy", style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 0 }, onError: (e) => e.target.style.display = 'none' }),
                    createElement('div', { style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: isWatched ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.6)', zIndex: 1, pointerEvents: 'none' } }),
                    createElement('div', { style: { background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)', width: '100%', padding: '10px', paddingTop: '40px', zIndex: 2, position: 'relative' } }, [
                        createElement('div', { style: { fontSize: '0.55rem', color: isWatched ? 'var(--success)' : '#fff', marginBottom: 2, fontWeight: 'bold', textShadow: '0 1px 2px #000' } }, isWatched ? '✓ ASSISTIDO' : 'PENDENTE'),
                        createElement('div', { style: { fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', textShadow: '0 1px 3px #000', lineHeight: 1.2 } }, m.titulo),
                        createElement('div', { style: { fontSize: '0.6rem', color: '#ccc', marginTop: 2 } }, m.ano)
                    ])
                ]);
            })
        )
    ]);
}