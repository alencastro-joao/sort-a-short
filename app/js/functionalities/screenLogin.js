// Usando variáveis globais (sem import)
// PEGANDO DO GLOBAL
const React = window.React;
const { useState } = React;

function ScreenLogin({ onClose, onLoginSuccess }) {
    const [mode, setMode] = useState('signin');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [code, setCode] = useState('');
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setMsg(''); 
        if (mode === 'signup' && pass !== confirmPass) {
            setMsg("As senhas não conferem!"); return;
        }
        setLoading(true);
        try {
            if (mode === 'signin') { await Api.signIn(email, pass); onLoginSuccess(); onClose(); } 
            else if (mode === 'signup') { await Api.signUp(email, pass); setMode('confirm'); setMsg("Código enviado!"); } 
            else if (mode === 'confirm') { await Api.confirmSignUp(email, code); setMode('signin'); setMsg("Confirmado! Entre."); }
        } catch (err) { setMsg(err.message); }
        setLoading(false);
    };

    return (
        <div className="auth-modal">
            <div className="auth-box">
                <button className="btn-close-box btn-close-absolute" onClick={onClose}>✕</button>
                <h2 style={{marginTop: 15, marginBottom: 20, color: '#fff', fontSize:'1.2rem', letterSpacing: 2}}>
                    {mode === 'signin' ? 'ENTRAR' : mode === 'signup' ? 'CADASTRO' : 'CONFIRMAR'}
                </h2>
                {msg && <div className="auth-error">{msg}</div>}
                <input className="auth-input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                {mode !== 'confirm' && <input className="auth-input" type="password" placeholder="Senha" value={pass} onChange={e => setPass(e.target.value)} />}
                {mode === 'signup' && (
                    <input className="auth-input" type="password" placeholder="Confirmar Senha" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                )}
                {mode === 'confirm' && <input className="auth-input" placeholder="Código do Email" value={code} onChange={e => setCode(e.target.value)} />}
                <button className="btn-main" onClick={handleSubmit} disabled={loading}>{loading ? '...' : 'ENVIAR'}</button>
                {mode === 'signin' && <span className="auth-link" onClick={() => setMode('signup')}>Criar Conta</span>}
                {mode === 'signup' && <span className="auth-link" onClick={() => setMode('signin')}>Voltar Login</span>}
            </div>
        </div>
    );
}

// Exporta globalmente
window.ScreenLogin = ScreenLogin;