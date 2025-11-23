const React = window.React;
const { useState, createElement } = React;

export default function AddFriends({ onClose, userEmail }) {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState('');

    const handleSendRequest = async () => {
        if (code.length < 6) {
            setStatus('Código inválido (mínimo 6 dígitos).');
            return;
        }
        
        setStatus('Buscando...');
        try {
            const res = await fetch('/api/friends/add', {
                method: 'POST',
                body: JSON.stringify({ email: userEmail, friend_code: code })
            });
            
            if (res.status === 200) {
                setStatus('Amigo adicionado com sucesso!');
                setTimeout(() => { onClose(); }, 1500);
            } else {
                setStatus('Usuário não encontrado.');
            }
        } catch (e) {
            setStatus('Erro ao adicionar.');
        }
    };

    return createElement('div', { className: 'auth-modal' },
        createElement('div', { className: 'auth-box', style: { borderColor: '#00e676' } },
            createElement('button', { className: 'btn-close-box btn-close-absolute', onClick: onClose }, '✕'),
            
            createElement('h2', { style: { marginTop: 15, marginBottom: 20, color: '#fff', fontSize: '1.2rem', letterSpacing: 2 } }, 'ADICIONAR AMIGO'),

            createElement('p', { style: { color: '#888', fontSize: '0.8rem', marginBottom: 20 } }, 'Digite o código de 6 dígitos do seu amigo.'),

            status && createElement('div', { 
                style: { 
                    color: status.includes('sucesso') ? '#00e676' : '#cc0000', 
                    fontSize: '0.8rem', marginBottom: 15, border: '1px solid', padding: 10 
                } 
            }, status),

            createElement('input', { 
                className: 'auth-input', 
                placeholder: 'Código (ex: 123456)...', 
                value: code, 
                onChange: e => setCode(e.target.value),
                maxLength: 6
            }),

            createElement('button', { 
                className: 'btn-main', 
                onClick: handleSendRequest 
            }, 'ADICIONAR')
        )
    );
}