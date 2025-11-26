// ARQUIVO: src/components/UserProfile.js
import { Api } from '../api.js';
import { AVATAR_COUNT, AVATAR_COLORS, getAvatarUI } from '../utils.js';
import FollowAction from './FollowAction.js';
import FollowListModal from './FollowListModal.js';
import AddFriends from './AddFriends.js';
import CollectionCard from './CollectionCard.js';
import CollectionDetail from './CollectionDetail.js';
import MovieDetailModal from './MovieDetailModal.js';

const React = window.React;
const { useState, useMemo, createElement, useEffect } = React;

export default function UserProfile({ user, watchedList, reviewsList, catalog, collections, onClose, onLogout, onSelectMovie, onUpdateUser, initialVisitorEmail, clearVisitorEmail }) {
    const [editing, setEditing] = useState(false);
    const [tempName, setTempName] = useState(user.username || "");
    const [tempAvatar, setTempAvatar] = useState(user.avatar || 0);
    const [msg, setMsg] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('history');
    const [colFilter, setColFilter] = useState('all');
    const [detailMovie, setDetailMovie] = useState(null);
    const [editingReview, setEditingReview] = useState(null); 
    const [viewingCollection, setViewingCollection] = useState(null); 
    const [viewingProfile, setViewingProfile] = useState(null); 
    const [showListType, setShowListType] = useState(null); 
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showAddFriends, setShowAddFriends] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (initialVisitorEmail && !viewingProfile) {
            handleViewUser({ email: initialVisitorEmail });
            clearVisitorEmail();
        }
    }, [initialVisitorEmail]); 

    const isAdmin = user.email === 'oliveijao@gmail.com';
    const myFollowing = user.following || [];
    const myFollowers = user.followers || [];

    const activeUser = viewingProfile || { 
        username: user.username, email: user.email, avatar: user.avatar || 0, color: user.color || '#333', friend_code: user.friend_code,
        following: myFollowing, followers: myFollowers
    };
    const activeWatched = viewingProfile ? (viewingProfile.watched || []) : watchedList;
    const activeReviews = viewingProfile ? (viewingProfile.reviews || []) : reviewsList;

    const displayFollowingCount = viewingProfile ? (viewingProfile.following || []).length : myFollowing.length;
    const displayFollowersCount = viewingProfile ? (viewingProfile.followers || []).length : myFollowers.length;

    const myUnlockedAvatars = useMemo(() => {
        if (viewingProfile) return [];
        if (!collections) return [];
        let unlocked = [];
        Object.keys(collections).forEach(key => {
            const col = collections[key];
            const allMovies = col.allMovies || [];
            const watchedCount = allMovies.filter(id => watchedList.includes(id)).length;
            if (col.levels) col.levels.forEach(lvl => { if (watchedCount >= lvl.required) unlocked = [...unlocked, ...lvl.rewards]; });
        });
        return [...new Set(unlocked)]; 
    }, [watchedList, collections, catalog, viewingProfile]);

    const watchedMovies = activeWatched.map(id => catalog ? { id, ...catalog[id] } : null).filter(m => m !== null).reverse();
    const userReviews = activeReviews.map(r => {
        const movie = catalog ? catalog[r.movie_id] : null;
        return movie ? { ...r, title: movie.titulo, id: r.movie_id } : null;
    }).filter(r => r !== null).reverse();

    const safeWatchedList = watchedList || []; 

    // --- CORREÇÃO DO FILTRO ---
    const filteredCollectionList = useMemo(() => {
        if (!collections || !catalog) return [];
        const list = Object.keys(collections).map(key => ({ ...collections[key], id: key }));
        
        if (colFilter === 'all') return list;
        
        return list.filter(col => {
            const allMovies = col.allMovies || [];
            const myWatchedCount = allMovies.filter(id => safeWatchedList.includes(id)).length;
            
            if (colFilter === 'completed') {
                if (col.levels && col.levels.length > 0) { return myWatchedCount >= col.levels[0].required; }
                return allMovies.length > 0 && myWatchedCount >= allMovies.length;
            }
            
            // AGORA LÊ O TIPO DIRETO DO JSON
            const type = col.type || 'other'; 
            return type === colFilter;
        });
    }, [collections, catalog, colFilter, watchedList]);

    const handleSaveProfile = async () => {
        if(!tempName.trim()) return;
        setLoading(true); setMsg(null);
        try {
            let colorToSend = user.color || AVATAR_COLORS[0];
            await Api.saveProfile(user.email, tempName, tempAvatar, colorToSend);
            Api.updateLocalUser(tempName, tempAvatar, colorToSend);
            onUpdateUser(); setEditing(false);
        } catch (e) { setMsg({ type: 'error', text: e.message }); }
        setLoading(false);
    };

    const handleSearch = async () => {
        if(searchQuery.length < 2) return;
        setSearching(true);
        const results = await Api.searchUsers(searchQuery);
        setSearchResults(results);
        setSearching(false);
    };

    const handleViewUser = async (otherUser) => {
        setShowListType(null); // Fecha lista ao trocar de perfil
        setSearching(true);
        const profile = await Api.getProfile(otherUser.email);
        setViewingProfile({ 
            username: otherUser.username, email: otherUser.email, 
            watched: profile.watched, reviews: profile.reviews, 
            avatar: profile.avatar || 0, color: profile.color || '#333',
            following: profile.following || [], followers: profile.followers || []
        });
        setTab('history'); setSearching(false);
    };

    const handleBackToMe = () => { setViewingProfile(null); setTab('search'); };
    const handleCopyCode = () => { navigator.clipboard.writeText(activeUser.friend_code || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const openDetail = (movie) => { setDetailMovie(movie); setEditingReview(null); };
    const openEdit = (reviewItem) => {
        const movieData = catalog[reviewItem.id];
        if (movieData) { setDetailMovie({ ...movieData, id: reviewItem.id }); setEditingReview({ rating: parseFloat(reviewItem.rating), review: reviewItem.review }); }
    };
    const handleDeleteReview = async (reviewItem) => { if(!confirm("Apagar?")) return; await Api.deleteRating(user.email, reviewItem.id); onUpdateUser(); };
    const handleCloseDetail = () => { setDetailMovie(null); setEditingReview(null); if (!viewingProfile) onUpdateUser(); };

    return createElement('div', { className: 'auth-modal' },
        createElement('div', { className: 'auth-box profile-box' }, [
            !viewingProfile && createElement('button', { className: 'btn-close-box', onClick: onClose }, '✕'),
            viewingProfile && createElement('button', { className: 'btn-back-box', onClick: handleBackToMe }, '←'),

            createElement('div', { key: 'head', style: { display: 'flex', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: 20, marginBottom: 20, width: '100%' } }, [
                createElement('div', { key: 'info', style: {flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 15} }, [
                    !editing && getAvatarUI(activeUser.avatar, activeUser.username, activeUser.color, 'avatar-large'),
                    createElement('div', { key: 'data', style: {flex: 1} }, [
                        viewingProfile && createElement('span', { key: 'vis', style: {background:'#222', color:'#888', fontSize:'0.6rem', padding:'2px 5px', display:'block', width:'fit-content', marginBottom:5} }, 'VISITANDO'),
                        createElement('div', { key: 'row', style: {display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap'} }, [
                            createElement('div', { key: 'left' }, [
                                !editing ? (
                                    createElement('div', {}, [
                                        createElement('h2', { style: { margin: 0, fontSize: '1.8rem', color: '#fff', letterSpacing: '1px', lineHeight: 1 } }, 
                                            activeUser.username ? activeUser.username.toUpperCase() : "USUÁRIO"
                                        ),
                                        !viewingProfile && createElement('button', { onClick: () => setEditing(true), style: {background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:'0.7rem', marginTop: 5, textDecoration:'underline'} }, 'EDITAR PERFIL')
                                    ])
                                ) : (
                                    createElement('div', { key: 'edt', style: {marginTop: 5} }, [
                                        createElement('input', { className: 'auth-input', style:{margin:'0 0 10px 0', padding: '5px'}, value: tempName, onChange: e => setTempName(e.target.value), placeholder: 'Nome...' }),
                                        createElement('div', { style:{color:'#666', fontSize:'0.7rem', marginBottom: 5} }, 'AVATAR:'),
                                        createElement('div', { className: 'avatar-grid' }, [
                                            Array.from({length: AVATAR_COUNT}, (_, i) => i + 1).map(num => createElement('img', { key: num, src: `/avatars/${num}.png`, className: `avatar-base avatar-option ${tempAvatar === num ? 'selected' : ''}`, onClick: () => setTempAvatar(num) })),
                                            myUnlockedAvatars.map(num => createElement('img', { key: `u${num}`, src: `/avatars/${num}.png`, className: `avatar-base avatar-option ${tempAvatar === num ? 'selected' : ''}`, style:{borderColor: 'var(--success)'}, onClick: () => setTempAvatar(num) }))
                                        ]),
                                        createElement('div', { style:{display:'flex', gap: 10} }, [
                                            createElement('button', { onClick: handleSaveProfile, disabled: loading, style:{cursor:'pointer', background:'#fff', border:'none', padding:'5px 15px', fontWeight:'bold'} }, 'SALVAR'),
                                            createElement('button', { onClick: () => {setEditing(false); setMsg(null)}, style:{cursor:'pointer', background:'transparent', border:'1px solid #fff', color:'#fff', padding:'5px 15px'} }, 'CANCELAR')
                                        ])
                                    ])
                                ),
                                !editing && createElement('div', { style: { marginTop: 10 } }, [
                                    !viewingProfile && createElement('div', { className: 'user-code-box', style:{marginBottom: 10} }, [
                                        createElement('span', { className: 'user-code-text' }, `#${activeUser.friend_code || "..."}`),
                                        createElement('button', { className: `btn-copy-code ${copied ? 'copied' : ''}`, onClick: handleCopyCode }, copied ? '✓' : '❐')
                                    ]),
                                    createElement('div', { style: { display:'flex', gap: 15, fontSize: '0.8rem' } }, [
                                        createElement('span', { style: { cursor: 'pointer', color: '#ccc' }, onClick: () => setShowListType('following') }, [createElement('strong', {style:{color:'#fff'}}, displayFollowingCount), ' Seguindo']),
                                        createElement('span', { style: { cursor: 'pointer', color: '#ccc' }, onClick: () => setShowListType('followers') }, [createElement('strong', {style:{color:'#fff'}}, displayFollowersCount), ' Seguidores'])
                                    ])
                                ])
                            ]),
                            viewingProfile && createElement(FollowAction, { currentUserEmail: user.email, targetUserEmail: viewingProfile.email, isFollowing: myFollowing.includes(viewingProfile.email), onUpdate: onUpdateUser })
                        ])
                    ])
                ])
            ]),
            createElement('div', { key: 'body', className: 'profile-body' }, [
                createElement('div', { key: 'side', className: 'profile-sidebar' }, [
                    createElement('div', { key: 'sts', style:{display:'flex', gap: 10} }, [
                        createElement('div', { className: 'stat-box', style:{flex:1} }, [createElement('div', {className:'stat-label'}, 'Vistos'), createElement('div', {className:'stat-value'}, activeWatched.length)]),
                        createElement('div', { className: 'stat-box', style:{flex:1} }, [createElement('div', {className:'stat-label'}, 'Avaliados'), createElement('div', {className:'stat-value'}, activeReviews.length)])
                    ]),
                    (!viewingProfile && isAdmin) && createElement('button', { className: 'btn-secondary', onClick: () => Api.devRefill(user.email).then(onUpdateUser), style:{marginTop: 10, borderColor: 'var(--success)', color: 'var(--success)'} }, '⚡ RECARGA'),
                    !viewingProfile && createElement('button', { className: 'btn-secondary', onClick: onLogout, style:{marginTop: 10} }, 'SAIR')
                ]),
                createElement('div', { key: 'main', className: 'profile-main' }, [
                    createElement('div', { key: 'tabs', className: 'tab-header' }, [
                        createElement('button', { key: 't1', className: `tab-btn ${tab === 'history' ? 'active' : ''}`, onClick: () => { setTab('history'); setViewingCollection(null); } }, 'HISTÓRICO'),
                        !viewingProfile && createElement('button', { key: 't2', className: `tab-btn ${tab === 'collections' ? 'active' : ''}`, onClick: () => { setTab('collections'); setViewingCollection(null); } }, 'COLEÇÕES'),
                        createElement('button', { key: 't3', className: `tab-btn ${tab === 'reviews' ? 'active' : ''}`, onClick: () => { setTab('reviews'); setViewingCollection(null); } }, 'AVALIAÇÕES'),
                        !viewingProfile && createElement('button', { key: 't4', className: `tab-btn ${tab === 'search' ? 'active' : ''}`, onClick: () => { setTab('search'); setViewingCollection(null); } }, 'BUSCAR')
                    ]),
                    createElement('div', { key: 'cnt', style:{overflowY: 'auto', flex: 1, paddingRight: 10} }, [
                        tab === 'history' && createElement('div', { className: 'profile-grid' }, [
                            watchedMovies.map((m, i) => createElement('div', { key: m.id, className: 'profile-movie-item' }, [
                                createElement('div', { style: { flex: 1, cursor: viewingProfile ? 'default' : 'pointer' }, onClick: () => !viewingProfile ? openDetail(m) : null }, [
                                    createElement('div', { style: { fontSize: '0.65rem', color: '#666' } }, m.ano),
                                    createElement('div', { style: { fontSize: '0.8rem', fontWeight: 'bold', marginTop: 5, color: '#ddd' } }, m.titulo)
                                ]),
                                createElement('button', { className: 'btn-info-icon', onClick: (e) => { e.stopPropagation(); openDetail(m); } }, 'i')
                            ]))
                        ]),
                        tab === 'collections' && !viewingProfile && (viewingCollection 
                            ? createElement(CollectionDetail, { key: 'cd', collection: viewingCollection, watchedList: safeWatchedList, catalog, onBack: () => setViewingCollection(null), onMovieClick: (id) => openDetail({ ...catalog[id], id }) }) 
                            : createElement('div', { key: 'col-main' }, [
                                createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', paddingBottom: 5 } }, [
                                    { id: 'all', label: 'TODOS' }, { id: 'studio', label: 'ESTÚDIOS' }, { id: 'director', label: 'DIRETORES' }, { id: 'completed', label: 'CONQUISTAS' } 
                                ].map(f => createElement('button', { key: f.id, onClick: () => setColFilter(f.id), style: { background: colFilter === f.id ? 'var(--highlight)' : 'transparent', color: colFilter === f.id ? '#fff' : '#666', border: `1px solid ${colFilter === f.id ? 'var(--highlight)' : '#333'}`, borderRadius: '20px', padding: '5px 15px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' } }, f.label))),
                                createElement('div', {}, filteredCollectionList.length > 0 ? filteredCollectionList.map(col => createElement(CollectionCard, { key: col.id, collection: col, watchedList: safeWatchedList, onClick: () => setViewingCollection(col) })) : createElement('div', { className: 'search-empty' }, 'Nada aqui.'))
                            ])
                        ),
                        tab === 'reviews' && createElement('div', {}, [
                            userReviews.map((r, idx) => createElement('div', { key: idx, style: { background: '#080808', padding: 15, border: '1px solid #222', marginBottom: 10 } }, [
                                createElement('div', { style:{display:'flex', justifyContent:'space-between'} }, [createElement('span', {style:{fontWeight:'bold', color:'#fff'}}, r.title), createElement('span', {style:{color:'var(--highlight)'}}, `★ ${r.rating}`)]),
                                r.review && createElement('div', { style:{color:'#888', fontSize:'0.8rem', marginTop: 5} }, `"${r.review}"`)
                            ]))
                        ]),
                        tab === 'search' && !viewingProfile && createElement('div', {}, [
                            createElement('div', { style:{display:'flex', gap: 10, marginBottom: 20} }, [
                                createElement('input', { className: 'auth-input', style:{marginBottom:0}, placeholder: 'Buscar...', value: searchQuery, onChange: e => setSearchQuery(e.target.value), onKeyDown: e => e.key === 'Enter' && handleSearch() }),
                                createElement('button', { className: 'btn-main', style:{width:'auto'}, onClick: handleSearch }, searching ? '...' : 'BUSCAR'),
                                createElement('button', { className: 'btn-login', onClick: () => setShowAddFriends(true), style:{border:'1px solid #666', color:'#ccc'} }, '+ AMIGO')
                            ]),
                            showAddFriends && createElement(AddFriends, { userEmail: user.email, followingList: myFollowing, onClose: () => setShowAddFriends(false) }),
                            createElement('div', {}, [
                                searchResults.map((res, idx) => createElement('div', { key: res.email, className: 'search-result-item', onClick: () => handleViewUser(res) }, [
                                    createElement('div', { style:{display:'flex', alignItems:'center'} }, [getAvatarUI(res.avatar, res.username, res.color, 'search-avatar'), createElement('div', {style:{fontWeight:'bold', color:'#fff'}}, res.username.toUpperCase())]),
                                    !isAdmin && createElement(FollowAction, { currentUserEmail: user.email, targetUserEmail: res.email, isFollowing: myFollowing.includes(res.email), onUpdate: onUpdateUser })
                                ]))
                            ])
                        ])
                    ])
                ])
            ]),
            detailMovie && createElement(MovieDetailModal, { key: detailMovie.id, movie: detailMovie, user: user, onClose: handleCloseDetail, enableRating: !!editingReview, initialRating: editingReview ? editingReview.rating : 0, initialReview: editingReview ? editingReview.review : "", isWatched: safeWatchedList.includes(detailMovie.id), onPlay: (!viewingProfile && !editingReview && safeWatchedList.includes(detailMovie.id)) ? () => { setDetailMovie(null); onSelectMovie(detailMovie.id); } : null }),
            
            showListType && createElement(FollowListModal, { title: showListType === 'following' ? 'SEGUINDO' : 'SEGUIDORES', listEmails: showListType === 'following' ? (viewingProfile ? viewingProfile.following : myFollowing) : (viewingProfile ? viewingProfile.followers : myFollowers), currentUser: user, onClose: () => setShowListType(null), onUpdate: onUpdateUser, onViewProfile: handleViewUser })
        ])
    );
}