// Arquivo: LoginModal.js

const LoginModal = ({ onClose, onLoginSuccess }) => {
    const [mode, setMode] = React.useState('signin'); // 'signin', 'signup', 'confirm'
    const [email, setEmail] = React.useState('');
    const [pass, setPass] = React.useState('');
    const [confirmPass, setConfirmPass] = React.useState('');
    const [code, setCode] = React.useState('');
    const [msg, setMsg] = React.useState(null); // { type: 'error'|'success', text: '' }
    const [loading, setLoading] = React.useState(false);

    // --- TRADUTOR DE ERROS (AWS -> PORTUGUÊS) ---
    const translateError = (errorText) => {
        const err = errorText.toLowerCase();
        if (err.includes("password") && err.includes("policy")) return "Senha fraca: Use 8+ caracteres, números e maiúsculas.";
        if (err.includes("user already exists")) return "Este email já está cadastrado.";
        if (err.includes("incorrect username or password")) return "Email ou senha incorretos.";
        if (err.includes("user does not exist")) return "Usuário não encontrado.";
        if (err.includes("notauthorizedexception")) return "Não autorizado. Verifique senha ou confirmação.";
        if (err.includes("limitexceeded")) return "Muitas tentativas. Aguarde um momento.";
        if (err.includes("code mismatch")) return "Código de verificação inválido.";
        if (err.includes("expired")) return "Código expirado. Solicite novo.";
        if (err.includes("empty")) return "Preencha todos os campos.";
        return "Erro: " + errorText; 
    };

    const validate = () => {
        if (!email || !pass) return "Email e Senha são obrigatórios.";
        if (mode === 'signup') {
            if (pass !== confirmPass) return "As senhas não conferem.";
            if (pass.length < 6) return "A senha deve ter no mínimo 6 caracteres.";
            if (!email.includes('@')) return "Email inválido.";
        }
        if (mode === 'confirm' && !code) return "Digite o código enviado ao seu email.";
        return null;
    };

    const handleSubmit = async () => {
        const validationError = validate();
        if (validationError) { setMsg({ type: 'error', text: validationError }); return; }

        setMsg(null); 
        setLoading(true);

        try {
            // 'Api' será lido do escopo global (definido no index.html por enquanto)
            if (mode === 'signin') {
                await Api.signIn(email, pass);
                onLoginSuccess();
                onClose();
            } 
            else if (mode === 'signup') {
                await Api.signUp(email, pass);
                setMode('confirm');
                setMsg({ type: 'success', text: "Sucesso! Verifique o código no seu email." });
            } 
            else if (mode === 'confirm') {
                await Api.confirmSignUp(email, code);
                setMode('signin');
                setMsg({ type: 'success', text: "Conta confirmada! Faça login agora." });
            }
        } catch (err) {
            console.error("Erro Login:", err);
            const rawError = err.message || JSON.stringify(err);
            setMsg({ type: 'error', text: translateError(rawError) });
        }
        setLoading(false);
    };

    return (
        <div className="auth-modal">
            <div className="auth-box">
                <button className="btn-close-box btn-close-absolute" onClick={onClose}>✕</button>
                
                <h2 style={{marginTop: 15, marginBottom: 20, color: '#fff', fontSize:'1.2rem', letterSpacing: 2}}>
                    {mode === 'signin' ? 'ENTRAR' : mode === 'signup' ? 'CADASTRO' : 'CONFIRMAR'}
                </h2>
                
                {msg && (
                    <div className={msg.type === 'error' ? 'auth-error' : 'auth-success'}>
                        {msg.text}
                    </div>
                )}

                <input className="auth-input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                
                {mode !== 'confirm' && (
                    <input className="auth-input" type="password" placeholder="Senha" value={pass} onChange={e => setPass(e.target.value)} disabled={loading} />
                )}
                
                {/* CAMPO NOVO: Confirmar Senha */}
                {mode === 'signup' && (
                    <input className="auth-input" type="password" placeholder="Confirmar Senha" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} disabled={loading} />
                )}

                {mode === 'confirm' && (
                    <div style={{textAlign:'left'}}>
                        <span style={{fontSize:'0.7rem', color:'#888', display:'block', marginBottom:5}}>Enviamos um código para {email}:</span>
                        <input className="auth-input" placeholder="Ex: 123456" value={code} onChange={e => setCode(e.target.value)} disabled={loading} />
                    </div>
                )}
                
                <button className="btn-main" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'PROCESSANDO...' : (mode === 'signin' ? 'ENTRAR' : 'CONTINUAR')}
                </button>
                
                <div style={{marginTop: 20, borderTop: '1px solid #222', paddingTop: 15}}>
                    {mode === 'signin' && (
                        <span className="auth-link" onClick={() => {setMode('signup'); setMsg(null);}}>
                            Não tem conta? <span style={{color:'#fff'}}>Criar agora</span>
                        </span>
                    )}
                    {(mode === 'signup' || mode === 'confirm') && (
                        <span className="auth-link" onClick={() => {setMode('signin'); setMsg(null);}}>
                            Já tem conta? <span style={{color:'#fff'}}>Fazer Login</span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// Exporta para o navegador
window.LoginModal = LoginModal;