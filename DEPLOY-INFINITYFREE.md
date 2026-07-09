# Deploy ke InfinityFree

InfinityFree hanya cocok untuk frontend statis, PHP, dan MySQL. Backend Node.js di proyek ini tidak bisa dijalankan langsung di InfinityFree.

## Arsitektur yang dipakai

- Frontend HTML/CSS/JS di-upload ke InfinityFree.
- Backend `server.js` di-host terpisah di layanan yang mendukung Node.js.
- Frontend membaca alamat backend dari `config.js`.

## 1. Host backend Node.js di layanan lain

Contoh layanan yang cocok: Render, Railway, atau VPS Node.js.

Variabel environment minimal backend:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`
- `ADMIN_NAME`
- `ALLOW_PUBLIC_REGISTRATION=false`
- `CORS_ORIGIN=https://domain-frontend-anda`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=None`

Catatan:

- Untuk frontend lintas domain, proyek ini sekarang mengirim token Bearer otomatis setelah login.
- Cookie sesi tetap didukung, tetapi token Bearer membuat login lintas origin lebih stabil.

## 2. Siapkan frontend untuk InfinityFree

Edit `config.js` lalu isi domain backend Anda:

```js
window.PUTROE_CONFIG = {
    apiBase: 'https://backend-anda.example.com'
};
```

## 3. Upload ke InfinityFree

Upload file frontend berikut ke folder `htdocs` atau `public_html` akun InfinityFree Anda:

- `.htaccess`
- `index.html`
- `produk.html`
- `kontak.html`
- `keranjang.html`
- `tentang.html`
- `profil.html`
- `login.html`
- `admin.html`
- `style.css`
- `script.js`
- `config.js`
- aset gambar/logo yang dipakai halaman

Jangan upload file backend berikut ke InfinityFree:

- `server.js`
- `.env`
- `database/store.db`
- `database/*.json`
- `package.json`

## 4. Tes setelah upload

Urutan tes yang disarankan:

1. Buka halaman utama frontend di domain InfinityFree.
2. Pastikan produk tampil normal.
3. Buka halaman login admin.
4. Login admin dan pastikan masuk ke `admin.html#overview`.
5. Simpan perubahan produk atau kategori dari dashboard admin.
6. Pastikan data terbaca lagi setelah refresh.

## Masalah yang paling sering

- Jika login gagal dari domain InfinityFree, cek `CORS_ORIGIN` di backend.
- Jika browser memblokir permintaan, cek apakah backend memakai HTTPS.
- Jika data tidak tersimpan, pastikan backend Node.js benar-benar aktif dan bisa diakses publik.
- Jika halaman indeks folder terlihat di browser, pastikan file `.htaccess` ikut ter-upload.