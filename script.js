const formatRupiah = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
}).format(value);

let activeSession = null;
let allowRemoteAdminSync = false;

const getCurrentPage = () => {
    const current = window.location.pathname.split('/').pop();
    return current || 'index.html';
};

const getNextPageParam = () => {
    const queryValue = new URLSearchParams(window.location.search).get('next');
    if (!queryValue || !queryValue.endsWith('.html') || queryValue.includes('/')) {
        return null;
    }

    return queryValue;
};

const buildLoginUrl = (targetPage) => `login.html?next=${encodeURIComponent(targetPage)}`;

const getDefaultPostLoginPage = (user) => {
    if (user && user.isAdmin) {
        return 'admin.html#products';
    }

    return 'profil.html';
};

const demoStorageKeys = {
    users: 'putroeDemoUsers',
    session: 'putroeDemoSession',
    orders: 'putroeDemoOrders',
    products: 'putroeDemoProducts',
    categories: 'putroeDemoCategories',
    customers: 'putroeDemoCustomers',
    settings: 'putroeDemoSettings'
};

const demoAdminAccount = {
    id: 1,
    name: 'Admin Putroe Shop',
    email: 'admin@putroeshop.com',
    password: 'admin12345',
    isAdmin: true
};

const parseStoredJson = (key, fallback) => {
    try {
        const rawValue = localStorage.getItem(key);
        return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
        return fallback;
    }
};

const saveStoredJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const pushAdminCollectionToServer = (collectionName, value) => {
    if (!allowRemoteAdminSync || window.location.protocol === 'file:') {
        return;
    }

    fetch('/api/admin/store/sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [collectionName]: value })
    }).catch(() => {
        // Cache lokal tetap menjadi fallback bila sinkronisasi server gagal.
    });
};

const sanitizeSessionUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: Boolean(user.isAdmin)
});

const getDemoUsers = () => {
    const storedUsers = parseStoredJson(demoStorageKeys.users, []);
    return Array.isArray(storedUsers) ? storedUsers : [];
};

const saveDemoUsers = (users) => {
    saveStoredJson(demoStorageKeys.users, users);
};

const getDemoOrders = () => {
    const storedOrders = parseStoredJson(demoStorageKeys.orders, []);
    return Array.isArray(storedOrders) ? storedOrders : [];
};

const saveDemoOrders = (orders) => {
    saveStoredJson(demoStorageKeys.orders, orders);
};

const getDemoProducts = () => {
    const storedProducts = parseStoredJson(demoStorageKeys.products, []);
    return Array.isArray(storedProducts) ? storedProducts : [];
};

const saveDemoProducts = (products) => {
    saveStoredJson(demoStorageKeys.products, products);
    pushAdminCollectionToServer('products', products);
};

const getDemoCategories = () => {
    const storedCategories = parseStoredJson(demoStorageKeys.categories, []);
    return Array.isArray(storedCategories) ? storedCategories : [];
};

const saveDemoCategories = (categories) => {
    saveStoredJson(demoStorageKeys.categories, categories);
    pushAdminCollectionToServer('categories', categories);
};

const getDemoCustomers = () => {
    const storedCustomers = parseStoredJson(demoStorageKeys.customers, []);
    return Array.isArray(storedCustomers) ? storedCustomers : [];
};

const saveDemoCustomers = (customers) => {
    saveStoredJson(demoStorageKeys.customers, customers);
    pushAdminCollectionToServer('customers', customers);
};

const getDefaultDemoSettings = () => ({
    storeName: 'Putroe Shop',
    address: 'Jl. UMKM Putroe Shop, Banda Aceh',
    whatsapp: '0812-3456-7890',
    email: 'admin@putroeshop.com',
    logo: 'logo-putroe-shop.png'
});

const getDemoSettings = () => {
    const storedSettings = parseStoredJson(demoStorageKeys.settings, getDefaultDemoSettings());
    return storedSettings && typeof storedSettings === 'object'
        ? { ...getDefaultDemoSettings(), ...storedSettings }
        : getDefaultDemoSettings();
};

const saveDemoSettings = (settings) => {
    saveStoredJson(demoStorageKeys.settings, settings);
    pushAdminCollectionToServer('settings', settings);
};

const seedDemoData = () => {
    if (!localStorage.getItem(demoStorageKeys.categories)) {
        saveDemoCategories([
            { id: 101, name: 'Dress Muslimah', note: 'Kategori busana sopan dan elegan.' },
            { id: 102, name: 'Blouse Wanita', note: 'Kategori atasan harian dan formal.' },
            { id: 103, name: 'Outer Fashion', note: 'Kategori pelengkap gaya kasual.' }
        ]);
    }

    if (!localStorage.getItem(demoStorageKeys.products)) {
        saveDemoProducts([
            { id: 201, name: 'Dress Aulia', category: 'Dress Muslimah', price: 185000, stock: 12, description: 'Dress harian dengan bahan adem dan jatuh.', photo: 'gambar1.jpg' },
            { id: 202, name: 'Blouse Meutia', category: 'Blouse Wanita', price: 135000, stock: 18, description: 'Blouse kerja simpel untuk aktivitas harian.', photo: 'gambar3.jpg' },
            { id: 203, name: 'Outer Safa', category: 'Outer Fashion', price: 210000, stock: 9, description: 'Outer premium dengan potongan modern.', photo: 'gambar4.jpg' }
        ]);
    }

    if (!localStorage.getItem(demoStorageKeys.customers)) {
        saveDemoCustomers([
            { id: 301, fullName: 'Siti Rahma', address: 'Banda Aceh', phone: '0812-1111-2222', email: 'siti@example.com' },
            { id: 302, fullName: 'Nadia Putri', address: 'Sigli', phone: '0813-3333-4444', email: 'nadia@example.com' }
        ]);
    }

    if (!localStorage.getItem(demoStorageKeys.settings)) {
        saveDemoSettings(getDefaultDemoSettings());
    }
};

const upsertDemoCustomer = (customer) => {
    const fullName = String(customer.fullName || '').trim();
    const phone = String(customer.phone || '').trim();
    const email = String(customer.email || '').trim().toLowerCase();

    if (!fullName) {
        return;
    }

    const customers = getDemoCustomers();
    const existingCustomer = customers.find((item) => {
        const sameEmail = email
            && String(item.email || '').trim().toLowerCase() === email
            && String(item.fullName || '').trim().toLowerCase() === fullName.toLowerCase();
        const samePhone = phone && String(item.phone || '').trim() === phone;
        return sameEmail || samePhone;
    });

    if (existingCustomer) {
        existingCustomer.fullName = fullName;
        existingCustomer.address = String(customer.address || existingCustomer.address || '').trim();
        existingCustomer.phone = phone || existingCustomer.phone || '';
        existingCustomer.email = email || existingCustomer.email || '';
    } else {
        customers.unshift({
            id: Date.now(),
            fullName,
            address: String(customer.address || '').trim(),
            phone,
            email
        });
    }

    saveDemoCustomers(customers);
};

const getOrderTotalValue = (order) => Number(order.total_price) || 0;

seedDemoData();

const getDemoSession = () => {
    const session = parseStoredJson(demoStorageKeys.session, null);
    if (!session || typeof session !== 'object') {
        return null;
    }

    return sanitizeSessionUser(session);
};

const setDemoSession = (user) => {
    saveStoredJson(demoStorageKeys.session, sanitizeSessionUser(user));
};

const clearDemoSession = () => {
    localStorage.removeItem(demoStorageKeys.session);
};

const findDemoUserByCredentials = (identifier, password) => {
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');
    const candidates = [demoAdminAccount, ...getDemoUsers()];

    return candidates.find((user) => {
        const email = String(user.email || '').toLowerCase();
        const username = email.split('@')[0];
        return (normalizedIdentifier === email || normalizedIdentifier === username)
            && normalizedPassword === String(user.password || '');
    }) || null;
};

const handleLocalDemoRequest = (url, options = {}) => {
    const method = String(options.method || 'GET').toUpperCase();
    const payload = options.body || {};
    const session = getDemoSession();

    if (url === '/api/auth/me' && method === 'GET') {
        return session
            ? { ok: true, authenticated: true, user: session }
            : { ok: true, authenticated: false, user: null };
    }

    if (url === '/api/auth/login' && method === 'POST') {
        const user = findDemoUserByCredentials(payload.email, payload.password);
        if (!user) {
            return {
                ok: false,
                message: 'Login gagal. Gunakan admin / admin12345 atau akun yang sudah didaftarkan.'
            };
        }

        setDemoSession(user);
        return {
            ok: true,
            message: 'Login berhasil. Mode demo lokal aktif.',
            user: sanitizeSessionUser(user)
        };
    }

    if (url === '/api/auth/register' && method === 'POST') {
        const email = String(payload.email || '').trim().toLowerCase();
        const name = String(payload.name || '').trim();
        const password = String(payload.password || '');

        if (!name || !email || !password) {
            return { ok: false, message: 'Nama, email, dan password wajib diisi.' };
        }

        const existingUser = [demoAdminAccount, ...getDemoUsers()].find((user) => String(user.email || '').toLowerCase() === email);
        if (existingUser) {
            return { ok: false, message: 'Email sudah terdaftar.' };
        }

        const users = getDemoUsers();
        const newUser = {
            id: Date.now(),
            name,
            email,
            password,
            isAdmin: false
        };

        users.push(newUser);
        saveDemoUsers(users);
        return { ok: true, message: 'Registrasi berhasil. Silakan login.' };
    }

    if (url === '/api/auth/logout' && method === 'POST') {
        clearDemoSession();
        return { ok: true, message: 'Anda berhasil logout.' };
    }

    if (url === '/api/store/bootstrap' && method === 'GET') {
        return {
            ok: true,
            products: getDemoProducts(),
            categories: getDemoCategories(),
            customers: session && session.isAdmin ? getDemoCustomers() : [],
            orders: session && session.isAdmin ? getDemoOrders() : [],
            settings: getDemoSettings()
        };
    }

    if (url === '/api/admin/store/sync' && method === 'POST') {
        if (!session || !session.isAdmin) {
            return { ok: false, message: 'Akses admin diperlukan.' };
        }

        if (Array.isArray(payload.products)) {
            saveStoredJson(demoStorageKeys.products, payload.products);
        }

        if (Array.isArray(payload.categories)) {
            saveStoredJson(demoStorageKeys.categories, payload.categories);
        }

        if (Array.isArray(payload.customers)) {
            saveStoredJson(demoStorageKeys.customers, payload.customers);
        }

        if (payload.settings && typeof payload.settings === 'object') {
            saveStoredJson(demoStorageKeys.settings, payload.settings);
        }

        return { ok: true, message: 'Data admin lokal diperbarui.' };
    }

    if (url === '/api/orders' && method === 'POST') {
        if (!session) {
            return { ok: false, message: 'Silakan login terlebih dahulu.' };
        }

        const orders = getDemoOrders();
        const quantity = Math.max(Number(payload.jumlah) || 1, 1);
        const totalPrice = Number(payload.totalHarga) || Number(payload.total_price) || 0;
        const newOrder = {
            id: Date.now(),
            order_code: `ORD-${String(Date.now()).slice(-6)}`,
            user_id: session.id,
            user_name: session.name,
            user_email: session.email,
            customer_name: String(payload.nama || session.name || '').trim(),
            phone: String(payload.telepon || '').trim(),
            address: String(payload.alamat || '').trim(),
            product_name: String(payload.produk || 'Pesanan Website').trim(),
            quantity,
            total_price: totalPrice,
            payment_method: String(payload.pembayaran || 'Transfer Bank').trim(),
            note: String(payload.pesan || 'Tidak ada catatan.').trim(),
            status: String(payload.status || 'menunggu_konfirmasi'),
            created_at: new Date().toISOString()
        };

        orders.unshift(newOrder);
        saveDemoOrders(orders);
        upsertDemoCustomer({
            fullName: newOrder.customer_name,
            address: newOrder.address,
            phone: newOrder.phone,
            email: newOrder.user_email
        });
        return { ok: true, message: 'Pesanan demo berhasil disimpan.', order: newOrder };
    }

    if (url === '/api/orders/my' && method === 'GET') {
        if (!session) {
            return { ok: false, message: 'Silakan login terlebih dahulu.' };
        }

        const orders = getDemoOrders().filter((order) => Number(order.user_id) === Number(session.id));
        return { ok: true, orders };
    }

    if (url === '/api/admin/orders' && method === 'GET') {
        if (!session || !session.isAdmin) {
            return { ok: false, message: 'Akses admin diperlukan.' };
        }

        return { ok: true, orders: getDemoOrders() };
    }

    const adminStatusMatch = url.match(/^\/api\/admin\/orders\/(\d+)\/status$/);
    if (adminStatusMatch && method === 'PATCH') {
        if (!session || !session.isAdmin) {
            return { ok: false, message: 'Akses admin diperlukan.' };
        }

        const orderId = Number(adminStatusMatch[1]);
        const orders = getDemoOrders();
        const targetOrder = orders.find((order) => Number(order.id) === orderId);

        if (!targetOrder) {
            return { ok: false, message: 'Pesanan tidak ditemukan.' };
        }

        targetOrder.status = String(payload.status || targetOrder.status);
        saveDemoOrders(orders);
        return { ok: true, message: 'Status pesanan berhasil diperbarui.', order: targetOrder };
    }

    return {
        ok: false,
        message: 'Backend belum aktif dan endpoint ini belum didukung pada mode demo lokal.'
    };
};

const closeAllAccountMenus = () => {
    // Login tetap dipisah per halaman, tidak memakai dropdown akun di beranda.
};

const setupAccountMenu = () => {
    return;
};

const requestAuthApi = async (url, options = {}) => {
    if (window.location.protocol === 'file:') {
        return handleLocalDemoRequest(url, options);
    }

    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 404) {
                return handleLocalDemoRequest(url, options);
            }

            return {
                ok: false,
                message: data.message || 'Terjadi kesalahan pada server.'
            };
        }

        return {
            ok: true,
            ...data
        };
    } catch (error) {
        return handleLocalDemoRequest(url, options);
    }
};

const registerAccount = ({ name, email, password }) => requestAuthApi('/api/auth/register', {
    method: 'POST',
    body: { name, email, password }
});

const loginAccount = ({ email, password, remember }) => requestAuthApi('/api/auth/login', {
    method: 'POST',
    body: { email, password, remember }
});

const logoutAccount = () => requestAuthApi('/api/auth/logout', {
    method: 'POST'
});

const upsertLocalOrderCache = (order) => {
    if (!order || typeof order !== 'object') {
        return;
    }

    const orders = getDemoOrders();
    const existingIndex = orders.findIndex((item) => Number(item.id) === Number(order.id));

    if (existingIndex >= 0) {
        orders[existingIndex] = order;
    } else {
        orders.unshift(order);
    }

    saveStoredJson(demoStorageKeys.orders, orders);
};

const applyRemoteStoreBootstrap = (payload) => {
    if (Array.isArray(payload.products)) {
        saveStoredJson(demoStorageKeys.products, payload.products);
    }

    if (Array.isArray(payload.categories)) {
        saveStoredJson(demoStorageKeys.categories, payload.categories);
    }

    if (Array.isArray(payload.customers)) {
        saveStoredJson(demoStorageKeys.customers, payload.customers);
    }

    if (Array.isArray(payload.orders)) {
        saveStoredJson(demoStorageKeys.orders, payload.orders);
    }

    if (payload.settings && typeof payload.settings === 'object') {
        saveStoredJson(demoStorageKeys.settings, payload.settings);
    }
};

const initializeRemoteStore = async () => {
    if (window.location.protocol === 'file:') {
        return;
    }

    const result = await requestAuthApi('/api/store/bootstrap');
    if (result.ok) {
        applyRemoteStoreBootstrap(result);
    }
};

const createOrder = async (payload) => {
    const result = await requestAuthApi('/api/orders', {
        method: 'POST',
        body: payload
    });

    if (result.ok && result.order) {
        upsertLocalOrderCache(result.order);
        upsertDemoCustomer({
            fullName: result.order.customer_name,
            address: result.order.address,
            phone: result.order.phone,
            email: result.order.user_email
        });
    }

    return result;
};

const getMyOrders = () => requestAuthApi('/api/orders/my');
const getAdminOrders = () => requestAuthApi('/api/admin/orders');
const updateAdminOrderStatus = async (orderId, status) => {
    const result = await requestAuthApi(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status }
    });

    if (result.ok && result.order) {
        upsertLocalOrderCache(result.order);
    }

    return result;
};

const formatOrderDate = (rawDate) => {
    const parsed = new Date(String(rawDate || '').replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) {
        return String(rawDate || '-');
    }

    return parsed.toLocaleString('id-ID');
};

const fetchActiveSession = async () => {
    const result = await requestAuthApi('/api/auth/me');
    activeSession = result.ok && result.authenticated ? result.user : null;
    allowRemoteAdminSync = Boolean(activeSession && activeSession.isAdmin);
    return activeSession;
};

const updateAuthNavigation = () => {
    document.querySelectorAll('.auth-nav-link').forEach((link) => {
        if (activeSession) {
            if (activeSession.isAdmin) {
                link.textContent = 'Admin';
                link.href = 'admin.html';
            } else {
                link.textContent = 'Profil';
                link.href = 'profil.html';
            }
            return;
        }

        link.textContent = 'Login Admin';
        link.href = 'login.html';
    });
};

const syncLoginPageState = () => {
    const loginForm = document.getElementById('login-form');
    const authCard = document.getElementById('auth-card');
    const authGreeting = document.getElementById('auth-greeting');
    const authDashboardLink = document.getElementById('auth-dashboard-link');
    const authCatalogLink = document.getElementById('auth-catalog-link');

    if (!loginForm || !authCard) {
        return;
    }

    if (activeSession) {
        loginForm.hidden = true;
        authCard.hidden = false;
        if (authGreeting) {
            authGreeting.textContent = `Halo, ${activeSession.name}. Anda login sebagai ${activeSession.email}.`;
        }
        if (authDashboardLink) {
            authDashboardLink.href = activeSession.isAdmin ? 'admin.html#overview' : 'profil.html';
        }
        if (authCatalogLink) {
            authCatalogLink.href = activeSession.isAdmin ? 'admin.html#products' : 'produk.html';
            authCatalogLink.textContent = activeSession.isAdmin ? 'Buka Katalog Admin' : 'Buka Katalog';
        }
    } else {
        loginForm.hidden = false;
        authCard.hidden = true;
    }
};

const setupAuthForms = () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(loginForm);
            const result = await loginAccount({
                email: formData.get('username'),
                password: formData.get('password'),
                remember: formData.get('remember') === 'on'
            });

            showToast(result.message);
            if (!result.ok) {
                return;
            }

            activeSession = result.user || null;
            loginForm.reset();
            updateAuthNavigation();
            syncLoginPageState();
            const nextPage = getNextPageParam() || getDefaultPostLoginPage(activeSession);
            setTimeout(() => {
                window.location.href = nextPage;
            }, 700);
        });
    }

    const logoutButton = document.getElementById('logout-account');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            const result = await logoutAccount();
            if (!result.ok) {
                showToast(result.message);
                return;
            }

            activeSession = null;
            closeAllAccountMenus();
            updateAuthNavigation();
            syncLoginPageState();
            showToast(result.message || 'Anda berhasil logout.');
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(registerForm);
            const password = String(formData.get('password') || '');
            const confirmPassword = String(formData.get('confirmPassword') || '');

            if (password !== confirmPassword) {
                showToast('Konfirmasi password tidak sama.');
                return;
            }

            const result = await registerAccount({
                name: formData.get('name'),
                email: formData.get('email'),
                password
            });

            showToast(result.message);
            if (!result.ok) {
                return;
            }

            registerForm.reset();
            const nextPage = getNextPageParam();
            const targetLogin = nextPage ? buildLoginUrl(nextPage) : 'login.html';
            setTimeout(() => {
                window.location.href = targetLogin;
            }, 700);
        });
    }

    const logoutProfileButton = document.getElementById('logout-profile');
    if (logoutProfileButton) {
        logoutProfileButton.addEventListener('click', async () => {
            const result = await logoutAccount();
            if (!result.ok) {
                showToast(result.message);
                return;
            }

            activeSession = null;
            closeAllAccountMenus();
            updateAuthNavigation();
            showToast(result.message || 'Anda berhasil logout.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 600);
        });
    }
};

const enforceProtectedPage = () => {
    if (activeSession) {
        const adminOnlyPage = document.body.dataset.requiresAdmin === 'true';
        if (adminOnlyPage && !activeSession.isAdmin) {
            window.location.href = 'index.html';
            return true;
        }

        return false;
    }

    const protectedPage = document.body.dataset.requiresAuth === 'true';
    if (!protectedPage) {
        return false;
    }

    const currentPage = getCurrentPage();
    window.location.href = buildLoginUrl(currentPage);
    return true;
};

const renderProfilePage = () => {
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileId = document.getElementById('profile-id');

    if (!profileName || !profileEmail || !profileId || !activeSession) {
        return;
    }

    profileName.textContent = activeSession.name;
    profileEmail.textContent = activeSession.email;
    profileId.textContent = `USR-${String(activeSession.id).padStart(4, '0')}`;
};

const renderOrderHistory = async () => {
    const historyContainer = document.getElementById('order-history');
    if (!historyContainer || !activeSession) {
        return;
    }

    const result = await getMyOrders();
    if (!result.ok) {
        historyContainer.innerHTML = `<p class="order-history-empty">${result.message}</p>`;
        return;
    }

    const orders = Array.isArray(result.orders) ? result.orders : [];
    if (orders.length === 0) {
        historyContainer.innerHTML = '<p class="order-history-empty">Belum ada pesanan.</p>';
        return;
    }

    historyContainer.innerHTML = '';
    orders.forEach((order) => {
        const item = document.createElement('article');
        item.className = 'order-history-item';

        const top = document.createElement('div');
        top.className = 'order-history-top';
        top.innerHTML = `
            <strong>Order #${order.id}</strong>
            <span>${formatOrderDate(order.created_at)}</span>
        `;

        const status = document.createElement('p');
        status.className = 'order-status';
        status.textContent = `Status: ${String(order.status || '').replaceAll('_', ' ')}`;

        const note = document.createElement('p');
        note.className = 'order-note';
        note.textContent = order.note || '-';

        const meta = document.createElement('p');
        meta.className = 'order-meta';
        meta.textContent = `${order.payment_method} | ${order.phone}`;

        item.append(top, status, note, meta);
        historyContainer.appendChild(item);
    });
};

const renderAdminOrders = async () => {
    const adminOrderList = document.getElementById('admin-order-list');
    if (!adminOrderList || !activeSession || !activeSession.isAdmin) {
        return;
    }

    const result = await getAdminOrders();
    if (!result.ok) {
        adminOrderList.innerHTML = `<p class="order-history-empty">${result.message}</p>`;
        return;
    }

    const orders = Array.isArray(result.orders) ? result.orders : [];
    if (orders.length === 0) {
        adminOrderList.innerHTML = '<p class="order-history-empty">Belum ada data pesanan.</p>';
        return;
    }

    adminOrderList.innerHTML = '';
    const statusOptions = [
        'menunggu_konfirmasi',
        'diproses',
        'dikirim',
        'selesai',
        'dibatalkan'
    ];

    orders.forEach((order) => {
        const card = document.createElement('article');
        card.className = 'admin-order-card';

        const productName = String(order.product_name || 'Pesanan Website');
        const quantity = Math.max(Number(order.quantity) || 1, 1);
        const totalPrice = getOrderTotalValue(order);

        const top = document.createElement('div');
        top.className = 'order-history-top';
        top.innerHTML = `
            <strong>${order.order_code || `Order #${order.id}`} - ${order.customer_name}</strong>
            <span>${formatOrderDate(order.created_at)}</span>
        `;

        const customer = document.createElement('p');
        customer.className = 'order-meta';
        customer.textContent = `${order.user_name} (${order.user_email}) | ${order.phone}`;

        const detail = document.createElement('p');
        detail.className = 'order-note';
        detail.textContent = `${productName} | ${quantity} item | ${formatRupiah(totalPrice)} | ${order.payment_method}`;

        const note = document.createElement('p');
        note.className = 'order-note';
        note.textContent = `Alamat: ${order.address || '-'} | Catatan: ${order.note}`;

        const actions = document.createElement('div');
        actions.className = 'admin-order-actions';

        const select = document.createElement('select');
        select.className = 'admin-status-select';
        select.dataset.orderId = String(order.id);

        statusOptions.forEach((status) => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status.replaceAll('_', ' ');
            if (status === order.status) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        const updateButton = document.createElement('button');
        updateButton.type = 'button';
        updateButton.className = 'button primary';
        updateButton.dataset.orderId = String(order.id);
        updateButton.dataset.action = 'update-order-status';
        updateButton.textContent = 'Update Status';

        actions.append(select, updateButton);
        card.append(top, customer, detail, note, actions);
        adminOrderList.appendChild(card);
    });
};

const renderAdminStoreHeader = () => {
    const settings = getDemoSettings();
    const storeNameElement = document.getElementById('admin-store-name');
    const storeSubtitleElement = document.getElementById('admin-store-subtitle');
    const dashboardStoreName = document.getElementById('dashboard-store-name');
    const dashboardStoreContact = document.getElementById('dashboard-store-contact');

    if (storeNameElement) {
        storeNameElement.textContent = settings.storeName;
    }

    if (storeSubtitleElement) {
        storeSubtitleElement.textContent = 'Website Penjualan Online UMKM';
    }

    if (dashboardStoreName) {
        dashboardStoreName.textContent = settings.storeName;
    }

    if (dashboardStoreContact) {
        dashboardStoreContact.textContent = `${settings.whatsapp} | ${settings.email}`;
    }
};

const renderAdminSummary = () => {
    const products = getDemoProducts();
    const categories = getDemoCategories();
    const customers = getDemoCustomers();
    const orders = getDemoOrders();
    const omzet = orders.reduce((total, order) => total + getOrderTotalValue(order), 0);

    const summaryMap = {
        'summary-products': products.length,
        'summary-categories': categories.length,
        'summary-customers': customers.length,
        'summary-orders': orders.length,
        'summary-sales': formatRupiah(omzet)
    };

    Object.entries(summaryMap).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = String(value);
        }
    });
};

const fillSelectOptions = (select, values, placeholder) => {
    if (!select) {
        return;
    }

    const currentValue = select.value;
    select.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    values.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    if (values.includes(currentValue)) {
        select.value = currentValue;
    }
};

const renderAdminFormOptions = () => {
    const categories = getDemoCategories().map((item) => item.name);
    const products = getDemoProducts().map((item) => item.name);
    fillSelectOptions(document.getElementById('product-category'), categories, 'Pilih kategori');
    fillSelectOptions(document.getElementById('order-product'), products, 'Pilih produk');
};

const renderProductsList = () => {
    const container = document.getElementById('product-list');
    if (!container) {
        return;
    }

    const products = getDemoProducts();
    if (products.length === 0) {
        container.innerHTML = '<p class="table-empty">Belum ada data produk.</p>';
        return;
    }

    container.innerHTML = products.map((product) => `
        <article class="data-card">
            <div class="data-card-top">
                <div>
                    <h3>${product.name}</h3>
                    <p>${product.category}</p>
                </div>
                <strong>${formatRupiah(Number(product.price) || 0)}</strong>
            </div>
            <p>${product.description || '-'}</p>
            <p class="data-meta">Stok: ${product.stock} | Foto: ${product.photo || '-'}</p>
            <div class="data-actions">
                <button type="button" class="button secondary" data-admin-action="edit-product" data-id="${product.id}">Edit</button>
                <button type="button" class="button secondary" data-admin-action="delete-product" data-id="${product.id}">Hapus</button>
            </div>
        </article>
    `).join('');
};

const renderCategoriesList = () => {
    const container = document.getElementById('category-list');
    if (!container) {
        return;
    }

    const categories = getDemoCategories();
    if (categories.length === 0) {
        container.innerHTML = '<p class="table-empty">Belum ada data kategori.</p>';
        return;
    }

    container.innerHTML = categories.map((category) => `
        <article class="data-card compact">
            <div class="data-card-top">
                <div>
                    <h3>${category.name}</h3>
                    <p>${category.note || '-'}</p>
                </div>
            </div>
            <div class="data-actions">
                <button type="button" class="button secondary" data-admin-action="edit-category" data-id="${category.id}">Edit</button>
                <button type="button" class="button secondary" data-admin-action="delete-category" data-id="${category.id}">Hapus</button>
            </div>
        </article>
    `).join('');
};

const renderCustomersList = () => {
    const container = document.getElementById('customer-list');
    if (!container) {
        return;
    }

    const customers = getDemoCustomers();
    if (customers.length === 0) {
        container.innerHTML = '<p class="table-empty">Belum ada data pelanggan.</p>';
        return;
    }

    container.innerHTML = customers.map((customer) => `
        <article class="data-card compact">
            <div class="data-card-top">
                <div>
                    <h3>${customer.fullName}</h3>
                    <p>${customer.address || '-'}</p>
                </div>
            </div>
            <p class="data-meta">${customer.phone || '-'} | ${customer.email || '-'}</p>
            <div class="data-actions">
                <button type="button" class="button secondary" data-admin-action="edit-customer" data-id="${customer.id}">Edit</button>
                <button type="button" class="button secondary" data-admin-action="delete-customer" data-id="${customer.id}">Hapus</button>
            </div>
        </article>
    `).join('');
};

const renderSalesList = () => {
    const container = document.getElementById('sales-list');
    if (!container) {
        return;
    }

    const orders = getDemoOrders();
    if (orders.length === 0) {
        container.innerHTML = '<p class="table-empty">Belum ada data penjualan.</p>';
        return;
    }

    container.innerHTML = orders.map((order) => `
        <article class="data-card compact">
            <div class="data-card-top">
                <div>
                    <h3>${order.order_code || `Order #${order.id}`}</h3>
                    <p>${order.customer_name} | ${order.product_name || 'Pesanan Website'}</p>
                </div>
                <strong>${formatRupiah(getOrderTotalValue(order))}</strong>
            </div>
            <p class="data-meta">${formatOrderDate(order.created_at)} | ${order.status.replaceAll('_', ' ')}</p>
        </article>
    `).join('');
};

const getReportFilteredOrders = () => {
    const startValue = document.getElementById('report-start')?.value || '';
    const endValue = document.getElementById('report-end')?.value || '';
    const startDate = startValue ? new Date(`${startValue}T00:00:00`) : null;
    const endDate = endValue ? new Date(`${endValue}T23:59:59`) : null;

    return getDemoOrders().filter((order) => {
        const orderDate = new Date(order.created_at);
        if (startDate && orderDate < startDate) {
            return false;
        }
        if (endDate && orderDate > endDate) {
            return false;
        }
        return true;
    });
};

const renderReportSummary = () => {
    const orders = getReportFilteredOrders();
    const totalSales = orders.reduce((total, order) => total + getOrderTotalValue(order), 0);

    const totalPenjualan = document.getElementById('report-total-sales');
    const totalOrders = document.getElementById('report-total-orders');
    const totalOmzet = document.getElementById('report-omzet');
    const results = document.getElementById('report-results');

    if (totalPenjualan) {
        totalPenjualan.textContent = formatRupiah(totalSales);
    }
    if (totalOrders) {
        totalOrders.textContent = String(orders.length);
    }
    if (totalOmzet) {
        totalOmzet.textContent = formatRupiah(totalSales);
    }
    if (results) {
        results.innerHTML = orders.length === 0
            ? '<p class="table-empty">Tidak ada data penjualan pada periode ini.</p>'
            : orders.map((order) => `
                <article class="data-card compact">
                    <div class="data-card-top">
                        <div>
                            <h3>${order.order_code || `Order #${order.id}`}</h3>
                            <p>${order.customer_name} | ${order.product_name || 'Pesanan Website'}</p>
                        </div>
                        <strong>${formatRupiah(getOrderTotalValue(order))}</strong>
                    </div>
                    <p class="data-meta">${formatOrderDate(order.created_at)} | ${order.status.replaceAll('_', ' ')}</p>
                </article>
            `).join('');
    }
};

const renderSettingsForm = () => {
    const settingsForm = document.getElementById('settings-form');
    if (!settingsForm) {
        return;
    }

    const settings = getDemoSettings();
    settingsForm.elements.storeName.value = settings.storeName;
    settingsForm.elements.address.value = settings.address;
    settingsForm.elements.whatsapp.value = settings.whatsapp;
    settingsForm.elements.email.value = settings.email;
    settingsForm.elements.currentLogo.value = settings.logo;

    const logoPreview = document.getElementById('settings-logo-preview');
    if (logoPreview) {
        logoPreview.textContent = `Logo saat ini: ${settings.logo || '-'}`;
    }
};

const resetFormById = (formId) => {
    const form = document.getElementById(formId);
    if (!form) {
        return;
    }

    form.reset();
    form.querySelectorAll('input[type="hidden"]').forEach((input) => {
        input.value = '';
    });
    if (formId === 'settings-form') {
        renderSettingsForm();
    }
};

const setActiveAdminSection = (sectionName) => {
    document.querySelectorAll('[data-admin-section-target]').forEach((button) => {
        button.classList.toggle('active', button.dataset.adminSectionTarget === sectionName);
    });

    document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.adminPanel !== sectionName;
    });

    if (document.getElementById('admin-dashboard')) {
        window.location.hash = sectionName;
    }
};

const getInitialAdminSection = () => {
    const allowedSections = new Set(['overview', 'products', 'categories', 'customers', 'orders', 'sales', 'reports', 'settings']);
    const requestedSection = window.location.hash.replace('#', '').trim();

    return allowedSections.has(requestedSection) ? requestedSection : 'overview';
};

const syncCustomersFromOrders = () => {
    getDemoOrders().forEach((order) => {
        upsertDemoCustomer({
            fullName: order.customer_name,
            address: order.address,
            phone: order.phone,
            email: order.user_email
        });
    });
};

const renderAdminWorkspace = async () => {
    if (!document.getElementById('admin-dashboard')) {
        return;
    }

    setActiveAdminSection(getInitialAdminSection());
    syncCustomersFromOrders();
    renderAdminStoreHeader();
    renderAdminSummary();
    renderAdminFormOptions();
    renderProductsList();
    renderCategoriesList();
    renderCustomersList();
    await renderAdminOrders();
    renderSalesList();
    renderReportSummary();
    renderSettingsForm();
};

const setupAdminPageActions = () => {
    document.querySelectorAll('[data-admin-section-target]').forEach((button) => {
        button.addEventListener('click', () => {
            setActiveAdminSection(button.dataset.adminSectionTarget);
        });
    });

    document.querySelectorAll('[data-admin-shortcut-target]').forEach((button) => {
        button.addEventListener('click', () => {
            setActiveAdminSection(button.dataset.adminShortcutTarget);
        });
    });

    const dashboardContent = document.getElementById('admin-dashboard');
    if (dashboardContent) {
        dashboardContent.addEventListener('click', async (event) => {
            const actionButton = event.target.closest('button[data-admin-action]');
            if (!actionButton) {
                return;
            }

            const targetId = Number(actionButton.dataset.id);
            const action = actionButton.dataset.adminAction;

            if (action === 'edit-product') {
                const product = getDemoProducts().find((item) => Number(item.id) === targetId);
                const form = document.getElementById('product-form');
                if (!product || !form) {
                    return;
                }

                form.elements.productId.value = product.id;
                form.elements.productName.value = product.name;
                form.elements.category.value = product.category;
                form.elements.price.value = product.price;
                form.elements.stock.value = product.stock;
                form.elements.description.value = product.description;
                form.elements.currentPhoto.value = product.photo || '';
                setActiveAdminSection('products');
                return;
            }

            if (action === 'delete-product') {
                saveDemoProducts(getDemoProducts().filter((item) => Number(item.id) !== targetId));
                await renderAdminWorkspace();
                showToast('Data produk dihapus.');
                return;
            }

            if (action === 'edit-category') {
                const category = getDemoCategories().find((item) => Number(item.id) === targetId);
                const form = document.getElementById('category-form');
                if (!category || !form) {
                    return;
                }

                form.elements.categoryId.value = category.id;
                form.elements.categoryName.value = category.name;
                form.elements.categoryNote.value = category.note;
                setActiveAdminSection('categories');
                return;
            }

            if (action === 'delete-category') {
                saveDemoCategories(getDemoCategories().filter((item) => Number(item.id) !== targetId));
                await renderAdminWorkspace();
                showToast('Data kategori dihapus.');
                return;
            }

            if (action === 'edit-customer') {
                const customer = getDemoCustomers().find((item) => Number(item.id) === targetId);
                const form = document.getElementById('customer-form');
                if (!customer || !form) {
                    return;
                }

                form.elements.customerId.value = customer.id;
                form.elements.fullName.value = customer.fullName;
                form.elements.address.value = customer.address;
                form.elements.phone.value = customer.phone;
                form.elements.email.value = customer.email;
                setActiveAdminSection('customers');
                return;
            }

            if (action === 'delete-customer') {
                saveDemoCustomers(getDemoCustomers().filter((item) => Number(item.id) !== targetId));
                await renderAdminWorkspace();
                showToast('Data pelanggan dihapus.');
                return;
            }
        });
    }

    const adminOrderList = document.getElementById('admin-order-list');
    if (adminOrderList) {
        adminOrderList.addEventListener('click', async (event) => {
            const updateButton = event.target.closest('button[data-action="update-order-status"]');
            if (!updateButton) {
                return;
            }

            const orderId = Number(updateButton.dataset.orderId);
            const select = adminOrderList.querySelector(`select[data-order-id="${orderId}"]`);
            if (!select) {
                return;
            }

            updateButton.disabled = true;
            const result = await updateAdminOrderStatus(orderId, select.value);
            updateButton.disabled = false;
            showToast(result.message || 'Status diproses.');

            if (result.ok) {
                await renderAdminWorkspace();
            }
        });
    }

    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(productForm);
            const productId = Number(formData.get('productId'));
            const photoFile = productForm.elements.photo.files[0];
            const currentPhoto = String(formData.get('currentPhoto') || '');
            const products = getDemoProducts();
            const nextProduct = {
                id: productId || Date.now(),
                name: String(formData.get('productName') || '').trim(),
                category: String(formData.get('category') || '').trim(),
                price: Number(formData.get('price')) || 0,
                stock: Number(formData.get('stock')) || 0,
                description: String(formData.get('description') || '').trim(),
                photo: photoFile ? photoFile.name : currentPhoto
            };

            const existingIndex = products.findIndex((item) => Number(item.id) === productId);
            if (existingIndex >= 0) {
                products[existingIndex] = nextProduct;
            } else {
                products.unshift(nextProduct);
            }

            saveDemoProducts(products);
            productForm.reset();
            productForm.elements.productId.value = '';
            productForm.elements.currentPhoto.value = '';
            await renderAdminWorkspace();
            showToast('Data produk berhasil disimpan.');
        });
    }

    const resetProductButton = document.getElementById('reset-product-form');
    if (resetProductButton) {
        resetProductButton.addEventListener('click', () => {
            resetFormById('product-form');
        });
    }

    const categoryForm = document.getElementById('category-form');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(categoryForm);
            const categoryId = Number(formData.get('categoryId'));
            const categories = getDemoCategories();
            const nextCategory = {
                id: categoryId || Date.now(),
                name: String(formData.get('categoryName') || '').trim(),
                note: String(formData.get('categoryNote') || '').trim()
            };

            const existingIndex = categories.findIndex((item) => Number(item.id) === categoryId);
            if (existingIndex >= 0) {
                categories[existingIndex] = nextCategory;
            } else {
                categories.unshift(nextCategory);
            }

            saveDemoCategories(categories);
            resetFormById('category-form');
            await renderAdminWorkspace();
            showToast('Data kategori berhasil disimpan.');
        });
    }

    const customerForm = document.getElementById('customer-form');
    if (customerForm) {
        customerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(customerForm);
            const customerId = Number(formData.get('customerId'));
            const customers = getDemoCustomers();
            const nextCustomer = {
                id: customerId || Date.now(),
                fullName: String(formData.get('fullName') || '').trim(),
                address: String(formData.get('address') || '').trim(),
                phone: String(formData.get('phone') || '').trim(),
                email: String(formData.get('email') || '').trim()
            };

            const existingIndex = customers.findIndex((item) => Number(item.id) === customerId);
            if (existingIndex >= 0) {
                customers[existingIndex] = nextCustomer;
            } else {
                customers.unshift(nextCustomer);
            }

            saveDemoCustomers(customers);
            resetFormById('customer-form');
            await renderAdminWorkspace();
            showToast('Data pelanggan berhasil disimpan.');
        });
    }

    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(orderForm);
            const payload = {
                nama: formData.get('customerName'),
                telepon: formData.get('customerPhone'),
                alamat: formData.get('customerAddress'),
                pembayaran: 'Manual Admin',
                pesan: `Nomor Pesanan: ${formData.get('orderNumber')}`,
                produk: formData.get('productName'),
                jumlah: Number(formData.get('quantity')) || 1,
                totalHarga: Number(formData.get('totalPrice')) || 0,
                status: formData.get('status') || 'diproses'
            };

            const result = await createOrder(payload);
            showToast(result.message || 'Pesanan berhasil disimpan.');
            if (!result.ok) {
                return;
            }

            orderForm.reset();
            await renderAdminWorkspace();
        });
    }

    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', (event) => {
            event.preventDefault();
            renderReportSummary();
            showToast('Laporan penjualan ditampilkan.');
        });
    }

    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(settingsForm);
            const logoFile = settingsForm.elements.logo.files[0];
            const currentLogo = String(formData.get('currentLogo') || '');
            saveDemoSettings({
                storeName: String(formData.get('storeName') || '').trim(),
                address: String(formData.get('address') || '').trim(),
                whatsapp: String(formData.get('whatsapp') || '').trim(),
                email: String(formData.get('email') || '').trim(),
                logo: logoFile ? logoFile.name : currentLogo
            });
            await renderAdminWorkspace();
            showToast('Pengaturan toko berhasil disimpan.');
        });
    }

    const refreshButton = document.getElementById('refresh-admin-orders');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            await renderAdminWorkspace();
            showToast('Data pesanan dimuat ulang.');
        });
    }
};

const initializeAuth = async () => {
    await fetchActiveSession();
    const redirected = enforceProtectedPage();
    if (redirected) {
        return { redirected: true };
    }

    updateAuthNavigation();
    syncLoginPageState();
    renderProfilePage();
    await renderOrderHistory();
    await renderAdminWorkspace();
    return { redirected: false };
};

const getCart = () => {
    try {
        const cart = JSON.parse(localStorage.getItem('pocutCart') || '[]');
        if (!Array.isArray(cart)) {
            return [];
        }

        return cart
            .filter((item) => item && typeof item.name === 'string')
            .map((item) => ({
                name: item.name,
                price: Number(item.price) || 0,
                quantity: Math.max(Number(item.quantity) || 1, 1)
            }));
    } catch (error) {
        saveCart([]);
        return [];
    }
};

const saveCart = (cart) => {
    localStorage.setItem('pocutCart', JSON.stringify(cart));
};

const updateCartCount = () => {
    const totalItems = getCart().reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach((element) => {
        element.textContent = totalItems;
    });
};

const showToast = (message) => {
    const oldToast = document.querySelector('.toast');
    if (oldToast) {
        oldToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2200);
};

const addToCart = (name, price) => {
    const cart = getCart();
    const existingItem = cart.find((item) => item.name === name);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name, price, quantity: 1 });
    }

    saveCart(cart);
    updateCartCount();
    showToast(`${name} ditambahkan ke keranjang.`);
};

const updateCartItemQuantity = (name, change) => {
    const cart = getCart()
        .map((item) => item.name === name
            ? { ...item, quantity: item.quantity + change }
            : item)
        .filter((item) => item.quantity > 0);

    saveCart(cart);
    updateCartCount();
    renderCart();
};

const removeCartItem = (name) => {
    const cart = getCart().filter((item) => item.name !== name);
    saveCart(cart);
    updateCartCount();
    renderCart();
    showToast(`${name} dihapus dari keranjang.`);
};

const renderCart = () => {
    const cartItems = document.getElementById('cart-items');
    const emptyCart = document.getElementById('empty-cart');
    const cartTotal = document.getElementById('cart-total');
    const cartSubtotal = document.getElementById('cart-subtotal');

    if (!cartItems || !emptyCart || !cartTotal) {
        return;
    }

    const cart = getCart();
    cartItems.innerHTML = '';

    if (cart.length === 0) {
        emptyCart.style.display = 'block';
        cartTotal.textContent = formatRupiah(0);
        if (cartSubtotal) {
            cartSubtotal.textContent = formatRupiah(0);
        }
        return;
    }

    emptyCart.style.display = 'none';

    cart.forEach((item) => {
        const cartItem = document.createElement('article');
        const productInfo = document.createElement('div');
        const productName = document.createElement('h3');
        const productQuantity = document.createElement('p');
        const productSubtotal = document.createElement('strong');
        const productActions = document.createElement('div');
        const decreaseButton = document.createElement('button');
        const quantityText = document.createElement('span');
        const increaseButton = document.createElement('button');
        const removeButton = document.createElement('button');

        cartItem.className = 'cart-item';
        productName.textContent = item.name;
        productQuantity.textContent = `${item.quantity} x ${formatRupiah(item.price)}`;
        productSubtotal.textContent = formatRupiah(item.price * item.quantity);

        productActions.className = 'cart-actions';
        decreaseButton.type = 'button';
        decreaseButton.textContent = '-';
        decreaseButton.dataset.action = 'decrease';
        decreaseButton.dataset.name = item.name;
        quantityText.textContent = item.quantity;
        increaseButton.type = 'button';
        increaseButton.textContent = '+';
        increaseButton.dataset.action = 'increase';
        increaseButton.dataset.name = item.name;
        removeButton.type = 'button';
        removeButton.textContent = 'Hapus';
        removeButton.dataset.action = 'remove';
        removeButton.dataset.name = item.name;
        removeButton.className = 'remove-item';

        productInfo.append(productName, productQuantity);
        productActions.append(decreaseButton, quantityText, increaseButton, removeButton);
        cartItem.append(productInfo, productActions, productSubtotal);
        cartItems.appendChild(cartItem);
    });

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotal.textContent = formatRupiah(total);
    if (cartSubtotal) {
        cartSubtotal.textContent = formatRupiah(total);
    }
};

document.querySelectorAll('.cart-items').forEach((cartItems) => {
    cartItems.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            return;
        }

        if (button.dataset.action === 'increase') {
            updateCartItemQuantity(button.dataset.name, 1);
        }

        if (button.dataset.action === 'decrease') {
            updateCartItemQuantity(button.dataset.name, -1);
        }

        if (button.dataset.action === 'remove') {
            removeCartItem(button.dataset.name);
        }
    });
});

document.querySelectorAll('.add-to-cart').forEach((button) => {
    button.addEventListener('click', () => {
        addToCart(button.dataset.name, Number(button.dataset.price));
    });
});

const clearCartButton = document.getElementById('clear-cart');
if (clearCartButton) {
    clearCartButton.addEventListener('click', () => {
        saveCart([]);
        updateCartCount();
        renderCart();
    });
}

document.querySelectorAll('.contact-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const session = activeSession || await fetchActiveSession();
        if (!session) {
            showToast('Silakan login dulu untuk mengirim pemesanan.');
            setTimeout(() => {
                window.location.href = buildLoginUrl(getCurrentPage());
            }, 700);
            return;
        }

        const formData = new FormData(form);
        const payload = {
            nama: String(formData.get('nama') || '').trim(),
            telepon: String(formData.get('telepon') || '').trim(),
            alamat: String(formData.get('alamat') || '').trim(),
            pembayaran: String(formData.get('pembayaran') || '').trim(),
            pesan: String(formData.get('pesan') || '').trim()
        };

        const result = await createOrder(payload);
        showToast(result.message || 'Proses pengiriman pesanan selesai.');
        if (!result.ok) {
            return;
        }

        form.reset();
    });
});

// Prevent stale cached local images when the file is replaced with a new photo.
document.querySelectorAll('img[src^="gambar"]').forEach((image) => {
    const separator = image.src.includes('?') ? '&' : '?';
    image.src = `${image.src}${separator}v=${Date.now()}`;
});

const bootstrapPage = async () => {
    await initializeRemoteStore();
    setupAuthForms();
    setupAdminPageActions();
    const authResult = await initializeAuth();
    if (authResult && authResult.redirected) {
        return;
    }

    updateCartCount();
    renderCart();
};

bootstrapPage();