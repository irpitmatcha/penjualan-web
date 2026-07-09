const express = require('express');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const DATABASE_DIR = path.join(ROOT_DIR, 'database');
const USERS_FILE = path.join(DATABASE_DIR, 'users.json');
const ORDERS_FILE = path.join(DATABASE_DIR, 'orders.json');
const PRODUCTS_FILE = path.join(DATABASE_DIR, 'products.json');
const CATEGORIES_FILE = path.join(DATABASE_DIR, 'categories.json');
const CUSTOMERS_FILE = path.join(DATABASE_DIR, 'customers.json');
const SETTINGS_FILE = path.join(DATABASE_DIR, 'settings.json');
const SESSIONS_FILE = path.join(DATABASE_DIR, 'sessions.json');
const SESSION_COOKIE_NAME = 'putroe_session';
const DEFAULT_ADMIN_PASSWORD = 'admin12345';

const createPasswordHash = (password, salt = crypto.randomBytes(16).toString('hex')) => ({
    salt,
    hash: crypto.scryptSync(String(password), salt, 64).toString('hex')
});

const defaultAdminCredentials = createPasswordHash(DEFAULT_ADMIN_PASSWORD, 'putroe-shop-admin-salt');

const defaultUsers = [
    {
        id: 1,
        name: 'Admin Putroe Shop',
        email: 'admin@putroeshop.com',
        username: 'admin',
        passwordHash: '3e6f44beb399f4140dd4f434b3da1a33c012112d27928731076db9f80055244cb448d2c14d113cc2b9ff1c92349042f42d00e04c218485eadf861021744cf980',
        passwordSalt: defaultAdminCredentials.salt,
        isAdmin: true,
        createdAt: '2026-07-09T00:00:00.000Z'
    }
];

const defaultOrders = [];
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
    address: 'Jl. UMKM Putroe Shop, Banda Aceh',
    whatsapp: '0812-3456-7890',
    email: 'admin@putroeshop.com',
    logo: 'logo-putroe-shop.png'
};
const defaultSessions = [];

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

const ensureJsonFile = async (filePath, fallbackData) => {
    try {
        await fs.access(filePath);
    } catch (error) {
        await fs.writeFile(filePath, `${JSON.stringify(fallbackData, null, 4)}\n`, 'utf8');
    }
};

const readJsonFile = async (filePath, fallbackData) => {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(fallbackData)
            ? (Array.isArray(parsed) ? parsed : fallbackData)
            : (parsed && typeof parsed === 'object' ? parsed : fallbackData);
    } catch (error) {
        return fallbackData;
    }
};

const writeJsonFile = async (filePath, data) => {
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 4)}\n`, 'utf8');
};

const initializeDatabase = async () => {
    await fs.mkdir(DATABASE_DIR, { recursive: true });
    await ensureJsonFile(USERS_FILE, defaultUsers);
    await ensureJsonFile(ORDERS_FILE, defaultOrders);
    await ensureJsonFile(PRODUCTS_FILE, defaultProducts);
    await ensureJsonFile(CATEGORIES_FILE, defaultCategories);
    await ensureJsonFile(CUSTOMERS_FILE, defaultCustomers);
    await ensureJsonFile(SETTINGS_FILE, defaultSettings);
    await ensureJsonFile(SESSIONS_FILE, defaultSessions);
};

const getUsers = () => readJsonFile(USERS_FILE, defaultUsers);
const saveUsers = (users) => writeJsonFile(USERS_FILE, users);
const getOrders = () => readJsonFile(ORDERS_FILE, defaultOrders);
const saveOrders = (orders) => writeJsonFile(ORDERS_FILE, orders);
const getProducts = () => readJsonFile(PRODUCTS_FILE, defaultProducts);
const saveProducts = (products) => writeJsonFile(PRODUCTS_FILE, products);
const getCategories = () => readJsonFile(CATEGORIES_FILE, defaultCategories);
const saveCategories = (categories) => writeJsonFile(CATEGORIES_FILE, categories);
const getCustomers = () => readJsonFile(CUSTOMERS_FILE, defaultCustomers);
const saveCustomers = (customers) => writeJsonFile(CUSTOMERS_FILE, customers);
const getSettings = () => readJsonFile(SETTINGS_FILE, defaultSettings);
const saveSettings = (settings) => writeJsonFile(SETTINGS_FILE, settings);
const getSessions = () => readJsonFile(SESSIONS_FILE, defaultSessions);
const saveSessions = (sessions) => writeJsonFile(SESSIONS_FILE, sessions);

const normalizeCustomerPayload = (customer = {}) => ({
    fullName: String(customer.fullName || '').trim(),
    address: String(customer.address || '').trim(),
    phone: String(customer.phone || '').trim(),
    email: String(customer.email || '').trim().toLowerCase()
});

const upsertCustomerRecord = (customers, customer) => {
    const normalized = normalizeCustomerPayload(customer);
    if (!normalized.fullName) {
        return customers;
    }

    const existingCustomer = customers.find((item) => {
        const sameEmail = normalized.email
            && String(item.email || '').trim().toLowerCase() === normalized.email
            && String(item.fullName || '').trim().toLowerCase() === normalized.fullName.toLowerCase();
        const samePhone = normalized.phone && String(item.phone || '').trim() === normalized.phone;
        return sameEmail || samePhone;
    });

    if (existingCustomer) {
        existingCustomer.fullName = normalized.fullName;
        existingCustomer.address = normalized.address || existingCustomer.address || '';
        existingCustomer.phone = normalized.phone || existingCustomer.phone || '';
        existingCustomer.email = normalized.email || existingCustomer.email || '';
        return customers;
    }

    customers.unshift({
        id: Date.now(),
        ...normalized
    });
    return customers;
};

const setSessionCookie = (response, token) => {
    const cookieParts = [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        'HttpOnly',
        'Path=/',
        'SameSite=Lax',
        `Max-Age=${60 * 60 * 24 * 7}`
    ];
    response.setHeader('Set-Cookie', cookieParts.join('; '));
};

const clearSessionCookie = (response) => {
    response.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
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

const findUserByIdentifier = (users, identifier) => {
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    return users.find((user) => {
        const email = String(user.email || '').trim().toLowerCase();
        const username = String(user.username || email.split('@')[0] || '').trim().toLowerCase();
        return normalizedIdentifier === email || normalizedIdentifier === username;
    }) || null;
};

const getAuthenticatedUser = async (request) => {
    const cookies = parseCookies(request.headers.cookie || '');
    const token = cookies[SESSION_COOKIE_NAME];
    if (!token) {
        return null;
    }

    const sessions = await getSessions();
    const activeSession = sessions.find((session) => session.token === token);
    if (!activeSession) {
        return null;
    }

    if (new Date(activeSession.expiresAt).getTime() <= Date.now()) {
        await saveSessions(sessions.filter((session) => session.token !== token));
        return null;
    }

    const users = await getUsers();
    return users.find((user) => Number(user.id) === Number(activeSession.userId)) || null;
};

const requireAuth = async (request, response, next) => {
    const user = await getAuthenticatedUser(request);
    if (!user) {
        response.status(401).json({ message: 'Silakan login terlebih dahulu.' });
        return;
    }

    request.user = user;
    next();
};

const requireAdmin = async (request, response, next) => {
    const user = await getAuthenticatedUser(request);
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

app.use(express.json());

app.get('/api/health', (request, response) => {
    response.json({ ok: true, message: 'Backend Putroe Shop aktif.' });
});

app.get('/api/store/bootstrap', async (request, response) => {
    const user = await getAuthenticatedUser(request);
    const isAdmin = Boolean(user && user.isAdmin);
    const [products, categories, settings, customers, orders] = await Promise.all([
        getProducts(),
        getCategories(),
        getSettings(),
        isAdmin ? getCustomers() : Promise.resolve([]),
        isAdmin ? getOrders() : Promise.resolve([])
    ]);

    response.json({
        products,
        categories,
        customers,
        orders,
        settings
    });
});

app.get('/api/auth/me', async (request, response) => {
    const user = await getAuthenticatedUser(request);
    response.json({
        authenticated: Boolean(user),
        user: user ? sanitizeUser(user) : null
    });
});

app.post('/api/auth/login', async (request, response) => {
    const identifier = String(request.body.email || request.body.username || '').trim();
    const password = String(request.body.password || '');

    if (!identifier || !password) {
        response.status(400).json({ message: 'Username atau email serta password wajib diisi.' });
        return;
    }

    const users = await getUsers();
    const user = findUserByIdentifier(users, identifier);
    if (!verifyPassword(password, user)) {
        response.status(401).json({ message: 'Login gagal. Periksa username atau password.' });
        return;
    }

    const sessions = await getSessions();
    const token = crypto.randomUUID();
    const nextSessions = sessions.filter((session) => Number(session.userId) !== Number(user.id));
    nextSessions.push({
        token,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (1000 * 60 * 60 * 24 * 7)).toISOString()
    });
    await saveSessions(nextSessions);
    setSessionCookie(response, token);

    response.json({
        message: 'Login berhasil.',
        user: sanitizeUser(user)
    });
});

app.post('/api/auth/register', async (request, response) => {
    const name = String(request.body.name || '').trim();
    const email = String(request.body.email || '').trim().toLowerCase();
    const password = String(request.body.password || '');

    if (!name || !email || !password) {
        response.status(400).json({ message: 'Nama, email, dan password wajib diisi.' });
        return;
    }

    const users = await getUsers();
    const existingUser = users.find((user) => String(user.email || '').trim().toLowerCase() === email);
    if (existingUser) {
        response.status(409).json({ message: 'Email sudah terdaftar.' });
        return;
    }

    const credentials = createPasswordHash(password);
    const usernameBase = email.split('@')[0] || `user${Date.now()}`;
    const newUser = {
        id: Date.now(),
        name,
        email,
        username: usernameBase,
        passwordHash: credentials.hash,
        passwordSalt: credentials.salt,
        isAdmin: false,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers(users);
    response.status(201).json({ message: 'Registrasi berhasil. Silakan login.' });
});

app.post('/api/auth/logout', async (request, response) => {
    const cookies = parseCookies(request.headers.cookie || '');
    const token = cookies[SESSION_COOKIE_NAME];
    if (token) {
        const sessions = await getSessions();
        await saveSessions(sessions.filter((session) => session.token !== token));
    }

    clearSessionCookie(response);
    response.json({ message: 'Anda berhasil logout.' });
});

app.post('/api/orders', requireAuth, async (request, response) => {
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

    const [orders, customers] = await Promise.all([getOrders(), getCustomers()]);
    orders.unshift(newOrder);
    upsertCustomerRecord(customers, {
        fullName: newOrder.customer_name,
        address: newOrder.address,
        phone: newOrder.phone,
        email: newOrder.user_email
    });
    await Promise.all([
        saveOrders(orders),
        saveCustomers(customers)
    ]);
    response.status(201).json({ message: 'Pesanan berhasil disimpan.', order: newOrder });
});

app.get('/api/orders/my', requireAuth, async (request, response) => {
    const orders = await getOrders();
    response.json({
        orders: orders.filter((order) => Number(order.user_id) === Number(request.user.id))
    });
});

app.get('/api/admin/orders', requireAdmin, async (request, response) => {
    const orders = await getOrders();
    response.json({ orders });
});

app.patch('/api/admin/orders/:id/status', requireAdmin, async (request, response) => {
    const orderId = Number(request.params.id);
    const nextStatus = String(request.body.status || '').trim();
    const orders = await getOrders();
    const targetOrder = orders.find((order) => Number(order.id) === orderId);

    if (!targetOrder) {
        response.status(404).json({ message: 'Pesanan tidak ditemukan.' });
        return;
    }

    if (!nextStatus) {
        response.status(400).json({ message: 'Status pesanan wajib diisi.' });
        return;
    }

    targetOrder.status = nextStatus;
    await saveOrders(orders);
    response.json({ message: 'Status pesanan berhasil diperbarui.', order: targetOrder });
});

app.post('/api/admin/store/sync', requireAdmin, async (request, response) => {
    const tasks = [];

    if (Array.isArray(request.body.products)) {
        tasks.push(saveProducts(request.body.products));
    }

    if (Array.isArray(request.body.categories)) {
        tasks.push(saveCategories(request.body.categories));
    }

    if (Array.isArray(request.body.customers)) {
        tasks.push(saveCustomers(request.body.customers));
    }

    if (request.body.settings && typeof request.body.settings === 'object' && !Array.isArray(request.body.settings)) {
        tasks.push(saveSettings({ ...defaultSettings, ...request.body.settings }));
    }

    if (tasks.length === 0) {
        response.status(400).json({ message: 'Tidak ada data admin yang dikirim untuk disimpan.' });
        return;
    }

    await Promise.all(tasks);
    response.json({ message: 'Data dashboard admin berhasil disimpan ke file.' });
});

app.use(express.static(ROOT_DIR));

app.get('/', (request, response) => {
    response.sendFile(path.join(ROOT_DIR, 'index.html'));
});

initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Putroe Shop berjalan di http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Gagal menyiapkan database file-based.', error);
        process.exit(1);
    });