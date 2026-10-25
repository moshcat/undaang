# Walkthrough: dari nol sampai PR pertama

Panduan ini untuk anggota tim yang belum pernah membuat web. Ikuti berurutan. Kalau macet, cek bagian **Troubleshooting** di bawah sebelum bertanya.

## Konsep singkat (5 menit)

- **Frontend** adalah folder `frontend/`, isinya aplikasi Vue yang berjalan di browser. Frontend tidak menyimpan data sendiri; semua data diambil dari backend.
- **Backend** adalah folder `backend/`, yaitu server API di `localhost:3000` yang menyimpan data di MongoDB. Backend sudah jadi, jadi kita hanya memakainya.
- **API** adalah alamat-alamat seperti `GET /api/v1/invitations` yang mengembalikan JSON. Daftarnya ada di `docs/API.md` dan di Swagger `http://localhost:3000/docs`.
- **Komponen** adalah potongan UI yang bisa dipakai ulang, berupa file `.vue`. Kita memakai komponen siap pakai dari **shadcn-vue** yang ada di `src/components/ui/`.
- **Route** adalah alamat halaman di browser, misalnya `/app/invitations`. Satu route sama dengan satu file di `src/views/`.
- **Store (Pinia)** adalah tempat menyimpan data yang dipakai banyak halaman, misalnya user yang sedang login.

## Langkah 1: Install alat

1. **Git**: https://git-scm.com. Setelah itu set identitas: `git config --global user.name "Nama"` dan `git config --global user.email "email@kamu"`.
2. **Bun** (pengganti npm, lebih cepat):
   - macOS/Linux: `curl -fsSL https://bun.sh/install | bash`
   - Windows (PowerShell): `powershell -c "irm bun.sh/install.ps1 | iex"`
   - Cek dengan `bun --version`, minimal 1.3.
3. **Node.js LTS**: https://nodejs.org. Ini dibutuhkan MCP shadcn yang berjalan lewat `npx`.
4. **VS Code** + ekstensi **Vue (Official)**. VS Code akan menawarkannya otomatis karena ada di `.vscode/extensions.json`. Ekstensi **ESLint** dan **Prettier** juga disarankan.
5. **AI agent** pilihanmu: Claude Code, Codex, atau Cursor.

## Langkah 2: Clone dan jalankan

```bash
git clone <url-repo> undaang
cd undaang
git checkout dev
```

**Backend** (terminal 1):

```bash
cd backend
bun install
# minta file .env ke lead (berisi MONGODB_URI, JWT_SECRET, dll), taruh di backend/.env
bun run seed      # sekali saja: membuat akun admin + 3 tema awal
bun run dev       # biarkan terminal ini terbuka
```

Buka `http://localhost:3000/health`. Kalau muncul `"status":"ok"`, backend sudah jalan. Buka juga `http://localhost:3000/docs` untuk melihat semua API dan mencobanya langsung lewat tombol "Try it out".

**Frontend** (terminal 2):

```bash
cd frontend
bun install
bun run dev
```

Buka `http://localhost:5173`. Coba **Daftar**, lalu kamu akan masuk ke dashboard. Untuk mencoba panel admin, login dengan email dan password admin yang ada di `backend/.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`), lalu buka menu akun → Panel Admin.

> Kenapa tidak ada CORS error? Di mode dev, Vite meneruskan semua request `/api` ke `localhost:3000`. Pengaturannya ada di `vite.config.ts`. Kamu tidak perlu `.env` di frontend.

## Langkah 3: Setup AI agent (skills + MCP)

Semua perintah di langkah ini dijalankan dari folder **`frontend/`**, dan folder `frontend/` juga yang dibuka sebagai project di agent atau editor kamu.

### 3a. Skills

Skills adalah "buku panduan" yang dibaca AI agent. Pasang ketiganya. Saat CLI bertanya agent mana yang dipakai, pilih agent kamu (Claude Code, Cursor, Codex, dan sebagainya). Saat ditanya scope, pilih **project**.

```bash
# 1. Praktik terbaik Vue 3, Router, Pinia (TANPA options-api & jsx, tidak dipakai di proyek ini)
bunx --bun skills add vuejs-ai/skills --skill vue-best-practices vue-router-best-practices vue-pinia-best-practices vue-debug-guides create-adaptable-composable vue-testing-best-practices

# 2. shadcn-vue: cara menambah, mencari, dan menyusun komponen
bunx --bun skills add unovue/shadcn-vue

# 3. Anti-slop: mencegah UI, teks, dan komentar "khas AI" yang generik
bunx --bun skills add miqdadbadjuber/anti-slop --skill antislop antislop-ui antislop-copywriting antislop-human antislop-layoutmobile antislop-code
```

Ada beberapa alternatif untuk anti-slop:
- Installer interaktif: `bunx antislop-ai`. **Bukan** `npx antislop`, karena itu paket lain.
- Plugin Claude Code:
  ```
  /plugin marketplace add https://github.com/miqdadbadjuber/anti-slop
  /plugin install antislop@anti-slop
  ```
- Plugin Vue untuk Claude Code:
  ```
  /plugin marketplace add vuejs-ai/skills
  /plugin install vue-best-practices@vue-skills vue-router-best-practices@vue-skills vue-pinia-best-practices@vue-skills
  ```

Setelah memasang skills, **tutup lalu buka sesi agent baru**, karena skills dimuat saat sesi dimulai. Cek dengan bertanya ke agent: "skill apa saja yang tersedia?"

> Skills ditulis per laptop dan tidak di-commit. Jangan commit folder `.claude/skills`, `.agents/`, dan sejenisnya yang dibuat CLI di dalam `frontend/`, kecuali lead memutuskan lain.

### 3b. MCP shadcn-vue

MCP memberi agent akses langsung ke katalog komponen shadcn-vue, jadi agent tidak menebak nama atau API komponen. Konfigurasinya **sudah ada di repo**:

| Agent | File | Cara mengaktifkan |
|---|---|---|
| Claude Code | `frontend/.mcp.json` | jalankan `claude` dari folder `frontend/`, setujui server `shadcn`, lalu ketik `/mcp` dan pastikan statusnya **Connected** |
| Cursor | `frontend/.cursor/mcp.json` | Settings → MCP → aktifkan `shadcn` sampai titiknya hijau |
| VS Code (Copilot) | `frontend/.vscode/mcp.json` | buka file itu, lalu klik **Start** di atas server `shadcn` |
| Codex | manual | tambahkan potongan di bawah ke `~/.codex/config.toml`, lalu restart Codex |

Potongan untuk Codex:

```toml
[mcp_servers.shadcn]
command = "npx"
args = ["shadcn-vue@latest", "mcp"]
```

Kalau file `.mcp.json` hilang, buat ulang dengan `bunx shadcn-vue@latest mcp init --client claude`. Dokumentasinya ada di https://www.shadcn-vue.com/docs/mcp.

Contoh pemakaian ke agent: *"Pakai MCP shadcn untuk mencari komponen yang cocok untuk date picker, lalu tambahkan ke project."*

## Langkah 4: Kenali kodenya (15 menit)

Buka file-file ini berurutan dan baca komentarnya:

1. `AGENTS.md`: aturan. **Wajib dibaca.**
2. `src/router/index.ts`: semua halaman dan alamatnya.
3. `src/views/auth/LoginView.vue`: **contoh halaman lengkap**, yaitu form, validasi, panggilan API, error, toast, dan redirect. Semua form ditulis dengan pola ini.
4. `src/api/client.ts`: cara memanggil API (`api` + `unwrap`).
5. `src/api/types.ts`: tipe data dari backend.
6. `src/stores/auth.ts`: contoh Pinia store.
7. `src/components/ui/`: komponen shadcn-vue. Dokumentasi tiap komponen ada di https://www.shadcn-vue.com/docs/components.

## Langkah 5: Membuat halaman pertamamu

Contoh: tiket T-03, halaman Profil. Langkahnya sama untuk tiket lain.

```bash
git checkout dev && git pull
git checkout -b feature/T-03-profile
```

1. Buka `src/views/app/ProfileView.vue`. Saat ini isinya `TodoPlaceholder`.
2. Buka agent dan tempel **blok pembuka** dari `docs/TASKS.md`, lalu tempel **Prompt T-03**.
3. Sambil agent bekerja, buka `http://localhost:5173/app/profile` di browser. Halaman akan ter-update otomatis setiap file disimpan (hot reload).
4. Setelah agent selesai:
   - baca **diff**-nya dengan perintah `git diff` atau tab Source Control di VS Code;
   - cocokkan dengan **checklist review hasil AI** di `TASKS.md`;
   - klik semua tombol;
   - buka DevTools (F12) → ikon ponsel → pilih lebar 390px.
5. Jalankan:
   ```bash
   bun run lint && bun run typecheck && bun run build
   ```
   Kalau ada yang merah, tempel errornya ke agent: *"perbaiki error ini tanpa mematikan rule lint dan tanpa `any`"*.
6. Commit dan push:
   ```bash
   git add -A
   git commit -m "feat(profile): show account details"
   git push -u origin feature/T-03-profile
   ```
7. Buka Pull Request ke **`dev`** di GitHub. Tulis deskripsinya: apa yang dibuat, screenshot desktop dan mobile, serta checklist Definition of Done dari `AGENTS.md`. Minta satu orang me-review.

## Cara memanggil API (contoh)

```ts
import { ref, onMounted } from 'vue'
import { api, unwrap } from '@/api/client'
import { toUserMessage } from '@/api/errors'
import type { Invitation, PageMeta } from '@/api/types'

const items = ref<Invitation[]>([])
const meta = ref<PageMeta>()
const loading = ref(true)
const error = ref<string | null>(null)

async function load(page = 1) {
  loading.value = true
  error.value = null
  try {
    const res = await unwrap(api.GET('/api/v1/invitations', { params: { query: { page } } }))
    items.value = res.data
    meta.value = res.meta
  } catch (err) {
    error.value = toUserMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
```

Di template, pakai `v-if="loading"` untuk Skeleton, `v-else-if="error"` untuk Alert + tombol Coba lagi, `v-else-if="!items.length"` untuk Empty, dan `v-else` untuk konten.

Endpoint dengan parameter path ditulis seperti ini:

```ts
api.GET('/api/v1/invitations/{id}', { params: { path: { id } } })
```

Kalau editor menandai merah dan menyebut path atau field tidak ada, berarti yang kamu tulis memang salah. Cek `docs/API.md`. Jangan dipaksa dengan `as any`.

## Menambah komponen shadcn-vue

```bash
bunx shadcn-vue@latest add calendar popover
```

File baru akan muncul di `src/components/ui/<nama>/`. Import-nya seperti ini:

```ts
import { Calendar } from '@/components/ui/calendar'
```

**Block** adalah halaman jadi dari shadcn-vue, contohnya `dashboard-01`, `login-02`, dan `sidebar-07`. Style project kita (`reka-luma`) tidak punya block, jadi pasang lewat URL style `new-york-v4`:

```bash
bunx shadcn-vue@latest add https://shadcn-vue.com/r/styles/new-york-v4/sidebar-07.json
```

Setelah dipasang, rapikan block sesuai aturan 4a di `AGENTS.md`:
- pindahkan file ke folder fitur;
- hapus data demo;
- ganti ikon `@tabler` ke `@lucide/vue`;
- hapus import Google Fonts di `style.css`.

Contoh hasil yang sudah dirapikan ada di `src/components/dashboard/` (dari `dashboard-01`) dan `src/views/auth/` (dari `login-02` dan `signup-02`).

Kalau kamu mendapat mockup dari Stitch atau Figma, atau contoh kode React (`className=`, `@radix-ui`, `lucide-react`), **jangan disalin**. Minta agent: *"Terjemahkan mockup ini ke komponen shadcn-vue yang setara, cek lewat MCP shadcn, pakai token warna tema."* Mockup Stitch resmi tiap halaman beserta pemetaan komponennya ada di `docs/DESIGN.md`.

## Saat backend berubah

Kalau lead mengabarkan bahwa API berubah:

```bash
git pull
# backend harus sedang jalan (bun run dev di folder backend)
cd frontend && bun run gen:api
bun run typecheck   # error yang muncul = tempat yang harus disesuaikan
```

Commit perubahan `src/api/schema.d.ts` bersama perbaikanmu.

## Template prompt untuk tugas di luar tiket

```
[blok pembuka dari docs/TASKS.md]

Tugas: <jelaskan apa yang mau dibuat/diubah, di halaman mana, route apa>
Data: <endpoint dari docs/API.md yang dipakai>
Tampilan: <komponen shadcn-vue yang diharapkan / lampirkan mockup>
Selesai kalau: <daftar perilaku yang bisa dicek>
Jangan ubah file di luar: <daftar folder/file>
```

**Tips vibecode:**
- Satu prompt untuk satu tugas kecil. Prompt seperti "buat semua halaman" menghasilkan kode yang tidak bisa di-review.
- Kalau AI mulai berputar-putar memperbaiki error yang sama, hentikan. Jalankan `git checkout .` untuk membuang perubahannya, lalu buka sesi baru dengan prompt yang lebih kecil.
- Minta AI menjelaskan kode yang tidak kamu mengerti sebelum di-commit. Kamu yang akan ditanya saat review dan presentasi.
- Jangan pernah menempelkan isi `backend/.env` ke AI atau ke chat.

## Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Semua request gagal atau muncul toast "Tidak dapat terhubung" | backend tidak jalan | jalankan `bun run dev` di `backend/`, lalu cek `localhost:3000/health` |
| Backend crash `Invalid environment variables` | `.env` backend belum lengkap | minta `.env` ke lead |
| Backend crash `MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster` | IP kamu belum ada di IP Access List Atlas | minta lead (pemilik cluster) menambahkan IP kamu di cloud.mongodb.com → Security → Database & Network Access → IP Access List → Add IP Address (atau "Allow Access from Anywhere" `0.0.0.0/0` untuk proyek kuliah), tunggu status Active, lalu jalankan lagi `bun run dev` |
| Error yang sama walau IP sudah diizinkan | VPN atau Wi-Fi kampus memblokir port 27017, atau cluster gratis sedang di-pause | matikan VPN atau pakai hotspot HP; minta lead cek halaman Clusters lalu klik Resume |
| Selalu dilempar ke `/login` | token kedaluwarsa (24 jam) atau database berganti | login ulang |
| Toast "Fitur ini butuh paket Basic" (402) | batas paket, dan ini **memang perilaku yang benar** | tampilkan tombol upgrade; jangan diakali di frontend |
| `/u/slug` menampilkan "tidak ditemukan" | undangan belum **diterbitkan** | terbitkan dulu di editor |
| Upload foto gagal 503 | R2 belum dikonfigurasi di `.env` backend | lapor ke lead |
| Upload foto gagal 403 atau error CORS ke `r2.cloudflarestorage.com` | CORS bucket R2 belum mengizinkan `localhost:5173`, atau `Content-Type` berbeda dari yang di-presign | lapor ke lead; pastikan memakai `uploadFile()` |
| Bayar gagal 503 | kunci DOKU belum diisi | lapor ke lead |
| Error TypeScript "property does not exist" pada data API | tipe usang, atau kamu salah membaca bentuk data | `bun run gen:api`, lalu cek `docs/API.md` |
| `bun run lint` menolak `axios`, `lucide-vue-next`, atau `@radix-ui` | memang dilarang | pakai `api`/`unwrap`, `@lucide/vue`, dan komponen shadcn-vue |
| MCP shadcn tidak Connected | agent tidak dibuka dari folder `frontend/`, atau Node.js belum terpasang | buka ulang dari `frontend/` dan cek `npx --version` |
| Port 5173 atau 3000 sudah dipakai | server lama masih jalan | tutup terminal lama, atau `bunx kill-port 5173` |
