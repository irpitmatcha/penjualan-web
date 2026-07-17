const putroeHostedApiBase = 'https://web-production-8d5f42.up.railway.app';
const putroeLocalHostnames = new Set(['localhost', '127.0.0.1']);
const putroeCurrentHostname = String(window.location.hostname || '').trim().toLowerCase();
const putroeUseLocalApi = putroeLocalHostnames.has(putroeCurrentHostname);

window.PUTROE_CONFIG = {
    // Saat dibuka dari localhost, pakai backend lokal yang melayani file statis dan API sekaligus.
    // Saat dibuka dari hosting statis seperti InfinityFree, arahkan request API ke backend publik.
    apiBase: putroeUseLocalApi ? '' : putroeHostedApiBase
};