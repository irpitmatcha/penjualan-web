const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ROOT_DIR = __dirname;
const ENV_FILE = path.join(ROOT_DIR, '.env');

const loadEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex <= 0) {
            return;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
            process.env[key] = value;
        }
    });
};

loadEnvFile(ENV_FILE);

const requireEnv = (key) => {
    const value = String(process.env[key] || '').trim();
    if (!value) {
        throw new Error(`Environment variable ${key} wajib diisi. Lihat file .env.example.`);
    }
    return value;
};

const createPasswordHash = (password, salt = crypto.randomBytes(16).toString('hex')) => ({
    salt,
    hash: crypto.scryptSync(String(password), salt, 64).toString('hex')
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATABASE_DIR = path.join(ROOT_DIR, 'database');
const SQLITE_FILE = path.join(DATABASE_DIR, 'store.db');
const USERS_FILE = path.join(DATABASE_DIR, 'users.json');
const ORDERS_FILE = path.join(DATABASE_DIR, 'orders.json');
const PRODUCTS_FILE = path.join(DATABASE_DIR, 'products.json');
const CATEGORIES_FILE = path.join(DATABASE_DIR, 'categories.json');
const CUSTOMERS_FILE = path.join(DATABASE_DIR, 'customers.json');
const SETTINGS_FILE = path.join(DATABASE_DIR, 'settings.json');
const SESSIONS_FILE = path.join(DATABASE_DIR, 'sessions.json');
const SESSION_COOKIE_NAME = 'putroe_session';
const SESSION_MAX_AGE_SECONDS = Math.max(Number(process.env.SESSION_MAX_AGE_SECONDS) || (60 * 60 * 24 * 7), 300);
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';
const COOKIE_SAME_SITE = String(process.env.COOKIE_SAME_SITE || 'None').trim() || 'None';
const ALLOW_PUBLIC_REGISTRATION = String(process.env.ALLOW_PUBLIC_REGISTRATION || '').toLowerCase() === 'true';
const LOGIN_RATE_LIMIT_MAX = Math.max(Number(process.env.LOGIN_RATE_LIMIT_MAX) || 5, 1);
const LOGIN_RATE_LIMIT_WINDOW_MS = Math.max(Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 900000, 60000);
const CORS_ORIGIN = String(process.env.CORS_ORIGIN || '').trim();
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin Putroe Shop';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@putroeshop.com';
const ADMIN_USERNAME = requireEnv('ADMIN_USERNAME');
const ADMIN_PASSWORD = requireEnv('ADMIN_PASSWORD');

const parseCorsOrigins = (rawValue) => String(rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const corsOrigins = parseCorsOrigins(CORS_ORIGIN);

const isLoopbackOrigin = (requestUrl) => ['localhost', '127.0.0.1', '::1'].includes(requestUrl.hostname);

const matchesCorsOrigin = (requestOrigin) => {
    if (!requestOrigin) {
        return false;
    }

    try {
        const requestUrl = new URL(requestOrigin);
        if (['http:', 'https:'].includes(requestUrl.protocol) && isLoopbackOrigin(requestUrl)) {
            return true;
        }

        if (!corsOrigins.length) {
            return false;
        }

        if (corsOrigins.includes(requestOrigin)) {
            return true;
        }

        return corsOrigins.some((allowedOrigin) => {
            const allowedUrl = new URL(allowedOrigin);
            return requestUrl.hostname === allowedUrl.hostname
                && requestUrl.port === allowedUrl.port
                && ['http:', 'https:'].includes(requestUrl.protocol)
                && ['http:', 'https:'].includes(allowedUrl.protocol);
        });
    } catch (error) {
        return false;
    }
};

const normalizeSameSiteValue = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'none') {
        return 'None';
    }

    if (normalized === 'strict') {
        return 'Strict';
    }

    return 'Lax';
};

const getForwardedProtocol = (request) => String(request.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();

const isSecureRequest = (request) => request.secure || getForwardedProtocol(request) === 'https';

const shouldUseCrossSiteSessionCookie = (request) => {
    const requestOrigin = String(request.headers.origin || '').trim();
    return Boolean(requestOrigin) && matchesCorsOrigin(requestOrigin);
};

const getSessionCookiePolicy = (request) => {
    const configuredSameSite = normalizeSameSiteValue(COOKIE_SAME_SITE);
    const requestIsSecure = isSecureRequest(request);

    if (requestIsSecure && (configuredSameSite === 'None' || shouldUseCrossSiteSessionCookie(request))) {
        return { sameSite: 'None', secure: true };
    }

    return {
        sameSite: configuredSameSite,
        secure: COOKIE_SECURE && requestIsSecure
    };
};

const defaultProducts = [
    { id: 201, name: 'Dress Aulia', category: 'Dress Muslimah', price: 185000, stock: 12, description: 'Dress harian dengan bahan adem dan jatuh.', photo: 'gambar1.jpg' },
    { id: 202, name: 'Blouse Meutia', category: 'Blouse Wanita', price: 135000, stock: 18, description: 'Blouse kerja simpel untuk aktivitas harian.', photo: 'gambar3.jpg' },
    { id: 203, name: 'Outer Safa', category: 'Outer Fashion', price: 210000, stock: 9, description: 'Outer premium dengan potongan modern.', photo: 'gambar4.jpg' }
];
const defaultCategories = [
    { id: 101, name: 'Dress Muslimah', note: 'Kategori busana sopan dan elegan.' },
    { id: 102, name: 'Blouse Wanita', note: 'Kategori atasan harian dan formal.' },
    { id: 103, name: 'Outer Fashion', note: 'Kategori pelengkap gaya kasual.' }
];
const defaultCustomers = [
    { id: 301, fullName: 'Siti Rahma', address: 'Banda Aceh', phone: '0812-1111-2222', email: 'siti@example.com' },
    { id: 302, fullName: 'Nadia Putri', address: 'Sigli', phone: '0813-3333-4444', email: 'nadia@example.com' }
];
const defaultSettings = {
    storeName: 'Putroe Shop',
    address: 'Jl. SAMALANGA, KEDAI SAMALANGA',
    whatsapp: '081380134226',
    email: ADMIN_EMAIL,
    logo: 'gambar1.jpg'
};

const sanitizeUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    isAdmin: Boolean(user.isAdmin)
});

const parseCookies = (cookieHeader = '') => cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((cookies, pair) => {
        const separatorIndex = pair.indexOf('=');
        if (separatorIndex <= 0) {
            return cookies;
        }

        const key = pair.slice(0, separatorIndex).trim();
        const value = pair.slice(separatorIndex + 1).trim();
        cookies[key] = decodeURIComponent(value);
        return cookies;
    }, {});

const getAuthorizationToken = (request) => {
    const header = String(request.headers.authorization || '').trim();
    if (!header.toLowerCase().startsWith('bearer ')) {
        return '';
    }

    return header.slice(7).trim();
};

const readLegacyJson = (filePath, fallback) => {
    try {
        if (!fs.existsSync(filePath)) {
            return fallback;
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(fallback)
            ? (Array.isArray(parsed) ? parsed : fallback)
            : (parsed && typeof parsed === 'object' ? parsed : fallback);
    } catch (error) {
        return fallback;
    }
};

const normalizeCustomerPayload = (customer = {}) => ({
    fullName: String(customer.fullName || '').trim(),
    address: String(customer.address || '').trim(),
    phone: String(customer.phone || '').trim(),
    email: String(customer.email || '').trim().toLowerCase()
});

const loginAttempts = new Map();

const getClientIp = (request) => {
    const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwarded || request.socket.remoteAddress || 'unknown';
};

const pruneLoginAttempts = () => {
    const cutoff = Date.now() - LOGIN_RATE_LIMIT_WINDOW_MS;
    for (const [ip, timestamps] of loginAttempts.entries()) {
        const valid = timestamps.filter((time) => time >= cutoff);
        if (valid.length === 0) {
            loginAttempts.delete(ip);
            continue;
        }
        loginAttempts.set(ip, valid);
    }
};

const getRateLimitState = (ip) => {
    pruneLoginAttempts();
    const attempts = loginAttempts.get(ip) || [];
    if (attempts.length < LOGIN_RATE_LIMIT_MAX) {
        return { limited: false, retryAfterSeconds: 0 };
    }

    const oldestAttempt = attempts[0];
    const retryAfterSeconds = Math.max(Math.ceil((oldestAttempt + LOGIN_RATE_LIMIT_WINDOW_MS - Date.now()) / 1000), 1);
    return { limited: true, retryAfterSeconds };
};

const recordFailedLogin = (ip) => {
    pruneLoginAttempts();
    const attempts = loginAttempts.get(ip) || [];
    attempts.push(Date.now());
    loginAttempts.set(ip, attempts);
};

const clearFailedLogins = (ip) => {
    loginAttempts.delete(ip);
};

fs.mkdirSync(DATABASE_DIR, { recursive: true });
const db = new DatabaseSync(SQLITE_FILE);

const withTransaction = (callback) => {
    db.exec('BEGIN');
    try {
        const result = callback();
        db.exec('COMMIT');
        return result;
    } catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
};

const createSchema = () => {
    db.exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            is_admin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price INTEGER NOT NULL,
            stock INTEGER NOT NULL,
            description TEXT,
            photo TEXT
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            note TEXT
        );

        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY,
            full_name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            email TEXT
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY,
            order_code TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            user_email TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            total_price INTEGER NOT NULL,
            payment_method TEXT NOT NULL,
            note TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            store_name TEXT NOT NULL,
            address TEXT NOT NULL,
            whatsapp TEXT NOT NULL,
            email TEXT NOT NULL,
            logo TEXT NOT NULL
        );
    `);
};

const seedRowsIfEmpty = (tableName, countSql, insertCallback) => {
    const current = db.prepare(countSql).get();
    if (Number(current.total) === 0) {
        insertCallback();
    }
};

const migrateLegacyData = () => {
    const legacyUsers = readLegacyJson(USERS_FILE, []);
    const legacyProducts = readLegacyJson(PRODUCTS_FILE, defaultProducts);
    const legacyCategories = readLegacyJson(CATEGORIES_FILE, defaultCategories);
    const legacyCustomers = readLegacyJson(CUSTOMERS_FILE, defaultCustomers);
    const legacyOrders = readLegacyJson(ORDERS_FILE, []);
    const legacySettings = readLegacyJson(SETTINGS_FILE, defaultSettings);
    const legacySessions = readLegacyJson(SESSIONS_FILE, []);

    seedRowsIfEmpty('users', 'SELECT COUNT(*) AS total FROM users', () => {
        const statement = db.prepare(`
            INSERT INTO users (id, name, email, username, password_hash, password_salt, is_admin, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        legacyUsers.forEach((user) => {
            if (!user || !user.passwordHash || !user.passwordSalt) {
                return;
            }
            statement.run(
                Number(user.id) || Date.now(),
                String(user.name || 'User'),
                String(user.email || '').trim().toLowerCase(),
                String(user.username || String(user.email || '').split('@')[0] || `user${Date.now()}`).trim().toLowerCase(),
                String(user.passwordHash),
                String(user.passwordSalt),
                user.isAdmin ? 1 : 0,
                String(user.createdAt || new Date().toISOString())
            );
        });
    });

    seedRowsIfEmpty('products', 'SELECT COUNT(*) AS total FROM products', () => {
        const statement = db.prepare('INSERT INTO products (id, name, category, price, stock, description, photo) VALUES (?, ?, ?, ?, ?, ?, ?)');
        legacyProducts.forEach((product) => {
            statement.run(
                Number(product.id) || Date.now(),
                String(product.name || ''),
                String(product.category || ''),
                Number(product.price) || 0,
                Number(product.stock) || 0,
                String(product.description || ''),
                String(product.photo || '')
            );
        });
    });

    seedRowsIfEmpty('categories', 'SELECT COUNT(*) AS total FROM categories', () => {
        const statement = db.prepare('INSERT INTO categories (id, name, note) VALUES (?, ?, ?)');
        legacyCategories.forEach((category) => {
            statement.run(Number(category.id) || Date.now(), String(category.name || ''), String(category.note || ''));
        });
    });

    seedRowsIfEmpty('customers', 'SELECT COUNT(*) AS total FROM customers', () => {
        const statement = db.prepare('INSERT INTO customers (id, full_name, address, phone, email) VALUES (?, ?, ?, ?, ?)');
        legacyCustomers.forEach((customer) => {
            statement.run(
                Number(customer.id) || Date.now(),
                String(customer.fullName || ''),
                String(customer.address || ''),
                String(customer.phone || ''),
                String(customer.email || '').trim().toLowerCase()
            );
        });
    });

    seedRowsIfEmpty('orders', 'SELECT COUNT(*) AS total FROM orders', () => {
        const statement = db.prepare(`
            INSERT INTO orders (
                id, order_code, user_id, user_name, user_email, customer_name, phone, address,
                product_name, quantity, total_price, payment_method, note, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        legacyOrders.forEach((order) => {
            statement.run(
                Number(order.id) || Date.now(),
                String(order.order_code || `ORD-${Date.now()}`),
                Number(order.user_id) || 0,
                String(order.user_name || ''),
                String(order.user_email || '').trim().toLowerCase(),
                String(order.customer_name || ''),
                String(order.phone || ''),
                String(order.address || ''),
                String(order.product_name || ''),
                Math.max(Number(order.quantity) || 1, 1),
                Number(order.total_price) || 0,
                String(order.payment_method || 'Transfer Bank'),
                String(order.note || ''),
                String(order.status || 'menunggu_konfirmasi'),
                String(order.created_at || new Date().toISOString())
            );
        });
    });

    seedRowsIfEmpty('settings', 'SELECT COUNT(*) AS total FROM settings', () => {
        db.prepare(`
            INSERT INTO settings (id, store_name, address, whatsapp, email, logo)
            VALUES (1, ?, ?, ?, ?, ?)
        `).run(
            String(legacySettings.storeName || defaultSettings.storeName),
            String(legacySettings.address || defaultSettings.address),
            String(legacySettings.whatsapp || defaultSettings.whatsapp),
            String(legacySettings.email || defaultSettings.email),
            String(legacySettings.logo || defaultSettings.logo)
        );
    });

    seedRowsIfEmpty('sessions', 'SELECT COUNT(*) AS total FROM sessions', () => {
        const statement = db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)');
        legacySessions.forEach((session) => {
            if (!session || !session.token || !session.userId) {
                return;
            }
            statement.run(
                String(session.token),
                Number(session.userId),
                String(session.createdAt || new Date().toISOString()),
                String(session.expiresAt || new Date(Date.now() + (SESSION_MAX_AGE_SECONDS * 1000)).toISOString())
            );
        });
    });
};

const ensureAdminUser = () => {
    const credentials = createPasswordHash(ADMIN_PASSWORD);
    const existingAdmin = db.prepare(`
        SELECT id FROM users
        WHERE id = 1 OR lower(email) = lower(?) OR lower(username) = lower(?)
        ORDER BY CASE WHEN id = 1 THEN 0 ELSE 1 END
        LIMIT 1
    `).get(ADMIN_EMAIL, ADMIN_USERNAME);

    if (existingAdmin) {
        db.prepare(`
            UPDATE users
            SET name = ?, email = ?, username = ?, password_hash = ?, password_salt = ?, is_admin = 1
            WHERE id = ?
        `).run(
            ADMIN_NAME,
            ADMIN_EMAIL,
            ADMIN_USERNAME,
            credentials.hash,
            credentials.salt,
            Number(existingAdmin.id)
        );
        return;
    }

    db.prepare(`
        INSERT INTO users (id, name, email, username, password_hash, password_salt, is_admin, created_at)
        VALUES (1, ?, ?, ?, ?, ?, 1, ?)
    `).run(
        ADMIN_NAME,
        ADMIN_EMAIL,
        ADMIN_USERNAME,
        credentials.hash,
        credentials.salt,
        new Date().toISOString()
    );
};

const purgeExpiredSessions = () => {
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
};

const initializeDatabase = () => {
    createSchema();
    withTransaction(() => {
        migrateLegacyData();
        ensureAdminUser();
        purgeExpiredSessions();
    });
};

const mapUserRow = (row) => row ? {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    isAdmin: Boolean(row.is_admin),
    createdAt: row.created_at
} : null;

const getSettings = () => {
    const row = db.prepare('SELECT store_name, address, whatsapp, email, logo FROM settings WHERE id = 1').get();
    return row ? {
        storeName: row.store_name,
        address: row.address,
        whatsapp: row.whatsapp,
        email: row.email,
        logo: row.logo
    } : { ...defaultSettings };
};

const getProducts = () => db.prepare(`
    SELECT id, name, category, price, stock, description, photo
    FROM products ORDER BY id DESC
`).all();

const getCategories = () => db.prepare(`
    SELECT id, name, note FROM categories ORDER BY id DESC
`).all();

const getCustomers = () => db.prepare(`
    SELECT id, full_name AS fullName, address, phone, email FROM customers ORDER BY id DESC
`).all();

const getOrders = () => db.prepare(`
    SELECT id, order_code, user_id, user_name, user_email, customer_name, phone, address,
           product_name, quantity, total_price, payment_method, note, status, created_at
    FROM orders ORDER BY datetime(created_at) DESC, id DESC
`).all();

const replaceProducts = (products) => {
    withTransaction(() => {
        db.prepare('DELETE FROM products').run();
        const statement = db.prepare('INSERT INTO products (id, name, category, price, stock, description, photo) VALUES (?, ?, ?, ?, ?, ?, ?)');
        products.forEach((product) => {
            statement.run(
                Number(product.id) || Date.now(),
                String(product.name || '').trim(),
                String(product.category || '').trim(),
                Number(product.price) || 0,
                Number(product.stock) || 0,
                String(product.description || '').trim(),
                String(product.photo || '').trim()
            );
        });
    });
};

const replaceCategories = (categories) => {
    withTransaction(() => {
        db.prepare('DELETE FROM categories').run();
        const statement = db.prepare('INSERT INTO categories (id, name, note) VALUES (?, ?, ?)');
        categories.forEach((category) => {
            statement.run(Number(category.id) || Date.now(), String(category.name || '').trim(), String(category.note || '').trim());
        });
    });
};

const replaceCustomers = (customers) => {
    withTransaction(() => {
        db.prepare('DELETE FROM customers').run();
        const statement = db.prepare('INSERT INTO customers (id, full_name, address, phone, email) VALUES (?, ?, ?, ?, ?)');
        customers.forEach((customer) => {
            statement.run(
                Number(customer.id) || Date.now(),
                String(customer.fullName || '').trim(),
                String(customer.address || '').trim(),
                String(customer.phone || '').trim(),
                String(customer.email || '').trim().toLowerCase()
            );
        });
    });
};

const saveSettings = (settings) => {
    const nextSettings = { ...defaultSettings, ...settings };
    db.prepare(`
        UPDATE settings
        SET store_name = ?, address = ?, whatsapp = ?, email = ?, logo = ?
        WHERE id = 1
    `).run(
        String(nextSettings.storeName || defaultSettings.storeName).trim(),
        String(nextSettings.address || defaultSettings.address).trim(),
        String(nextSettings.whatsapp || defaultSettings.whatsapp).trim(),
        String(nextSettings.email || defaultSettings.email).trim(),
        String(nextSettings.logo || defaultSettings.logo).trim()
    );
};

const upsertCustomerRecord = (customer) => {
    const normalized = normalizeCustomerPayload(customer);
    if (!normalized.fullName) {
        return;
    }

    const existingCustomer = db.prepare(`
        SELECT id, address, phone, email FROM customers
        WHERE (lower(email) = lower(?) AND lower(full_name) = lower(?))
           OR phone = ?
        LIMIT 1
    `).get(normalized.email, normalized.fullName, normalized.phone);

    if (existingCustomer) {
        db.prepare(`
            UPDATE customers
            SET full_name = ?, address = ?, phone = ?, email = ?
            WHERE id = ?
        `).run(
            normalized.fullName,
            normalized.address || existingCustomer.address || '',
            normalized.phone || existingCustomer.phone || '',
            normalized.email || existingCustomer.email || '',
            Number(existingCustomer.id)
        );
        return;
    }

    db.prepare('INSERT INTO customers (id, full_name, address, phone, email) VALUES (?, ?, ?, ?, ?)').run(
        Date.now(),
        normalized.fullName,
        normalized.address,
        normalized.phone,
        normalized.email
    );
};

const setSessionCookie = (request, response, token) => {
    const cookiePolicy = getSessionCookiePolicy(request);
    const cookieParts = [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        'HttpOnly',
        'Path=/',
        `SameSite=${cookiePolicy.sameSite}`,
        `Max-Age=${SESSION_MAX_AGE_SECONDS}`
    ];
    if (cookiePolicy.secure) {
        cookieParts.push('Secure');
    }
    response.setHeader('Set-Cookie', cookieParts.join('; '));
};

const clearSessionCookie = (request, response) => {
    const cookiePolicy = getSessionCookiePolicy(request);
    const cookieParts = [`${SESSION_COOKIE_NAME}=`, 'HttpOnly', 'Path=/', `SameSite=${cookiePolicy.sameSite}`, 'Max-Age=0'];
    if (cookiePolicy.secure) {
        cookieParts.push('Secure');
    }
    response.setHeader('Set-Cookie', cookieParts.join('; '));
};

const getSessionToken = (request) => {
    const bearerToken = getAuthorizationToken(request);
    if (bearerToken) {
        return bearerToken;
    }

    const cookies = parseCookies(request.headers.cookie || '');
    return cookies[SESSION_COOKIE_NAME] || '';
};

const verifyPassword = (password, user) => {
    if (!user || !user.passwordHash || !user.passwordSalt) {
        return false;
    }

    const candidateHash = crypto.scryptSync(String(password), user.passwordSalt, 64).toString('hex');
    const expected = Buffer.from(String(user.passwordHash), 'hex');
    const actual = Buffer.from(candidateHash, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const findUserByIdentifier = (identifier) => {
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    const row = db.prepare(`
        SELECT id, name, email, username, password_hash, password_salt, is_admin, created_at
        FROM users
        WHERE lower(email) = ? OR lower(username) = ?
        LIMIT 1
    `).get(normalizedIdentifier, normalizedIdentifier);
    return mapUserRow(row);
};

const findUserByEmail = (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const row = db.prepare(`
        SELECT id, name, email, username, password_hash, password_salt, is_admin, created_at
        FROM users WHERE lower(email) = ? LIMIT 1
    `).get(normalizedEmail);
    return mapUserRow(row);
};

const getAuthenticatedUser = (request) => {
    purgeExpiredSessions();
    const token = getSessionToken(request);
    if (!token) {
        return null;
    }

    const session = db.prepare(`
        SELECT s.user_id, u.id, u.name, u.email, u.username, u.password_hash, u.password_salt, u.is_admin, u.created_at
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
        LIMIT 1
    `).get(token);
    return mapUserRow(session);
};

const requireAuth = (request, response, next) => {
    const user = getAuthenticatedUser(request);
    if (!user) {
        response.status(401).json({ message: 'Silakan login terlebih dahulu.' });
        return;
    }

    request.user = user;
    next();
};

const requireAdmin = (request, response, next) => {
    const user = getAuthenticatedUser(request);
    if (!user) {
        response.status(401).json({ message: 'Silakan login terlebih dahulu.' });
        return;
    }

    if (!user.isAdmin) {
        response.status(403).json({ message: 'Akses admin diperlukan.' });
        return;
    }

    request.user = user;
    next();
};

app.disable('x-powered-by');
app.use((request, response, next) => {
    const requestOrigin = String(request.headers.origin || '').trim();
    if (matchesCorsOrigin(requestOrigin)) {
        response.setHeader('Access-Control-Allow-Origin', requestOrigin);
        response.setHeader('Vary', 'Origin');
        response.setHeader('Access-Control-Allow-Credentials', 'true');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    }

    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://wa.me");

    if (request.method === 'OPTIONS') {
        response.status(204).end();
        return;
    }

    next();
});
app.use(express.json({ limit: '64kb' }));

app.use((error, request, response, next) => {
    if (error instanceof SyntaxError && 'body' in error) {
        response.status(400).json({ message: 'Format JSON tidak valid.' });
        return;
    }
    next(error);
});

app.get('/api/health', (request, response) => {
    response.json({ ok: true, message: 'Backend Putroe Shop aktif.', storage: 'sqlite' });
});

app.get('/api/store/bootstrap', (request, response) => {
    const user = getAuthenticatedUser(request);
    const isAdmin = Boolean(user && user.isAdmin);
    response.json({
        products: getProducts(),
        categories: getCategories(),
        customers: isAdmin ? getCustomers() : [],
        orders: isAdmin ? getOrders() : [],
        settings: getSettings()
    });
});

app.get('/api/auth/me', (request, response) => {
    const user = getAuthenticatedUser(request);
    response.json({
        authenticated: Boolean(user),
        user: user ? sanitizeUser(user) : null
    });
});

app.post('/api/auth/login', (request, response) => {
    const identifier = String(request.body.email || request.body.username || '').trim();
    const password = String(request.body.password || '');
    const ip = getClientIp(request);
    const rateLimit = getRateLimitState(ip);

    if (rateLimit.limited) {
        response.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
        response.status(429).json({ message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.' });
        return;
    }

    if (!identifier || !password) {
        response.status(400).json({ message: 'Username atau email serta password wajib diisi.' });
        return;
    }

    const user = findUserByIdentifier(identifier);
    if (!verifyPassword(password, user)) {
        recordFailedLogin(ip);
        response.status(401).json({ message: 'Login gagal. Periksa username atau password.' });
        return;
    }

    clearFailedLogins(ip);
    const token = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (SESSION_MAX_AGE_SECONDS * 1000)).toISOString();

    withTransaction(() => {
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(Number(user.id));
        db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, Number(user.id), createdAt, expiresAt);
    });

    setSessionCookie(request, response, token);
    response.json({ message: 'Login berhasil.', user: sanitizeUser(user), token, tokenType: 'Bearer' });
});

app.post('/api/auth/register', (request, response) => {
    if (!ALLOW_PUBLIC_REGISTRATION) {
        response.status(403).json({ message: 'Registrasi publik dinonaktifkan pada server ini.' });
        return;
    }

    const name = String(request.body.name || '').trim();
    const email = String(request.body.email || '').trim().toLowerCase();
    const password = String(request.body.password || '');

    if (!name || !email || !password) {
        response.status(400).json({ message: 'Nama, email, dan password wajib diisi.' });
        return;
    }

    if (findUserByEmail(email)) {
        response.status(409).json({ message: 'Email sudah terdaftar.' });
        return;
    }

    const credentials = createPasswordHash(password);
    const usernameBase = email.split('@')[0] || `user${Date.now()}`;
    db.prepare(`
        INSERT INTO users (id, name, email, username, password_hash, password_salt, is_admin, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
        Date.now(),
        name,
        email,
        usernameBase,
        credentials.hash,
        credentials.salt,
        new Date().toISOString()
    );

    response.status(201).json({ message: 'Registrasi berhasil. Silakan login.' });
});

app.post('/api/auth/logout', (request, response) => {
    const token = getSessionToken(request);
    if (token) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    clearSessionCookie(request, response);
    response.json({ message: 'Anda berhasil logout.' });
});

app.post('/api/orders', requireAuth, (request, response) => {
    const quantity = Math.max(Number(request.body.jumlah) || 1, 1);
    const totalPrice = Number(request.body.totalHarga) || Number(request.body.total_price) || 0;
    const orderId = Date.now();
    const newOrder = {
        id: orderId,
        order_code: String(request.body.orderNumber || `ORD-${String(orderId).slice(-6)}`),
        user_id: request.user.id,
        user_name: request.user.name,
        user_email: request.user.email,
        customer_name: String(request.body.nama || request.user.name || '').trim(),
        phone: String(request.body.telepon || '').trim(),
        address: String(request.body.alamat || '').trim(),
        product_name: String(request.body.produk || request.body.product_name || 'Pesanan Website').trim(),
        quantity,
        total_price: totalPrice,
        payment_method: String(request.body.pembayaran || 'Transfer Bank').trim(),
        note: String(request.body.pesan || 'Tidak ada catatan.').trim(),
        status: String(request.body.status || 'menunggu_konfirmasi').trim(),
        created_at: new Date().toISOString()
    };

    withTransaction(() => {
        db.prepare(`
            INSERT INTO orders (
                id, order_code, user_id, user_name, user_email, customer_name, phone, address,
                product_name, quantity, total_price, payment_method, note, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            newOrder.id,
            newOrder.order_code,
            Number(newOrder.user_id),
            newOrder.user_name,
            newOrder.user_email,
            newOrder.customer_name,
            newOrder.phone,
            newOrder.address,
            newOrder.product_name,
            newOrder.quantity,
            newOrder.total_price,
            newOrder.payment_method,
            newOrder.note,
            newOrder.status,
            newOrder.created_at
        );
        upsertCustomerRecord({
            fullName: newOrder.customer_name,
            address: newOrder.address,
            phone: newOrder.phone,
            email: newOrder.user_email
        });
    });

    response.status(201).json({ message: 'Pesanan berhasil disimpan.', order: newOrder });
});

app.get('/api/orders/my', requireAuth, (request, response) => {
    const statement = db.prepare(`
        SELECT id, order_code, user_id, user_name, user_email, customer_name, phone, address,
               product_name, quantity, total_price, payment_method, note, status, created_at
        FROM orders WHERE user_id = ? ORDER BY datetime(created_at) DESC, id DESC
    `);
    response.json({ orders: statement.all(Number(request.user.id)) });
});

app.get('/api/admin/orders', requireAdmin, (request, response) => {
    response.json({ orders: getOrders() });
});

app.patch('/api/admin/orders/:id/status', requireAdmin, (request, response) => {
    const orderId = Number(request.params.id);
    const nextStatus = String(request.body.status || '').trim();
    const targetOrder = db.prepare(`
        SELECT id, order_code, user_id, user_name, user_email, customer_name, phone, address,
               product_name, quantity, total_price, payment_method, note, status, created_at
        FROM orders WHERE id = ? LIMIT 1
    `).get(orderId);

    if (!targetOrder) {
        response.status(404).json({ message: 'Pesanan tidak ditemukan.' });
        return;
    }

    if (!nextStatus) {
        response.status(400).json({ message: 'Status pesanan wajib diisi.' });
        return;
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(nextStatus, orderId);
    response.json({ message: 'Status pesanan berhasil diperbarui.', order: { ...targetOrder, status: nextStatus } });
});

app.post('/api/admin/store/sync', requireAdmin, (request, response) => {
    let changed = false;

    if (Array.isArray(request.body.products)) {
        replaceProducts(request.body.products);
        changed = true;
    }

    if (Array.isArray(request.body.categories)) {
        replaceCategories(request.body.categories);
        changed = true;
    }

    if (Array.isArray(request.body.customers)) {
        replaceCustomers(request.body.customers);
        changed = true;
    }

    if (request.body.settings && typeof request.body.settings === 'object' && !Array.isArray(request.body.settings)) {
        saveSettings(request.body.settings);
        changed = true;
    }

    if (!changed) {
        response.status(400).json({ message: 'Tidak ada data admin yang dikirim untuk disimpan.' });
        return;
    }

    response.json({ message: 'Data dashboard admin berhasil disimpan ke SQLite.' });
});

app.use(express.static(ROOT_DIR));

app.get('/', (request, response) => {
    response.sendFile(path.join(ROOT_DIR, 'index.html'));
});

initializeDatabase();
app.listen(PORT, () => {
    console.log(`Putroe Shop berjalan di http://localhost:${PORT}`);
});