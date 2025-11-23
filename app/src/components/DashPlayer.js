// ARQUIVO: src/components/DashPlayer.js
// --------------------------------------------------------------------------
// Wrapper para a biblioteca dash.js.
// Gerencia a inicialização, reprodução e eventos do vídeo.
// --------------------------------------------------------------------------

const React = window.React;
const { useRef, useEffect, createElement } = React;

export default function DashPlayer({ url, isPlaying, startAt, enableControls, onEnded }) {
    const videoRef = useRef(null);

    // Efeito: Inicializa o Player quando a URL muda
    useEffect(() => {
        if (!url || !videoRef.current) return;
        
        // Inicializa o Dash.js
        const player = dashjs.MediaPlayer().create();
        player.initialize(videoRef.current, url, false);
        
        // Pula para o tempo inicial (se for retomar filme)
        if (startAt > 0) {
            player.seek(startAt);
        }

        const vid = videoRef.current;
        
        // Listener para quando o filme acaba
        const handleEnd = () => { 
            if (onEnded) onEnded(); 
        };
        vid.addEventListener('ended', handleEnd);

        // Limpeza ao desmontar
        return () => { 
            vid.removeEventListener('ended', handleEnd); 
            player.destroy(); 
        };
    }, [url]);

    // Efeito: Controla Play/Pause baseado na prop isPlaying
    useEffect(() => { 
        if (videoRef.current) {
            isPlaying ? videoRef.current.play() : videoRef.current.pause(); 
        }
    }, [isPlaying]);

    return createElement('video', {
        ref: videoRef,
        controls: enableControls,
        controlsList: "nodownload",
        style: { cursor: enableControls ? 'auto' : 'none' }
    });
}