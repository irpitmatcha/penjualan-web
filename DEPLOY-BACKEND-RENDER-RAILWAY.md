# Deploy Backend ke Render atau Railway

Dokumen ini menyiapkan backend Node.js proyek Putroe Shop agar bisa dipakai bersama frontend yang di-host di InfinityFree.

## Opsi 1: Render

Repo ini sudah disiapkan dengan `render.yaml` dan `Procfile`.

Langkah umum:

1. Push repo ke GitHub.
2. Login ke Render.
3. Pilih New Web Service.
4. Hubungkan repo GitHub `penjualan-web`.
5. Pastikan service membaca konfigurasi dari `render.yaml`.
6. Isi environment variable yang bertanda `sync: false`.
7. Deploy lalu catat URL backend, misalnya `https://putroe-shop-backend.onrender.com`.

Environment variable wajib:

- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `CORS_ORIGIN=https://domain-frontend-infinityfree-anda`

Variable penting lain yang sudah direkomendasikan:

- `ALLOW_PUBLIC_REGISTRATION=false`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=None`
- `SESSION_MAX_AGE_SECONDS=604800`

## Opsi 2: Railway

Railway umumnya bisa menjalankan repo ini langsung karena `package.json` sudah punya script `start`.

Langkah umum:

1. Login ke Railway.
2. Create New Project.
3. Deploy from GitHub Repo.
4. Pilih repo `penjualan-web`.
5. Railway akan mendeteksi Node.js otomatis.
6. Isi environment variable yang sama seperti daftar di atas.
7. Deploy lalu salin public URL backend.

## Setelah backend live

Edit `config.js` pada frontend menjadi seperti ini:

```js
window.PUTROE_CONFIG = {
    apiBase: 'https://backend-anda.example.com'
};
```

Lalu upload ulang frontend ke InfinityFree.

## Cek cepat setelah deploy backend

1. Buka `https://backend-anda.example.com/api/health`.
2. Pastikan response mengandung `"ok": true` dan `"storage": "sqlite"`.
3. Pastikan login admin dari frontend berhasil.
4. Pastikan dashboard admin tetap bisa memuat data setelah refresh.