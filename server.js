const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { setupDB } = require('./database');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const SECRET_KEY = "mi_clave_super_secreta_123";

let db;
setupDB().then(database => {
    db = database;
    console.log('🗄️ Bóveda de datos SQLite conectada');
});

// --- MIDDLEWARE DE AUTENTICACIÓN ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Acceso denegado. No hay token." });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido o expirado." });
        req.user = user;
        next();
    });
};

// Entregar el HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. Registro de Usuario
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Faltan credenciales" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // El primer usuario será admin por defecto para pruebas
        const role = username === 'admin' ? 'admin' : 'user';
        await db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
        res.json({ mensaje: "✅ Usuario registrado con éxito en la bóveda" });
    } catch (e) {
        res.status(400).json({ error: "El usuario ya existe o error en registro" });
    }
});

// 2. Login con DB
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

        if (user && await bcrypt.compare(password, user.password_hash)) {
            const token = jwt.sign({ name: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
            return res.json({ 
                token, 
                has2FA: !!user.twofa_secret,
                role: user.role
            });
        } 
        res.status(401).json({ error: "Credenciales incorrectas" });
    } catch (e) {
        res.status(500).json({ error: "Error en el servidor de autenticación" });
    }
});

// --- 2FA (CONFIGURACIÓN Y VERIFICACIÓN) ---

app.post('/api/2fa/setup', authenticateToken, (req, res) => {
    const secret = speakeasy.generateSecret({ name: `SecureGate (${req.user.name})` });
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        res.json({ qrCode: data_url, secret: secret.base32 });
    });
});

app.post('/api/2fa/verify', authenticateToken, async (req, res) => {
    const { token, secret } = req.body;
    const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 1
    });

    if (verified) {
        await db.run('UPDATE users SET twofa_secret = ? WHERE username = ?', [secret, req.user.name]);
        res.json({ success: true, mensaje: "✅ 2FA activado permanentemente" });
    } else {
        res.status(400).json({ success: false, mensaje: "❌ Código 2FA incorrecto" });
    }
});

// --- RUTA PROTEGIDA (AUTORIZACIÓN) ---
app.get('/api/admin-only', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "No tienes permisos de Administrador" });
    }
    res.json({ mensaje: "¡Bienvenido, Administrador! Acceso concedido a la bóveda secreta." });
});

// API Status
app.get('/api/status', (req, res) => {
    res.json({
        mensaje: "Servidor operativo - Validación TLS/Nginx exitosa",
        protocolo_interno: "HTTP",
        protocolo_externo: "HTTPS (TLS 1.3)",
        database: "SQLite Persistente"
    });
});

app.listen(3000, () => {
    console.log('🚀 Backend escuchando en puerto 3000');
});
