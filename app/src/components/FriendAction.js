const React = window.React;
const { useState, createElement } = React;

export default function FriendAction({ currentUserEmail, targetUserEmail, onAdd }) {
    const [status, setStatus] = useState('idle'); // idle, loading, added

    const handleClick = async (e) => {
        e.stopPropagation(); // Não abre o perfil se clicar no botão
        if (status !== 'idle') return;

        setStatus('loading');
        try {
            await fetch('/api/friends/add', {
                method: 'POST',
                body: JSON.stringify({ email: currentUserEmail, friend_email: targetUserEmail })
            });
            setStatus('added');
            if (onAdd) onAdd();
        } catch (error) {
            console.error(error);
            setStatus('idle');
        }
    };

    // Se já adicionou, mostra o Check verde
    if (status === 'added') {
        return createElement('span', { 
            style: { color: '#00e676', fontWeight: 'bold', fontSize: '1.2rem', padding: '0 10px' } 
        }, '✓');
    }

    // Botão Rosa [+]
    return createElement('button', {
        onClick: handleClick,
        className: 'btn-friend-add',
        style: {
            background: 'transparent',
            border: '2px solid #e91e63', // Rosa
            color: '#e91e63',
            borderRadius: '8px',
            width: '35px',
            height: '35px',
            fontSize: '1.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: '0.2s',
            paddingBottom: '4px', // Ajuste visual do +
            lineHeight: '0',
            marginLeft: '10px'
        }
    }, status === 'loading' ? '...' : '+');
}   