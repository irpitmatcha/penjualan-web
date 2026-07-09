# Langkah InfinityFree

## Status yang sudah disiapkan di repo

- Bundle upload frontend sudah ada di `infinityfree-upload/`
- File zip upload sudah ada di `infinityfree-upload.zip`
- Panduan upload ada di `DEPLOY-INFINITYFREE.md`
- Konfigurasi frontend backend ada di `config.js`

## Langkah manual yang harus dilakukan di InfinityFree

1. Buat akun di InfinityFree.
2. Verifikasi email.
3. Login ke dashboard InfinityFree.
4. Buat hosting account baru.
5. Pilih subdomain gratis atau domain sendiri.
6. Masuk ke Control Panel hosting.
7. Buka File Manager.
8. Buka folder `htdocs` atau `public_html`.
9. Upload isi `infinityfree-upload/` atau ekstrak `infinityfree-upload.zip`.
10. Pastikan `.htaccess` ikut ter-upload.

## Setelah backend publik sudah ada

Edit `config.js` menjadi:

```js
window.PUTROE_CONFIG = {
    apiBase: 'https://backend-anda.example.com'
};
```

## Catatan

- Backend Node.js proyek ini tidak jalan di InfinityFree.
- Backend harus di-host terpisah, misalnya di Render atau Railway.
