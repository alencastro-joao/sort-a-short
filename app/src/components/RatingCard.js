// ARQUIVO: src/components/RatingCard.js
// --------------------------------------------------------------------------
// Modal que aparece ao final do filme para dar nota (1-5) e review.
// --------------------------------------------------------------------------

const React = window.React;
const { useState, createElement } = React;
import { Api } from '../api.js'; // Importamos a API que criamos na Fase 1

export default function RatingCard({ movie, user, onClose }) {
    const [hoverStar, setHoverStar] = useState(0);
    const [selectedStar, setSelectedStar] = useState(0); 
    const [review, setReview] = useState("");
    const [loading, setLoading] = useState(false);

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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Cria as 5 estrelas
    const stars = [1, 2, 3, 4, 5].map(star => {
        return createElement('span', {
            key: star,
            className: `star-icon ${(hoverStar || selectedStar) >= star ? 'active' : ''}`,
            onMouseEnter: () => setHoverStar(star),
            onMouseLeave: () => setHoverStar(0),
            onClick: () => setSelectedStar(star)
        }, '★');
    });

    return createElement('div', { className: 'auth-modal', style: { background: 'rgba(0,0,0,0.8)' } },
        createElement('div', { className: 'movie-card', style: { textAlign: 'center', padding: 40, maxWidth: 450, animation: 'slideUp 0.5s', position: 'relative' } },
            
            // Botão Fechar
            createElement('button', { className: 'btn-close-box btn-close-absolute', onClick: onClose }, '✕'),
            
            // Títulos
            createElement('h3', { style: { margin: 0, fontSize: '0.8rem', color: '#888', letterSpacing: 2, marginTop: 15 } }, 'SESSÃO FINALIZADA'),
            createElement('h2', { style: { margin: '10px 0 0 0', fontSize: '1.8rem', color: '#fff' } }, movie.titulo),
            
            // Estrelas
            createElement('div', { className: 'rating-stars' }, stars),
            
            // Textarea
            createElement('textarea', {
                className: 'rating-textarea',
                placeholder: 'O que você achou? (Opcional)',
                value: review,
                onChange: (e) => setReview(e.target.value),
                onKeyDown: handleKeyDown
            }),
            
            // Botão Enviar
            createElement('button', { 
                className: 'btn-main', 
                onClick: handleSend, 
                disabled: loading 
            }, loading ? 'ENVIANDO...' : 'ENVIAR AVALIAÇÃO')
        )
    );
}