// ARQUIVO: src/components/FollowAction.js
const React = window.React;
const { useState, useEffect, createElement, useRef } = React;

export default function FollowAction({ currentUserEmail, targetUserEmail, isFollowing, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [followingState, setFollowingState] = useState(isFollowing);
    const [hover, setHover] = useState(false);
    
    // REF para garantir que o componente ainda existe antes de atualizar o estado
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (isMounted.current) setFollowingState(isFollowing);
    }, [isFollowing]);

    const handleToggle = async (e) => {
        e.stopPropagation(); // Evita abrir o perfil ao clicar no botão
        if (loading) return;
        
        if (isMounted.current) setLoading(true);

        const action = followingState ? 'unfollow' : 'follow';
        
        try {
            await fetch('/api/social/follow', {
                method: 'POST',
                body: JSON.stringify({ 
                    email: currentUserEmail, 
                    target_email: targetUserEmail,
                    action: action 
                })
            });
            
            // Só atualiza estado local se ainda estiver montado
            if (isMounted.current) {
                setFollowingState(!followingState);
                setLoading(false);
            }
            
            // Notifica o pai para recarregar a lista
            if (onUpdate) onUpdate();
            
        } catch (error) {
            console.error("Erro follow:", error);
            if (isMounted.current) setLoading(false);
        }
    };

    if (currentUserEmail === targetUserEmail) return null;

    if (followingState) {
        return createElement('button', {
            className: 'btn-action-base btn-action-following',
            onClick: handleToggle,
            onMouseEnter: () => setHover(true),
            onMouseLeave: () => setHover(false)
        }, loading ? '...' : (hover ? 'DEIXAR' : 'SEGUINDO'));
    }

    return createElement('button', {
        className: 'btn-action-base btn-action-follow',
        onClick: handleToggle
    }, loading ? '...' : 'SEGUIR');
}