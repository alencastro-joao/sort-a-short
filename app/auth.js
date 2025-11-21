// auth.js - Gerenciador do Cognito (Versão Corrigida)
const POOL_DATA = {
    UserPoolId: 'us-east-1_m9nygX9Pm',
    ClientId: '3i2m7sfkp66qa9uhfvvb7g6d9c'
};

let userPool;

function initAuth() {
    // Verifica explicitamente no window
    if (window.AmazonCognitoIdentity) {
        userPool = new window.AmazonCognitoIdentity.CognitoUserPool(POOL_DATA);
        console.log("Cognito inicializado com sucesso.");
    } else {
        console.error("ERRO CRÍTICO: SDK do Cognito não foi encontrado no window.");
    }
}

const AuthService = {
    // 1. Cadastro
    signUp: (email, password) => {
        return new Promise((resolve, reject) => {
            // Verifica se o SDK foi carregado antes de usar
            if (!window.AmazonCognitoIdentity) { reject(new Error('SDK do Cognito não carregado')); return; }
            // [CORREÇÃO] Uso do window.AmazonCognitoIdentity
            const attributeList = [
                new window.AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email })
            ];

            if (!userPool) { reject(new Error('Erro: UserPool não inicializado.')); return; }

            userPool.signUp(email, password, attributeList, null, (err, result) => {
                if (err) {
                    console.error("Erro no Sign Up:", err);
                    reject(err);
                } else {
                    resolve(result.user);
                }
            });
        });
    },

    // 2. Confirmar Código
    confirmSignUp: (email, code) => {
        return new Promise((resolve, reject) => {
            const userData = { Username: email, Pool: userPool };
            const cognitoUser = new window.AmazonCognitoIdentity.CognitoUser(userData);
            
            cognitoUser.confirmRegistration(code, true, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    },

    // 3. Login
    signIn: (email, password) => {
        return new Promise((resolve, reject) => {
            const authDetails = new window.AmazonCognitoIdentity.AuthenticationDetails({ 
                Username: email, 
                Password: password 
            });
            const userData = { Username: email, Pool: userPool };
            const cognitoUser = new window.AmazonCognitoIdentity.CognitoUser(userData);

            cognitoUser.authenticateUser(authDetails, {
                onSuccess: (result) => resolve(result),
                onFailure: (err) => reject(err)
            });
        });
    },

    // 4. Logout
    signOut: () => {
        if (!userPool) return;
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) cognitoUser.signOut();
    },

    // 5. Verificar Sessão Atual
    getCurrentUser: () => {
        return new Promise((resolve) => {
            if (!userPool) { resolve(null); return; }
            const cognitoUser = userPool.getCurrentUser();
            
            if (!cognitoUser) { resolve(null); return; }

            cognitoUser.getSession((err, session) => {
                if (err || !session.isValid()) { resolve(null); return; }
                
                cognitoUser.getUserAttributes((err, attributes) => {
                    if (err) resolve(null);
                    else {
                        const profile = {};
                        attributes.forEach(attr => { profile[attr.getName()] = attr.getValue() });
                        resolve({ username: cognitoUser.getUsername(), ...profile });
                    }
                });
            });
        });
    }
};

// Expõe para o escopo global
window.AuthService = AuthService;
window.initAuth = initAuth;