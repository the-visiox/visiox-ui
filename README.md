# VisioX UI

Next.js frontend for the **VisioX** computer vision platform: marketing site, authenticated workspace (datasets, training, deploy), and **image annotation** (Konva) wired to the **Visiox Django API**.

## Tech stack

| Layer | Technology |
|--------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4 |
| Motion | Framer Motion |
| Canvas | Konva + react-konva |
| Icons | lucide-react |
| Package manager | pnpm |

## Prerequisites

- Node 20+ recommended  
- **visiox** Django API running for real auth and data — default `http://localhost:8000`

## Environment

Copy the example and adjust if the API is not on port 8000:

```bash
cp .env.local.example .env.local
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL of the Visiox API (no trailing slash), e.g. `http://127.0.0.1:8000` |

Restart `pnpm dev` after changing env vars.

## Scripts

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm lint
```

## Project structure (high level)

```text
app/                    # Routes (marketing, login, overview, datasets, annotate, …)
components/             # UI + platform + annotate (AnnotationEditor)
lib/
  api.ts                # JWT client: auth, projects, datasets, training, …
  api/                  # Supplemental fetch helpers (jobs, classes, …)
  types/annotation.ts   # Editor shape / tool types
  auth.tsx              # AuthProvider (uses lib/api.ts)
```

## Annotation workspace

- Route: `/datasets/[datasetId]/annotate/[mediaId]`  
- Optional query: `?jobId=<labelingTaskId>` to **load/save** via `GET` / `PATCH /api/jobs/{id}/annotations/`.  
- **Box tool**: drag on the image. **Polygon tool**: choose vertex count in the toolbar, then click corners; **Esc** cancels in-progress polygon.  
- **Demo mode**: no token → placeholder image and demo labels; API calls skipped until logged in.

## Login

1. Start the Visiox API (`python manage.py runserver 0.0.0.0:8000` or Docker).  
2. Open `/login`.  
3. Use a real user (e.g. after `seed_demo_data`: `demo@visiox.ai` / `Demo1234!`).  
If the UI shows a network error, confirm `NEXT_PUBLIC_API_URL` and that the browser can reach `/api/docs/` on the API host.

## Agent / AI skills

- **VisioX design & patterns**: `.agents/skills/visiox-frontend-agent/SKILL.md`  
- **Hub**: `.agents/AGENTS.md`

## Design notes

Premium **light** workspace aesthetic (`bg-[#fcfaf7]`, stone palette, orange accents). The annotation screen uses the same system; `LayoutShell` gives annotate routes a full-width shell without the main sidebar.

---

Built for the VisioX platform.
