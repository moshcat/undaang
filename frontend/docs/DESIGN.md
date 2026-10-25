# Desain UI undaang: dari Stitch ke shadcn-vue

Dokumen ini adalah acuan visual untuk setiap halaman di `BRIEF.md` §6. Mockup dibuat di Google Stitch, lalu **diterjemahkan** ke shadcn-vue. HTML hasil Stitch tidak boleh disalin (lihat `../AGENTS.md` aturan 1–4).

- **Project Stitch** (privat, minta akses ke lead): https://stitch.google.com/projects/12598551227702964802
- **Design system:** `../.stitch/DESIGN.md` (warna, tipografi, radius, pola komponen). Nilainya sama dengan token di `src/style.css`.
- **Metadata screen:** `../.stitch/metadata.json` (ID setiap screen, untuk `stitch download` atau `stitch edit`).

## Cara memakai mockup

1. Buka link screen di tabel bawah. Perhatikan susunan, hierarki, dan isi. Abaikan detail piksel.
2. Cocokkan setiap elemen dengan kolom "Komponen shadcn-vue". Kalau ragu, tanyakan ke agent: *"Terjemahkan mockup ini ke komponen shadcn-vue yang setara, cek lewat MCP shadcn, pakai token warna tema."*
3. Warna hanya dari token. Kalau mockup terlihat memakai warna lain (Stitch kadang menggeser sedikit), tetap pakai token terdekat: `primary`, `muted`, `success`, `warning`, `destructive`.
4. Kalau mockup menampilkan fitur yang **tidak ada** di `BRIEF.md` (misalnya "Lupa kata sandi" atau notifikasi), jangan dibuat. Yang menjadi acuan isi adalah BRIEF, bukan mockup.
5. Teks di mockup boleh dipakai apa adanya kalau sesuai BRIEF. Data contoh (Raka & Sinta, angka) hanya ilustrasi.

Elemen di mockup yang **tidak** dibuat karena tidak ada di BRIEF/API:

| Screen | Elemen yang diabaikan |
|---|---|
| Login (versi pertama di kanvas) | "Lupa kata sandi?", "Ingat saya" |
| Login, Register | tautan "Beranda" di pojok kanan atas boleh dipakai; footer hak cipta tidak wajib |
| Statistik | kotak "Keuntungan Upgrade Paket" (cukup tautan "Upgrade paket" di kartu kuota) |
| Status Pembayaran | kartu "Ringkasan Pesanan" dan nomor referensi DOKU di bawah status (opsional, hanya kalau datanya ada di `GET /orders/{invoice}`) |
| Admin Statistik | tabel "Ringkasan Aktivitas Terkini" |
| Admin Transaksi | empat kartu ringkasan di atas tabel dan tombol "Ekspor data" |
| Admin Tema | pencarian dan filter di atas tabel (tema hanya 3–10 baris) |
| Semua sidebar | ikon "+" ganda pada "+ + Undangan Baru"; cukup satu `PlusIcon` |

## Token dan konvensi

| Kebutuhan | Pakai |
|---|---|
| Aksi utama, tab aktif, status Terbit, paket Premium | `bg-primary` / `Button` default / `Badge` default |
| Permukaan sekunder, header tabel, area terkunci | `bg-muted`, `text-muted-foreground` |
| RSVP Hadir, order Lunas | token baru `success`: `labels.ts` → `ATTENDANCE_LABELS.hadir.class` |
| RSVP Ragu, order Menunggu, kuota hampir penuh | token baru `warning` |
| Tidak Hadir, gagal, hapus, Ditangguhkan | `destructive` |
| Grafik | `chart-1..5`; donut RSVP memakai `success` / `warning` / `destructive` / `muted` |

Badge status memakai label dan kelas dari `@/lib/labels`:

```vue
<Badge :variant="ATTENDANCE_LABELS[r.attendance].variant" :class="ATTENDANCE_LABELS[r.attendance].class">
  {{ ATTENDANCE_LABELS[r.attendance].label }}
</Badge>
```

Pola yang berulang di hampir semua screen:

| Di mockup | shadcn-vue |
|---|---|
| Judul halaman + deskripsi + tombol kanan | `PageHeader` |
| Kartu angka | `StatCards` (`@/components/dashboard/StatCards.vue`) |
| Tabel di dalam kartu + toolbar | `Card` > `Table`, toolbar memakai `InputGroup` (ikon cari) + `Select` + `Button` |
| Menu titik tiga | `DropdownMenu` + `Button variant="ghost" size="icon"` dengan `aria-label` |
| Pil status/paket | `Badge` + `@/lib/labels` |
| Fitur terkunci (gembok) | `Tooltip` "Tersedia di paket Basic/Premium" + `LockIcon` + tombol `Upgrade` |
| Panel samping berisi form | `Sheet` |
| Modal form | `Dialog`; konfirmasi hapus/tangguhkan memakai `AlertDialog` |
| Kartu pilihan (tema, paket) | `RadioGroup` + `RadioGroupItem` di dalam `Label` berbentuk kartu (`has-data-[state=checked]:border-primary`) |
| Tautan + tombol salin | `InputGroup` readonly + `InputGroupButton` (`useClipboard`) |

Setiap screen tetap wajib punya state loading (`Skeleton`), kosong (`Empty`), dan error (`Alert` + "Coba lagi"), walaupun mockup hanya menampilkan state sukses.

## Screen per halaman

### Publik dan auth

| Screen | Route | View | Tiket | Mockup |
|---|---|---|---|---|
| Landing (desktop) | `/` | `views/public/LandingView.vue` | T-02 | [Beranda - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=e5198e204dfc4eadbee12ba5f674692a) |
| Landing (mobile) | `/` | sama | T-02 | [Beranda - undaang (Mobile)](https://stitch.google.com/projects/12598551227702964802?node-id=8e9ecc9df65a4d0a94c68092e580637b) |
| Login | `/login` | `views/auth/LoginView.vue` (sudah jadi) | — | [Masuk - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=33588360d22d45e189b571d08b7b91d6) |
| Register | `/register` | `views/auth/RegisterView.vue` (sudah jadi) | — | [Daftar - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=23bb5a0255b447bd8e9ca451aac981b5) |

- **Landing:** navbar = `Button variant="ghost"` "Masuk" + `Button` "Daftar Gratis". Kartu fitur dan harga = `Card`. Paket Basic disorot dengan `border-primary` dan `Badge` "Paling populer". Fitur paket memakai `CheckIcon`/`XIcon` lucide. FAQ = `Accordion` (**tambahkan**: `bunx shadcn-vue@latest add accordion`). Di mobile, navbar memakai `Sheet` dari kiri untuk menu. Galeri tema dari `GET /themes` memakai `AspectRatio` (tambahkan) + `Badge` tier.
- **Login/Register:** yang perlu diambil dari mockup hanya panel kanan `AuthLayout` (foto sampul + gradasi + kutipan). Simpan foto di `public/` atau R2 dan pakai `<img class="object-cover">`, gradasi `bg-gradient-to-t from-black/60`. Hitam/putih transparan untuk overlay foto masih dianggap netral, tetapi jangan pakai warna lain. Mockup login versi pertama di kanvas menampilkan "Lupa kata sandi" dan "Ingat saya"; keduanya **di luar scope**.

### Dashboard pasangan

| Screen | Route | View | Tiket | Mockup |
|---|---|---|---|---|
| Undangan Saya | `/app/invitations` | `views/app/InvitationsView.vue` | T-04 | [Undangan Saya - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=056de54afa5642ada0917e7e34aceaa1) |
| Dialog Buat Undangan | `/app/invitations?new=1` | sama (komponen `invitations/CreateInvitationDialog.vue`) | T-04 | [Buat Undangan Baru - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=0b666b7e17a145a6b1055ce1a30d7333) |
| Editor | `/app/invitations/:id/edit` | `views/app/InvitationEditorView.vue` | T-05 – T-09, T-12 | [Editor Undangan - Raka & Sinta - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=ec164b43fdd547438ce881b31b7d9dfe) |
| Daftar Tamu | `/app/invitations/:id/guests` | `views/app/GuestsView.vue` | T-13, T-14 | [Daftar Tamu - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=b9af91505bfc442b892e295085605ab0) |
| RSVP & Ucapan | `/app/invitations/:id/rsvps` | `views/app/RsvpsView.vue` | T-15 | [RSVP & Ucapan - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=c6b6dfbe4ad6479e80eab624a369d121) |
| Statistik | `/app/invitations/:id/stats` | `views/app/StatsView.vue` | T-16 | [Statistik - Raka & Sinta - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=aa40f6b47e284ce9bcf9c38f3538d9f0) |
| Upgrade | `/app/invitations/:id/upgrade` | `views/app/UpgradeView.vue` | T-17 | [Upgrade Paket - Raka & Sinta - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=d75af4d06d814552a445eada1f6dd6f2) |
| Status Pembayaran | `/orders/:invoice` | `views/app/OrderStatusView.vue` | T-18 | [Status Pembayaran - INV-20261025-0001 - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=c10076f5cc434d4fb7dfb1f09f83ae28) |
| Riwayat Transaksi | `/app/orders` | `views/app/OrdersView.vue` | T-19 | [Riwayat Transaksi - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=e3b6f45ab02e42a293771ed3365cd101) |
| Profil | `/app/profile` | `views/app/ProfileView.vue` | T-03 | [Profil - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=688ff2d938ad4fbab67d44a86744c951) |

Sidebar, header, dan breadcrumb di mockup **sudah ada** di `components/dashboard/` (`DashboardShell`, `AppSidebar`, `SiteHeader`). Jangan dibuat ulang; kerjakan hanya isi halamannya.

- **Undangan Saya:** grid `grid gap-6 sm:grid-cols-2 xl:grid-cols-3`. Kartu = `Card` (`CardHeader`: judul + dua `Badge`; `CardContent`: `InputGroup` tautan + meta dengan ikon `EyeIcon`/`CalendarIcon` `text-muted-foreground`; `CardFooter`: `Button variant="outline"` Edit + `DropdownMenu`). Filter status = `Tabs` (nilai di query `?status=`). `Pagination` di bawah. Mockup menampilkan "+ + Undangan Baru"; cukup satu ikon `PlusIcon` + teks "Undangan Baru".
- **Dialog Buat Undangan:** `Dialog` + form vee-validate. Slug = `InputGroup` dengan `InputGroupAddon` teks `undaang.id/u/`. Pilihan tema = `RadioGroup` kartu; tema terkunci tetap tampil dengan `opacity-60`, `LockIcon`, dan caption "Butuh paket Basic". Nama mempelai = dua `Field` dalam `grid sm:grid-cols-2`.
- **Editor:** `grid lg:grid-cols-[11fr_9fr] gap-6`. Kiri `Tabs` enam tab; tab terkunci memakai `LockIcon` kecil di trigger + `Tooltip`. Kartu acara = `Card` per item, `Select` jenis acara, tanggal memakai `Popover` + `Calendar` (**tambahkan** keduanya), jam memakai `Input type="time"`. Tombol "+ Tambah Acara" = `Button variant="outline"` dengan `border-dashed`. Kanan: `div` `sticky top-6` berisi bingkai ponsel (`rounded-[2rem] border-8 border-foreground/90` + `ScrollArea` (tambahkan) berisi `InvitationRenderer preview`). Di bawah `lg`, pratinjau dibuka lewat tombol "Pratinjau" → `Sheet side="bottom"`. Indikator "Tersimpan"/"Menyimpan…" = teks `text-muted-foreground text-sm` + `CheckIcon`/`Spinner`.
- **Daftar Tamu:** kartu kuota = `Card` + `Progress` + `Badge` paket (`Progress` memakai `warning` saat ≥ 90%, lewat kelas `[&>div]:bg-warning`). Toolbar `flex flex-wrap gap-2`. Kolom "Dibuka" = teks waktu relatif, atau `Badge variant="secondary"` "Belum". Form tamu = `Sheet`. Impor CSV = `Dialog` (tombol dikunci kalau `!limits.csv_import`).
- **RSVP & Ucapan:** tiga kartu ringkasan = `StatCards` atau tiga `Card`, angka `tabular-nums`, aksen warna lewat ikon (`text-success` / `text-destructive` / `text-warning`), bukan latar penuh. Daftar ucapan = `Card` per item dengan `Avatar` + `AvatarFallback` inisial, `Badge` kehadiran, `Switch` "Tampilkan". Ucapan tersembunyi ditampilkan `opacity-60`.
- **Statistik:** `StatCards` empat kolom. Donut RSVP = `@/components/ui/chart` (donut unovis) dengan warna `var(--success)`, `var(--warning)`, `var(--destructive)`, `var(--muted)`. Kartu kuota sama dengan di Daftar Tamu; sebaiknya dijadikan komponen bersama `components/guests/GuestQuotaCard.vue`.
- **Upgrade:** `grid lg:grid-cols-[1fr_360px] gap-6`. Kartu paket = `RadioGroup` kartu, daftar fitur memakai `CheckIcon text-success`. Paket yang lebih rendah dari paket aktif: `disabled` + `opacity-50`. Ringkasan = `Card` dengan baris `flex justify-between`, `Separator`, total `font-semibold tabular-nums`. Catatan DOKU = `ShieldCheckIcon` + teks muted.
- **Status Pembayaran:** mockup memperlihatkan **tiga state berdampingan hanya untuk referensi**; halaman asli menampilkan satu kartu sesuai status. Kartu = `Card` `max-w-md mx-auto text-center`, ikon dalam lingkaran (`bg-warning/10 text-warning` + `ClockIcon`, `bg-success/10 text-success` + `CircleCheckIcon`, `bg-destructive/10 text-destructive` + `CircleXIcon`).
- **Riwayat Transaksi:** `Card` > `Table`; baris bisa diklik (`cursor-pointer`, `@click` ke `/orders/:invoice`, plus `ChevronRightIcon`). Nominal rata kanan `tabular-nums`. Badge status dari `ORDER_STATUS_LABELS`.
- **Profil:** satu `Card max-w-2xl`; header dengan `Avatar` besar + nama + `Badge` peran; isi berupa daftar `dl` dengan `Separator`; footer `Button variant="outline"` dengan `text-destructive` + `LogOutIcon`. Read-only.

### Undangan publik (mobile-first, tema rustic-sage)

| Screen | Route | Komponen | Tiket | Mockup |
|---|---|---|---|---|
| Cover | `/u/:slug?to=KODE` | `components/invitation/CoverSection.vue` | T-10 | [Undangan Publik - Raka & Sinta (Cover)](https://stitch.google.com/projects/12598551227702964802?node-id=cfbeaf6a81e3419b914c97bb484ffb2f) |
| Isi undangan | `/u/:slug` | `InvitationRenderer` + section | T-10, T-11 | [Undangan Pernikahan - Raka & Sinta (Mobile)](https://stitch.google.com/projects/12598551227702964802?node-id=0fbcca4906c249aaa085c841afa1f27b) |
| Tidak ditemukan / tidak aktif | `/u/:slug` (404/410) | `views/public/InvitationView.vue` | T-10 | [Undangan Tidak Aktif - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=26a363ff52db4a90b5a0d8d4bbb691ee) |

- Seluruh renderer dibungkus `div` `mx-auto max-w-md` dengan `:style="{ '--primary': invitation.settings.primary_color }"`, sehingga hijau sage di mockup **berasal dari data tema**, bukan dari kelas warna.
- Tipografi tetap Inter (tidak ada font tambahan). Nama pasangan `text-4xl font-light tracking-tight`; label section `text-xs uppercase tracking-[0.2em] text-muted-foreground`; pemisah ornamen memakai `Separator` pendek di tengah (`mx-auto w-16`).
- Cover: foto `object-cover` penuh layar + overlay `bg-black/40`; kartu nama tamu `bg-background/80 backdrop-blur` `rounded-xl`; tombol "Buka Undangan" `Button size="lg" class="rounded-full"` + `MailOpenIcon`.
- Countdown: empat `Card` kecil, angka `tabular-nums`.
- Acara: `Card` per acara, tombol `Button variant="outline"` "Lihat Lokasi" (`MapPinIcon`) dan `Button variant="ghost"` "Simpan ke Kalender" (`CalendarPlusIcon`), keduanya `as-child` ke `<a target="_blank">`.
- Galeri: `grid grid-cols-2 gap-2`, `AspectRatio` + `<img loading="lazy">`, klik membuka `Dialog`.
- Kisah: timeline dari `div` `border-l` + titik `bg-primary` (komposisi, tidak ada komponen timeline).
- Amplop: `Card` + `InputGroup` readonly nomor rekening + tombol "Salin".
- RSVP: `Card` + `RadioGroup` (Hadir / Tidak Hadir / Ragu), `Select` jumlah orang, `Textarea` + penghitung `0/500`, `Button` lebar penuh.
- Ucapan: `Card` per ucapan dengan `Badge` kehadiran (`ATTENDANCE_LABELS`) dan `relativeTime`.
- Tombol musik: `Button size="icon" class="fixed bottom-4 right-4 rounded-full shadow-lg"` dengan `aria-label`.
- Halaman 404/410: tampilan netral (tanpa `--primary` tema) memakai `Empty` (`EmptyMedia` ikon `CalendarXIcon` / `SearchXIcon`).

### Panel admin

| Screen | Route | View | Tiket | Mockup |
|---|---|---|---|---|
| Statistik Sistem | `/admin/stats` | `views/admin/AdminStatsView.vue` | T-20 | [Statistik Sistem - Panel Admin - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=2bf486e849244ff8834ceb3d4aba80c4) |
| Katalog Tema | `/admin/themes` | `views/admin/AdminThemesView.vue` | T-21 | [Katalog Tema - Panel Admin - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=cf14af5126e44f1ea6f5e7370e73b9ac) |
| Semua Transaksi | `/admin/orders` | `views/admin/AdminOrdersView.vue` | T-22 | [Panel Admin - Transaksi - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=080ab6fddabd44849329e3c40270ee39) |
| Semua Undangan | `/admin/invitations` | `views/admin/AdminInvitationsView.vue` | T-23 | [Semua Undangan - Panel Admin - undaang](https://stitch.google.com/projects/12598551227702964802?node-id=82f6686d02b842dbaebf213de4043a32) |

- **Statistik:** `StatCards` + dua `Card` berisi chart bar (pendapatan per paket) dan donut/bar (undangan per status), warna `chart-1..5`.
- **Tema:** `Table` dengan thumbnail `AspectRatio` kecil, kode `font-mono text-xs`. Kolom warna default menampilkan lingkaran contoh dengan `:style="{ background: theme.defaults.primary_color }"` (warna dari data, diizinkan). Form = `Sheet` + `Switch` "Aktif".
- **Transaksi:** sama dengan Riwayat Transaksi + kolom pengguna (nama + email muted dua baris) + filter status `Tabs`/`Select`.
- **Undangan:** `InputGroup` cari slug + `Select` status. Tombol "Tangguhkan" = `Button variant="outline" size="sm"`, "Pulihkan" = `Button variant="secondary" size="sm"`. Konfirmasi = `AlertDialog` dengan aksi destructive.

## Komponen yang perlu ditambahkan

Semua lewat CLI (bukan dependency baru, diizinkan oleh `AGENTS.md` aturan 14):

```bash
bunx shadcn-vue@latest add accordion aspect-ratio popover calendar scroll-area
```

## Mengubah atau menambah screen

Dari folder `frontend/` (perlu `stitch login` dengan akun yang punya akses ke project):

```bash
# ubah screen yang ada
stitch edit screen <screen-id> --project <project-id> --prompt "Pada header kanan atas, ganti ..."
# screen baru (prompt hanya layout dan isi; warna dan font sudah dari design system)
stitch generate screen --project <project-id> --device DESKTOP --prompt "..."
# unduh gambar untuk lampiran PR
stitch download screen <screen-id> --project <project-id> --format png > screen.png
```

Kalau token di `src/style.css` berubah, perbarui juga `../.stitch/DESIGN.md` lalu `stitch upload design .stitch/DESIGN.md --project <project-id>` supaya mockup berikutnya tetap konsisten.
