// Usando variáveis e componentes expostos em `window` (sem bundler)
const React = window.React;
const { useState, useEffect } = React;
const { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } = window.ReactRouterDOM;
const ReactDOM = window.ReactDOM;
const BUCKET_URL = window.BUCKET_URL;
const Api = window.Api;
const ScreenHome = window.ScreenHome;
const ScreenLogin = window.ScreenLogin;
const ScreenProfile = window.ScreenProfile;
const ScreenPlayer = window.ScreenPlayer;

const AppContent = () => {
    const location = useLocation();
    const [user, setUser] = useState(null);
    // ... (O RESTO DO CÓDIGO CONTINUA IGUAL)
    const [fullCatalog, setFullCatalog] = useState(null);
    const [watchedList, setWatchedList] = useState([]);
    const [reviewsList, setReviewsList] = useState([]);
    
    const [showLogin, setShowLogin] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    useEffect(() => {
        fetch(`${BUCKET_URL}/shorts.json?t=${new Date().getTime()}`).then(r=>r.json()).then(setFullCatalog).catch(console.error);
        refreshUser();
    }, []);

    const refreshUser = async () => {
        const u = Api.getCurrentUser();
        if(u) {
            const data = await Api.getProfile(u.email);
            if(data.username) { 
                Api.updateLocalUser(data.username); 
                u.username = data.username; 
            }
            setWatchedList(data.watched || []);
            setReviewsList(data.reviews || []);
        } else {
            setWatchedList([]);
            setReviewsList([]);
        }
        setUser(u);
    };

    const handleLogout = () => { Api.signOut(); refreshUser(); setShowProfile(false); };

    return (
        <>
            <div className="user-bar">
                {user ? (
                    <div className="user-info" onClick={() => setShowProfile(true)}>
                        {user.username ? user.username.toUpperCase() : user.email.split('@')[0]}
                    </div>
                ) : (
                    <button className="btn-login" onClick={() => setShowLogin(true)}>LOGIN</button>
                )}
            </div>

            {showLogin && <ScreenLogin onClose={() => setShowLogin(false)} onLoginSuccess={refreshUser} />}
            
            {showProfile && user && (
                <ScreenProfile 
                    user={user} 
                    watchedList={watchedList} 
                    reviewsList={reviewsList}
                    catalog={fullCatalog}
                    onClose={() => setShowProfile(false)}
                    onLogout={handleLogout}
                    onUpdateUser={refreshUser}
                />
            )}

            <Routes>
                <Route path="/" element={<ScreenHome fullCatalog={fullCatalog} watchedList={watchedList} />} />
                <Route path="/assistir/:id" element={<ScreenPlayer fullCatalog={fullCatalog} user={user} />} />
            </Routes>
        </>
    );
};

const App = () => {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);