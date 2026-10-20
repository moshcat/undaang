# undaang backend

RESTful API untuk undaang, platform undangan pernikahan digital. Dibangun dengan Hono di atas Bun, MongoDB Atlas lewat Mongoose, Cloudflare R2 untuk media, dan DOKU Checkout untuk pembayaran. Spesifikasi lengkap ada di `Dokumen SRS SDS - undaang.pdf`.

## Menjalankan

Butuh Bun 1.3 atau lebih baru. Semua perintah dijalankan dari folder `backend/`.

```sh
bun install
cp .env.example .env   # lalu isi nilainya, lihat tabel di bawah
bun run seed           # tema awal + akun admin
bun run dev            # http://localhost:3000, dokumentasi di /docs
```

| Script                            | Fungsi                                                         |
| --------------------------------- | -------------------------------------------------------------- |
| `bun run dev`                     | Server dengan hot reload                                       |
| `bun run start`                   | Server untuk production                                        |
| `bun test`                        | Unit dan integration test (MongoDB in-memory, tanpa `.env`)    |
| `bun run typecheck`               | TypeScript 7                                                   |
| `bun run lint` / `bun run format` | ESLint dan Prettier                                            |
| `bun run seed`                    | Membuat satu tema per tier dan admin. Aman dijalankan berulang |

`bunfig.toml` memuat `src/shims/bun-v8.ts` sebelum kode lain. Tanpa shim ini, bson 7.3 crash saat di-import di Bun 1.3, jadi jalankan Bun dari folder `backend/` agar `bunfig.toml` terbaca.

## Environment

| Variabel                                                                                  | Wajib            | Keterangan                                                                               |
| ----------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `MONGODB_URI`                                                                             | Ya               | Connection string Atlas (`mongodb+srv://...`). Tambahkan IP kamu di Network Access Atlas |
| `JWT_SECRET`                                                                              | Ya               | Minimal 32 karakter. Buat dengan `openssl rand -base64 48`                               |
| `PORT`                                                                                    | Tidak            | Default `3000`                                                                           |
| `CORS_ORIGIN`                                                                             | Tidak            | Origin frontend, pisahkan dengan koma jika lebih dari satu                               |
| `APP_BASE_URL`                                                                            | Tidak            | URL frontend, dipakai untuk tautan tamu dan halaman setelah bayar                        |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Untuk upload     | Selama kosong, `POST /uploads/presign` menjawab `503`                                    |
| `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`                                                       | Untuk pembayaran | Dari DOKU Back Office sandbox. Selama kosong, `POST /orders` menjawab `503`              |
| `DOKU_BASE_URL`                                                                           | Tidak            | Default sandbox `https://api-sandbox.doku.com`                                           |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`                                                 | Untuk seed       | Akun admin yang dibuat `bun run seed`                                                    |

Server menolak start dan menyebut variabel yang salah jika `MONGODB_URI` atau `JWT_SECRET` tidak valid. `.env` tidak pernah di-commit.

### Cloudflare R2

1. Buat bucket, lalu API token dengan izin Object Read & Write untuk bucket itu.
2. Aktifkan akses publik (domain `r2.dev` atau custom domain) dan isi `R2_PUBLIC_URL` dengan URL tersebut.
3. Atur CORS bucket agar browser boleh `PUT` dari origin frontend:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"]
  }
]
```

Alur upload: frontend meminta `POST /api/v1/uploads/presign`, mengirim file dengan `PUT` ke `upload_url` memakai `Content-Type` yang sama, lalu menyimpan `public_url` ke undangan lewat `PUT /api/v1/invitations/:id`.

### DOKU Checkout (sandbox)

Notifikasi pembayaran dikirim DOKU ke server, jadi server lokal butuh URL publik HTTPS:

```sh
bun run dev
cloudflared tunnel --url http://localhost:3000
```

Salin URL `https://....trycloudflare.com` dari output, lalu di DOKU Back Office sandbox isi Notification URL dengan `https://....trycloudflare.com/api/v1/payments/doku/notify`. URL tunnel berubah setiap cloudflared dijalankan ulang, jadi perbarui juga di dashboard.

Paket hanya aktif lewat notifikasi yang signature-nya valid. Halaman redirect setelah bayar cukup memanggil `GET /api/v1/orders/:invoice` untuk menampilkan status.

## Struktur

```
src/
  app.ts            createApp(): middleware dan semua router
  index.ts          koneksi database lalu serve
  config/           env (zod), koneksi db, tabel paket
  models/           6 collection Mongoose beserta index SDS 3.2
  routes/           satu router per modul, skema zod jadi dokumentasi OpenAPI
  services/         logika: paket, DOKU, R2, statistik, tamu, pembayaran
  middlewares/      auth JWT, role, kepemilikan undangan, rate limit, error
  lib/              error helper, jwt, sanitasi teks, kode tamu
scripts/seed.ts
tests/              bun test per modul, tests/load/public.js untuk k6
```

## Ringkasan API

Semua endpoint ada di bawah `/api/v1`. Dokumentasi interaktif: `GET /docs` (Swagger UI), spesifikasi mentah: `GET /openapi.json`.

| Modul      | Endpoint                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth       | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`                                                                                               |
| Tema       | `GET /themes?tier=`                                                                                                                                     |
| Undangan   | `GET/POST /invitations`, `GET/PUT/DELETE /invitations/:id`, `PATCH /invitations/:id/publish`, `GET /invitations/:id/stats`                              |
| Upload     | `POST /uploads/presign`                                                                                                                                 |
| Tamu       | `GET/POST /invitations/:id/guests`, `POST /invitations/:id/guests/import`, `PUT/DELETE /invitations/:id/guests/:guestId`                                |
| RSVP       | `GET /invitations/:id/rsvps`, `PATCH /invitations/:id/rsvps/:rsvpId`, `GET /invitations/:id/rsvps/export`                                               |
| Publik     | `GET /public/invitations/:slug?to=KODE`, `POST /public/invitations/:slug/rsvps`                                                                         |
| Order      | `POST /orders`, `GET /orders`, `GET /orders/:invoice`                                                                                                   |
| Pembayaran | `POST /payments/doku/notify` (dipanggil DOKU)                                                                                                           |
| Admin      | `GET /admin/stats`, `GET /admin/orders`, `GET /admin/invitations`, `PATCH /admin/invitations/:id/status`, `POST /admin/themes`, `PUT /admin/themes/:id` |

Format respons sukses `{ data, meta? }`, error `{ error: { code, message, details? } }`. Batasan paket dicek di backend dan dijawab `402` dengan `details.required_plan`.

## Uji beban

```sh
k6 run -e BASE_URL=http://localhost:3000 -e SLUG=<slug-undangan-published> tests/load/public.js
```

Skenario 100 pengguna bersamaan untuk halaman publik dan RSVP, dengan target p95 di bawah 500 ms. Jalankan ke server lokal: script memberi setiap virtual user alamat `X-Forwarded-For` sendiri, dan itu hanya berlaku tanpa proxy di depan server.

## Deploy (Railway atau Render)

- Root directory `backend`, build `bun install`, start `bun run start`.
- Isi environment yang sama seperti `.env`, dengan `NODE_ENV=production`.
- Rate limit membaca alamat klien dari entri terakhir `X-Forwarded-For`, yang ditambahkan proxy platform. Jika ada proxy lain di depan (misalnya Cloudflare), sesuaikan `clientIp` di `src/middlewares/rateLimit.ts`.
- Ganti Notification URL di DOKU ke domain backend production.
- Rate limit disimpan di memori proses. Untuk lebih dari satu instance, ganti store `hono-rate-limiter` ke Redis.
