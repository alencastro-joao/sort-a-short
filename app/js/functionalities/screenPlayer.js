// Usando variáveis globais (sem import)
// PEGANDO DO GLOBAL
const React = window.React;
const { useState, useEffect, useRef } = React;
const { useParams, useNavigate } = window.ReactRouterDOM;

const DashPlayer = ({ url, isPlaying, startAt, onEnded }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (!url || !videoRef.current) return;
        const player = dashjs.MediaPlayer().create();
        player.initialize(videoRef.current, url, false);
        if (startAt > 0) player.seek(startAt);
        const vid = videoRef.current;
        const handleEnd = () => { if(onEnded) onEnded(); };
        vid.addEventListener('ended', handleEnd);
        return () => { vid.removeEventListener('ended', handleEnd); player.destroy(); };
    }, [url]);
    useEffect(() => { if (videoRef.current) isPlaying ? videoRef.current.play() : videoRef.current.pause(); }, [isPlaying]);
    return <video ref={videoRef} controls={true} controlsList="nodownload" style={{cursor: 'auto'}} />;
};

function ScreenPlayer({ fullCatalog, user }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [phase, setPhase] = useState('info'); 
    const [movie, setMovie] = useState(null);
    
    const [hoverStar, setHoverStar] = useState(0);
    const [selectedStar, setSelectedStar] = useState(0); 
    const [review, setReview] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if(fullCatalog && fullCatalog[id]) {
            const m = fullCatalog[id];
            const slug = id.toLowerCase().replace(/ /g, "_");
            setMovie({ ...m, id, videoUrl: `${BUCKET_URL}/videos/${slug}/playlist.mpd` });
        }
    }, [fullCatalog, id]);

    if(!movie) return null;

    const handleSendRating = async () => {
        if (selectedStar === 0 && !review) { navigate('/'); return; } 
        setSending(true);
        try {
            if(user) await Api.saveRating(user.email, movie.id, selectedStar, review);
            navigate('/'); 
        } catch(e) { console.error(e); setSending(false); }
    };

    return (
        <>
            <div className={`video-background ${phase !== 'playing' ? 'dimmed' : 'active'}`}>
                <DashPlayer 
                    url={movie.videoUrl} 
                    isPlaying={phase === 'playing'} 
                    startAt={movie.capaSeconds || 0} 
                    onEnded={() => setPhase('rating')} 
                />
            </div>

            <div className="ui-layer">
                {phase === 'info' && (
                    <div className="movie-card">
                        <div style={{fontSize: '0.7rem', color: '#cc0000', marginBottom: 15, letterSpacing: 2, fontWeight:'bold'}}>● SELEÇÃO</div>
                        <h2 className="card-title">{movie.titulo}</h2>
                        <span className="card-meta">{movie.ano} — {movie.diretor}</span>
                        <div className="card-desc">{movie.descricao || "..."}</div>
                        <button className="btn-main" onClick={() => setPhase('playing')}>ASSISTIR</button>
                    </div>
                )}

                {phase === 'rating' && (
                    <div className="movie-card" style={{textAlign:'center', padding: 40, maxWidth: 450}}>
                        <h3 style={{margin:0, fontSize:'0.8rem', color:'#888', letterSpacing: 2}}>FIM DA SESSÃO</h3>
                        <h2 style={{margin:'10px 0 0 0', fontSize:'1.8rem', color:'#fff'}}>{movie.titulo}</h2>
                        <div className="rating-stars">
                            {[1,2,3,4,5].map(star => (
                                <span key={star} 
                                      className={`star-icon ${(hoverStar || selectedStar) >= star ? 'active' : ''}`}
                                      onMouseEnter={() => setHoverStar(star)}
                                      onMouseLeave={() => setHoverStar(0)}
                                      onClick={() => setSelectedStar(star)}>★</span>
                            ))}
                        </div>
                        <textarea className="rating-textarea" placeholder="O que você achou?" value={review} onChange={(e) => setReview(e.target.value)} />
                        <button className="btn-main" onClick={handleSendRating} disabled={sending}>
                            {sending ? '...' : 'ENVIAR AVALIAÇÃO'}
                        </button>
                        <button className="btn-secondary" style={{marginTop: 10}} onClick={() => navigate('/')}>PULAR</button>
                    </div>
                )}
            </div>

            {phase !== 'rating' && <button className="btn-back-corner" onClick={() => navigate('/')}>MENU</button>}
        </>
    );
}

// Expor no escopo global para carregamento via <script>
window.ScreenPlayer = ScreenPlayer;
window.DashPlayer = DashPlayer;