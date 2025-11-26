const React = window.React;
const { useState, createElement } = React;
import { Api } from '../api.js';

export default function LoginModal({ onClose, onLoginSuccess }) {
    const [mode, setMode] = useState('signin'); 
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [code, setCode] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const reqs = { length: pass.length >= 8, number: /\d/.test(pass), upper: /[A-Z]/.test(pass), special: /[!@#$%^&*(),.?":{}|<>]/.test(pass) };
    const translateError = (err) => {
        const m = err.message || err.toString();
        if (m.includes('UserNotFound')) return "Usuário não encontrado.";
        if (m.includes('NotAuthorized')) return "Email ou senha incorretos.";
        if (m.includes('UsernameExists')) return "Este email já está cadastrado.";
        if (m.includes('InvalidPassword')) return "Senha fraca. Siga os requisitos.";
        if (m.includes('CodeMismatch')) return "Código inválido.";
        return "Erro ao processar. Tente novamente.";
    };
    const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };
    
    const handleSubmit = async () => {
        setMsg('');
        if (!email.includes('@')) { setMsg("Digite um email válido."); return; }
        if (mode === 'signup') {
            const isPasswordValid = reqs.length && reqs.number && reqs.upper && reqs.special;
            if (!isPasswordValid) { setMsg("A senha não atende aos requisitos."); return; }
            if (pass !== confirmPass) { setMsg("As senhas não coincidem!"); return; }
        }
        if (mode === 'confirm' && code.length < 4) { setMsg("Digite o código."); return; }
        setLoading(true);
        try {
            if (mode === 'signin') { await Api.signIn(email, pass); onLoginSuccess(); onClose(); } 
            else if (mode === 'signup') { await Api.signUp(email, pass); setMode('confirm'); setMsg("Código enviado!"); } 
            else if (mode === 'confirm') { await Api.confirmSignUp(email, code); setMode('signin'); setMsg("Confirmado! Faça login."); setPass(''); }
        } catch (err) { setMsg(translateError(err)); }
        setLoading(false);
    };

    const renderPasswordInput = (placeholder, value, onChange) => createElement('div', { className: 'input-wrapper' }, [
        createElement('input', { key: 'i', className: 'auth-input', type: showPass ? "text" : "password", placeholder, value, onChange, onKeyDown: handleKeyDown }),
        createElement('button', { key: 'b', className: 'btn-toggle-pass', onClick: () => setShowPass(!showPass), tabIndex: "-1" }, showPass ? 'OCULTAR' : 'EXIBIR')
    ]);

    return createElement('div', { className: 'auth-modal' },
        createElement('div', { className: 'auth-box' }, [
            // PADRÃO: FECHAR NA DIREITA
            createElement('button', { key: 'x', className: 'btn-close-box', onClick: onClose }, '✕'),
            createElement('h2', { key: 't', style: {marginTop: 15, marginBottom: 20, color: '#fff', fontSize:'1.2rem', letterSpacing: 2} }, 
                mode === 'signin' ? 'ENTRAR' : mode === 'signup' ? 'NOVA CONTA' : 'CONFIRMAR'
            ),
            msg && createElement('div', { key: 'err', className: 'auth-error' }, msg),
            createElement('input', { key: 'em', className: 'auth-input', placeholder: 'Email', value: email, onChange: e => setEmail(e.target.value), onKeyDown: handleKeyDown, autoFocus: true }),
            
            mode !== 'confirm' && renderPasswordInput("Senha", pass, e => setPass(e.target.value)),
            
            mode === 'signup' && createElement('div', { key: 'reqs', className: 'password-reqs' }, [
                createElement('span', { key: '1', className: `req-item ${reqs.length ? 'valid' : ''}` }, 'Mínimo 8 caracteres'),
                createElement('span', { key: '2', className: `req-item ${reqs.number ? 'valid' : ''}` }, 'Pelo menos 1 número'),
                createElement('span', { key: '3', className: `req-item ${reqs.upper ? 'valid' : ''}` }, 'Letra maiúscula'),
                createElement('span', { key: '4', className: `req-item ${reqs.special ? 'valid' : ''}` }, 'Caractere especial')
            ]),
            
            mode === 'signup' && renderPasswordInput("Confirmar Senha", confirmPass, e => setConfirmPass(e.target.value)),
            mode === 'confirm' && createElement('input', { key: 'cod', className: 'auth-input', placeholder: 'Código', value: code, onChange: e => setCode(e.target.value), onKeyDown: handleKeyDown }),
            
            createElement('button', { key: 'sub', className: 'btn-main', onClick: handleSubmit, disabled: loading }, loading ? '...' : (mode === 'confirm' ? 'VALIDAR' : 'ENVIAR')),
            
            createElement('div', { key: 'lnks', style: {marginTop: 15} }, [
                mode === 'signin' && createElement('span', { key: 'l1', className: 'auth-link', onClick: () => {setMode('signup'); setMsg('')} }, 'Não tem conta? Cadastre-se'),
                mode === 'signup' && createElement('span', { key: 'l2', className: 'auth-link', onClick: () => {setMode('signin'); setMsg('')} }, 'Já tem conta? Entrar'),
                mode === 'confirm' && createElement('span', { key: 'l3', className: 'auth-link', onClick: () => {setMode('signup'); setMsg('')} }, 'Voltar')
            ])
        ])
    );
}