// ARQUIVO: src/components/UserProfile.js
import { Api } from '../api.js';
import { AVATAR_COUNT, AVATAR_COLORS, getAvatarUI } from '../utils.js';
import FriendAction from './FriendAction.js';
import AddFriends from './FriendAdd.js';
import CollectionCard from './CollectionCard.js';
import CollectionDetail from './CollectionDetail.js';
import MovieDetailModal from './MovieDetailModal.js';

const React = window.React;
const { useState, useMemo, createElement } = React;

export default function UserProfile({ user, watchedList, reviewsList, catalog, collections, onClose, onLogout, onSelectMovie, onUpdateUser }) {
    const [editing, setEditing] = useState(false);
    const [tempName, setTempName] = useState(user.username || "");
    const [tempAvatar, setTempAvatar] = useState(user.avatar || 0);
    const [msg, setMsg] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('history');
    
    const [detailMovie, setDetailMovie] = useState(null);
    const [viewingCollection, setViewingCollection] = useState(null); 
    const [viewingProfile, setViewingProfile] = useState(null); 
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showAddFriends, setShowAddFriends] = useState(false);

    const isAdmin = user.email === 'oliveijao@gmail.com';
    const myFriends = user.friends || [];
    const safeWatchedList = watchedList || [];
    const activeUser = viewingProfile || { 
        username: user.username, email: user.email, avatar: user.avatar || 0, color: user.color || '#333', friend_code: user.friend_code
    };
    const activeWatched = viewingProfile ? (viewingProfile.watched || []) : safeWatchedList;
    const activeReviews = viewingProfile ? (viewingProfile.reviews || []) : reviewsList;

    const myUnlockedAvatars = useMemo(() => {
        if (viewingProfile) return [];
        if (!collections) return [];
        let unlocked = [];
        Object.keys(collections).forEach(key => {
            const col = collections[key];
            const allMovies = col.allMovies || [];
            const watchedCount = allMovies.filter(id => safeWatchedList.includes(id)).length;
            if (col.levels) col.levels.forEach(lvl => { if (watchedCount >= lvl.required) unlocked = [...unlocked, ...lvl.rewards]; });
        });
        return unlocked;
    }, [safeWatchedList, collections, catalog, viewingProfile]);

    const watchedMovies = activeWatched.map(id => catalog ? { id, ...catalog[id] } : null).filter(m => m !== null).reverse();
    const userReviews = activeReviews.map(r => {
        const movie = catalog ? catalog[r.movie_id] : null;
        return movie ? { ...r, title: movie.titulo } : null;
    }).filter(r => r !== null).reverse();

    const collectionList = useMemo(() => {
        if (!collections || !catalog) return [];
        return Object.keys(collections).map(key => ({ ...collections[key], id: key }));
    }, [collections, catalog]);

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
        setSearching(true);
        const profile = await Api.getProfile(otherUser.email);
        setViewingProfile({ username: otherUser.username, email: otherUser.email, watched: profile.watched, reviews: profile.reviews, avatar: profile.avatar || 0, color: profile.color || '#333' });
        setTab('history'); setSearching(false);
    };

    const handleBackToMe = () => { setViewingProfile(null); setTab('search'); };
    const handleCopyCode = () => { navigator.clipboard.writeText(activeUser.friend_code || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const openDetail = (movie) => { setDetailMovie(movie); };

    return createElement('div', { className: 'auth-modal' },
        createElement('div', { className: 'auth-box profile-box' }, [
            
            // *** NOVO FECHAR ABSOLUTO (APARECE QUANDO NÃO ESTÁ VISITANDO PERFIL) ***
            !viewingProfile && createElement('button', { className: 'btn-close-box btn-close-absolute', onClick: onClose }, '✕'),

            // --- HEADER (AGORA SÓ CONTEÚDO, SEM O BOTÃO 'X') ---
            createElement('div', { key: 'head', style: { display: 'flex', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: 20, marginBottom: 20, width: '100%' } }, [
                
                // Botão VOLTAR (SÓ APARECE SE ESTIVER VISITANDO PERFIL)
                viewingProfile && createElement('button', { key: 'back', className: 'btn-close-box', style: {marginRight: 20}, onClick: handleBackToMe }, '←'),

                createElement('div', { key: 'info', style: {flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 15} }, [
                    !editing && getAvatarUI(activeUser.avatar, activeUser.username, activeUser.color, 'avatar-large'),
                    createElement('div', { key: 'data', style: {flex: 1} }, [
                        viewingProfile && createElement('span', { key: 'vis', style: {background:'#222', color:'#888', fontSize:'0.6rem', padding:'2px 5px', display:'block', width:'fit-content', marginBottom:5} }, 'VISITANDO'),
                        createElement('div', { key: 'row', style: {display:'flex', alignItems:'center', justifyContent:'space-between'} }, [
                            createElement('div', { key: 'left' }, [
                                createElement('h2', { key: 'ti', style: { margin: 0, fontSize: '1.2rem', color: '#fff', letterSpacing: '2px' } }, viewingProfile ? 'PERFIL PÚBLICO' : 'MEU PERFIL'),
                                !viewingProfile ? (
                                    !editing ? createElement('div', { key: 'usr', style: {display:'flex', alignItems:'center', gap: 10} }, [
                                        createElement('span', { key: 'nm', style: { color: '#fff', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold' } }, activeUser.username ? activeUser.username.toUpperCase() : activeUser.email),
                                        createElement('button', { key: 'ed', onClick: () => setEditing(true), style: {background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:'0.7rem', textDecoration:'underline'} }, '[EDITAR]')
                                    ]) : createElement('div', { key: 'edt', style: {marginTop: 5} }, [
                                        createElement('input', { key: 'inp', className: 'auth-input', style:{margin:'0 0 10px 0', padding: '5px 10px'}, value: tempName, onChange: e => setTempName(e.target.value), placeholder: 'Nome...' }),
                                        createElement('div', { key: 'lbl', style:{color:'#666', fontSize:'0.7rem', marginBottom: 5} }, 'ESCOLHA UM AVATAR:'),
                                        createElement('div', { key: 'grd', className: 'avatar-grid' }, [
                                            createElement('div', { key: '0', className: `avatar-base avatar-letter avatar-option ${tempAvatar === 0 ? 'selected' : ''}`, style:{background: user.color || '#333', fontSize: '1.5rem'}, onClick: () => setTempAvatar(0) }, tempName ? tempName.charAt(0).toUpperCase() : '?'),
                                            Array.from({length: AVATAR_COUNT}, (_, i) => i + 1).map(num => createElement('img', { key: num, src: `/avatars/${num}.png`, className: `avatar-base avatar-option ${tempAvatar === num ? 'selected' : ''}`, onClick: () => setTempAvatar(num) })),
                                            myUnlockedAvatars.length > 0 && createElement('div', { key: 'sep', className: 'avatar-separator' }, 'DESBLOQUEADOS'),
                                            myUnlockedAvatars.map(num => createElement('img', { key: `u${num}`, src: `/avatars/${num}.png`, className: `avatar-base avatar-option ${tempAvatar === num ? 'selected' : ''}`, style:{borderColor: 'var(--success)'}, onClick: () => setTempAvatar(num) }))
                                        ]),
                                        createElement('div', { key: 'acts', style:{display:'flex', gap: 10} }, [
                                            createElement('button', { key: 's', onClick: handleSaveProfile, disabled: loading, style:{cursor:'pointer', background:'#fff', border:'none', padding:'5px 15px', fontWeight:'bold'} }, 'SALVAR'),
                                            createElement('button', { key: 'c', onClick: () => {setEditing(false); setMsg(null)}, style:{cursor:'pointer', background:'transparent', border:'1px solid #fff', color:'#fff', padding:'5px 15px'} }, 'CANCELAR')
                                        ])
                                    ])
                                ) : createElement('span', { key: 'vnm', style: { color: '#fff', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold' } }, activeUser.username ? activeUser.username.toUpperCase() : "USUÁRIO"),
                                !viewingProfile && !editing && createElement('div', { key: 'cod', className: 'user-code-box' }, [
                                    createElement('span', { key: 'txt', className: 'user-code-text' }, `#${activeUser.friend_code || "..."}`),
                                    createElement('button', { key: 'cpy', className: `btn-copy-code ${copied ? 'copied' : ''}`, onClick: handleCopyCode }, copied ? '✓' : '❐')
                                ])
                            ]),
                            viewingProfile && createElement(FriendAction, { 
                                key: 'fa', 
                                currentUserEmail: user.email, 
                                targetUserEmail: viewingProfile.email,
                                alreadyFriend: myFriends.includes(viewingProfile.email)
                            })
                        ])
                    ])
                ])
            ]),

            // --- CORPO ---
            createElement('div', { key: 'body', style: { display: 'flex', gap: 40, flexWrap: 'wrap', width: '100%', flex: 1, minHeight: 0 } }, [
                createElement('div', { key: 'side', style: { flex: '1 1 200px', display:'flex', flexDirection:'column' } }, [
                    createElement('div', { key: 'sts', style:{display:'flex', gap: 10} }, [
                        createElement('div', { className: 'stat-box', style:{flex:1} }, [createElement('div', {className:'stat-label'}, 'Vistos'), createElement('div', {className:'stat-value'}, activeWatched.length)]),
                        createElement('div', { className: 'stat-box', style:{flex:1} }, [createElement('div', {className:'stat-label'}, 'Avaliados'), createElement('div', {className:'stat-value'}, activeReviews.length)])
                    ]),
                    (!viewingProfile && isAdmin) && createElement('button', { className: 'btn-secondary', onClick: () => Api.devRefill(user.email).then(onUpdateUser), style:{marginTop: 10, borderColor: 'var(--success)', color: 'var(--success)'} }, '⚡ RECARGA RÁPIDA'),
                    !viewingProfile && createElement('button', { className: 'btn-secondary', onClick: onLogout, style:{marginTop: 10} }, 'SAIR')
                ]),

                createElement('div', { key: 'main', style: { flex: '2 1 300px', display:'flex', flexDirection:'column', minHeight: 0 } }, [
                    createElement('div', { key: 'tabs', className: 'tab-header' }, [
                        createElement('button', { className: `tab-btn ${tab === 'history' ? 'active' : ''}`, onClick: () => { setTab('history'); setViewingCollection(null); } }, 'HISTÓRICO'),
                        !viewingProfile && createElement('button', { className: `tab-btn ${tab === 'collections' ? 'active' : ''}`, onClick: () => { setTab('collections'); setViewingCollection(null); } }, 'COLEÇÕES'),
                        createElement('button', { className: `tab-btn ${tab === 'reviews' ? 'active' : ''}`, onClick: () => { setTab('reviews'); setViewingCollection(null); } }, 'AVALIAÇÕES'),
                        !viewingProfile && createElement('button', { className: `tab-btn ${tab === 'search' ? 'active' : ''}`, onClick: () => { setTab('search'); setViewingCollection(null); } }, 'PESQUISAR')
                    ]),
                    createElement('div', { key: 'cnt', style:{overflowY: 'auto', flex: 1, paddingRight: 10} }, [
                        tab === 'history' && createElement('div', { className: 'profile-grid' }, [
                            watchedMovies.length === 0 && createElement('div', { className: 'search-empty' }, 'Nenhum filme assistido.'),
                            watchedMovies.map((m, i) => createElement('div', { key: i, className: 'profile-movie-item' }, [
                                createElement('div', { style: { flex: 1, cursor: viewingProfile ? 'default' : 'pointer' }, onClick: () => !viewingProfile ? openDetail(m) : null }, [
                                    createElement('div', { style: { fontSize: '0.65rem', color: '#666' } }, m.ano),
                                    createElement('div', { style: { fontSize: '0.8rem', fontWeight: 'bold', marginTop: 5, color: '#ddd' } }, m.titulo)
                                ]),
                                createElement('button', { className: 'btn-info-icon', onClick: (e) => { e.stopPropagation(); openDetail(m); }, title: 'Ver Detalhes' }, 'i')
                            ]))
                        ]),
                        tab === 'collections' && !viewingProfile && (viewingCollection ? createElement(CollectionDetail, { collection: viewingCollection, watchedList: safeWatchedList, catalog, onBack: () => setViewingCollection(null) }) : createElement('div', {}, collectionList.map(col => createElement(CollectionCard, { key: col.id, collection: col, watchedList: safeWatchedList, onClick: () => setViewingCollection(col) })))),
                        tab === 'reviews' && createElement('div', {}, [
                            userReviews.length === 0 && createElement('div', { className: 'search-empty' }, 'Nenhuma avaliação feita.'),
                            userReviews.map((r, idx) => createElement('div', { key: idx, style: { background: '#080808', padding: 15, border: '1px solid #222', marginBottom: 10 } }, [
                                createElement('div', { style:{display:'flex', justifyContent:'space-between'} }, [createElement('span', { style:{fontWeight:'bold', color:'#fff'} }, r.title), createElement('span', { style:{color: 'var(--highlight)'} }, `★ ${r.rating}`)]),
                                r.review && createElement('div', { style:{color:'#888', fontSize:'0.8rem', marginTop: 5, borderLeft: '2px solid #333', paddingLeft: 10} }, `"${r.review}"`)
                            ]))
                        ]),
                        
                        tab === 'search' && !viewingProfile && createElement('div', {}, [
                            createElement('div', { style:{display:'flex', gap: 10, marginBottom: 20} }, [
                                createElement('input', { className: 'auth-input', style:{marginBottom:0}, placeholder: 'Buscar usuário...', value: searchQuery, onChange: e => setSearchQuery(e.target.value), onKeyDown: e => e.key === 'Enter' && handleSearch() }),
                                createElement('button', { className: 'btn-main', style:{width:'auto'}, onClick: handleSearch }, searching ? '...' : 'BUSCAR'),
                                createElement('button', { className: 'btn-login', onClick: () => setShowAddFriends(true), style:{border:'1px solid #666', color:'#ccc'} }, '+ AMIGO')
                            ]),
                            showAddFriends && createElement(AddFriends, { userEmail: user.email, onClose: () => setShowAddFriends(false) }),
                            createElement('div', { key: 'res' }, [
                                searchResults.map((res, idx) => {
                                    const isMe = res.email === user.email;
                                    
                                    return createElement('div', { key: idx, className: 'search-result-item', onClick: () => handleViewUser(res) }, [
                                        createElement('div', { style:{display:'flex', alignItems:'center'} }, [getAvatarUI(res.avatar, res.username, res.color, 'search-avatar'), createElement('div', {}, [createElement('div', {style:{fontWeight:'bold', color:'#fff'}}, res.username.toUpperCase()), createElement('div', {style:{fontSize:'0.7rem', color:'#666'}}, 'Usuário')])]),
                                        createElement('div', { style:{display:'flex', gap:10, alignItems:'center'} }, [
                                            createElement('span', {className:'search-btn-action'}, 'VER PERFIL →'),
                                            !isMe && createElement(FriendAction, { 
                                                currentUserEmail: user.email, 
                                                targetUserEmail: res.email,
                                                alreadyFriend: myFriends.includes(res.email) 
                                            })
                                        ])
                                    ]);
                                })
                            ])
                        ])
                    ])
                ])
            ]),
            detailMovie && createElement(MovieDetailModal, { movie: detailMovie, user: user, onClose: () => setDetailMovie(null), enableRating: false, onPlay: !viewingProfile ? () => { setDetailMovie(null); onSelectMovie(detailMovie.id); } : null })
        ])
    );
}