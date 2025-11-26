// ARQUIVO: src/components/MovieDetailModal.js
const React = window.React;
const { useState, createElement } = React;
import { Api } from '../api.js';
import { BUCKET_URL, formatRichText } from '../utils.js';

export default function MovieDetailModal({ movie, user, onClose, enableRating = false, onPlay, initialRating = 0, initialReview = "", isWatched = false }) {
    const [hoverStar, setHoverStar] = useState(0);
    const [selectedStar, setSelectedStar] = useState(initialRating || 0); 
    const [review, setReview] = useState(initialReview || "");
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const posterUrl = movie.id ? `${BUCKET_URL}/posters/${movie.id}.jpg` : null;

    const handleSend = async () => {
        if (selectedStar === 0 && !review) { onClose(); return; } 
        setLoading(true);
        try { 
            if(user) await Api.saveRating(user.email, movie.id, selectedStar, review); 
            onClose(); 
        } catch(e) { setLoading(false); }
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

    const stars = [1, 2, 3, 4, 5].map(star => {
        return createElement('span', {
            key: star,
            className: `star-icon ${(hoverStar || selectedStar) >= star ? 'active' : ''}`,
            onMouseEnter: () => setHoverStar(star),
            onMouseLeave: () => setHoverStar(0),
            onClick: () => setSelectedStar(star)
        }, '★');
    });

    const shouldUseLongText = isWatched && movie.detalhes && movie.detalhes.length > 5;
    const rawText = shouldUseLongText ? movie.detalhes : movie.descricao;
    
    const finalTitle = movie.titulo_detalhes ? movie.titulo_detalhes : 'FICHA TÉCNICA';
    const isBigText = rawText && rawText.length > 350;

    return createElement('div', { className: 'auth-modal', style: { background: 'rgba(0,0,0,0.95)', zIndex: 300 } },
        // AJUSTE: maxWidth reduzido para 550px (encurtado horizontalmente)
        createElement('div', { className: 'movie-card', style: { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', maxWidth: '550px', width: '95%' } },
            
            createElement('div', { style: { position: 'absolute', top: 20, right: 20, zIndex: 10 } }, 
                createElement('button', { className: 'btn-close-box', onClick: onClose, style: { background: 'rgba(0,0,0,0.8)', border: 'none', color: '#fff' } }, '✕')
            ),

            createElement('div', { style: { overflowY: 'auto', height: '100%' } }, [
                
                posterUrl && createElement('div', { key: 'banner',
                    style: { width: '100%', height: '450px', position: 'relative', backgroundColor: '#111' }
                }, [
                    createElement('img', {
                        src: posterUrl,
                        style: { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' },
                        onError: (e) => e.target.style.display = 'none' 
                    }),
                    // AJUSTE: Gradiente aumentado (altura total) e mais intenso
                    createElement('div', { key: 'grad', style: { 
                        position: 'absolute', bottom: 0, left: 0, width: '100%', height: '450px', 
                        background: 'linear-gradient(to bottom, transparent 0%, rgba(15,15,15,0.4) 40%, #0f0f0f 100%)' 
                    }})
                ]),

                createElement('div', { key: 'content', style: { padding: '20px 40px 40px 40px', marginTop: posterUrl ? '-60px' : '40px', position: 'relative' } }, [
                    
                    // AJUSTE: Título principal (h2) movido para CIMA do subtítulo (h3)
                    createElement('h2', { key: 'tit', style: { margin: '0 0 10px 0', fontSize: '2rem', color: '#fff', lineHeight: '1.1', textShadow: '0 2px 4px rgba(0,0,0,0.8)' } }, movie.titulo),
                    
                    createElement('h3', { key: 'sub', style: { margin: 0, marginBottom: 20, fontSize: '0.8rem', color: 'var(--highlight)', letterSpacing: 1, textTransform: 'uppercase', lineHeight: '1.4', textShadow: '0 2px 4px rgba(0,0,0,0.8)' } }, finalTitle),

                    createElement('div', { key: 'meta', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 25, fontSize: '0.8rem', color: '#888', borderBottom: '1px solid #333', paddingBottom: 20 } }, [
                        createElement('div', {key: 'dir'}, [createElement('strong', {key:'l'}, 'Diretor: '), movie.diretor]),
                        createElement('div', {key: 'ano'}, [createElement('strong', {key:'l'}, 'Ano: '), movie.ano]),
                        createElement('div', {key: 'pais'}, [createElement('strong', {key:'l'}, 'País: '), movie.pais || '-']),
                        createElement('div', {key: 'gen'}, [createElement('strong', {key:'l'}, 'Gênero: '), movie.genero || '-']),
                    ]),

                    createElement('div', { 
                        key: 'txt-container', 
                        style: { position: 'relative', marginBottom: 30, maxHeight: (isBigText && !expanded) ? '180px' : 'none', overflow: 'hidden', transition: 'max-height 0.3s ease' }
                    }, [
                        createElement('div', { key: 'txt-content', style: { lineHeight: '1.8', fontSize: '0.9rem', color: '#ddd', whiteSpace: 'pre-line' } }, formatRichText(rawText)),
                        (isBigText && !expanded) && createElement('div', { key: 'fade', style: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80px', background: 'linear-gradient(to bottom, transparent, #0f0f0f)' } })
                    ]),

                    isBigText && createElement('button', {
                        key: 'toggle-btn',
                        onClick: () => setExpanded(!expanded),
                        style: { background: 'transparent', border: 'none', color: 'var(--highlight)', fontSize: '0.8rem', cursor: 'pointer', marginBottom: 30, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, alignSelf: 'flex-start', padding: 0 }
                    }, expanded ? '↑ LER MENOS' : '↓ LER MAIS'),

                    onPlay && !enableRating && createElement('button', {
                        key: 'play-btn',
                        className: 'btn-main',
                        onClick: onPlay,
                        style: { marginBottom: 20, background: '#fff', color: '#000', border: 'none' }
                    }, '▶ ASSISTIR FILME'),

                    enableRating && createElement('div', { key: 'rating-area', style: { background: '#111', padding: 20, borderRadius: 8, border: '1px solid #333' } }, [
                        createElement('div', { key: 'rt-head', style: {textAlign: 'center', marginBottom: 10, fontSize: '0.9rem', color: 'var(--success)'} }, initialRating > 0 ? 'EDITAR AVALIAÇÃO' : 'SESSÃO FINALIZADA • AVALIE'),
                        createElement('div', { key: 'rt-stars', className: 'rating-stars', style: {marginTop: 0} }, stars),
                        createElement('textarea', {
                            key: 'rt-txt', className: 'rating-textarea', placeholder: 'O que achou deste curta?', value: review,
                            onChange: (e) => setReview(e.target.value), onKeyDown: handleKeyDown
                        }),
                        createElement('button', { key: 'rt-btn', className: 'btn-main', onClick: handleSend, disabled: loading }, loading ? '...' : 'SALVAR NO PERFIL')
                    ])
                ])
            ])
        )
    );
}