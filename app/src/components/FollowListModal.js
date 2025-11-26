// ARQUIVO: src/components/FollowListModal.js
const React = window.React;
const { useState, useEffect, createElement } = React;
import { getAvatarUI } from '../utils.js';
import FollowAction from './FollowAction.js';
import { Api } from '../api.js';

export default function FollowListModal({ title, listEmails, currentUser, onClose, onUpdate, onViewProfile }) {
    const [usersData, setUsersData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Função segura para buscar dados
        const fetchDetails = async () => {
            if (!listEmails || listEmails.length === 0) { 
                setUsersData([]); 
                setLoading(false); 
                return; 
            }
            
            // Mapeia emails para promessas de perfil
            const promises = listEmails.map(async (email) => {
                try {
                    const profile = await Api.getProfile(email);
                    return { 
                        email: email, 
                        username: profile.username || email.split('@')[0], 
                        avatar: profile.avatar || 0, 
                        color: profile.color || '#333' 
                    };
                } catch { 
                    // Fallback se falhar
                    return { email, username: email.split('@')[0], avatar: 0, color: '#333' }; 
                }
            });

            const results = await Promise.all(promises);
            setUsersData(results);
            setLoading(false);
        };
        
        fetchDetails();
    }, [listEmails]);

    return createElement('div', { className: 'auth-modal', style:{zIndex: 250} },
        createElement('div', { className: 'auth-box', style: { height: '500px', display: 'flex', flexDirection: 'column' } }, [
            createElement('button', { className: 'btn-close-box', onClick: onClose }, '✕'),
            createElement('h3', { style: { color: '#fff', marginBottom: 20, letterSpacing: 2 } }, title),
            
            createElement('div', { style: { flex: 1, overflowY: 'auto', textAlign: 'left', paddingRight: 5 } }, [
                loading && createElement('div', { className: 'sorting-anim', style:{fontSize:'0.8rem'} }, 'Carregando...'),
                
                !loading && usersData.length === 0 && createElement('div', { className: 'search-empty' }, 'Vazio.'),
                
                !loading && usersData.map(u => (
                    createElement('div', { key: u.email, className: 'user-list-item' }, [
                        
                        // ÁREA CLICÁVEL (PERFIL)
                        createElement('div', { 
                            className: 'user-list-info',
                            onClick: () => { if (onViewProfile) { onViewProfile(u); } }
                        }, [
                            getAvatarUI(u.avatar, u.username, u.color, 'search-avatar'),
                            createElement('div', { className: 'user-list-name' }, u.username.toUpperCase())
                        ]),

                        // ÁREA DO BOTÃO (FIXA NA DIREITA)
                        // Só mostra botão se não for eu mesmo
                        u.email !== currentUser.email && createElement(FollowAction, { 
                            currentUserEmail: currentUser.email, 
                            targetUserEmail: u.email, 
                            isFollowing: currentUser.following.includes(u.email), 
                            onUpdate: onUpdate 
                        })
                    ])
                ))
            ])
        ])
    );
}