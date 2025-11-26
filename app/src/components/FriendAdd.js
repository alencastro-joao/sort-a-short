// ARQUIVO: src/components/AddFriends.js
const React = window.React;
const { useState, createElement } = React;
import { Api } from '../api.js';
import { getAvatarUI } from '../utils.js'; 
import FollowAction from './FollowAction.js';

export default function AddFriends({ onClose, userEmail, followingList = [] }) {
    const [mode, setMode] = useState('code'); 
    const [code, setCode] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    
    const [status, setStatus] = useState(''); 
    const [searching, setSearching] = useState(false); 

    const handleCodeSubmit = async () => {
        if (code.length < 6 || isNaN(code)) {
            setStatus('Código inválido.');
            return;
        }
        setStatus('Buscando...');
        try {
            const res = await fetch('/api/social/follow', {
                method: 'POST',
                body: JSON.stringify({ email: userEmail, friend_code: code, action: 'follow' })
            });
            
            if (res.status === 200) {
                setStatus('Usuário encontrado e seguido!');
                setTimeout(() => { onClose(); }, 1500);
            } else {
                setStatus('Usuário não encontrado.');
            }
        } catch (e) { setStatus('Erro ao processar.'); }
    };
    
    const handleSearchSubmit = async () => {
        if(searchQuery.length < 2) return;
        setSearching(true);
        const results = await Api.searchUsers(searchQuery);
        const filteredResults = results.filter(res => res.email !== userEmail);
        setSearchResults(filteredResults);
        setSearching(false);
    };

    const renderCodeMode = () => createElement('div', {}, [
        createElement('p', { style: { color: '#888', fontSize: '0.8rem', marginBottom: 20 } }, 'Digite o código de 6 dígitos.'),
        status && createElement('div', { style: { color: status.includes('seguido') ? '#00e676' : '#cc0000', fontSize: '0.8rem', marginBottom: 15 } }, status),
        createElement('input', { className: 'auth-input', placeholder: 'Código...', value: code, onChange: e => setCode(e.target.value), maxLength: 6 }),
        createElement('button', { className: 'btn-main', onClick: handleCodeSubmit }, 'SEGUIR')
    ]);

    const renderSearchMode = () => createElement('div', {}, [
        createElement('p', { style: { color: '#888', fontSize: '0.8rem', marginBottom: 20 } }, 'Busque por nome.'),
        createElement('div', { style: {display:'flex', gap: 10, marginBottom: 20} }, [
            createElement('input', { className: 'auth-input', style:{marginBottom:0}, placeholder: 'Nome...', value: searchQuery, onChange: e => setSearchQuery(e.target.value), onKeyDown: e => e.key === 'Enter' && handleSearchSubmit() }),
            createElement('button', { className: 'btn-main', style:{width:'auto'}, onClick: handleSearch }, searching ? '...' : 'BUSCAR')
        ]),
        createElement('div', { style: { maxHeight: '200px', overflowY: 'auto' } }, [
            searchResults.map((res, idx) => createElement('div', { key: idx, className: 'search-result-item' }, [
                createElement('div', { style:{display:'flex', alignItems:'center'} }, [
                    getAvatarUI(res.avatar, res.username, res.color, 'search-avatar'),
                    createElement('div', {style:{fontWeight:'bold', color:'#fff'}}, res.username.toUpperCase())
                ]),
                createElement(FollowAction, { currentUserEmail: userEmail, targetUserEmail: res.email, isFollowing: followingList.includes(res.email) })
            ]))
        ])
    ]);

    return createElement('div', { className: 'auth-modal' },
        createElement('div', { className: 'auth-box', style: { maxWidth: '500px' } }, [
            createElement('button', { className: 'btn-close-box', onClick: onClose }, '✕'),
            createElement('h2', { style: { marginTop: 15, marginBottom: 20, color: '#fff', fontSize: '1.2rem', letterSpacing: 2 } }, 'ADICIONAR'),
            createElement('div', { style: { display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20, borderBottom: '1px solid #333', paddingBottom: 10 } }, [
                createElement('button', { className: 'tab-btn', onClick: () => setMode('code'), style: { color: mode === 'code' ? 'var(--highlight)' : '#666' } }, 'CÓDIGO'),
                createElement('button', { className: 'tab-btn', onClick: () => setMode('search'), style: { color: mode === 'search' ? 'var(--highlight)' : '#666' } }, 'PESQUISAR')
            ]),
            mode === 'code' ? renderCodeMode() : renderSearchMode()
        ])
    );
}