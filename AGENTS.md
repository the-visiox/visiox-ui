# VisioX UI — Agent Configuration

Frontend of the VisioX computer-vision platform. Built with **Next.js 16 App Router** and **React 19**, it connects to a Django backend (`visiox/`).

---

## Quick Reference

| Aspect | Detail |
|---|---|
| Framework | Next.js 16.1.4, React 19.2.3, TypeScript 5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Canvas | Konva 10 + react-konva 19 |
| Package manager | pnpm v10 (CI installs pnpm@9) |
| Dev server | `pnpm dev` → `http://localhost:3000` |
| Build | `pnpm build` (no static export — standard Next.js build to `.next/`) |
| Lint | `pnpm lint` (just `eslint`, no args — uses `eslint.config.mjs`) |
| API prefix | Backend uses `/api/v1/` for all endpoints |
| Backend API | `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`, no trailing slash) |
| Path alias | `@/*` maps to `./*` (tsconfig paths) |

No test command, no typecheck script, no Prettier config, no Husky/lint-staged.  
`lib/hooks/` and `lib/types/` directories exist but are empty.

### Dev Server Port Note

Next.js binds to 3000 by default. If taken it auto-increments (3001, 3002, …). To pin: `pnpm exec next dev -p 3000`.

---

## Two-Repo Architecture

```
visiox-ui/          ← This repo (Next.js frontend)
    ↕ REST API (JWT Bearer) — all endpoints under /api/v1/
visiox/             ← Django backend (auth, projects, datasets, training, deployment)
```

---

## Key Integration Points

### Authentication
- JWT tokens (`access_token`, `refresh_token`) stored in `localStorage` under keys `visiox_access_token` / `visiox_refresh_token`.
- `lib/api.ts` injects Bearer token on every request, auto-refreshes on 401, and sets `visiox_session` cookie for middleware.
- OAuth (Google/GitHub): `POST /api/v1/auth/oauth/` with `{provider, code}`.
- `AuthProvider` (`lib/auth.tsx`) exposes `useAuth()` hook across the entire app.

### Middleware (`proxy.ts`)
- Exports a `proxy()` function that checks for `visiox_session` cookie on platform routes (`/home`, `/projects`, `/datasets`, `/teams`, `/train`, `/deploy`, `/workflows`, `/overview`, `/invite`).
- Redirects to `/login?next=...` if session is missing. Must be registered as Next.js middleware.

### Native Annotation Editor
- `components/annotate/AnnotationEditor.tsx` (1 115 lines) — Konva-based canvas, re-exports `Tool` type from `lib/annotation`.
- Business logic lives in `lib/annotation/` (types, geometry, label utilities, API mappers, session/history).
- Saves via `PATCH /api/v1/jobs/{id}/annotations/`, `PUT /api/v1/media/{id}/annotations/`, or `PUT /api/v1/datasets/{id}/frames/{n}/annotations/`.

### LAN / Remote Access
- `lib/api.ts` replaces `localhost` in the API base URL with `window.location.hostname` so the browser can reach the backend when accessed from another device on the same network.

---

## Styling System

- **Tailwind CSS v4** via `@tailwindcss/postcss` PostCSS plugin.
- **Colors**: background `#fcfaf7` (light stone), primary orange `#FF7300 → #F1A222`.
- **Custom animations** in `app/globals.css`: `fadeInUp`, `scan` (scanline), `float`.
- **Custom utilities**: `.no-number-spinner`, `.custom-scrollbar`.
- **Motion**: Framer Motion 12 for page transitions (`app/template.tsx` wraps children with slide+fade) and micro-interactions.
- **Fonts**: Geist and Geist Mono from `next/font/google`.

---

## State Management

| Layer | Mechanism | Scope |
|---|---|---|
| Authentication | React Context (`AuthProvider`) | Global |
| Annotation session | `AnnotationSession` class | Annotation page |
| UI / form state | `useState` | Component-local |
| No Redux / Zustand | — | — |

---

## Annotation Editor — Tool Reference

| Key | Tool | Shape |
|---|---|---|
| `v` | Select | — |
| `n` | Rectangle | Bounding box |
| `p` | Polygon | Closed polygon |
| `l` | Polyline | Open polyline |
| `k` | Points | Keypoints |
| `Esc` | Cancel | — |
| `Ctrl+Z` | Undo | — |
| `Ctrl+Y` | Redo | — |
| `Ctrl+scroll` | Zoom | — |

Additional tools: `c` → cuboid, `t` → tag (defined in `lib/annotation/types.ts`).

---

## Agent Skills

| Skill | Purpose |
|---|---|
| `visiox-frontend-agent` | VisioX design system, component patterns, annotation integration rules |
| `vercel-react-best-practices` | React/Next.js performance optimization |
| `vercel-composition-patterns` | Component architecture patterns |
| `deploy-to-vercel` | Vercel deployment automation |

See `specs/001-roboflow-ui/` for feature specs and task breakdowns.

---

## Environment Variables

```bash
# Required
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000   # No trailing slash

# Optional
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GITHUB_CLIENT_ID=...
GITHUB_REPOSITORY=org/repo                  # Sets basePath for GitHub Pages
```

No `.env.local.example` exists — copy from `.env.local` or the README. Restart `pnpm dev` after changing env vars.

---

## Build & Deploy Notes

- **`next.config.mjs`**: `images.unoptimized: true`, dynamic `basePath` from `GITHUB_REPOSITORY`. No `output: "export"` set (Next.js default applies — standard server build).
- **CI** (`.github/workflows/`): GitHub Pages deploy (`pnpm install --frozen-lockfile` → `pnpm run build` → upload `out/`) and Vercel deploy (`pnpm install --no-frozen-lockfile` → `vercel build`).
- No lint or typecheck runs in CI.

---

## Structure

```
app/                          # Next.js App Router pages
  ├── layout.tsx              # Root: AuthProvider + LayoutShell
  ├── template.tsx            # Page transition animation (Framer Motion)
  ├── page.tsx                # Landing page (marketing, full-screen snap)
  ├── login/register/...      # Auth pages (bare chrome, dark bg #1c1917)
  └── datasets/[id]/          # Dataset detail + annotation routes
      ├── DatasetDetailClient.tsx    # Dataset browser UI
      └── annotate/[imageId]/
          ├── page.tsx               # Server page (Suspense + generateStaticParams)
          ├── AnnotatePageClient.tsx # Annotation workspace (1132 lines)
          └── AnnotateWorkspaceLayout.tsx
components/
  ├── LayoutShell.tsx         # Route-level chrome (bare/marketing/platform/annotate)
  ├── annotate/AnnotationEditor.tsx  # Konva canvas (1115 lines)
  └── platform/Sidebar.tsx, TopBar.tsx
lib/
  ├── api.ts                  # JWT fetch wrapper (736 lines), typed resource methods, LAN resolution
  ├── auth.tsx                # AuthProvider + useAuth()
  ├── api/                    # Supplemental: client, datasets, jobs, classes, labelProfile
  └── annotation/             # Annotation runtime (types, geometry, labels, mappers, session, history)
```

Pages export pattern: `page.tsx` (server) + `*Client.tsx` (client wrapper) — do **not** mix `"use client"` with `generateStaticParams()` in the same file.
