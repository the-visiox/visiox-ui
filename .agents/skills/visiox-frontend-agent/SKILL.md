---
name: visiox-frontend-agent
description: Enforces the premium, light-themed, animated design system of the VisioX UI project when building or modifying React/Next.js components. Use this skill whenever generating frontend code.
---

# VisioX Frontend Engineering Guidelines

When acting as an AI coding assistant on the VisioX UI repository, follow these design, architectural, and API-integration rules. The product uses a **light**, workspace-first aesthetic and talks to the **Visiox Django API** via `lib/api.ts`.

## 1. Core tech stack

- **Framework**: Next.js 16 (App Router) with React 19.
- **Styling**: Tailwind CSS v4. Avoid custom CSS unless necessary.
- **Animations**: `framer-motion` for section entrances and lists; avoid heavy raw-CSS transitions for those.
- **Icons**: `lucide-react` only.
- **Canvas**: `konva` + `react-konva` for in-app annotation (`AnnotationEditor`); `use-image` for loading images on the canvas.
- **Lists**: `virtua` where virtualized lists are used.
- **Package manager**: `pnpm` (v10) for installs and scripts.

## 2. Global aesthetics and colors

- **Base**: Generous whitespace. Backgrounds: `bg-[#fcfaf7]`, `bg-stone-50` — not pure `#fff` / `#000` for large areas.
- **Text**: `text-stone-900` headings; `text-stone-500` / `text-stone-600` body.
- **Gradients** (accents): e.g. `from-orange-600 to-amber-500 bg-clip-text text-transparent`, or brand `from-[#E66700] via-[#FF7300] to-[#F1A222]`.
- **Shadows**: `shadow-xl shadow-stone-200/50` for depth.
- **Radius**: `rounded-2xl`, `rounded-3xl`, `rounded-[2.5rem]` for cards and canvas containers.

## 3. Structural rules

- **Server vs client**: Do not mix `"use client"` with `generateStaticParams()` in the same file. Use a `*Client.tsx` wrapper and a thin `page.tsx` (server) that exports `generateStaticParams` and renders the client component.
- **Next.js 16 params**: In server pages, when `params` is a Promise, `await` it before use.
- **Client components**: Add `"use client"` for interactivity, Konva, hooks, Framer Motion controls.
- **Root layout**: `app/layout.tsx` wraps `AuthProvider` + `LayoutShell`. **Do not** import `Header` or `Footer` inside individual pages (double chrome).
- **LayoutShell** (`components/LayoutShell.tsx`):
  - Marketing routes: `Header` + `Footer`.
  - Platform routes (`/overview`, `/datasets`, …): `Sidebar` + `TopBar`.
  - **Annotation workspace** (`/datasets/.../annotate/...`): full-width light shell **without** sidebar/top bar; the annotate page supplies its own toolbar.
- **Badges**: Use `@/components/Badge` for section labels.

## 4. Configuration and deployment

- **Config**: `next.config.mjs` (not `.ts`). Typically includes `images.unoptimized: true` and optional `basePath` for GitHub Actions / Pages. If `output: "export"` is enabled, every route must stay statically compatible.
- **Env**: `NEXT_PUBLIC_API_URL` in `.env.local` for the Django API (see `.env.local.example`).
- **CI**: Check `.github/workflows` for deploy targets.

## 5. API integration

- **Single client**: Prefer `lib/api.ts` — `API_BASE_URL`, `auth.login` / `register`, `datasets`, `projects`, `training`, `deployments`, JWT refresh on 401.
- **Annotation jobs**: `lib/api/jobs.ts` — `GET/PATCH /api/jobs/{id}/annotations/`, `POST` issues.
- **CORS**: Non-default front-end origins must be listed in Django `CORS_ALLOWED_ORIGINS`.

## 6. Animation and micro-interactions

- Fade-up: `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`, `duration ~0.5`.
- Lists: stagger `transition={{ delay: index * 0.1 }}`.
- Images: `group-hover:scale-105 transition-transform duration-700` where appropriate.
- Buttons: subtle `hover:-translate-y-0.5` or `hover:scale-105 active:scale-95`.
- Nav / overlays: `backdrop-blur-md` / `backdrop-blur-xl`.

## 7. Key components

| Component | Role |
|-----------|------|
| `LayoutShell` | Route-based chrome (marketing vs platform vs annotate). |
| `AnnotationEditor` | Konva: rectangle (drag), polygon (vertex count prop), select, Transformer on rects. |
| `AnnotatePageClient` | Toolbar, labels, `?jobId=` save/load, demo fallback. |
| `ImageGrid` | Dataset thumbnails (virtualized where used). |
| `BlueprintGrid` | Background grid on workspace pages. |
| `SolutionPageTemplate` | Industry solution pages. |
| Dataset detail | Data browser, frame proxy URLs — follow existing `lib/api.ts` helpers and `*Client.tsx` patterns in-repo. |

## 8. File naming

- Pages: `page.tsx` (server when possible).
- Clients: `*Client.tsx` / `*PageClient.tsx`.
- Shared UI: `components/**/*.tsx`.
- Hooks: `hooks/*.ts`.
- Utilities: `lib/*.ts`, `lib/**/*.ts`.
