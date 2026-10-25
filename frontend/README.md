# undaang frontend

SPA Vue 3 + Vite + TypeScript + shadcn-vue untuk undaang, platform undangan pernikahan digital. Satu aplikasi ini melayani:

- dashboard pasangan (`/app`);
- halaman undangan publik (`/u/:slug`);
- panel admin (`/admin`).

## Mulai cepat

```bash
bun install
bun run dev        # http://localhost:5173, backend harus jalan di :3000
```

| Perintah | Fungsi |
|---|---|
| `bun run lint` | ESLint |
| `bun run typecheck` | vue-tsc |
| `bun run build` | build production |
| `bun run format` | Prettier |
| `bun run gen:api` | regenerate tipe API dari backend `/openapi.json` |

## Dokumen

| File | Untuk |
|---|---|
| [`AGENTS.md`](AGENTS.md) | aturan wajib untuk manusia dan AI agent, dibaca otomatis oleh agent |
| [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md) | setup dari nol (termasuk skills dan MCP shadcn-vue) sampai PR pertama |
| [`docs/BRIEF.md`](docs/BRIEF.md) | spesifikasi tiap halaman dan acceptance criteria |
| [`docs/API.md`](docs/API.md) | kontrak API backend versi frontend |
| [`docs/TASKS.md`](docs/TASKS.md) | tiket berurutan, prompt siap tempel, checklist review |
