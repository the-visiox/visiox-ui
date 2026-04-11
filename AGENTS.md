# VisioX UI — Agent Configuration

This is the **frontend** of the VisioX computer-vision platform, built with Next.js 16 (App Router) and React 19.

## Quick Reference

| Aspect | Detail |
|--------|--------|
| Framework | Next.js 16, React 19, Tailwind CSS v4 |
| Package manager | pnpm v10 |
| Dev server | `pnpm dev` → `http://localhost:3000` |
| Backend API | `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) |
| CVAT URL | `NEXT_PUBLIC_CVAT_URL` (default `http://localhost:8080`) |
| Output mode | Static export (`output: "export"`) for GitHub Pages |

## Architecture

```
visiox-ui/                  ← This repo (Next.js frontend)
  ↕ REST API (JWT)
visiox/                     ← Django backend (API, CVAT SDK, auth)
  ↕ cvat-sdk + REST
cvat/                       ← Customized CVAT fork (annotation engine)
```

### Key Integration Points

1. **Authentication**: JWT tokens stored in `localStorage`, auto-refresh on 401. API client in `lib/api.ts`.
2. **CVAT SSO**: Annotation page embeds CVAT iframe using `/api/auth/visiox-sso?token=<jwt>&next=<path>`.
3. **Data Browser**: Dataset detail page (`/datasets/[id]`) fetches frames + annotations from backend proxy and renders SVG overlays.
4. **Image Proxy**: Backend proxies CVAT images at `/api/datasets/{id}/frames/{num}/?token=<jwt>`.

## Skills

- **`visiox-frontend-agent`**: Design system, component patterns, CVAT integration rules
- **`vercel-react-best-practices`**: React/Next.js performance optimization rules
- **`vercel-composition-patterns`**: Component architecture patterns
- **`web-design-guidelines`**: UI review against Web Interface Guidelines
- **`deploy-to-vercel`**: Vercel deployment automation

## Key Directories

```
app/                    # Next.js App Router pages
├── datasets/[id]/      # Data browser (DatasetDetailClient.tsx) + annotation page
├── projects/[id]/      # Project detail with dataset list
├── login/              # Auth page
├── solutions/          # Industry solution marketing pages
└── products/           # Product feature pages
components/             # Shared React components (BlueprintGrid, Badge, etc.)
lib/
├── api.ts              # Centralized API client with JWT handling
└── auth.tsx            # AuthProvider context
```
