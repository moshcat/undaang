---
name: undaang
colors:
  background: '#FFFFFF'
  foreground: '#0A0A0A'
  card: '#FFFFFF'
  card-foreground: '#0A0A0A'
  popover: '#FFFFFF'
  popover-foreground: '#0A0A0A'
  primary: '#0069A8'
  primary-foreground: '#F0F9FF'
  secondary: '#F4F4F5'
  secondary-foreground: '#18181B'
  muted: '#F5F5F5'
  muted-foreground: '#737373'
  accent: '#F5F5F5'
  accent-foreground: '#171717'
  destructive: '#E7000B'
  success: '#16A34A'
  warning: '#D97706'
  border: '#E5E5E5'
  input: '#E5E5E5'
  ring: '#A1A1A1'
  sidebar: '#FAFAFA'
  sidebar-primary: '#0084D1'
  chart-1: '#74D4FF'
  chart-2: '#00A6F4'
  chart-3: '#0084D1'
  chart-4: '#0069A8'
  chart-5: '#00598A'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  invitation-display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '300'
    lineHeight: 48px
    letterSpacing: -0.03em
rounded:
  sm: 0.375rem
  md: 0.5rem
  lg: 0.625rem
  xl: 0.875rem
  full: 9999px
spacing:
  base: 0.25rem
  gap: 1.5rem
  page-x: 1rem
  page-x-desktop: 1.5rem
---

# Design System: undaang

**Sumber:** diekstrak dari `frontend/src/style.css` (token shadcn-vue, style `reka-luma`, base color neutral) dan `frontend/components.json`. Token di file ini adalah satu-satunya sumber warna; implementasi memakai CSS variables shadcn, bukan hex.

## 1. Visual Theme & Atmosphere

undaang adalah platform undangan pernikahan digital untuk pasangan di Indonesia. Aplikasinya punya dua wajah:

- **Dashboard pasangan dan panel admin**: alat kerja yang bersih, netral, dan padat informasi secukupnya. Latar putih, border tipis abu-abu, kartu datar dengan bayangan sangat halus, banyak ruang kosong. Biru laut (`primary`) hanya dipakai untuk aksi utama, tab aktif, dan status "Terbit". Kesannya tenang dan bisa dipercaya, bukan meriah.
- **Undangan publik untuk tamu**: halaman mobile-first yang hangat dan seremonial. Judul memakai Inter tipis berukuran besar, foto pasangan besar, ornamen tipis, banyak ruang napas. Warna aksen undangan mengikuti tema yang dipilih pasangan (`settings.primary_color` menggantikan `primary`).

Semua teks antarmuka berbahasa Indonesia yang sopan dan natural (Undangan Saya, Tamu, RSVP & Ucapan, Terbitkan, Tersedia di paket Basic). Wordmark selalu huruf kecil: **undaang**.

## 2. Color Palette & Roles

### Primary Foundation
- **Background** `#FFFFFF`: kanvas halaman dan permukaan kartu.
- **Sidebar** `#FAFAFA`: latar sidebar dashboard, sedikit lebih abu dari konten.
- **Muted** `#F5F5F5`: latar header tabel, area terkunci, placeholder gambar, panel sampul login.
- **Border / Input** `#E5E5E5`: semua garis pemisah, outline kartu, dan field.

### Accent & Interactive
- **Primary** `#0069A8` (biru laut): tombol utama, tab aktif, link, badge "Terbit", badge paket Premium, progress bar. Teks di atasnya `#F0F9FF`.
- **Sidebar primary** `#0084D1`: item menu aktif di sidebar.
- **Secondary** `#F4F4F5`: tombol sekunder, badge "Draft", badge paket Gratis.
- **Ring** `#A1A1A1`: cincin fokus keyboard.

### Typography & Text Hierarchy
- **Foreground** `#0A0A0A`: judul dan teks utama.
- **Muted foreground** `#737373`: deskripsi, label sekunder, waktu relatif, metadata.

### Functional States
- **Destructive** `#E7000B`: hapus, error, badge "Ditangguhkan", RSVP "Tidak Hadir", order gagal/kedaluwarsa.
- **Success** `#16A34A` (token baru): RSVP "Hadir", order "Lunas", ikon centang pembayaran.
- **Warning** `#D97706` (token baru): RSVP "Ragu", order "Menunggu pembayaran", kuota tamu hampir penuh.
- Badge status memakai latar warna 10% + teks warna penuh + border 20%.

### Charts
`chart-1` s.d. `chart-5` adalah gradasi biru dari terang `#74D4FF` ke gelap `#00598A`. Diagram RSVP memakai success / warning / destructive agar langsung terbaca (Hadir / Ragu / Tidak Hadir).

## 3. Typography Rules

### Hierarchy & Weights
- **Inter Variable** untuk seluruh dashboard, admin, form, tabel, dan angka. Angka statistik dan nominal rupiah memakai `tabular-nums`.
- Judul halaman 24px semibold (`PageHeader`), judul kartu 16px semibold, isi 14px regular, caption 12px.
- Halaman undangan publik tetap memakai **Inter** (tanpa font tambahan). Kesan seremonial didapat dari ukuran: nama pasangan 36–40px weight 300 dengan tracking rapat, label section huruf kapital 12px tracking lebar (0.2em), dan ampersand besar sebagai ornamen.
- Tracking negatif tipis (-0.015em s.d. -0.02em) untuk judul besar.

### Spacing Principles
- Ritme dasar 4px. Jarak antarbagian halaman `gap-6` (24px). Isi kartu 24px.
- Label field 14px medium dengan jarak 8px ke input; pesan error inline 12px di bawah field.

## 4. Component Stylings

Semua komponen adalah shadcn-vue (style reka-luma). Mockup Stitch hanya acuan visual.

### Buttons
- Tinggi 36–40px, radius 8px (`rounded-md`), teks 14px medium, ikon lucide 16px di kiri.
- Varian: `default` (primary penuh), `secondary`, `outline` (border, latar putih), `ghost`, `destructive`, `link`.
- Saat memproses: disabled + spinner kecil di kiri teks.

### Cards & Invitation Cards
- Latar putih, border 1px `#E5E5E5`, radius 14px (`rounded-xl`), bayangan sangat halus.
- Struktur: header (judul + deskripsi muted), konten, footer berisi aksi yang dipisah border atas.
- **Kartu undangan** (Undangan Saya): judul "Raka & Sinta", badge status + badge paket, input tautan publik read-only dengan tombol salin, jumlah kunjungan, masa aktif, tombol Edit, menu titik tiga.
- **Stat card**: label muted kecil di atas, angka besar 30px tabular, keterangan tren/sub-angka di bawah.

### Navigation
- **Sidebar inset** kiri (lebar ~256px, bisa diciutkan menjadi rail ikon): wordmark undaang di atas, tombol utama "Undangan Baru", menu (Undangan Saya, Riwayat Transaksi, Profil), menu pengguna di bawah dengan avatar inisial.
- **Admin sidebar**: Statistik, Tema, Transaksi, Undangan.
- **Header konten**: tombol toggle sidebar, pemisah vertikal, breadcrumb / judul halaman.
- Tabs bergaya segmented (latar muted, tab aktif putih dengan bayangan halus).

### Inputs & Forms
- Tinggi 36–40px, border 1px, radius 8px, placeholder muted. Fokus: ring abu 3px.
- Error: border destructive + teks error kecil di bawah field.
- Input dengan prefix/suffix (InputGroup), misalnya `undaang.id/u/` + slug, atau tautan + tombol salin.
- Pilihan tema dan paket memakai **radio card**: kartu dengan border, kartu terpilih memakai border primary + ring tipis.

### Badges
- Pill (`rounded-full`), 12px medium.
- Paket: Gratis = secondary, Basic = outline, Premium = default (primary).
- Status undangan: Draft = secondary, Terbit = default, Ditangguhkan = destructive.
- RSVP: Hadir = success lembut, Ragu = warning lembut, Tidak Hadir = destructive lembut.

### Tables
- Di dalam Card. Header tabel latar muted, teks 12px medium muted. Baris 48px, border bawah tipis, hover latar muted.
- Kolom angka rata kanan dan tabular. Kolom terakhir berisi tombol ikon titik tiga (DropdownMenu).
- Toolbar di atas tabel: pencarian dengan ikon, filter Select, tombol aksi di kanan.

### Locked / Freemium Feature
- Konten diredupkan (opacity rendah, latar muted), ikon gembok, tooltip "Tersedia di paket Basic" / "Tersedia di paket Premium", tombol "Upgrade".

### Feedback
- Toast (sonner) pojok kanan bawah. Empty state: ikon dalam lingkaran muted, judul, deskripsi, tombol aksi pertama. Error: Alert destructive dengan tombol "Coba lagi". Loading: skeleton seukuran konten.

### Invitation Sections (halaman publik)
- Cover penuh layar dengan foto pasangan redup, teks "Kepada Yth." + nama tamu, nama pasangan besar weight tipis, tanggal, tombol "Buka Undangan".
- Section dipisah ornamen garis tipis; kartu acara, amplop, RSVP memakai kartu putih radius 14px.
- Tombol musik bulat melayang di pojok kanan bawah.

## 5. Layout Principles

### Grid & Structure
- Dashboard: sidebar + konten dengan padding 16px (mobile) / 24px (desktop). Grid kartu undangan 1 / 2 / 3 kolom. Stat cards 1 / 2 / 4 kolom.
- Editor: kolom kiri ~55% (tabs form), kolom kanan ~45% (pratinjau sticky dalam bingkai ponsel).
- Undangan publik: satu kolom `max-w-md` (≈448px) di tengah layar, latar luar muted pada desktop.
- Auth: dua kolom, form di kiri, panel sampul foto di kanan (disembunyikan di mobile).

### Whitespace Strategy
Banyak ruang kosong, sedikit garis. Pemisahan lewat jarak dan kartu, bukan warna latar yang berbeda-beda.

### Alignment & Visual Balance
Rata kiri untuk teks dan form. Aksi utama halaman di kanan atas (PageHeader). Angka rata kanan.

### Responsive Behavior & Touch
Dicek di 390px dan 1280px. Target sentuh minimal 40px. Tabel di mobile scroll horizontal di dalam kartu; halaman tidak pernah scroll horizontal. Sidebar menjadi Sheet di mobile.

## 6. Design System Notes for Stitch Generation

### Language to Use
"clean neutral SaaS dashboard, shadcn/ui style, white cards with thin gray borders, rounded-xl cards, subtle shadows, generous whitespace, ocean blue primary accents, Inter font, Indonesian language UI". Untuk undangan publik: "elegant mobile wedding invitation, large light-weight sans-serif headings, uppercase letter-spaced section labels, soft romantic photography, thin ornamental dividers, centered single column".

### Color References
Primary biru laut untuk aksi utama; abu netral untuk permukaan; hijau/kuning/merah lembut hanya untuk status.

### Component Prompts
- "Card grid of wedding invitations, each card shows couple names, status pill and plan pill, a read-only public link input with a copy button, view count, expiry date, an Edit button and a three-dot menu."
- "Data table inside a card with a toolbar: search input, group filter select, opened filter, sort select, an outlined Import CSV button with a lock and a primary Add Guest button."
- "Selectable radio cards for pricing plans with a feature checklist; the selected card has a primary border."

### Incremental Iteration
Generate satu halaman per prompt. Koreksi dengan edit yang menyebut lokasi elemen ("pada header kanan atas, ganti..."). Jangan mengganti warna lewat prompt; ubah design system.
