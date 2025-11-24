// ARQUIVO: src/components/MovieDetailModal.js
const React = window.React;
const { useState, createElement } = React;
import { Api } from '../api.js';

export default function MovieDetailModal({ movie, user, onClose, enableRating = false, onPlay }) {
    const [hoverStar, setHoverStar] = useState(0);
    const [selectedStar, setSelectedStar] = useState(0); 
    const [review, setReview] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Estado para controlar se o texto está expandido ou recolhido
    const [expanded, setExpanded] = useState(false);

    // Formata o texto (Negrito ** e Quebras de linha)
    const formatText = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, i) => {
            if (!line.trim()) return createElement('br', { key: i });
            const parts = line.split('**');
            const formattedLine = parts.map((part, index) => {
                if (index % 2 === 1) return createElement('strong', { key: index, style: { color: '#fff' } }, part);
                return part;
            });
            return createElement('p', { key: i, style: { margin: '0 0 10px 0' } }, formattedLine);
        });
    };

    const handleSend = async () => {
        if (selectedStar === 0 && !review) { onClose(); return; } 
        setLoading(true);
        try { 
            if(user) await Api.saveRating(user.email, movie.id, selectedStar, review); 
            onClose(); 
        } catch(e) { 
            setLoading(false); 
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const stars = [1, 2, 3, 4, 5].map(star => {
        return createElement('span', {
            key: star,
            className: `star-icon ${(hoverStar || selectedStar) >= star ? 'active' : ''}`,
            onMouseEnter: () => setHoverStar(star),
            onMouseLeave: () => setHoverStar(0),
            onClick: () => setSelectedStar(star)
        }, '★');
    });

    // Lógica de Texto
    const hasLongText = movie.detalhes && movie.detalhes.length > 5;
    const rawText = hasLongText ? movie.detalhes : movie.descricao;
    
    // O Título do texto (se existir)
    const articleTitle = movie.titulo_detalhes || null;

    // Lógica de "Ler Mais" - Limite de caracteres
    const isBigText = rawText && rawText.length > 350;

    return createElement('div', { className: 'auth-modal', style: { background: 'rgba(0,0,0,0.95)', zIndex: 300 } },
        createElement('div', { className: 'movie-card', style: { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', maxWidth: '600px' } },
            
            // --- CABEÇALHO (Fechar) ---
            createElement('div', { style: { padding: 20, display: 'flex', justifyContent: 'flex-end' } }, 
                createElement('button', { className: 'btn-close-box', onClick: onClose }, '✕')
            ),

            // --- CONTEÚDO COM SCROLL ---
            createElement('div', { style: { padding: '0 40px 40px 40px', overflowY: 'auto' } }, [
                
                // Título Fixo da Seção (Vermelho)
                createElement('h3', { key: 'sub', style: { margin: 0, fontSize: '0.8rem', color: 'var(--highlight)', letterSpacing: 1, textTransform: 'uppercase', lineHeight: '1.4' } }, 'FICHA TÉCNICA'),
                
                // Título do Filme (Grande)
                createElement('h2', { key: 'tit', style: { margin: '10px 0 20px 0', fontSize: '2rem', color: '#fff', lineHeight: '1.1' } }, movie.titulo),

                // Metadados (Grid)
                createElement('div', { key: 'meta', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 25, fontSize: '0.8rem', color: '#888', borderBottom: '1px solid #333', paddingBottom: 20 } }, [
                    createElement('div', {}, [createElement('strong', {style:{color:'#ccc'}}, 'Diretor: '), movie.diretor]),
                    createElement('div', {}, [createElement('strong', {style:{color:'#ccc'}}, 'Ano: '), movie.ano]),
                    createElement('div', {}, [createElement('strong', {style:{color:'#ccc'}}, 'País: '), movie.pais || '-']),
                    createElement('div', {}, [createElement('strong', {style:{color:'#ccc'}}, 'Gênero: '), movie.genero || '-']),
                ]),

                // --- BLOCO DE TEXTO EXPANSÍVEL ---
                createElement('div', { 
                    key: 'txt-container', 
                    style: { 
                        position: 'relative',
                        marginBottom: 30,
                        maxHeight: (isBigText && !expanded) ? '180px' : 'none',
                        overflow: 'hidden',
                        transition: 'max-height 0.3s ease'
                    }
                }, [
                    // TÍTULO DO TEXTO (Branco, logo acima do texto)
                    articleTitle && createElement('h4', { 
                        key: 'art-title', 
                        style: { margin: '0 0 15px 0', fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' } 
                    }, articleTitle),

                    // O TEXTO
                    createElement('div', { 
                        key: 'txt-content', 
                        style: { lineHeight: '1.8', fontSize: '0.9rem', color: '#ddd', whiteSpace: 'pre-line' } 
                    }, formatText(rawText)),

                    // Gradiente Fade Out
                    (isBigText && !expanded) && createElement('div', {
                        style: {
                            position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80px',
                            background: 'linear-gradient(to bottom, transparent, #0f0f0f)'
                        }
                    })
                ]),

                // --- BOTÃO LER MAIS / MENOS ---
                isBigText && createElement('button', {
                    key: 'toggle-btn',
                    onClick: () => setExpanded(!expanded),
                    style: {
                        background: 'transparent', border: 'none', color: 'var(--highlight)', 
                        fontSize: '0.8rem', cursor: 'pointer', marginBottom: 30, 
                        fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1,
                        alignSelf: 'flex-start', padding: 0
                    }
                }, expanded ? '↑ LER MENOS' : '↓ LER MAIS'),

                // --- BOTÃO ASSISTIR ---
                onPlay && !enableRating && createElement('button', {
                    key: 'play-btn',
                    className: 'btn-main',
                    onClick: onPlay,
                    style: { marginBottom: 20, background: '#fff', color: '#000', border: 'none' }
                }, '▶ ASSISTIR FILME'),

                // --- ÁREA DE AVALIAÇÃO ---
                enableRating && createElement('div', { key: 'rating-area', style: { background: '#111', padding: 20, borderRadius: 8, border: '1px solid #333' } }, [
                    createElement('div', { style: {textAlign: 'center', marginBottom: 10, fontSize: '0.9rem', color: 'var(--success)'} }, 'SESSÃO FINALIZADA • AVALIE'),
                    createElement('div', { className: 'rating-stars', style: {marginTop: 0} }, stars),
                    createElement('textarea', {
                        className: 'rating-textarea',
                        placeholder: 'O que achou deste curta?',
                        value: review,
                        onChange: (e) => setReview(e.target.value),
                        onKeyDown: handleKeyDown
                    }),
                    createElement('button', { className: 'btn-main', onClick: handleSend, disabled: loading }, loading ? '...' : 'SALVAR NO PERFIL')
                ])
            ])
        )
    );
}