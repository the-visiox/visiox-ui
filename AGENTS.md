# VisioX UI — Agent Configuration

Frontend of the VisioX computer-vision platform. Built with **Next.js 16 App Router** and **React 19**, it connects to a Django backend (`visiox/`) and an optional customized CVAT fork (`cvat/`) for annotation.

---

## Quick Reference

| Aspect | Detail |
|---|---|
| Framework | Next.js 16.1.4, React 19.2.3, TypeScript 5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Canvas | Konva 10 + react-konva 19 |
| Package manager | pnpm v10 |
| Dev server | `pnpm dev` → `http://localhost:3000` |
| Build | `pnpm build` → static export in `out/` |
| Backend API | `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) |
| CVAT URL | `NEXT_PUBLIC_CVAT_URL` (default `http://localhost:8080`) |
| Output mode | `output: "export"` (static — GitHub Pages compatible) |

### Dev Server Port Note

Next.js binds to **3000** by default. If the port is taken it auto-increments (3001, 3002, …). To pin port 3000: `pnpm exec next dev -p 3000`.

---

## Three-Repo Architecture

```
visiox-ui/          ← This repo (Next.js frontend)
    ↕ REST API (JWT Bearer)
visiox/             ← Django backend (auth, projects, datasets, training, deployment, CVAT proxy)
    ↕ cvat-sdk + REST
cvat/               ← Customized CVAT fork (annotation engine + web app)
```

---

## Key Integration Points

### 1. Authentication
- JWT tokens (`access_token`, `refresh_token`) stored in `localStorage` under keys `visiox_access_token` / `visiox_refresh_token`.
- `lib/api.ts` injects Bearer token on every request and auto-refreshes on 401.
- OAuth (Google/GitHub): `POST /api/auth/oauth/` with `{provider, code}`.
- `AuthProvider` (`lib/auth.tsx`) exposes `useAuth()` hook across the entire app.

### 2. CVAT SSO Embed
- Backend endpoint `GET /api/datasets/{id}/annotate_url/` returns a CVAT URL with an embedded SSO token.
- The `/datasets/[id]/annotate/cvat` route renders a full-screen `<iframe>` pointed at that URL.

### 3. Data Browser
- `DatasetDetailClient.tsx` fetches frames + shape annotations from `GET /api/datasets/{id}/browser/`.
- Images are served via `GET /api/datasets/{id}/frames/{num}/?token=<jwt>` (backend proxy).

### 4. Native Annotation Editor
- `components/annotate/AnnotationEditor.tsx` (1 189 lines) — Konva-based canvas.
- Business logic lives in `lib/annotation/` (types, geometry, label utilities, API mappers, session/history).
- Saves via `PATCH /api/jobs/{id}/annotations/` or `PUT /api/media/{id}/annotations/`.

### 5. LAN / Remote Access
- `lib/api.ts` replaces `localhost` in the API base URL with `window.location.hostname` so the browser can reach the backend when accessed from another device on the same network.

---

## API Endpoints (Backend Contract)

### Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login/` | Email + password login |
| POST | `/api/auth/register/` | New user signup |
| POST | `/api/auth/oauth/` | OAuth token exchange |
| POST | `/api/auth/logout/` | Logout |
| POST | `/api/auth/token/refresh/` | Access token refresh |

### Projects & Datasets
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/projects/` | List / create projects |
| GET | `/api/projects/{id}/` | Project detail |
| GET/POST | `/api/datasets/` | List / create datasets |
| GET | `/api/datasets/{id}/` | Dataset detail |
| PATCH/DELETE | `/api/datasets/{id}/` | Update / delete dataset |
| GET | `/api/datasets/{id}/media/` | Media list |
| GET | `/api/datasets/{id}/browser/` | Frames + annotations (data browser) |
| GET | `/api/datasets/{id}/frames/{n}/` | Image proxy (requires `?token=`) |
| GET | `/api/datasets/{id}/annotate_url/` | CVAT SSO URL |

### Annotations
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/jobs/{id}/annotations/` | Load job annotations |
| PATCH | `/api/jobs/{id}/annotations/` | Save job annotations |
| POST | `/api/jobs/{id}/issues/` | Create annotation issue |
| GET | `/api/media/{id}/annotations/` | Load media annotations |
| PUT | `/api/media/{id}/annotations/` | Save media annotations |

### Training & Deployment
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/training-jobs/` | Training job list |
| GET | `/api/experiments/` | Experiment list |
| GET | `/api/metrics/` | Training metrics |
| GET | `/api/registry/` | Model registry |
| GET | `/api/endpoints/` | Inference endpoint list |

---

## Key Directories

```
app/                            # Next.js App Router pages
├── page.tsx                    # Landing page (marketing)
├── layout.tsx                  # Root: AuthProvider + LayoutShell
├── login/ · register/          # Auth pages (bare shell)
├── auth/callback/              # OAuth callback
├── invite/[token]/             # Team invitation handler
├── home/ · overview/           # Authenticated workspace home
├── projects/                   # Project list + create + detail
├── datasets/[id]/              # Dataset browser + annotation
│   ├── DatasetDetailClient.tsx # Dataset browser UI
│   └── annotate/
│       ├── [imageId]/          # Native Konva annotation editor
│       └── cvat/               # CVAT iframe embed
├── teams/                      # Team management
├── train/ · deploy/            # Training + deployment dashboards
├── workflows/ · dataverse/     # Workflow builder + data marketplace
├── products/                   # Product feature pages (6 pages)
├── solutions/                  # Industry solution pages (9 verticals)
└── about/                      # Company, blog, contact

components/                     # Shared React components
├── LayoutShell.tsx             # Route-level chrome router
├── Header.tsx · Footer.tsx     # Marketing chrome
├── platform/Sidebar.tsx        # Workspace left nav
├── platform/TopBar.tsx         # Workspace top bar
├── Badge.tsx · BlueprintGrid.tsx · CardMenu.tsx
├── SolutionLayout.tsx · SolutionPageTemplate.tsx
├── datasets/ImageGrid.tsx      # Media browser grid
├── versions/GenerateVersionSlideover.tsx
└── annotate/AnnotationEditor.tsx  # Konva canvas (1 189 lines)

lib/                            # Client libraries
├── api.ts                      # Core API client (705 lines) — JWT, refresh, typed resources
├── auth.tsx                    # AuthProvider React context + useAuth() hook
├── assets.ts                   # Asset path resolver
├── api/
│   ├── client.ts               # apiFetch() shared helper
│   ├── datasets.ts             # getDataset(), getDatasetMedia()
│   ├── jobs.ts                 # Annotation job CRUD
│   ├── classes.ts              # Classification label APIs
│   └── labelProfile.ts         # Label profile APIs
└── annotation/                 # Unified annotation runtime
    ├── index.ts                # Public exports
    ├── types.ts                # Tool, ShapeType, EditorShape, LabelDefinition, TOOL_SHORTCUTS
    ├── geometry.ts             # bboxFromPoints(), clamp()
    ├── labels.ts               # buildLabelMetaMap(), colorFor(), labelNameFor()
    ├── mappers.ts              # apiShapesToEditor(), editorToApiPayload()
    ├── object-state.ts         # Shape object state
    ├── annotations-collection.ts  # In-memory shape store
    ├── annotations-history.ts  # Undo/redo stack
    └── session.ts              # AnnotationSession class

public/                         # Static assets
├── logos/                      # Partner/brand logos (SVG)
├── demo/                       # Demo images per industry
└── solutions/                  # Solution page images

specs/                          # Feature specifications
└── 001-roboflow-ui/
    ├── spec.md · plan.md · tasks.md

.agents/                        # Agent skills and workflows
└── skills/
    ├── visiox-frontend-agent/  # Design system + CVAT integration rules
    ├── vercel-react-best-practices/
    ├── vercel-composition-patterns/
    └── deploy-to-vercel/
```

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

---

## Agent Skills

| Skill | Purpose |
|---|---|
| `visiox-frontend-agent` | VisioX design system, component patterns, CVAT integration rules |
| `vercel-react-best-practices` | React/Next.js performance optimization |
| `vercel-composition-patterns` | Component architecture patterns |
| `deploy-to-vercel` | Vercel deployment automation |

---

## Environment Variables

```bash
# Required
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000   # VisioX Django backend

# Optional
NEXT_PUBLIC_CVAT_URL=http://localhost:8080  # CVAT web app for iframe embed
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...            # Google OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=...            # GitHub OAuth
GITHUB_REPOSITORY=org/repo                  # Sets basePath for GitHub Pages
```

---

## Styling System

- **Tailwind CSS v4** via `@tailwindcss/postcss` PostCSS plugin.
- **Colors**: background `#fcfaf7` (light stone), primary orange `#FF7300 → #F1A222`.
- **Custom animations** in `app/globals.css`: `fadeInUp`, `scan` (scanline), `float`.
- **Custom utilities**: `.no-number-spinner`, `.custom-scrollbar`.
- **Motion**: Framer Motion 12 for page transitions and micro-interactions.

---

## State Management

| Layer | Mechanism | Scope |
|---|---|---|
| Authentication | React Context (`AuthProvider`) | Global |
| Annotation session | `AnnotationSession` class | Annotation page |
| UI / form state | `useState` | Component-local |
| No Redux / Zustand | — | — |

---

See [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) for Mermaid flowcharts of the full system, component tree, data flow, and annotation workflow.
