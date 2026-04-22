let miToken = "";
let current2FASecret = "";
const displayResultado = document.getElementById('resultado');
const statusBadge = document.getElementById('status-badge');
const authSection = document.getElementById('auth-section');
const actionsSection = document.getElementById('actions-section');
const setup2FASection = document.getElementById('setup-2fa-section');
const userDisplay = document.getElementById('user-display');
const btnSubmit = document.getElementById('btnSubmit');
const qrcodeContainer = document.getElementById('qrcode-container');

// Gestión de Tabs
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
let isLoginMode = true;

tabLogin.addEventListener('click', () => {
    isLoginMode = true;
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    btnSubmit.querySelector('span').innerText = "Iniciar Sesión";
    btnSubmit.querySelector('i').className = "fas fa-sign-in-alt";
});

tabRegister.addEventListener('click', () => {
    isLoginMode = false;
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    btnSubmit.querySelector('span').innerText = "Crear Cuenta";
    btnSubmit.querySelector('i').className = "fas fa-user-plus";
});

// Utilidad para actualizar el terminal
function updateTerminal(message, type = 'info') {
    displayResultado.innerText = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
    
    statusBadge.className = 'badge';
    if (type === 'success') {
        statusBadge.classList.add('status-success');
        statusBadge.innerText = 'ONLINE';
    } else if (type === 'error') {
        statusBadge.classList.add('status-error');
        statusBadge.innerText = 'ERROR';
    } else {
        statusBadge.innerText = 'BUSY...';
    }
}

// Función para Login / Registro
async function handleAuth() {
    const userInp = document.getElementById('username').value;
    const passInp = document.getElementById('password').value;

    if (!userInp || !passInp) {
        updateTerminal("⚠️ Por favor, completa todos los campos.", "error");
        return;
    }

    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    updateTerminal(isLoginMode ? "Autenticando..." : "Registrando en la bóveda...");

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userInp, password: passInp })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            if (isLoginMode) {
                miToken = data.token;
                userDisplay.innerHTML = `Sesión: <strong>${userInp}</strong> (${data.role})`;
                
                if (!data.has2FA) {
                    updateTerminal("⚠️ Seguridad incompleta. Configure 2FA.", "info");
                    setup2FA();
                } else {
                    authSection.classList.add('hidden');
                    actionsSection.classList.remove('hidden');
                    updateTerminal("✅ Acceso concedido. Protocolo TLS activo.", "success");
                }
            } else {
                updateTerminal(data.mensaje, "success");
                // Cambiar a login después de registrar
                tabLogin.click();
            }
        } else {
            updateTerminal(`❌ Error: ${data.error}`, "error");
        }
    } catch (error) {
        updateTerminal("⚠️ Error crítico: No se pudo conectar con el sistema.", "error");
    }
}

// Función para iniciar configuración 2FA
async function setup2FA() {
    try {
        const res = await fetch('/api/2fa/setup', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${miToken}` }
        });
        const data = await res.json();
        
        current2FASecret = data.secret;
        qrcodeContainer.innerHTML = `<img src="${data.qrCode}" alt="QR 2FA">`;
        
        authSection.classList.add('hidden');
        setup2FASection.classList.remove('hidden');
    } catch (e) {
        updateTerminal("Error al generar configuración 2FA", "error");
    }
}

// Verificar 2FA
async function verify2FA() {
    const token = document.getElementById('2fa-token').value;
    if (!token) return updateTerminal("Ingrese el código de 6 dígitos", "error");

    try {
        const res = await fetch('/api/2fa/verify', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${miToken}`
            },
            body: JSON.stringify({ token, secret: current2FASecret })
        });
        
        const data = await res.json();
        if (data.success) {
            setup2FASection.classList.add('hidden');
            actionsSection.classList.remove('hidden');
            updateTerminal("✅ 2FA verificado. Seguridad completa.", "success");
        } else {
            updateTerminal(data.mensaje, "error");
        }
    } catch (e) {
        updateTerminal("Error en verificación 2FA", "error");
    }
}

// Función para ver el secreto
async function verSecreto() {
    updateTerminal("Consultando bóveda de datos...");

    try {
        const res = await fetch('/api/admin-only', {
            headers: { 'Authorization': `Bearer ${miToken}` }
        });
        
        const data = await res.json();
        
        if (res.status === 200) {
            updateTerminal(data, "success");
        } else {
            updateTerminal(data.error || "Acceso denegado", "error");
        }
    } catch (error) {
        updateTerminal("⚠️ Error al obtener datos del servidor.", "error");
    }
}

// Cerrar sesión
function logout() {
    miToken = "";
    authSection.classList.remove('hidden');
    actionsSection.classList.add('hidden');
    setup2FASection.classList.add('hidden');
    updateTerminal("Sesión finalizada. Inicie sesión de nuevo.", "info");
    document.getElementById('password').value = "";
    document.getElementById('2fa-token').value = "";
}

// Eventos
btnSubmit.addEventListener('click', handleAuth);
document.getElementById('btnVerify2FA').addEventListener('click', verify2FA);
document.getElementById('btnSecret').addEventListener('click', verSecreto);
document.getElementById('btnLogout').addEventListener('click', logout);

// Enter para enviar
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (!authSection.classList.contains('hidden')) handleAuth();
        else if (!setup2FASection.classList.contains('hidden')) verify2FA();
    }
});
