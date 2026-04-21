let miToken = "";
const displayResultado = document.getElementById('resultado');
const statusBadge = document.getElementById('status-badge');
const authSection = document.getElementById('auth-section');
const actionsSection = document.getElementById('actions-section');
const userDisplay = document.getElementById('user-display');

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

// Función para Login
async function login() {
    const userInp = document.getElementById('username').value;
    const passInp = document.getElementById('password').value;

    if (!userInp || !passInp) {
        updateTerminal("⚠️ Por favor, completa todos los campos.", "error");
        return;
    }

    updateTerminal("Autenticando...");

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userInp, password: passInp })
        });
        
        const data = await res.json();
        
        if (data.token) {
            miToken = data.token;
            userDisplay.innerHTML = `Bienvenido, <strong>${userInp}</strong>`;
            
            // UI Transition
            authSection.classList.add('hidden');
            actionsSection.classList.remove('hidden');
            
            updateTerminal("✅ Login exitoso. Token JWT generado correctamente.", "success");
        } else {
            updateTerminal(`❌ Error: ${data.error || "Credenciales inválidas"}`, "error");
        }
    } catch (error) {
        updateTerminal("⚠️ Error crítico: No se pudo conectar con el backend.", "error");
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
    updateTerminal("Sesión cerrada. Inicie sesión de nuevo.", "info");
    document.getElementById('password').value = "";
}

// Eventos
document.getElementById('btnLogin').addEventListener('click', login);
document.getElementById('btnSecret').addEventListener('click', verSecreto);
document.getElementById('btnLogout').addEventListener('click', logout);

// Permitir Login con Enter
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !authSection.classList.contains('hidden')) {
        login();
    }
});
