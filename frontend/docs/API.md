# Kontrak API backend (versi frontend)

Ringkasan ini untuk menulis halaman. Sumber kebenarannya ada dua:

- **Swagger UI** di `http://localhost:3000/docs` (selama backend jalan);
- tipe di `src/api/schema.d.ts`, hasil `bun run gen:api`.

Kalau ringkasan ini berbeda dengan Swagger, yang benar adalah Swagger. Kabari lead supaya dokumen ini diperbaiki.

## Dasar

- **Prefix:** semua endpoint ada di bawah `/api/v1`. Di dev, panggil path relatif (`/api/v1/...`); Vite mem-proxy-nya ke `localhost:3000`.
- **Auth:** header `Authorization: Bearer <token>` dipasang otomatis oleh `src/api/client.ts`.
  - Token berlaku 24 jam.
  - Tidak ada refresh token. Setelah token habis, user harus login ulang. Client otomatis logout dan mengarahkan ke `/login` saat menerima 401.
- **Role:** `user` dan `admin`. Admin lolos semua cek kepemilikan undangan.
- **Bentuk response sukses:** `{ data }`. Untuk list: `{ data: [...], meta: { page, limit, total, total_pages } }`.
- **Paginasi:** query `page` (mulai 1) dan `limit` (1–100, default 20).
- **Bentuk response error:** `{ error: { code, message, details? } }`. `unwrap()` mengubahnya menjadi `ApiError`.
- **ID:** setiap objek punya `id` (string). Tidak ada `_id`.
- **Tanggal:** string ISO. Tampilkan dengan `formatDate` / `formatDateTime`.
- **Teks:** semua teks yang dikirim akan dibersihkan dari tag HTML oleh backend. Tetap tampilkan dengan `{{ }}`, **jangan pernah pakai `v-html`**.

## Kode error dan reaksi UI

| Status | `code` | Kapan | Yang harus dilakukan UI |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | isian tidak valid; `details: [{ path, message }]` | `setErrors(fieldErrors(err))` agar error tampil di bawah input |
| 400 | `BAD_REQUEST` | aturan bisnis gagal | `toast.error(err.message)` atau `toUserMessage` |
| 401 | `UNAUTHORIZED` | token habis, atau email/password salah | login: error di field password; selain itu otomatis redirect ke login |
| 402 | `PLAN_LIMIT` | fitur di atas paket; `details: { plan, required_plan, limit?, remaining? }` | toast + tombol ke `/app/invitations/:id/upgrade` |
| 403 | `FORBIDDEN` | bukan pemilik, bukan admin, atau undangan ditangguhkan | Alert, lalu arahkan kembali ke daftar |
| 404 | `NOT_FOUND` | data tidak ada | Empty state "tidak ditemukan" |
| 409 | `CONFLICT` | email, slug, atau kode tema sudah dipakai | error inline di field terkait |
| 410 | `GONE` | undangan publik sudah kedaluwarsa | halaman "Undangan sudah tidak aktif" |
| 413 | `PAYLOAD_TOO_LARGE` | CSV lebih dari 1 MB | toast |
| 422 | `UNPROCESSABLE` | terbitkan undangan saat data wajib belum ada; `details.missing: string[]` | tampilkan daftar yang kurang |
| 429 | `TOO_MANY_REQUESTS` | rate limit | toast "coba lagi nanti" (header sisa kuota tidak bisa dibaca browser) |
| 502 | `BAD_GATEWAY` | DOKU gagal | toast, user bisa coba lagi |
| 503 | `SERVICE_UNAVAILABLE` | R2 atau DOKU belum dikonfigurasi di `.env` backend | toast; laporkan ke lead |

## Aturan paket (`backend/src/config/plans.ts`)

| | free (Gratis) | basic | premium |
|---|---|---|---|
| Harga sekali bayar | Rp0 | Rp49.000 | Rp99.000 |
| Tier tema yang boleh | free | free, basic | semua |
| Watermark | ya | tidak | tidak |
| Kuota tamu | 50 | 300 | 1.000 |
| Foto galeri | 6 | 20 | 50 |
| Musik + amplop digital | tidak | ya | ya |
| Impor CSV tamu + ekspor RSVP | tidak | tidak | ya |
| Masa aktif | 30 hari | 180 hari | 365 hari |

**Jangan hardcode tabel ini di logika.** Setiap `Invitation` membawa:

```
limits: { guest_quota, gallery_limit, theme_tiers[], watermark, music, gift_accounts, csv_import, rsvp_export }
```

Pakai `limits` untuk menampilkan gembok atau batas. Harga hanya boleh muncul sebagai teks di landing dan upgrade, lewat `PLAN_PRICES` di `src/lib/labels.ts`.

## Endpoint

Keterangan kolom Auth: **–** = publik, **B** = Bearer, **O** = Bearer + pemilik undangan (atau admin), **A** = admin.

### Auth (FR-001)

| Method | Path | Auth | Body / query | Response `data` |
|---|---|---|---|---|
| POST | `/auth/register` | – | `name` 1–100, `email`, `password` 8–72 | `Session`; 409 kalau email sudah dipakai |
| POST | `/auth/login` | – | `email`, `password` | `Session`; 401 kalau salah; 429 kalau lebih dari 10 kali per 15 menit |
| GET | `/auth/me` | B | – | `User` |

- `Session = { user, token, token_type: 'Bearer', expires_in: 86400 }`.
- `User = { id, name, email, role, createdAt, updatedAt }`.
- Semua ini sudah dibungkus `useAuthStore()`.

### Tema (FR-003, FR-010)

| Method | Path | Auth | Body / query | Catatan |
|---|---|---|---|---|
| GET | `/themes` | – | `?tier=free\|basic\|premium` | hanya tema aktif, tanpa paginasi |
| POST | `/admin/themes` | A | `code` (kebab-case, ≤50), `name`, `tier`, `preview_url?`, `defaults?{primary_color #rrggbb, font?}`, `is_active?` | 409 kalau `code` sudah dipakai |
| PUT | `/admin/themes/{id}` | A | field yang sama, semuanya opsional | |

`Theme = { id, code, name, tier, preview_url|null, defaults: { primary_color, font|null }, is_active }`.

Data seed: `rustic-sage` (free), `classic-ivory` (basic), `royal-navy` (premium). Ketiganya tanpa `preview_url`.

### Undangan (FR-002, FR-003, FR-004, FR-007)

| Method | Path | Auth | Body / query | Catatan |
|---|---|---|---|---|
| GET | `/invitations` | B | `?status&page&limit` | undangan milik sendiri, terbaru dulu |
| POST | `/invitations` | B | `slug`, `theme_id`, `couple?` | dibuat sebagai draft dengan paket free; tema harus tier free (selain itu 402); 409 kalau slug sudah dipakai |
| GET | `/invitations/{id}` | O | – | data lengkap untuk editor |
| PUT | `/invitations/{id}` | O | field mana pun dari daftar di bawah | 402 kalau melewati batas paket; 409 kalau slug sudah dipakai |
| PATCH | `/invitations/{id}/publish` | O | `{ published: boolean }` | lihat penjelasan di bawah |
| DELETE | `/invitations/{id}` | O | – | ikut menghapus tamu dan RSVP |
| GET | `/invitations/{id}/stats` | O | – | lihat bagian Statistik |

**Syarat `slug`:** 3–60 karakter, huruf kecil, angka, dan tanda `-` (`^[a-z0-9]+(-[a-z0-9]+)*$`). Contoh: `raka-dan-sinta`.

**Field yang bisa dikirim lewat `PUT /invitations/{id}`:** `slug`, `theme_id`, `couple`, `events`, `gallery`, `stories`, `gift_accounts`, `settings`.

**Hasil `PATCH /invitations/{id}/publish`:**
- `true` mewajibkan `couple.groom.name`, `couple.bride.name`, dan minimal 1 acara. Kalau belum ada, jawabannya 422 dengan `details.missing`.
- Undangan yang ditangguhkan admin menjawab 403.
- Paket kedaluwarsa, atau tema di atas paket, menjawab 402.

**Gotcha PUT:**
- Setiap bagian yang dikirim **menggantikan seluruh isi lama**. Kirim seluruh array `events`, `gallery`, `stories`, atau `gift_accounts`, bukan satu item saja.
- `couple.groom` dan `couple.bride` harus dikirim lengkap. Field yang tidak dikirim akan menjadi kosong.
- Bagian yang tidak dikirim tidak berubah. Jadi tab "Acara" cukup mengirim `{ events: [...] }`.

**Bentuk data:**

- **Person:**
  - `name` ≤100
  - `nickname` ≤50
  - `parents` ≤200, misalnya "Putra dari Bapak A & Ibu B"
  - `photo_url` URL atau null
- **Event:**
  - `type`: `akad`, `pemberkatan`, atau `resepsi`
  - `start_at`: ISO datetime, wajib
  - `end_at`: ISO atau null, dan tidak boleh sebelum `start_at`
  - `venue`: 1–200, wajib
  - `address` ≤500
  - `maps_url` URL atau null
  - Response menambahkan `id`.
- **Galeri:** `{ url, caption ≤200, order ≥0 }`, maksimal sebanyak `limits.gallery_limit`.
- **Cerita:** `{ date: 'YYYY-MM-DD' | null, title 1–100, body ≤2000 }`, maksimal 20. Response mengembalikan `date` sebagai ISO.
- **Rekening:** `{ bank 1–50, account_no (angka, spasi, '-', 4–40 karakter), account_name 1–100 }`, maksimal 5. Hanya untuk `limits.gift_accounts`.
- **settings:**
  - `primary_color` `#rrggbb` atau null
  - `music_url` URL atau null; hanya untuk `limits.music`
  - `show_wishes` boolean

**Response `Invitation`:**
- `id`, `owner_id`, `slug`, `theme_id`
- `status`: `draft`, `published`, atau `suspended`
- `plan`, `plan_expires_at`
- `couple`, `events[]`, `gallery[]`, `stories[]`, `gift_accounts[]`
- `settings`, `view_count`, `limits`, `createdAt`, `updatedAt`

### Upload foto dan musik (FR-004)

Panggil `uploadFile(invitationId, kind, file)`. Fungsi itu sudah menangani langkah 1–3:

1. `POST /uploads/presign` (B) dengan `{ invitation_id, kind, content_type, size }`.
2. Backend memvalidasi file:
   - `gallery` dan `couple`: `image/jpeg`, `image/png`, atau `image/webp`, maksimal **5 MB**;
   - `music`: `audio/mpeg`, `audio/mp4`, atau `audio/ogg`, maksimal **10 MB**, dan butuh paket Basic ke atas;
   - `gallery` ditolak dengan 402 kalau galeri sudah penuh.
3. Browser mengirim `PUT` langsung ke `upload_url` R2. URL ini berlaku 10 menit.
4. **Kamu yang menyimpan URL-nya.** Hasil `public_url` belum tersimpan di mana pun. Masukkan ke undangan lewat `PUT /invitations/{id}`:
   - galeri: `gallery: [...lama, { url, caption: '', order }]`;
   - foto mempelai: `couple.groom.photo_url` atau `couple.bride.photo_url`;
   - musik: `settings.music_url`.

Cek tipe dan ukuran file di frontend **sebelum** upload, supaya user cepat tahu kalau filenya salah. Pakai `accept="image/jpeg,image/png,image/webp"` pada input file.

### Tamu (FR-005, FR-009)

| Method | Path | Auth | Body / query |
|---|---|---|---|
| GET | `/invitations/{id}/guests` | O | `q` (nama), `group`, `opened=true\|false`, `sort=name\|-name\|createdAt\|-createdAt\|opened_at\|-opened_at`, `page`, `limit` |
| POST | `/invitations/{id}/guests` | O | `name` 1–100, `phone?` (`+62 812-...`, 6–20 karakter), `group?` ≤50, `pax_quota` 1–20 (default 2) |
| POST | `/invitations/{id}/guests/import` | O, Premium | `multipart/form-data`, field `file` (.csv, ≤1 MB); pakai `importGuestsCsv(id, file)` |
| PUT | `/invitations/{id}/guests/{guestId}` | O | field yang sama, sebagian boleh |
| DELETE | `/invitations/{id}/guests/{guestId}` | O | – |

- POST menjawab 402 kalau kuota tamu habis, dengan `details: { limit, remaining }`.
- **Format CSV impor:**
  - header `name` wajib, sedangkan `phone`, `group`, dan `pax_quota` opsional;
  - kalau ada satu baris salah, **seluruh file ditolak** dengan 400 `details.rows: [{ row, path, message }]`. Baris 2 adalah tamu pertama, sama seperti nomor baris di spreadsheet;
  - kalau sukses, jawabannya `{ imported, guests[] }`.
- **Response `Guest`:**
  - `id`, `name`, `code` (8 karakter), `phone|null`, `group|null`, `pax_quota`
  - `opened_at|null` (null berarti belum dibuka)
  - **`personal_url`**: tautan lengkap `.../u/<slug>?to=<code>`
  - **`share_text`**: teks WhatsApp siap kirim
- Tombol "Bagikan ke WhatsApp" cukup membuka `https://wa.me/<phone tanpa + dan spasi>?text=${encodeURIComponent(share_text)}`. Kalau tamu tidak punya nomor, pakai `https://wa.me/?text=...`.

### RSVP dan ucapan, sisi pemilik (FR-006, FR-009)

| Method | Path | Auth | Body / query |
|---|---|---|---|
| GET | `/invitations/{id}/rsvps` | O | `attendance=hadir\|tidak_hadir\|ragu`, `q`, `hidden=true\|false`, `page`, `limit` |
| PATCH | `/invitations/{id}/rsvps/{rsvpId}` | O | `{ is_hidden: boolean }` |
| GET | `/invitations/{id}/rsvps/export` | O, Premium | CSV; pakai `downloadRsvpCsv(id, \`rsvp-${slug}.csv\`)` |

`Rsvp = { id, guest_id|null, name, attendance, pax, message, is_hidden, createdAt }`.

### Statistik (FR-009)

`GET /invitations/{id}/stats` (O) mengembalikan:

```
{
  view_count,
  guests: { total, opened, not_opened, responded, quota, remaining_quota },
  rsvps: { total, by_attendance: { hadir: {count, pax}, tidak_hadir: {...}, ragu: {...} } },
  estimated_attendance   // jumlah pax yang hadir
}
```

### Halaman publik (FR-004, FR-006, FR-007)

**`GET /public/invitations/{slug}?to=KODE`**, tanpa auth.

- Kode jawaban:
  - 404 kalau undangan tidak ada atau belum terbit;
  - 410 kalau sudah kedaluwarsa;
  - 400 kalau format `to` salah (bukan 8 huruf/angka).
- Setiap kali dibuka, `view_count` bertambah. Dengan `to` yang valid, `opened_at` tamu juga tercatat. Jadi **panggil endpoint ini satu kali per kunjungan**, jangan berulang-ulang.
- Response `PublicInvitation`:
  - `slug`, `theme: { code, name, defaults } | null`, `couple`, `events`
  - `gallery`: sudah dipotong sesuai paket
  - `stories`
  - `gift_accounts`: `[]` di paket free
  - `settings: { primary_color, music_url, show_wishes }`
  - `watermark: boolean`
  - `guest: { name, group, pax_quota } | null`
  - `wishes`: maksimal 20 ucapan terbaru yang tidak disembunyikan
  - `og: { title, image }`

**`POST /public/invitations/{slug}/rsvps`**, tanpa auth, dibatasi 20 kali per 10 menit per IP.

- Body: `{ name?, attendance, pax 0–20, message ≤500, to? }`.
- Dengan `to`:
  - nama diambil dari daftar tamu, jadi field nama boleh disembunyikan;
  - `pax` tidak boleh melebihi `guest.pax_quota`;
  - kalau dikirim ulang, data lama diperbarui dan jawabannya 200, bukan 201.
- Tanpa `to`: `name` wajib dan `pax` maksimal 10.
- `tidak_hadir` selalu disimpan dengan `pax = 0`.
- Kalau `pax` terlalu banyak, jawabannya 400 dengan `details.max_pax`.

### Pesanan dan pembayaran (FR-008)

| Method | Path | Auth | Body / query |
|---|---|---|---|
| POST | `/orders` | B | `{ invitation_id, plan: 'basic' \| 'premium' }` |
| GET | `/orders` | B | `page`, `limit` |
| GET | `/orders/{invoice}` | B | – |

`Order = { invoice_number, invitation_id, plan, amount, status: pending|paid|expired|failed, payment_url, payment_method|null, paid_at|null, createdAt }`.

**Alur bayar:**
1. `POST /orders`.
   - Hasilnya `Order` berstatus `pending` dengan `payment_url`.
   - 400 kalau turun paket selagi paket lama masih aktif.
   - 502 atau 503 kalau DOKU bermasalah.
2. `window.location.href = order.payment_url`. User membayar di halaman DOKU, yang aktif selama 60 menit.
3. DOKU mengembalikan user ke **`/orders/<invoice_number>`** (frontend).
4. Halaman itu memanggil `GET /orders/{invoice}` **setiap 4 detik** selama status masih `pending`. Polling berhenti saat status sudah `paid`, `expired`, atau `failed`, atau saat user meninggalkan halaman.
5. Kalau sudah `paid`, tampilkan "Paket X aktif" dan tombol kembali ke editor. Data undangan perlu di-refetch supaya `limits` baru ikut terambil.

Paket hanya aktif lewat webhook DOKU atau pengecekan oleh backend, **tidak pernah karena user kembali ke halaman ini**. Halaman ini hanya menampilkan status.

### Admin (FR-010)

| Method | Path | Auth | Query / body | Response |
|---|---|---|---|---|
| GET | `/admin/stats` | A | – | `{ users, invitations: { total, by_status, paid }, revenue: { total, paid_orders, by_plan, last_30_days } }` |
| GET | `/admin/orders` | A | `status`, `page`, `limit` | `user_id` berisi `{ id, name, email }`, `invitation_id` berisi `{ id, slug }` |
| GET | `/admin/invitations` | A | `q` (potongan slug), `status`, `page`, `limit` | |
| PATCH | `/admin/invitations/{id}/status` | A | `{ suspended: boolean }` | `false` mengembalikan status ke draft, lalu pemilik harus menerbitkan ulang |

Endpoint tema admin ada di bagian Tema di atas.

## Rate limit

| Endpoint | Batas per IP |
|---|---|
| `POST /auth/login` | 10 per 15 menit |
| `POST /public/invitations/{slug}/rsvps` | 20 per 10 menit |
