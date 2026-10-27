# Tiket frontend undaang

Setiap tiket sudah menjadi issue di [GitHub Projects](https://github.com/users/moshcat/projects/5) dengan kolom To Do, Doing, dan Done.

**Aturan main:**
- Kerjakan tiket sesuai urutan dependensinya.
- Satu tiket berarti satu branch `feat/T-xx-...` (bug: `fix/...`) dan satu PR ke `dev`.
- Spesifikasi lengkap dan acceptance criteria (AC) ada di `BRIEF.md` pada bagian yang disebut di setiap tiket.

## Cara memakai prompt

Setiap tiket punya blok **Prompt**. Tempel ke AI agent (Claude Code, Codex, Cursor) **dalam satu sesi baru** yang dibuka dari folder `frontend/`. Awali dengan blok pembuka ini:

```
Kamu bekerja di repo undaang, folder frontend/. Sebelum menulis kode, baca:
AGENTS.md (aturan keras), docs/BRIEF.md (spesifikasi), docs/API.md (kontrak API),
dan src/views/auth/LoginView.vue (pola form/API wajib). Pakai skill vue-best-practices,
shadcn-vue, dan antislop bila tersedia, dan MCP shadcn untuk mencari komponen.
UI wajib shadcn-vue; jangan pasang library UI lain, jangan hardcode warna.
Jangan ubah backend/, src/components/ui/, atau src/api/schema.d.ts.
Kalau ada yang ambigu atau API tidak cukup, BERHENTI dan tanya saya.
Setelah selesai jalankan `bun run lint && bun run typecheck && bun run build`
dan perbaiki sampai hijau. Ringkas file yang kamu ubah dan apa yang perlu saya cek manual.
```

Setelah blok pembuka, tempel prompt tiketnya.

## Checklist review hasil AI (setiap PR)

Tanda-tanda hasil AI yang perlu dicurigai:

- [ ] Import paket yang tidak ada di `package.json`, `axios`, `react`, `@radix-ui`, `lucide-vue-next`, atau library UI lain.
- [ ] `fetch(` ke backend, URL backend ditulis manual, atau `interface Invitation {...}` yang ditulis sendiri padahal sudah ada di `@/api/types`.
- [ ] `any`, `as unknown as`, `// @ts-ignore`, atau `v-html`.
- [ ] Hex atau kelas warna mentah (`bg-blue-500`), atau `<div>` yang dibuat menjadi tombol.
- [ ] Logika paket di frontend, misalnya `if (plan === 'free') return`, tanpa membaca `limits` atau menangani 402.
- [ ] Halaman tanpa skeleton, tanpa empty state, tanpa error state, atau tanpa toast.
- [ ] Perubahan di file yang tidak terkait tiket. Minta AI mengembalikannya.
- [ ] Komentar basa-basi seperti `// This function handles the click`. Hapus.

Kalau masih ragu, jalankan halamannya, klik semua tombol, matikan backend lalu coba lagi, dan buka di lebar 390px.

## Peta dependensi

```
T-01 ─┬─ T-02, T-03
      ├─ T-04 ── T-05 ─┬─ T-06, T-07, T-08, T-09
      │                └─ T-12 (butuh T-10)
      ├─ T-10 ── T-11
      ├─ T-13 ── T-14        (butuh T-04 untuk navigasi)
      ├─ T-15, T-16          (butuh T-04)
      ├─ T-17 ── T-18 ── T-19
      └─ T-20, T-21, T-22, T-23
T-24 di akhir; T-25 opsional
```

---

## T-01 · Setup lingkungan (semua orang)
**FR:** – · **Butuh:** –

Ikuti `WALKTHROUGH.md` langkah 1–5. Selesai kalau:
- backend dan frontend jalan;
- bisa register dan login di `http://localhost:5173`;
- `/mcp` menunjukkan shadcn Connected;
- skills sudah terpasang.

Tiket ini tanpa PR.

## T-02 · Landing page (Krisna)
**FR:** FR-003, FR-008 · **Butuh:** T-01 · **BRIEF:** 6.1 · **File:** `src/views/public/LandingView.vue`, `src/components/landing/*`

**Prompt:**
```
Kerjakan T-02 di docs/TASKS.md: landing page di src/views/public/LandingView.vue sesuai
BRIEF.md 6.1. Ambil tema dari GET /api/v1/themes (lihat API.md), harga dari PLAN_PRICES di
src/lib/labels.ts, fitur per paket dari tabel di API.md. Pecah section besar ke
src/components/landing/. Tambah komponen shadcn-vue `accordion` untuk FAQ. Kalau user sudah
login (useAuthStore().isLoggedIn) CTA mengarah ke /app/invitations. Hapus TodoPlaceholder.
Mobile-first, cek di 390px.
```

## T-03 · Halaman profil (Pandu)
**FR:** FR-001 · **Butuh:** T-01 · **BRIEF:** 6.2 · **File:** `src/views/app/ProfileView.vue`

**Prompt:**
```
Kerjakan T-03: halaman profil read-only di src/views/app/ProfileView.vue sesuai BRIEF.md 6.2,
pakai data useAuthStore().user, formatDate dari src/lib/format.ts, Card dan Badge shadcn-vue.
Tombol Keluar memanggil auth.logout() lalu router.push({ name: 'login' }).
```

## T-04 · Daftar undangan + buat undangan (Pandu)
**FR:** FR-002, FR-003 · **Butuh:** T-01 · **BRIEF:** 6.3 · **File:** `src/views/app/InvitationsView.vue`, `src/components/invitations/*`, `src/composables/usePaginatedQuery.ts` (opsional)

**Prompt:**
```
Kerjakan T-04 sesuai BRIEF.md 6.3: halaman Undangan Saya (src/views/app/InvitationsView.vue).
- Ambil list dengan unwrap(api.GET('/api/v1/invitations', { params: { query: { page, status } } })).
  Simpan page & status di route query. Paginasi pakai komponen Pagination shadcn-vue.
- Kartu undangan di src/components/invitations/InvitationCard.vue; badge dari src/lib/labels.ts;
  tautan publik `${location.origin}/u/${slug}` dengan tombol salin (useClipboard dari @vueuse/core).
- Dialog "Buat Undangan Baru" juga terbuka otomatis bila route query ?new=1 (tombol "Undangan Baru"
  di sidebar mengarah ke sana); hapus query saat dialog ditutup.
- Dialog "Buat Undangan Baru" di src/components/invitations/CreateInvitationDialog.vue dengan
  form pola LoginView (zod: slug regex ^[a-z0-9]+(-[a-z0-9]+)*$ 3–60 karakter). Tema dari
  GET /api/v1/themes; tema tier != free tampil terkunci. 409 → error inline di slug.
  Sukses → router.push ke { name: 'invitation-edit', params: { id } }.
- Hapus dengan AlertDialog → DELETE /api/v1/invitations/{id} → toast → refetch.
- Wajib: Skeleton, Empty ("Belum ada undangan" + tombol buat), Alert error + Coba lagi.
Kalau polanya akan dipakai ulang, buat composable src/composables/usePaginatedQuery.ts
(page/limit dari route query, loading, error, data, meta, reload) dan pakai di sini.
```

## T-05 · Editor: kerangka, simpan, terbitkan (Pandu)
**FR:** FR-002 · **Butuh:** T-04 · **BRIEF:** 6.4 · **File:** `src/stores/editor.ts`, `src/views/app/InvitationEditorView.vue`, `src/components/editor/*`

**Prompt:**
```
Kerjakan T-05 sesuai BRIEF.md 6.4 (bagian layout, header, cara simpan, AC).
1. Buat Pinia setup store src/stores/editor.ts: state invitation (tipe Invitation dari
   @/api/types), loading, error, saving; aksi load(id), save(patch: UpdateInvitationBody)
   yang memanggil PUT /api/v1/invitations/{id} dan mengganti invitation dengan response,
   publish(published: boolean) ke PATCH .../publish.
2. InvitationEditorView.vue: load saat route param id berubah; header (Breadcrumb, badge
   status & paket, indikator "Menyimpan…/Tersimpan", tombol Terbitkan/Tarik ke Draft);
   Tabs dengan tab: Tema & Pengaturan, Mempelai, Acara, Galeri, Cerita, Amplop Digital.
   Isi tiap tab cukup komponen kosong di src/components/editor/<Nama>Tab.vue (diisi T-06..T-09).
   Kolom kanan desktop: placeholder kotak bingkai ponsel (diisi T-12).
3. Error: 422 publish → tampilkan details.missing dalam Bahasa Indonesia; 402 → toast dengan
   action "Upgrade" ke { name: 'invitation-upgrade' }; status suspended → Alert + semua
   input disabled; 403/404 → Alert + tombol kembali.
4. Buat helper src/composables/usePlanError.ts yang menerima err, dan kalau ApiError
   PLAN_LIMIT menampilkan toast dengan tombol Upgrade. Pakai di semua tab.
```

## T-06 · Editor: tab Tema & Pengaturan (Pandu)
**FR:** FR-003 · **Butuh:** T-05 · **BRIEF:** 6.4 (Tema & Pengaturan)

**Prompt:**
```
Kerjakan T-06: isi src/components/editor/ThemeTab.vue sesuai BRIEF.md 6.4.
Pilih tema (RadioGroup kartu dari GET /api/v1/themes; tier di luar invitation.limits.theme_tiers
diberi badge "Butuh paket X"), warna utama (input color + hex, validasi #rrggbb, tombol reset ke
theme.defaults.primary_color), musik latar (uploadFile(id, 'music', file) dari @/api/upload,
cek tipe audio/mpeg|audio/mp4|audio/ogg & ≤10MB dulu; terkunci bila !limits.music dengan
LockIcon + Tooltip), Switch show_wishes. Simpan via editor store save({ theme_id, settings }).
Tangani 402 dengan usePlanError.
```

## T-07 · Editor: tab Mempelai & Acara (Pandu)
**FR:** FR-004 · **Butuh:** T-05 · **BRIEF:** 6.4

**Prompt:**
```
Kerjakan T-07: CoupleTab.vue dan EventsTab.vue di src/components/editor/ sesuai BRIEF.md 6.4
dan bentuk data Person & Event di API.md. Gunakan form pola LoginView dengan zod yang menyalin
batas backend (useFieldArray dari vee-validate untuk daftar acara, maksimal 10).
Foto mempelai: uploadFile(id, 'couple', file), cek image/jpeg|png|webp ≤5MB.
Tanggal & jam: tambah komponen shadcn-vue yang perlu (mis. `calendar` + `popover`, atau
input type="date"/"time" dari Input shadcn) dan gabungkan ke ISO dengan toISOString().
end_at tidak boleh sebelum start_at. Simpan: CoupleTab kirim couple lengkap
({ groom: {...semua field}, bride: {...} }), EventsTab kirim seluruh array events.
Error 400 server → setErrors(fieldErrors(err)) (path seperti "events.0.venue").
```

## T-08 · Editor: tab Galeri & Cerita (Pandu)
**FR:** FR-004 · **Butuh:** T-05 · **BRIEF:** 6.4

**Prompt:**
```
Kerjakan T-08: GalleryTab.vue dan StoriesTab.vue sesuai BRIEF.md 6.4 dan API.md.
Galeri: grid foto, pilih banyak file, upload satu per satu dengan uploadFile(id, 'gallery', f)
(cek tipe & ≤5MB dulu), lalu save({ gallery: [...lama, ...baru] }) dengan order berurutan.
Caption, naik/turun, hapus; counter "n / limits.gallery_limit"; tombol upload disabled +
ajakan upgrade bila penuh; 402 → usePlanError. Cerita: daftar {date YYYY-MM-DD|null, title,
body} maks 20, tambah/hapus/urutkan, save({ stories }).
```

## T-09 · Editor: tab Amplop Digital (Pandu)
**FR:** FR-007 · **Butuh:** T-05 · **BRIEF:** 6.4

**Prompt:**
```
Kerjakan T-09: GiftsTab.vue sesuai BRIEF.md 6.4. Daftar rekening {bank, account_no, account_name}
maks 5, validasi account_no ^[0-9 -]{4,40}$. Jika !invitation.limits.gift_accounts: tab terkunci
(LockIcon di trigger tab, Tooltip "Tersedia di paket Basic", konten berisi kartu ajakan upgrade
ke { name: 'invitation-upgrade' }). Simpan save({ gift_accounts }).
```

## T-10 · Halaman undangan publik + renderer (Krisna)
**FR:** FR-004, FR-005, FR-007 · **Butuh:** T-01 · **BRIEF:** 6.5 · **File:** `src/views/public/InvitationView.vue`, `src/components/invitation/*`

**Prompt:**
```
Kerjakan T-10 sesuai BRIEF.md 6.5 (kecuali form RSVP = T-11).
- InvitationView.vue: panggil SEKALI unwrap(api.GET('/api/v1/public/invitations/{slug}',
  { params: { path: { slug }, query: { to } } })) — `to` hanya dikirim bila ada di route query.
  404 → tampilan "Undangan tidak ditemukan", 410 → "Undangan ini sudah tidak aktif".
  document.title = og.title.
- src/components/invitation/InvitationRenderer.vue: prop invitation: PublicInvitation (dari
  @/api/types) dan preview?: boolean. Pasang settings.primary_color sebagai style
  { '--primary': color } di root. Section terpisah di src/components/invitation/sections/
  (Cover, Couple, Countdown, Events, Gallery, Stories, Gifts, Wishes, Footer, MusicToggle).
- src/components/invitation/themes.ts: peta theme.code → kelas/varian (rustic-sage,
  classic-ivory, royal-navy) dengan fallback default. Cukup variasi sederhana pakai token.
- Musik mulai saat tombol "Buka Undangan" ditekan. Galeri loading="lazy" + Dialog zoom.
  Tombol salin rekening pakai useClipboard + toast. "Simpan ke Kalender" = link
  https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&location=...
- Mobile-first, max-w-md di tengah pada desktop. Tidak boleh v-html.
Untuk mencoba: buat undangan di dashboard, terbitkan, lalu buka /u/<slug>.
```

## T-11 · Form RSVP publik + ucapan (Krisna)
**FR:** FR-006 · **Butuh:** T-10 · **BRIEF:** 6.5 (Form RSVP)

**Prompt:**
```
Kerjakan T-11: src/components/invitation/sections/RsvpForm.vue sesuai BRIEF.md 6.5 dan aturan
POST /public/invitations/{slug}/rsvps di API.md. Form pola LoginView; jika ada guest: nama
disembunyikan, pax 1..guest.pax_quota; tanpa guest: nama wajib, pax 1..10. Tidak Hadir →
sembunyikan pax (kirim 0). Ucapan ≤500 dengan counter. Kirim `to` dari route query.
Sukses → kartu terima kasih + emit ucapan baru supaya Wishes menambahkannya di atas tanpa
GET ulang. 429 → pesan ramah; 400 details.max_pax → error inline di pax.
Di mode preview (prop preview) form disabled.
```

## T-12 · Pratinjau di editor (Krisna)
**FR:** FR-003, FR-004 · **Butuh:** T-05, T-10 · **BRIEF:** 6.4, 6.5

**Prompt:**
```
Kerjakan T-12: tampilkan InvitationRenderer di kolom kanan editor (bingkai ponsel sticky, lebar
390px, scroll sendiri) dan di mobile lewat tombol "Pratinjau" yang membuka Sheet/Dialog.
Buat fungsi toPreview(invitation: Invitation, theme: Theme | undefined): PublicInvitation di
src/components/invitation/toPreview.ts (guest: { name: 'Nama Tamu', group: null, pax_quota: 2 },
wishes: [], watermark: invitation.limits.watermark, gallery dipotong gallery_limit,
gift_accounts kosong bila !limits.gift_accounts). Pratinjau reaktif terhadap editor store.
Renderer dipanggil dengan preview=true (form RSVP dan musik nonaktif).
```

## T-13 · Daftar tamu (Pandu)
**FR:** FR-005, FR-009 · **Butuh:** T-04 · **BRIEF:** 6.6 · **File:** `src/views/app/GuestsView.vue`, `src/components/guests/*`

**Prompt:**
```
Kerjakan T-13 sesuai BRIEF.md 6.6 (kecuali impor CSV = T-14).
Tabel tamu dengan komponen Table shadcn-vue: GET /api/v1/invitations/{id}/guests dengan
q (debounce 300ms, refDebounced), group, opened, sort, page, limit — semua disimpan di route
query. Kartu kuota dari GET .../stats (guests.total/quota) dengan Progress.
Sheet tambah/edit tamu (src/components/guests/GuestFormSheet.vue, pola LoginView, zod sesuai
API.md). Menu baris: Salin tautan (guest.personal_url), Salin teks (guest.share_text),
Bagikan ke WhatsApp (https://wa.me/<digit phone>?text=encodeURIComponent(share_text)),
Edit, Hapus (AlertDialog). 402 kuota habis → usePlanError (dari T-05; kalau belum ada, buat).
Kolom Dibuka: relativeTime(opened_at) atau badge "Belum".
```

## T-14 · Impor CSV tamu (Pandu)
**FR:** FR-005 · **Butuh:** T-13 · **BRIEF:** 6.6 (Impor CSV)

**Prompt:**
```
Kerjakan T-14: dialog Impor CSV di src/components/guests/ImportGuestsDialog.vue sesuai BRIEF.md 6.6
dan API.md. Terkunci (badge Premium + Tooltip) bila !invitation.limits.csv_import.
Kirim dengan importGuestsCsv(id, file) dari @/api/upload (sudah menangani multipart).
Cek .csv & ≤1MB dulu. Tombol "Unduh template" membuat Blob CSV
"name,phone,group,pax_quota" di browser. Error 400 details.rows → tabel Baris/Kolom/Pesan.
413 → toast. Sukses → toast "n tamu diimpor" + refetch tabel.
```

## T-15 · RSVP & ucapan di dashboard (Pandu)
**FR:** FR-006, FR-009 · **Butuh:** T-04 · **BRIEF:** 6.7

**Prompt:**
```
Kerjakan T-15 sesuai BRIEF.md 6.7 di src/views/app/RsvpsView.vue. GET .../rsvps dengan
attendance, q, hidden, page (di route query). Ringkasan angka dari GET .../stats.
Kartu ucapan dengan Avatar inisial, Badge dari ATTENDANCE_LABELS, relativeTime, dan Switch
"Tampilkan" → PATCH .../rsvps/{rsvpId} { is_hidden } secara optimistic (rollback + toast
kalau gagal). Tombol Ekspor CSV memanggil downloadRsvpCsv(id, `rsvp-${slug}.csv`) dari
@/api/download; terkunci bila !limits.rsvp_export.
```

## T-16 · Statistik undangan (Krisna)
**FR:** FR-009 · **Butuh:** T-04 · **BRIEF:** 6.8

**Prompt:**
```
Kerjakan T-16 sesuai BRIEF.md 6.8 di src/views/app/StatsView.vue dari GET
/api/v1/invitations/{id}/stats (bentuk ada di API.md). 4 kartu angka pakai StatCards dari
src/components/dashboard/StatCards.vue (nilai sudah diformat formatNumber), rekap RSVP per kehadiran
pakai @/components/ui/chart yang sudah terpasang (donut/bar, warna var(--chart-1..5); lihat contoh
https://www.shadcn-vue.com/charts), progress kuota tamu. Skeleton, empty state saat 0 tamu & 0 RSVP.
```

## T-17 · Upgrade paket (Pandu)
**FR:** FR-008 · **Butuh:** T-04 · **BRIEF:** 6.9

**Prompt:**
```
Kerjakan T-17 sesuai BRIEF.md 6.9 di src/views/app/UpgradeView.vue. Ambil undangan
(GET /api/v1/invitations/{id}); RadioGroup kartu Basic/Premium dengan fitur dari tabel paket
di API.md dan harga dari PLAN_PRICES (hanya tampilan). Paket lebih rendah dari paket aktif yang
masih berlaku → disabled dengan penjelasan. Kartu ringkasan sticky. "Lanjut ke Pembayaran" →
unwrap(api.POST('/api/v1/orders', { body: { invitation_id, plan } })) →
window.location.href = data.payment_url. 400/502/503 → toast, tetap di halaman.
```

## T-18 · Status pembayaran (Pandu)
**FR:** FR-008 · **Butuh:** T-17 · **BRIEF:** 6.10

**Prompt:**
```
Kerjakan T-18 sesuai BRIEF.md 6.10 di src/views/app/OrderStatusView.vue (route /orders/:invoice,
JANGAN ganti path). GET /api/v1/orders/{invoice}; selama status pending polling tiap 4 detik
(useIntervalFn dari @vueuse/core), berhenti saat status final dan di onUnmounted. Tampilan per
status: pending / paid / expired / failed sesuai BRIEF. Tombol ke editor:
{ name: 'invitation-edit', params: { id: order.invitation_id } }.
```

## T-19 · Riwayat transaksi (Pandu)
**FR:** FR-008 · **Butuh:** T-18 · **BRIEF:** 6.11

**Prompt:**
```
Kerjakan T-19 sesuai BRIEF.md 6.11 di src/views/app/OrdersView.vue: tabel GET /api/v1/orders
dengan paginasi (page di route query), formatRupiah, ORDER_STATUS_LABELS, formatDateTime.
Klik baris → { name: 'order-status', params: { invoice } }. Empty state + skeleton.
```

## T-20 · Admin: statistik sistem (Krisna)
**FR:** FR-010 · **Butuh:** T-01 · **BRIEF:** 6.12

**Prompt:**
```
Kerjakan T-20 di src/views/admin/AdminStatsView.vue dari GET /api/v1/admin/stats (bentuk di API.md),
pakai StatCards dari src/components/dashboard/StatCards.vue untuk kartu pengguna, undangan per status, undangan berbayar, pendapatan total & 30 hari (formatRupiah),
pendapatan per paket. Login dengan akun admin hasil `bun run seed` untuk mencoba.
```

## T-21 · Admin: katalog tema (Krisna)
**FR:** FR-010 · **Butuh:** T-20

**Prompt:**
```
Kerjakan T-21 di src/views/admin/AdminThemesView.vue: tabel tema dari GET /api/v1/themes,
Sheet tambah (POST /api/v1/admin/themes) dan edit (PUT /api/v1/admin/themes/{id}) dengan form
pola LoginView: code kebab-case ≤50, name, tier (Select), preview_url opsional, defaults
primary_color #rrggbb, font opsional, is_active (Switch). 409 → error inline di code.
Catatan: GET /themes hanya mengembalikan tema aktif; tema yang dinonaktifkan hilang dari daftar.
Beri penjelasan di UI (FieldDescription) saat Switch aktif dimatikan.
```

## T-22 · Admin: semua transaksi (Krisna)
**FR:** FR-010 · **Butuh:** T-20

**Prompt:**
```
Kerjakan T-22 di src/views/admin/AdminOrdersView.vue: tabel GET /api/v1/admin/orders dengan
filter status (Tabs/Select di route query) dan paginasi. Kolom invoice, user (user_id.name +
email), undangan (invitation_id.slug), paket, nominal, status, tanggal bayar.
```

## T-23 · Admin: tangguhkan undangan (Krisna)
**FR:** FR-010 · **Butuh:** T-20

**Prompt:**
```
Kerjakan T-23 di src/views/admin/AdminInvitationsView.vue: tabel GET /api/v1/admin/invitations
dengan pencarian slug (q, debounce), filter status, paginasi. Tombol Tangguhkan / Pulihkan →
AlertDialog → PATCH /api/v1/admin/invitations/{id}/status { suspended }. Jelaskan di dialog
bahwa Pulihkan mengembalikan undangan ke draft dan pemilik harus menerbitkan ulang.
```

## T-24 · Polish & QA (Krisna, dibantu Pandu)
**FR:** NFR Usability · **Butuh:** tiket lain selesai

Lakukan pemeriksaan ini di semua halaman:
- cek lebar 360, 390, 768, dan 1280px;
- navigasi dengan keyboard saja;
- kontras teks;
- semua empty, error, dan loading state;
- judul tab;
- hapus semua `TodoPlaceholder`;
- Lighthouse mobile untuk `/u/:slug`.

Setelah desain final siap, ganti token di `src/style.css` di satu tempat lalu cek ulang semuanya.

## T-25 · (Opsional) Deploy + Open Graph (Lead)
**FR:** NFR Usability

Langkah:
- Deploy ke Cloudflare Pages: build `bun run build`, output `dist`, set `VITE_API_BASE_URL`, dan tambahkan SPA fallback.
- Tambah Pages Function untuk `/u/*` yang mengambil `og` dari API publik dan menyisipkan `<meta property="og:title">` dan `og:image` ke `index.html`, sehingga pratinjau WhatsApp menampilkan judul dan foto.
