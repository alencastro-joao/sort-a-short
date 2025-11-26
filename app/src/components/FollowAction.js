// ARQUIVO: src/components/FollowAction.js
const React = window.React;
const { useState, useEffect, createElement } = React;

export default function FollowAction({ currentUserEmail, targetUserEmail, isFollowing, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [followingState, setFollowingState] = useState(isFollowing);
    const [hover, setHover] = useState(false);

    useEffect(() => {
        setFollowingState(isFollowing);
    }, [isFollowing]);

    const handleToggle = async (e) => {
        e.stopPropagation();
        if (loading) return;
        setLoading(true);

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
            
            setFollowingState(!followingState);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
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