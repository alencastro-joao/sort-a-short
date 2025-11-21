// Usando variáveis globais (sem import)
// PEGANDO DO GLOBAL
const React = window.React;
const { useState } = React;
const { useNavigate } = window.ReactRouterDOM;

function ScreenProfile({ user, watchedList, reviewsList, catalog, onClose, onLogout, onUpdateUser }) {
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [tempName, setTempName] = useState(user.username || "");
    const [msg, setMsg] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('history');

    const watchedMovies = watchedList.map(id => catalog ? { id, ...catalog[id] } : null).filter(m => m !== null).reverse();
    const userReviews = (reviewsList || []).map(r => {
        const movie = catalog ? catalog[r.movie_id] : null;
        return movie ? { ...r, title: movie.titulo } : null;
    }).filter(r => r !== null).reverse();

    const handleSaveName = async () => {
        if(!tempName.trim()) return;
        setLoading(true); setMsg(null);
        try {
            await Api.saveUsername(user.email, tempName);
            Api.updateLocalUser(tempName);
            onUpdateUser(); setEditing(false);
        } catch (e) { setMsg({ type: 'error', text: e.message }); }
        setLoading(false);
    };

    const handleReplay = (movieId) => {
        onClose(); 
        navigate(`/assistir/${movieId}`);
    };

    return (
        <div className="auth-modal">
            <div className="auth-box profile-box">
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: 20, marginBottom: 20, width: '100%' }}>
                    <button className="btn-close-box" style={{marginRight: 20}} onClick={onClose}>✕</button>
                    <div style={{flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 15}}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', letterSpacing: '2px' }}>PERFIL</h2>
                        {!editing ? (
                            <div style={{display:'flex', alignItems:'center', gap: 10}}>
                                <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold' }}>
                                    {user.username ? user.username.toUpperCase() : user.email}
                                </span>
                                <button onClick={() => setEditing(true)} style={{background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:'0.7rem', textDecoration:'underline'}}>[EDITAR]</button>
                            </div>
                        ) : (
                            <div style={{display:'flex', gap: 10, alignItems:'center'}}>
                                <input className="auth-input" style={{margin:0, padding: '5px 10px', width: 150}} value={tempName} onChange={e => setTempName(e.target.value)} placeholder="Novo nome..." />
                                <button onClick={handleSaveName} disabled={loading} style={{cursor:'pointer', background:'#fff', border:'none', padding:'5px 10px', fontWeight:'bold'}}>OK</button>
                                <button onClick={() => {setEditing(false); setMsg(null)}} style={{cursor:'pointer', background:'transparent', border:'1px solid #fff', color:'#fff', padding:'5px 10px'}}>X</button>
                            </div>
                        )}
                    </div>
                </div>
                {msg && <div className={msg.type === 'error' ? 'auth-error' : 'auth-success'} style={{marginBottom: 20}}>{msg.text}</div>}

                <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', width: '100%', flex: 1, minHeight: 0 }}>
                    <div style={{ flex: '1 1 200px', display:'flex', flexDirection:'column' }}>
                        <div style={{display:'flex', gap: 10}}>
                            <div className="stat-box" style={{flex:1}}>
                                <div className="stat-label">Vistos</div>
                                <div className="stat-value">{watchedList.length}</div>
                            </div>
                            <div className="stat-box" style={{flex:1}}>
                                <div className="stat-label">Avaliados</div>
                                <div className="stat-value">{reviewsList ? reviewsList.length : 0}</div>
                            </div>
                        </div>
                        <button className="btn-secondary" onClick={onLogout} style={{marginTop: 10}}>SAIR</button>
                    </div>

                    <div style={{ flex: '2 1 300px', display:'flex', flexDirection:'column', minHeight: 0 }}>
                        <div className="tab-header">
                            <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>HISTÓRICO</button>
                            <button className={`tab-btn ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>AVALIAÇÕES</button>
                        </div>
                        <div style={{overflowY: 'auto', flex: 1, paddingRight: 10}}>
                            {tab === 'history' && watchedMovies.map((movie, index) => (
                                <div key={index} className="profile-movie-item" onClick={() => handleReplay(movie.id)}>
                                    <div style={{ fontSize: '0.65rem', color: '#666' }}>{movie.ano}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: 5, lineHeight: 1.2, color: '#ddd' }}>{movie.titulo}</div>
                                </div>
                            ))}
                            {tab === 'reviews' && userReviews.map((r, idx) => (
                                <div key={idx} style={{ background: '#080808', padding: 15, border: '1px solid #222', marginBottom: 10 }}>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <span style={{fontWeight:'bold', color: '#fff'}}>{r.title}</span>
                                        <span style={{color: 'var(--highlight)'}}>★ {r.rating}</span>
                                    </div>
                                    {r.review && <div style={{color:'#888', fontSize:'0.8rem', marginTop: 5, borderLeft: '2px solid #333', paddingLeft: 10}}>"{r.review}"</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Exporta globalmente
window.ScreenProfile = ScreenProfile;