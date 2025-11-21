// Usando variáveis globais (sem import)
// PEGANDO DO GLOBAL
const React = window.React;
const { useNavigate } = window.ReactRouterDOM;

function ScreenHome({ fullCatalog, watchedList }) {
    const navigate = useNavigate();
    const [sortText, setSortText] = React.useState("");
    const [isSorting, setIsSorting] = React.useState(false);

    const startSort = () => {
        if (!fullCatalog) return;
        setIsSorting(true);
        const titles = Object.values(fullCatalog).map(m => m.titulo);
        let steps = 0;
        const interval = setInterval(() => {
            setSortText(titles[Math.floor(Math.random() * titles.length)]);
            steps++;
            if (steps > 20) { 
                clearInterval(interval); 
                finishSort(); 
            }
        }, 100);
    };

    const finishSort = () => {
        let ids = Object.keys(fullCatalog).filter(id => !watchedList.includes(id));
        if (ids.length === 0) ids = Object.keys(fullCatalog); 
        const randomId = ids[Math.floor(Math.random() * ids.length)];
        
        const user = Api.getCurrentUser();
        if(user) Api.saveMovie(user.email, randomId);

        navigate(`/assistir/${randomId}`);
    };

    return (
        <div className="ui-layer">
            {!isSorting ? (
                <div className="sort-container">
                    <div className="big-title">SORT A SHORT</div><br/>
                    <button className="btn-main btn-sort" onClick={startSort} disabled={!fullCatalog}>
                        {fullCatalog ? "SORTEAR" : "CARREGANDO..."}
                    </button>
                </div>
            ) : (
                <div className="sorting-anim">{sortText}</div>
            )}
        </div>
    );
}

// Exporta globalmente para o browser
window.ScreenHome = ScreenHome;