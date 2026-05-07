# VisioX UI — Agent notes

This repo is the **Next.js** frontend for the VisioX computer vision platform. It pairs with the **Django API** in the sibling repo `visiox` (same parent folder `visiox_platform`).

## Quick reference

| Topic | Location |
|--------|-----------|
| Design system (light theme, motion) | `.agents/skills/visiox-frontend-agent/SKILL.md` |
| API client + JWT | `lib/api.ts` (`API_BASE_URL`, `auth`, `datasets`, …) |
| Annotation canvas | `components/annotate/AnnotationEditor.tsx` |
| Annotate route | `app/datasets/[id]/annotate/[imageId]/` |
| Env for API URL | `.env.local` → `NEXT_PUBLIC_API_URL` (see `.env.local.example`) |
| Speckit workflows | `.agents/workflows/*.md` |

## Backend pairing

- Default API: `http://localhost:8000` unless `NEXT_PUBLIC_API_URL` is set.
- Login: `POST /api/auth/login/` with `{ username, password }` (email allowed when unique).
- Annotation save (jobs): `GET/PATCH /api/jobs/{id}/annotations/`, issues: `/api/jobs/{id}/issues/`.

## Package manager

Use **pnpm** for this project (`pnpm install`, `pnpm dev`, `pnpm build`).

## Testing rule

- After creating or changing functionality, the agent must run the most relevant verification before handing work back.
- For UI and Next.js changes, prefer the smallest useful check first, usually `pnpm lint`, then add `pnpm build` when routing, typing, or app-level integration may be affected.
- Do not claim a feature is done without reporting which verification command was run and whether it passed.
- If a test or build cannot be run because of missing environment, time, or unrelated repo issues, the agent must say that clearly and explain the blocker.
