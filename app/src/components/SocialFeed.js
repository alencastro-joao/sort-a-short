const React = window.React;
const { useState, useEffect, createElement } = React;
import { Api } from '../api.js';
import { getAvatarUI } from '../utils.js';
import FriendAction from './FriendAction.js'; // Reutilizamos para poder adicionar amigos de amigos futuramente

export default function SocialFeed({ user, catalog, onClose }) {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFeed();
    }, []);

    const loadFeed = async () => {
        try {
            const data = await Api.getSocialFeed(user.email);
            setFeed(data);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
    };

    return createElement('div', { className: 'auth-modal' },
        createElement('div', { className: 'auth-box profile-box', style: { height: '80vh', display: 'flex', flexDirection: 'column' } }, [
            
            // Header
            createElement('div', { key: 'h', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #333', paddingBottom: 15 } }, [
                createElement('h2', { style: { margin: 0, color: '#fff', letterSpacing: 2 } }, 'FEED SOCIAL'),
                createElement('button', { className: 'btn-close-box', onClick: onClose }, '✕')
            ]),

            // Lista (Scrollable)
            createElement('div', { key: 'list', style: { flex: 1, overflowY: 'auto', paddingRight: 10 } }, [
                loading && createElement('div', { className: 'sorting-anim', style:{fontSize:'0.8rem'} }, 'Carregando atualizações...'),
                
                !loading && feed.length === 0 && createElement('div', { className: 'search-empty' }, [
                    createElement('p', {}, 'Nenhuma atividade recente.'),
                    createElement('p', { style:{fontSize:'0.8rem'} }, 'Adicione amigos para ver o que eles estão assistindo!')
                ]),

                !loading && feed.map((item, idx) => {
                    const movie = catalog[item.movie_id] || { titulo: "Filme Desconhecido" };
                    return createElement('div', { key: idx, style: { background: '#111', border: '1px solid #333', padding: 15, marginBottom: 15, borderRadius: 4 } }, [
                        // Linha do Usuário
                        createElement('div', { style: { display: 'flex', alignItems: 'center', marginBottom: 10 } }, [
                            getAvatarUI(item.avatar, item.username, item.color, 'search-avatar'),
                            createElement('div', {}, [
                                createElement('div', { style: { fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' } }, item.username.toUpperCase()),
                                createElement('div', { style: { fontSize: '0.7rem', color: '#666' } }, formatDate(item.timestamp))
                            ])
                        ]),
                        
                        // Conteúdo da Review
                        createElement('div', { style: { paddingLeft: 50 } }, [
                            createElement('div', { style: { color: '#888', fontSize: '0.75rem', marginBottom: 5 } }, [
                                'Avaliou ',
                                createElement('span', { style: { color: '#fff', fontWeight: 'bold' } }, movie.titulo)
                            ]),
                            createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 } }, [
                                createElement('span', { style: { color: 'var(--highlight)', fontSize: '1.2rem' } }, '★'.repeat(Math.round(item.rating))),
                                createElement('span', { style: { color: '#444', fontSize: '0.8rem' } }, `(${item.rating})`)
                            ]),
                            item.review && createElement('div', { style: { fontStyle: 'italic', color: '#bbb', fontSize: '0.9rem', borderLeft: '2px solid var(--highlight)', paddingLeft: 10, marginTop: 10 } }, `"${item.review}"`)
                        ])
                    ]);
                })
            ])
        ])
    );
}