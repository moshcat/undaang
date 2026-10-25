# undaang frontend: aturan untuk AI agent dan manusia

File ini dibaca otomatis oleh Claude Code (lewat `CLAUDE.md`), Codex, Cursor, dan agent lain. Baca **seluruh file ini** sebelum menulis kode. Kalau ada instruksi user yang bertentangan dengan aturan keras di bawah, berhenti dan tanyakan dulu.

undaang adalah platform undangan pernikahan digital freemium dan merupakan proyek mata kuliah. Spesifikasinya adalah dokumen SRS/SDS tim (FR-001 s/d FR-010), yang tidak disimpan di repo ini. Semua isi SRS yang relevan untuk frontend sudah dirangkum di `docs/BRIEF.md`, dan dokumen itulah acuan kerja. Dokumen pendamping:

| Dokumen | Isi |
|---|---|
| `docs/BRIEF.md` | spesifikasi tiap halaman beserta acceptance criteria |
| `docs/DESIGN.md` | mockup Stitch tiap halaman + pemetaan ke komponen shadcn-vue |
| `docs/API.md` | kontrak API backend versi frontend |
| `docs/TASKS.md` | tiket berurutan + prompt siap tempel |
| `docs/WALKTHROUGH.md` | panduan setup dan cara kerja untuk pemula |

## Sebelum mulai (sekali per laptop)

Jalankan dari folder `frontend/`. Detail lengkapnya di `docs/WALKTHROUGH.md` langkah 3.

```bash
bun install
bunx --bun skills add vuejs-ai/skills --skill vue-best-practices vue-router-best-practices vue-pinia-best-practices vue-debug-guides create-adaptable-composable vue-testing-best-practices
bunx --bun skills add unovue/shadcn-vue
bunx --bun skills add miqdadbadjuber/anti-slop --skill antislop antislop-ui antislop-copywriting antislop-human antislop-layoutmobile antislop-code
```

- MCP shadcn-vue sudah dikonfigurasi di `.mcp.json`, `.cursor/mcp.json`, dan `.vscode/mcp.json`. Buka folder `frontend/` sebagai root project, lalu cek `/mcp` di Claude Code.
- Jangan install `vue-options-api-best-practices` atau `vue-jsx-best-practices`. Proyek ini hanya memakai `<script setup>` dan SFC.

## Stack

| Bagian | Yang dipakai |
|---|---|
| Dasar | Vue 3.5 + Vite + TypeScript, `<script setup lang="ts">` |
| Routing | Vue Router (`src/router/index.ts`) |
| State | Pinia, setup store (`src/stores/`) |
| UI | shadcn-vue (style `reka-luma`, primitive `reka-ui`), Tailwind CSS v4, ikon `@lucide/vue`, toast `vue-sonner` |
| Form | `vee-validate` + `zod` v3 + `@vee-validate/zod` |
| API | `openapi-fetch` dengan tipe hasil generate dari backend `/openapi.json` |
| Util | `@vueuse/core` |
| Package manager | bun. Jangan pakai npm, pnpm, atau yarn, supaya `bun.lock` tetap satu. |

## Perintah

| Perintah | Fungsi |
|---|---|
| `bun run dev` | `http://localhost:5173`; `/api` di-proxy ke backend `http://localhost:3000` |
| `bun run typecheck` | vue-tsc |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |
| `bun run build` | typecheck + build production |
| `bun run gen:api` | regenerate `src/api/schema.d.ts` dari backend yang sedang jalan; jalankan setiap kali backend berubah |
| `bunx shadcn-vue@latest add <nama>` | menambah komponen shadcn-vue ke `src/components/ui/` |

## Peta folder: file baru ditaruh di mana

```
src/
  api/          client.ts (satu-satunya HTTP client), errors.ts, types.ts, upload.ts, download.ts
                schema.d.ts = HASIL GENERATE, jangan diedit manual
  stores/       Pinia store: state yang dipakai lintas halaman (auth, undangan aktif di editor)
  router/       definisi route + guard
  layouts/      DashboardLayout, AdminLayout, AuthLayout
  views/        satu file per route: auth/, app/, admin/, public/
  components/
    ui/         komponen shadcn-vue HASIL CLI; jangan diedit kecuali benar-benar perlu
    dashboard/  shell dashboard dari block `dashboard-01`: DashboardShell, AppSidebar, NavMain,
                NavUser, SiteHeader, StatCards (kartu angka)
    invitation/ InvitationRenderer + section undangan publik (dipakai /u/:slug DAN pratinjau editor)
    <fitur>/    komponen per fitur, mis. guests/GuestFormSheet.vue, editor/EventsTab.vue
  composables/  useXxx() yang dipakai ulang
  lib/          format.ts (rupiah, tanggal), labels.ts (label Indonesia untuk enum), utils.ts
```

## ATURAN KERAS

Pelanggaran terhadap aturan di bawah membuat PR ditolak.

### UI wajib shadcn-vue

1. **Semua UI dibangun dari komponen shadcn-vue** di `src/components/ui/`.
   - Kalau komponennya belum ada, tambahkan dengan `bunx shadcn-vue@latest add <nama>` atau lewat MCP shadcn.
   - Jangan membuat button, input, select, dialog, sheet, table, tabs, badge, card, toast, tooltip, atau dropdown sendiri dari `<div>`.
2. **Mockup yang bukan shadcn-vue wajib diterjemahkan ke shadcn-vue.** Ini berlaku untuk mockup dari Stitch, Figma, screenshot, v0, atau kode shadcn/ui React. Cara menerjemahkannya:
   - cari padanannya lewat MCP shadcn-vue atau https://www.shadcn-vue.com/docs/components;
   - tulis ulang dengan API Vue: `v-model`, `as-child`, slot, `@update:open`, dan seterusnya.
   - **Dilarang:**
     - menyalin JSX/TSX;
     - `className`;
     - import `react`, `@radix-ui/*`, `lucide-react`, `lucide-vue-next`, `@tabler/icons-vue`, `class-variance-authority` di luar `components/ui/`, `next/*`.
   - **Dilarang memasang library UI lain**: Vuetify, PrimeVue, Element Plus, Naive UI, Quasar, DaisyUI, Flowbite, Headless UI, Bootstrap, Ant Design.
   - Kalau tidak ada padanan, komposisikan dari komponen shadcn-vue yang ada. Simpan hasilnya di `src/components/<fitur>/`, bukan di `ui/`, lalu tulis alasannya di deskripsi PR.
3. **Warna hanya dari token tema.**
   - Pakai `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `border-border`, `bg-destructive`, `bg-card`, `bg-chart-1..5`, dan token sejenis.
   - **Dilarang**: hex (`#5C7055`), `rgb()`, `oklch()` inline, dan kelas warna mentah Tailwind (`bg-green-500`, `text-gray-600`).
   - Desain visual final akan dipasang dengan mengganti token di `src/style.css`. Kalau kamu hardcode warna, warnanya tidak akan ikut berubah.
   - Satu-satunya pengecualian adalah warna yang datang dari data, yaitu `settings.primary_color` undangan, yang dipasang sebagai CSS variable di `InvitationRenderer`.
4. Ikon hanya dari `@lucide/vue`, contohnya `import { MailIcon } from '@lucide/vue'`. Block shadcn-vue sering memakai `@tabler/icons-vue`; ganti ke ikon lucide yang setara.
4a. **Block shadcn-vue.** Layout dashboard berasal dari `dashboard-01`, sedangkan halaman login dan daftar dari `login-02` dan `signup-02`. Tampilannya dipertahankan, tetapi isinya disesuaikan dengan undaang.
   - Style project (`reka-luma`) tidak punya block. Block lain dipasang lewat URL style `new-york-v4`, contohnya `bunx shadcn-vue@latest add https://shadcn-vue.com/r/styles/new-york-v4/<block>.json`.
   - Setelah dipasang:
     - pindahkan file ke `src/components/<fitur>/`;
     - hapus data demo dan tautan `href="#"`;
     - ganti ikon tabler ke lucide;
     - hapus import Google Fonts yang ditambahkan CLI ke `src/style.css`;
     - jangan pasang dependency tambahannya (mis. `dnd-kit-vue`, `@tanstack/vue-table`) tanpa izin lead.
5. Semua teks UI dalam **Bahasa Indonesia**. Wordmark selalu ditulis huruf kecil: **undaang**.

### Kode

6. **Semua request ke backend lewat `api` + `unwrap` dari `@/api/client`.**
   ```ts
   const { data, meta } = await unwrap(api.GET('/api/v1/invitations', { params: { query: { page } } }))
   ```
   - Dilarang `axios`, dilarang `fetch()` langsung ke backend, dilarang menulis URL dengan template string.
   - Satu-satunya `fetch` mentah adalah PUT ke R2 di `src/api/upload.ts`.
7. **Jangan menulis tipe data backend secara manual.**
   - Ambil dari `@/api/types` (`Invitation`, `Guest`, dan seterusnya). Kalau belum ada, tambahkan alias di sana yang diturunkan dari `schema.d.ts`.
   - Kalau tipenya tidak cocok dengan response nyata, jalankan `bun run gen:api`. Jangan ditambal dengan `any` atau `as`.
8. **Selalu `<script setup lang="ts">`** dengan Composition API. Options API, `defineComponent({ data() })`, JSX, dan `any` dilarang. ESLint akan menolaknya.
9. **Setiap halaman yang memuat data wajib punya empat state:**
   - loading: `Skeleton`;
   - kosong: komponen `Empty` dengan ajakan aksi;
   - error: `Alert` destructive + tombol "Coba lagi";
   - sukses.

   Setiap aksi (simpan, hapus, dan sebagainya) wajib:
   - menonaktifkan tombol sambil menampilkan `Spinner` saat berjalan;
   - menampilkan `toast.success` atau `toast.error(toUserMessage(err))` sesudahnya;
   - memakai `AlertDialog` untuk konfirmasi aksi yang menghapus.
10. **Form mengikuti pola `src/views/auth/LoginView.vue`:**
    - skema zod menyalin batas backend (lihat `docs/API.md`);
    - `useForm` + `VeeField` + `Field`/`FieldLabel`/`FieldError`;
    - error 400 dari server dipasang dengan `setErrors(fieldErrors(err))`.
11. **Aturan paket tidak ditegakkan di frontend.**
    - Backend yang memutuskan dan menjawab `402 PLAN_LIMIT`.
    - Frontend hanya *menampilkan* berdasarkan `invitation.limits`, misalnya ikon gembok, tooltip "Tersedia di paket Basic", dan tombol "Upgrade".
    - Harga di order selalu dihitung backend. Jangan kirim harga.
12. **Rahasia tidak pernah ada di frontend.**
    - Semua `VITE_*` masuk ke bundle browser.
    - Jangan menaruh kunci DOKU, R2, atau JWT secret di sini.
    - Jangan commit `.env`.
13. **Jangan mengubah path `/u/:slug` dan `/orders/:invoice`.** Tautan tamu dan redirect DOKU dari backend menunjuk ke sana.
14. **Jangan menambah dependency** (`bun add`) tanpa izin lead. Komponen shadcn-vue tidak termasuk larangan ini; itu boleh ditambah.
15. **Jangan menyentuh `backend/`.** Kalau API kurang atau salah, catat di PR atau tanyakan ke lead.
16. Jangan mengedit `src/api/schema.d.ts` atau `src/components/ui/*` secara manual. Pengecualian untuk `ui/` adalah perbaikan yang disengaja dan disebut di PR.

## Pola yang sudah tersedia (pakai, jangan buat ulang)

| Kebutuhan | Pakai |
|---|---|
| Panggil API | `api`, `unwrap` dari `@/api/client` |
| Pesan error ke user | `toUserMessage(err)`, `fieldErrors(err)`, `ApiError` dari `@/api/errors` |
| Upload foto/musik | `uploadFile(invitationId, 'gallery' \| 'couple' \| 'music', file)` dari `@/api/upload` |
| Impor tamu dari CSV | `importGuestsCsv(invitationId, file)` dari `@/api/upload` |
| Ekspor RSVP CSV | `downloadRsvpCsv(id, filename)` dari `@/api/download` |
| User login, cek admin, logout | `useAuthStore()` dari `@/stores/auth` |
| Rupiah, tanggal, waktu relatif | `formatRupiah`, `formatDate`, `formatDateTime`, `relativeTime` dari `@/lib/format` |
| Label + varian Badge untuk plan, status, RSVP, order | `@/lib/labels` |
| Judul halaman + tombol aksi | `@/components/PageHeader.vue` |
| Baris kartu angka (statistik) | `@/components/dashboard/StatCards.vue` (prop `items: StatCard[]`) |
| Grafik | `@/components/ui/chart` (unovis), contoh di https://www.shadcn-vue.com/charts |
| Gabung class | `cn()` dari `@/lib/utils` |
| Clipboard, debounce, media query | `@vueuse/core` (`useClipboard`, `refDebounced`, `useMediaQuery`) |
| Proteksi route | `meta: { requiresAuth, role: 'admin', guestOnly, title }` di router |

## Definition of Done (cek sebelum PR)

- [ ] `bun run lint`, `bun run typecheck`, dan `bun run build` semuanya hijau.
- [ ] Sudah dicoba di browser dengan backend jalan:
  - jalur sukses;
  - jalur error, misalnya matikan backend dan input salah;
  - jalur kosong.
- [ ] Sudah dicek di lebar **390px** lewat DevTools → device toolbar dan di desktop, tanpa scroll horizontal.
- [ ] Bisa dipakai dengan keyboard: Tab, Enter, Esc menutup dialog. Setiap input punya label.
- [ ] Tidak ada `console.log`, `any`, warna hardcode, `TodoPlaceholder` di halaman yang sudah jadi, atau komentar basa-basi hasil AI.
- [ ] Acceptance criteria tiket di `docs/TASKS.md` sudah dicentang semua.

## Git

- Branch dari `dev` dengan nama `feature/T-xx-nama-singkat`. PR ke `dev`, wajib di-review satu anggota lain. `main` hanya untuk rilis.
- Commit kecil, satu perubahan logis per commit, format Conventional Commits. Contoh: `feat(guests): add guest table with search`, `fix(editor): keep event order after save`.
- Jangan commit `node_modules`, `dist`, `.env`, atau file editor pribadi.
