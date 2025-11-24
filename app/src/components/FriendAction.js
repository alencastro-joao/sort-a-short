// ARQUIVO: src/components/FriendAction.js
const React = window.React;
const { useState, createElement } = React;

export default function FriendAction({ currentUserEmail, targetUserEmail, onAdd, alreadyFriend = false }) {
    const [status, setStatus] = useState('idle'); // idle, loading, added

    const handleClick = async (e) => {
        e.stopPropagation(); 
        if (status !== 'idle' || alreadyFriend) return; // Bloqueia se já for amigo

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

    // Se já adicionou (pelo clique ou pela prop inicial), mostra o Check
    if (status === 'added' || alreadyFriend) {
        return createElement('span', { 
            style: { color: '#00e676', fontWeight: 'bold', fontSize: '1.2rem', padding: '0 10px' } 
        }, '✓');
    }

    // Botão Branco [+]
    return createElement('button', {
        onClick: handleClick,
        className: 'btn-friend-add',
        style: {
            background: 'transparent',
            border: '2px solid #fff', // AGORA É BRANCO
            color: '#fff',            // AGORA É BRANCO
            borderRadius: '8px',
            width: '35px',
            height: '35px',
            fontSize: '1.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: '0.2s',
            paddingBottom: '4px',
            lineHeight: '0',
            marginLeft: '10px'
        }
    }, status === 'loading' ? '...' : '+');
}