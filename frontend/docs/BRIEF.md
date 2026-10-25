# Brief frontend undaang

Dokumen ini adalah acuan kerja tim frontend. Isinya: apa yang dibangun, untuk siapa, dan kapan sebuah halaman dianggap selesai. Aturan cara menulis kode ada di `../AGENTS.md`, kontrak API di `API.md`, dan urutan pengerjaan di `TASKS.md`.

## 1. Produk dalam satu menit

undaang adalah platform undangan pernikahan digital. Urutan pemakaiannya:

1. Pasangan mendaftar, memilih tema, lalu mengisi data mempelai, acara, galeri, cerita, dan rekening hadiah.
2. Pasangan menerbitkan undangan di alamat `/u/<slug>`.
3. Setiap tamu mendapat tautan personal `/u/<slug>?to=<kode>` yang menampilkan namanya. Sistem mencatat siapa yang sudah membuka undangan.
4. Tamu mengisi RSVP dan ucapan tanpa perlu login. Semuanya terkumpul di dashboard pasangan.

Model bisnisnya freemium. Paket Gratis langsung bisa dipakai dengan batasan. Paket Basic (Rp49.000) dan Premium (Rp99.000) dibayar sekali per undangan lewat DOKU Checkout. Batas tiap paket ada di `API.md` → Aturan paket.

**Tiga area dalam satu aplikasi Vue:**

| Area | Route | Pengguna | Prioritas desain |
|---|---|---|---|
| Dashboard pasangan | `/app/*`, `/orders/:invoice` | pasangan (login) | responsif mobile, tablet, desktop |
| Undangan publik | `/u/:slug` | tamu (tanpa login), dibuka dari WhatsApp | **mobile-first**, ringan, muat < 3 detik di 4G |
| Panel admin | `/admin/*` | admin | desktop cukup, tetap tidak rusak di mobile |

Ditambah halaman `/` (landing + harga), `/login`, dan `/register`.

**Di luar scope:**
- Undangan ulang tahun. Ini ada di dokumen prompt Stitch tetapi tidak ada di SRS.
- Kirim WhatsApp otomatis. Sistem hanya membuat tautan dan teks; user yang mengirim sendiri.
- Realtime atau WebSocket.
- Reset password.

## 2. Peran tim

| Orang | Fokus | Tiket utama |
|---|---|---|
| Pandu (Frontend Engineer) | editor undangan, daftar tamu, RSVP, Pinia, konsumsi API, pembayaran | T-03 s/d T-09, T-13 s/d T-15, T-17 s/d T-19 |
| Krisna (UI/UX + Frontend) | design system, tema dan halaman undangan publik, landing, statistik, admin, responsivitas | T-02, T-10 s/d T-12, T-16, T-20 s/d T-24 |
| Lead (integrasi) | fondasi (sudah selesai), review PR, backend, deploy | review semua PR |

## 3. Yang sudah disiapkan

Bagian ini sudah jadi dan tidak perlu dibuat ulang:

- Router lengkap dengan semua route, guard login dan admin, serta judul tab.
  - Halaman yang belum dibuat menampilkan `TodoPlaceholder` dengan nomor tiketnya.
- Login dan register sudah berfungsi penuh. **`src/views/auth/LoginView.vue` adalah contoh pola yang wajib ditiru.**
- Layout dashboard dan admin dari block **`dashboard-01`**: sidebar inset, tombol aksi utama "Undangan Baru", menu user (profil, transaksi, admin, logout), dan header dengan judul halaman.
- Halaman login dan daftar dari block **`login-02`** dan **`signup-02`**, berupa dua kolom. Panel kanan masih kosong (`bg-muted`) dan menunggu gambar sampul dari desain.
- `StatCards` (kartu angka dari `dashboard-01`) dan komponen `chart` siap dipakai untuk statistik.
- API client bertipe, penanganan error ke Bahasa Indonesia, helper upload R2, dan helper unduh CSV.
- Store auth: token tersimpan, sesi pulih setelah refresh, dan otomatis logout saat token habis.
- Helper format rupiah, tanggal, dan waktu relatif. Label Indonesia untuk status, paket, RSVP, dan order.
- Komponen shadcn-vue yang sudah terpasang:
  - alert, alert-dialog, avatar, badge, breadcrumb, button, card, checkbox;
  - dialog, dropdown-menu, empty, field, input, input-group, label, pagination;
  - progress, radio-group, select, separator, sheet, sidebar, skeleton, sonner;
  - spinner, switch, table, tabs, textarea, tooltip.
- Komponen lain yang dibutuhkan bisa ditambah sendiri: `bunx shadcn-vue@latest add <nama>`. Contohnya `calendar`, `popover`, `scroll-area`, `aspect-ratio`, `toggle-group`, `hover-card`, `command`.

## 4. Desain visual

**UI wajib shadcn-vue.** Aturan lengkapnya di `AGENTS.md`. Ringkasnya:

- Saat ini tampilan memakai token default shadcn. Desain final akan dibuat lead/UI dan dipasang dengan mengganti token CSS di `src/style.css`.
- Selama itu, bangun halaman yang **rapi dan netral**:
  - jarak antarbagian `gap-6`;
  - kartu memakai `Card`;
  - judul memakai `PageHeader`;
  - angka statistik memakai `tabular-nums`.
- **Mockup yang akan datang** dari Stitch, Figma, atau screenshot, kalau ditulis untuk React/shadcn-ui atau tidak memakai shadcn, wajib diterjemahkan ke komponen shadcn-vue yang setara. Jangan disalin mentah dan jangan memasang library UI lain.
- Warna hanya dari token (`bg-primary`, `text-muted-foreground`, ...). Hex dilarang.
- Wordmark selalu ditulis huruf kecil: **undaang**.
- Konvensi tampilan domain sudah tersedia di `src/lib/labels.ts`:
  - Badge paket: Gratis = `secondary`, Basic = `outline`, Premium = `default`.
  - Badge status undangan: Draft = `secondary`, Terbit = `default`, Ditangguhkan = `destructive`.
  - Badge RSVP: Hadir, Tidak Hadir, dan Ragu.
  - Fitur yang terkunci paket: konten dibuat redup (muted), diberi ikon `LockIcon`, `Tooltip` "Tersedia di paket Basic", dan tombol ke halaman upgrade.

## 5. Standar UX wajib

Standar ini berasal dari SRS bagian kebutuhan non-fungsional dan berlaku untuk **setiap** halaman:

- **Loading**: `Skeleton` dengan bentuk yang mirip konten aslinya. Spinner layar penuh tidak boleh dipakai.
- **Kosong**: `Empty` berisi judul, penjelasan singkat, dan tombol aksi pertama, misalnya "Tambah tamu pertama".
- **Error memuat**: `Alert` varian destructive berisi `toUserMessage(err)` dan tombol "Coba lagi".
- **Aksi**:
  - tombol dinonaktifkan dan menampilkan `Spinner` selama aksi berjalan;
  - hasilnya diberi tahu lewat toast sukses atau error;
  - aksi yang menghapus dikonfirmasi dulu lewat `AlertDialog`.
- **Form**: validasi inline di bawah field dengan pola Login, ditambah error 400 dari server lewat `fieldErrors`.
- **Responsif**:
  - dicek di 390px dan 1280px;
  - tabel di mobile boleh di-scroll horizontal di dalam `Card`, tetapi halamannya sendiri tidak boleh;
  - target sentuh minimal 40px.
- **Aksesibilitas**: setiap input punya `FieldLabel`, tombol ikon punya `aria-label` atau `sr-only`, dan dialog bisa ditutup dengan Esc.
- **URL sebagai state**: filter, pencarian, dan halaman tabel disimpan di query string (`?q=&page=`), supaya tetap sama setelah refresh dan bisa dibagikan.

## 6. Spesifikasi halaman

Format setiap halaman: route, tiket, FR yang dicakup, endpoint, isi halaman, dan acceptance criteria (AC).

### 6.1 Landing `/` (T-02, FR-003, FR-008)

- **Endpoint:** `GET /themes`, untuk galeri tema.
- **Isi:**
  - Navbar: wordmark, tombol Masuk, tombol Daftar Gratis.
  - Hero: judul, deskripsi, CTA "Buat Undangan Gratis".
  - Tiga kartu fitur: tautan personal per tamu, RSVP dan ucapan terpusat, amplop digital.
  - Galeri tema dari API, berisi nama dan badge tier.
  - Tabel harga tiga paket dari `PLAN_PRICES` beserta fitur di `API.md`.
  - FAQ memakai `accordion`.
  - Footer.
- **AC:**
  - [ ] Kalau user sudah login, CTA langsung mengarah ke `/app/invitations`.
  - [ ] Galeri tema punya state skeleton dan error.
  - [ ] Rapi di 390px.

### 6.2 Profil `/app/profile` (T-03, FR-001)

- **Endpoint:** data dari `useAuthStore().user`, yang berasal dari `GET /auth/me`.
- **Isi:** kartu berisi nama, email, role, dan tanggal bergabung, plus tombol Keluar. Backend tidak menyediakan edit profil, jadi tampilan ini read-only.
- **AC:**
  - [ ] Data tampil setelah refresh.
  - [ ] Tombol Keluar mengarah ke `/login`.

### 6.3 Undangan Saya `/app/invitations` (T-04, FR-002, FR-003)

- **Endpoint:** `GET /invitations?page&status`, `POST /invitations`, `GET /themes`, `DELETE /invitations/{id}`.
- **Isi:**
  - `PageHeader` dengan tombol "+ Undangan Baru". Dialog buat undangan juga harus terbuka saat URL berisi `?new=1`, karena tombol "Undangan Baru" di sidebar mengarah ke sana. Hapus query itu dari URL setelah dialog ditutup.
  - Grid kartu undangan. Setiap kartu memuat:
    - judul "Groom & Bride", atau slug kalau nama belum diisi;
    - badge status dan badge paket;
    - tautan publik yang bisa disalin (`InputGroup` + tombol salin);
    - jumlah `view_count`;
    - masa aktif (`plan_expires_at`);
    - tombol Edit;
    - `DropdownMenu` berisi: Tamu, RSVP, Statistik, Upgrade, Lihat undangan (tab baru, hanya kalau sudah terbit), dan Hapus.
- **Dialog "Buat Undangan Baru":**
  - Input slug dengan prefix `undaang.id/u/`. Slug otomatis menjadi huruf kecil dan spasi menjadi `-`. Validasinya mengikuti regex di `API.md`.
  - Pilihan tema memakai `RadioGroup` berupa kartu. Tema non-free ditampilkan terkunci.
  - Input opsional nama mempelai pria dan wanita.
  - Setelah sukses, user diarahkan ke `/app/invitations/:id/edit`.
- **AC:**
  - [ ] 409 menampilkan error inline "Alamat ini sudah dipakai" di field slug.
  - [ ] Filter status memakai `Tabs` (Semua, Draft, Terbit, Ditangguhkan) dan disimpan di query.
  - [ ] Ada paginasi kalau `total_pages > 1`.
  - [ ] Hapus menampilkan AlertDialog yang menyebut bahwa tamu dan RSVP ikut terhapus.
  - [ ] Empty state muncul kalau belum ada undangan.

### 6.4 Editor `/app/invitations/:id/edit` (T-05 s/d T-09 dan T-12; FR-002, FR-003, FR-004, FR-007)

- **Endpoint:** `GET /invitations/{id}`, `PUT /invitations/{id}`, `PATCH .../publish`, `GET /themes`, `uploadFile`.
- **State:** `useEditorStore` (Pinia), yang menyimpan `invitation`, `saving`, `load(id)`, `save(patch)`, dan `publish(bool)`. Store ini dipakai bersama oleh semua tab dan pratinjau.
- **Layout desktop:**
  - kiri, sekitar 55%: `Tabs`;
  - kanan, sekitar 45%: pratinjau sticky dalam bingkai ponsel (T-12).
- **Layout mobile:** pratinjau dibuka lewat tombol "Pratinjau" yang membuka `Sheet` atau `Dialog`.
- **Header:**
  - breadcrumb;
  - badge status dan badge paket;
  - teks kecil "Tersimpan" atau "Menyimpan…";
  - tombol "Terbitkan" atau "Tarik ke Draft";
  - tautan "Lihat undangan" kalau sudah terbit.
- **Tab dan isinya:**
  - **Tema & Pengaturan** (T-06):
    - pilih tema; tema dengan tier di luar `limits.theme_tiers` tetap bisa dipilih untuk pratinjau, tetapi diberi badge "Butuh paket X". Backend menolak penyimpanannya dengan 402, dan UI menawarkan upgrade;
    - warna utama (`<Input type="color">` + hex), tombol reset ke default tema;
    - musik latar: upload mp3/m4a/ogg, hanya kalau `limits.music`, selain itu terkunci;
    - `Switch` "Tampilkan buku ucapan".
  - **Mempelai** (T-07): dua kartu, Pria dan Wanita. Isinya foto (upload `couple`), nama lengkap, panggilan, dan orang tua.
  - **Acara** (T-07):
    - daftar kartu acara dengan Select jenis (Akad, Pemberkatan, Resepsi);
    - tanggal dan jam mulai, jam selesai opsional;
    - nama tempat, alamat, dan link Google Maps;
    - tombol hapus per acara dan tombol "+ Tambah Acara" (maksimal 10).
  - **Galeri** (T-08):
    - grid foto, upload banyak foto sekaligus;
    - caption, urutan (tombol naik/turun), dan hapus;
    - teks "4 / 6 foto" berdasarkan `limits.gallery_limit`;
    - tombol upload dinonaktifkan kalau sudah penuh, dengan ajakan upgrade.
  - **Cerita** (T-08): daftar momen berisi tanggal, judul, dan isi. Bisa ditambah, dihapus, dan diurutkan. Maksimal 20.
  - **Amplop Digital** (T-09):
    - rekening berisi bank, nomor, dan atas nama; maksimal 5;
    - kalau `!limits.gift_accounts`, seluruh tab dikunci dengan ikon gembok di judul tab, Tooltip, dan kartu ajakan upgrade.
- **Cara menyimpan:**
  - Setiap tab punya tombol "Simpan" sendiri yang mengirim **hanya bagian tab itu**, misalnya `{ events }`.
  - Bagian yang berupa array dikirim utuh.
  - Autosave tidak wajib.
  - Tampilkan peringatan kalau user meninggalkan tab atau halaman dengan perubahan yang belum disimpan.
- **AC:**
  - [ ] 402 menampilkan toast dengan tombol "Upgrade" ke `/app/invitations/:id/upgrade`.
  - [ ] Terbitkan dengan data kurang (422) menampilkan daftar `details.missing` dalam bahasa manusia, misalnya "Nama mempelai pria", "Minimal 1 acara".
  - [ ] Undangan `suspended` membuat seluruh editor read-only, dengan Alert "Ditangguhkan admin".
  - [ ] Upload memeriksa tipe dan ukuran dulu, menampilkan progres atau spinner, dan foto langsung muncul di pratinjau setelah disimpan.
  - [ ] Format tanggal dan jam sesuai zona waktu browser. Kirim ke backend dengan `new Date(...).toISOString()`.

### 6.5 Undangan publik `/u/:slug?to=KODE` (T-10, T-11; FR-004, FR-005, FR-006, FR-007)

- **Endpoint:** `GET /public/invitations/{slug}?to=`, dipanggil **satu kali** saat halaman dibuka, dan `POST /public/invitations/{slug}/rsvps`.
- **Arsitektur:**
  - `components/invitation/InvitationRenderer.vue` menerima prop `invitation: PublicInvitation` dan `preview?: boolean`, lalu merangkai section-section di bawah.
  - Komponen yang sama dipakai pratinjau editor (T-12). Editor memetakan data draft ke bentuk `PublicInvitation`.
- **Tema:**
  - Tampilan dipilih berdasarkan `theme.code`, dengan peta `code → komponen/kelas` di `components/invitation/themes.ts`.
  - Tema yang belum dikenal memakai tampilan default.
  - `settings.primary_color` dipasang sebagai CSS variable `--primary` pada root renderer, supaya komponen shadcn ikut berwarna.
- **Section, berurutan:**
  1. Cover: "Kepada Yth. {guest.name}" kalau ada guest, nama pasangan, tanggal acara pertama, dan tombol "Buka Undangan". Tombol ini juga yang memulai musik, karena browser melarang autoplay.
  2. Profil mempelai: foto, nama, dan orang tua.
  3. Countdown ke acara pertama.
  4. Kartu acara: jenis, tanggal dan jam, tempat, alamat, tombol "Lihat Lokasi" (`maps_url`), dan tombol "Simpan ke Kalender" (link Google Calendar).
  5. Galeri: grid, gambar `loading="lazy"`, klik untuk memperbesar di `Dialog`.
  6. Kisah cinta: timeline.
  7. Amplop digital, kalau `gift_accounts.length`: bank, nomor, nama, dan tombol salin (`useClipboard` + toast).
  8. Form RSVP (T-11).
  9. Buku ucapan, kalau `settings.show_wishes`: daftar `wishes` dengan waktu relatif.
  10. Footer: watermark "Dibuat dengan undaang" kalau `watermark`.
  11. Tombol musik melayang (play/pause) kalau `settings.music_url`.
- **Form RSVP:**
  - Dengan `guest`: nama tidak perlu diisi (tampil sebagai sapaan), dan jumlah orang dipilih dari 1 sampai `guest.pax_quota`.
  - Tanpa `guest`: nama wajib, jumlah orang 1–10.
  - Kehadiran memakai `RadioGroup` (Hadir, Tidak Hadir, Ragu). Kalau Tidak Hadir dipilih, field jumlah orang disembunyikan.
  - Ucapan maksimal 500 karakter dengan penghitung karakter.
  - Kirim `to` dari query.
  - Setelah sukses, tampilkan kartu terima kasih. Ucapan baru ditambahkan di bagian atas daftar tanpa reload, dan **tanpa** memanggil ulang GET supaya `view_count` tidak bertambah.
  - Kalau ada 429, tampilkan pesan yang ramah.
- **AC:**
  - [ ] 404 menampilkan halaman "Undangan tidak ditemukan". 410 menampilkan "Undangan ini sudah tidak aktif". Keduanya dengan tampilan tema netral.
  - [ ] Rapi di 360–430px. Di desktop, konten di tengah dengan `max-w-md`.
  - [ ] Teks dari user ditampilkan dengan `{{ }}`, tidak pernah `v-html`.
  - [ ] Judul tab: `og.title`.
  - [ ] Lighthouse mobile Performance ≥ 80: gambar lazy, tidak ada library berat.
- **Catatan Open Graph:**
  - Pratinjau tautan di WhatsApp (judul + foto) membutuhkan meta tag di HTML awal. SPA murni tidak bisa melakukannya karena crawler WhatsApp tidak menjalankan JavaScript.
  - Untuk sekarang cukup set `document.title`.
  - Solusi nyatanya ada di tiket opsional T-25, yaitu Cloudflare Pages Function yang menyisipkan `og` dari API.

### 6.6 Daftar Tamu `/app/invitations/:id/guests` (T-13, T-14; FR-005, FR-009)

- **Endpoint:** `GET/POST/PUT/DELETE .../guests`, `POST .../guests/import`, `GET /invitations/{id}` (untuk `limits` dan slug), `GET .../stats` (untuk kuota).
- **Isi:**
  - Kartu kuota: `Progress` "42 / 50 tamu" dan badge paket, plus tautan Upgrade kalau hampir penuh.
  - Toolbar:
    - cari nama, dengan debounce 300ms;
    - filter grup;
    - filter "Sudah dibuka / Belum";
    - urutan;
    - tombol "Impor CSV" (badge Premium dan terkunci kalau `!limits.csv_import`);
    - tombol "+ Tambah Tamu".
  - Tabel dengan kolom Nama, Grup, Kuota orang, Dibuka (waktu relatif atau "Belum"), dan menu baris:
    - Salin tautan;
    - Salin teks undangan;
    - Bagikan ke WhatsApp;
    - Edit;
    - Hapus.
  - Paginasi beserta pilihan jumlah baris per halaman.
  - Form tambah dan edit tamu memakai `Sheet`: nama, nomor WhatsApp, grup, kuota orang.
  - Impor CSV memakai `Dialog`:
    - contoh format dan tombol "Unduh template", yaitu CSV `name,phone,group,pax_quota` yang dibuat di browser;
    - pilih file (≤1 MB);
    - kalau ada error, tampilkan tabel error per baris dari `details.rows`.
- **AC:**
  - [ ] Filter dan halaman disimpan di query URL.
  - [ ] 402 kuota habis menampilkan toast dengan tombol Upgrade.
  - [ ] Tautan yang disalin adalah `personal_url` dari API, bukan dirakit sendiri.

### 6.7 RSVP & Ucapan `/app/invitations/:id/rsvps` (T-15, FR-006, FR-009)

- **Endpoint:** `GET .../rsvps`, `PATCH .../rsvps/{rsvpId}`, `GET .../rsvps/export`.
- **Isi:**
  - Ringkasan tiga angka: Hadir (beserta jumlah orang), Tidak Hadir, Ragu.
  - `Tabs` filter kehadiran.
  - Pencarian nama.
  - Filter Ditampilkan / Disembunyikan.
  - Daftar kartu ucapan: avatar inisial, nama, badge kehadiran, jumlah orang, pesan, waktu, dan `Switch` "Tampilkan" (PATCH `is_hidden`).
  - Tombol "Ekspor CSV", hanya untuk Premium (selain itu terkunci).
- **AC:**
  - [ ] Switch langsung berubah (optimistic) dan kembali ke posisi semula kalau request gagal.
  - [ ] Ekspor mengunduh file `rsvp-<slug>.csv`.

### 6.8 Statistik `/app/invitations/:id/stats` (T-16, FR-009)

- **Endpoint:** `GET .../stats`.
- **Isi:**
  - Empat kartu angka: Kunjungan, Tautan dibuka (`opened/total`), Hadir (beserta estimasi orang), dan Belum merespons (`total - responded`).
  - Empat kartu memakai `StatCards`.
  - Diagram rekap RSVP memakai `@/components/ui/chart`, yang sudah terpasang. Bisa donut atau bar.
  - Progress kuota tamu.
- **AC:**
  - [ ] Angka memakai `formatNumber` dan `tabular-nums`.
  - [ ] Ada skeleton.
  - [ ] Kalau belum ada tamu atau RSVP, tampilkan empty state berisi ajakan menambah tamu.

### 6.9 Upgrade `/app/invitations/:id/upgrade` (T-17, FR-008)

- **Endpoint:** `GET /invitations/{id}`, `POST /orders`.
- **Isi:**
  - Pilihan Basic atau Premium (`RadioGroup` berupa kartu) beserta daftar fitur.
  - Paket yang tidak bisa dipilih ditandai, misalnya paket yang lebih rendah dari paket aktif.
  - Kartu ringkasan: undangan, paket, masa aktif, total.
  - Catatan "Pembayaran diproses aman melalui DOKU".
  - Tombol "Lanjut ke Pembayaran".
- **AC:**
  - [ ] Setelah klik, tombol menampilkan spinner, lalu browser diarahkan ke `window.location.href = payment_url`.
  - [ ] 502 atau 503 menampilkan toast dan user tetap di halaman.
  - [ ] Harga hanya sebagai teks. Yang dikirim ke backend hanya `{ invitation_id, plan }`.

### 6.10 Status Pembayaran `/orders/:invoice` (T-18, FR-008)

- **Endpoint:** `GET /orders/{invoice}`.
- **Isi berdasarkan status:**
  - `pending`: ikon jam, nomor invoice, teks "Menunggu pembayaran", polling otomatis setiap 4 detik, tombol "Cek Status" manual, dan tautan "Lanjutkan pembayaran" (`payment_url`).
  - `paid`: tanda centang, "Paket X aktif", metode bayar, dan tombol ke editor.
  - `expired` atau `failed`: tombol "Bayar Ulang" ke halaman upgrade.
- **AC:**
  - [ ] Polling dihentikan di `onUnmounted` dan setelah status final.
  - [ ] Halaman ini butuh login. Kalau token hilang, user login lalu kembali ke sini lewat `?redirect`, dan ini sudah ditangani router.

### 6.11 Riwayat Transaksi `/app/orders` (T-19, FR-008)

- **Endpoint:** `GET /orders`.
- **Isi:** tabel berisi invoice, undangan, paket, nominal (`formatRupiah`), status (badge), dan tanggal. Klik baris membuka `/orders/:invoice`. Ada paginasi dan empty state.

### 6.12 Admin (T-20 s/d T-23, FR-010)

- **Statistik `/admin/stats`:** memakai `StatCards`, berisi kartu pengguna, undangan per status, undangan berbayar, pendapatan total dan 30 hari terakhir, serta pendapatan per paket.
- **Tema `/admin/themes`:** tabel tema (`GET /themes` hanya mengembalikan tema aktif; tampilkan apa adanya). Tambah dan edit memakai `Sheet`: code, nama, tier, preview URL, warna default, font, dan aktif.
- **Transaksi `/admin/orders`:** tabel semua order dengan nama dan email user serta slug undangan, plus filter status.
- **Undangan `/admin/invitations`:** cari slug, filter status, dan tombol Tangguhkan / Pulihkan dengan AlertDialog. Teks dialog menjelaskan bahwa memulihkan undangan mengembalikannya ke draft.

## 7. Glosarium

| Istilah | Arti |
|---|---|
| Undangan / invitation | entitas utama, satu per pernikahan |
| Slug | alamat publik, mis. `raka-dan-sinta` |
| Kode tamu / `to` | 8 karakter unik per tamu, untuk tautan personal |
| Pax | jumlah orang yang datang |
| Paket / plan | free, basic, premium; berlaku per undangan, bukan per akun |
| Ditangguhkan / suspended | dinonaktifkan admin |
| Watermark | tulisan "Dibuat dengan undaang" di paket Gratis |
