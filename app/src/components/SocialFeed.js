// ARQUIVO: src/components/SocialFeed.js
const React = window.React;
const { useState, useEffect, createElement } = React;
import { Api } from '../api.js';
import { getAvatarUI, formatDate } from '../utils.js';
import AddFriends from './AddFriends.js';

export default function SocialFeed({ user, catalog, onViewFriend }) {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);

    useEffect(() => { loadFeed(); }, []);

    const loadFeed = async () => {
        setLoading(true);
        try {
            const data = await Api.getSocialFeed(user.email);
            data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setFeed(data);
        } catch (e) { console.error("Erro ao carregar feed:", e); }
        setLoading(false);
    };

    const renderFeedContent = (item, movie) => {
        const hasReviewText = item.review && item.review.length > 0;
        const ratingValue = parseFloat(item.rating) || 0;
        const ratingStars = '★'.repeat(Math.round(ratingValue));
        let actionText = hasReviewText ? 'Escreveu uma avaliação de' : (ratingValue > 0 ? 'Avaliou com estrelas' : 'Assistiu e avaliou');
        
        return createElement('div', { className: 'feed-content' }, [
            createElement('div', { key: 'act', style: { color: '#888', fontSize: '0.75rem', marginBottom: 5 } }, [
                actionText + ' ',
                createElement('span', { key: 'tt', style: { color: '#fff', fontWeight: 'bold' } }, movie.titulo)
            ]),
            ratingValue > 0 && createElement('div', { key: 'st', style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 } }, [
                createElement('span', { key: 'str', style: { color: 'var(--highlight)', fontSize: '1.2rem' } }, ratingStars),
                createElement('span', { key: 'val', style: { color: '#444', fontSize: '0.8rem' } }, `(${ratingValue})`)
            ]),
            hasReviewText && createElement('div', { key: 'rv', style: { fontStyle: 'italic', color: '#bbb', fontSize: '0.9rem', borderLeft: '2px solid var(--highlight)', paddingLeft: 10, marginTop: 10 } }, `"${item.review}"`)
        ]);
    };

    return createElement('div', { className: 'social-screen' }, [
        createElement('div', { key: 'h', className: 'social-header' }, [
            createElement('h2', { key: 't', style: { margin: 0, color: '#fff', letterSpacing: 2, fontSize: '1.8rem' } }, 'FEED SOCIAL'),
            createElement('div', { key: 'btns', style: { display: 'flex', gap: 15 } }, [
                createElement('button', { key: 'ref', className: 'btn-login', onClick: loadFeed, disabled: loading, style: { border: '1px solid #666', color: '#ccc', padding: '8px 15px' } }, loading ? '...' : '⟳ REFRESH'),
                createElement('button', { key: 'add', className: 'btn-login', onClick: () => setShowAddFriendsModal(true), style: { border: '1px solid #fff', color: '#fff' } }, '+ AMIGO')
            ])
        ]),

        createElement('div', { key: 'list', className: 'social-feed-list' }, [
            loading && createElement('div', { key: 'load', className: 'sorting-anim', style:{fontSize:'0.8rem'} }, 'Carregando atualizações...'),
            !loading && feed.length === 0 && createElement('div', { key: 'empty', className: 'search-empty', style: { border: '1px solid #333', padding: 40, marginTop: 40 } }, [
                createElement('h4', { key: 'et', style: { color: '#fff', margin: '0 0 15px 0', fontSize: '1.1rem' } }, 'Seu feed está vazio.'),
                createElement('p', { key: 'ed', style:{fontSize:'0.9rem', color: '#888', marginBottom: 20} }, 'Adicione amigos para ver o que eles estão assistindo e avaliando.'),
                createElement('button', { key: 'eb', className: 'btn-main', onClick: () => setShowAddFriendsModal(true), style: { width: '250px' } }, 'ADICIONAR AMIGO AGORA')
            ]),
            !loading && feed.map((item, idx) => {
                const movie = catalog[item.movie_id] || { titulo: "Filme Desconhecido" };
                return createElement('div', { key: item.timestamp + item.friend_email + idx, className: 'feed-card' }, [
                    createElement('div', { key: 'ur', style: { display: 'flex', alignItems: 'center', marginBottom: 10, cursor: 'pointer' }, onClick: () => onViewFriend(item.friend_email) }, [
                        createElement('div', {key: 'ac', style: {marginRight: 10}}, getAvatarUI(item.avatar, item.username, item.color, 'search-avatar')),
                        createElement('div', {key: 'ic'}, [
                            createElement('div', { style: { fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' } }, item.username.toUpperCase()),
                            createElement('div', { style: { fontSize: '0.7rem', color: '#666' } }, formatDate(item.timestamp))
                        ])
                    ]),
                    renderFeedContent(item, movie)
                ]);
            })
        ]),
        showAddFriendsModal && createElement(AddFriends, { key: 'adm', userEmail: user.email, followingList: user.following || [], onClose: () => setShowAddFriendsModal(false) })
    ]);
}