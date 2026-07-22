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

## Chạy tách riêng DB / Backend / Frontend

Mô hình khuyến nghị: chạy mỗi phần ở một terminal riêng.

### Terminal A — DB + Redis (repo `visiox`)

```bash
docker compose up -d db redis
docker compose ps
```

### Terminal B — Backend API (repo `visiox`)

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cp env.example .env
python manage.py migrate
python manage.py setup_groups
python manage.py seed_demo_data
python manage.py runserver 0.0.0.0:8000
```

Nếu bạn chạy backend bằng Conda/env `py312`, dùng đúng executable:

```bash
C:\Users\Admin\miniconda3\envs\py312\python.exe manage.py migrate
C:\Users\Admin\miniconda3\envs\py312\python.exe manage.py runserver 0.0.0.0:8000
```

Lưu ý: để save được label profile theo từng ảnh/frame, backend cần apply migration `datasets.0006_medialabelprofile` (bảng `media_label_profiles`).

### Terminal C — Frontend UI (repo `visiox-ui`)

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Mặc định frontend dùng:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Đăng nhập demo:
- `demo@visiox.ai`
- `Demo1234!`

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
pnpm lint         # Includes the 120-character code-line limit
```

## Project structure (high level)

```text
app/                    # Routes (marketing, login, overview, datasets, annotate, …)
components/             # UI + platform + annotate (AnnotationEditor)
lib/
  api.ts                # JWT client: auth, projects, datasets, training, …
  api/                  # Supplemental fetch helpers (jobs, classes, …)
  annotation/           # Annotation runtime, geometry, mappers, and shared types
  auth.tsx              # AuthProvider (uses lib/api.ts)
```

## API client (`lib/api.ts`)

Tất cả requests đến backend đi qua `lib/api.ts`. Backend dùng prefix `/api/v1/` cho mọi endpoint.

| Namespace | Mô tả |
| --------- | ----- |
| `auth` | Login, register, OAuth, logout, token refresh |
| `projects` | CRUD project |
| `teams` | Team, thành viên, invitation |
| `datasets` | CRUD dataset, upload, augmentation, export |
| `annotationClasses` | Labels của project |
| `training` | Training jobs (`startJob` → PATCH `{"status":"queued"}`), experiments, metrics |
| `deployments` | Model registry, inference endpoints (`startEndpoint` → PATCH `{"status":"active"}`) |
| `dataverse` | Public datasets, chia sẻ (`shareProject` → POST `/api/v1/dataverse/`), fork |

## GPU training metrics artifact

When a GPU training run finishes, upload `metrics.json` and expose it in the training job `artifact_urls` with the key `metrics.json`.
If available, also expose `training_log.json`; the Train page can use its epoch `metrics` events for charts and its `split_metrics` events as a fallback summary source.
The Train page reads split-specific values from these artifacts for the `Train`, `Valid`, and `Test` summary tabs.

Recommended `metrics.json` shape:

```json
{
  "split_metrics": {
    "train": {
      "f1": 0.951,
      "precision": 0.956,
      "recall": 0.945,
      "map50": 0.978,
      "map50_95": 0.955
    },
    "valid": {
      "f1": 0.934,
      "precision": 0.941,
      "recall": 0.927,
      "map50": 0.962,
      "map50_95": 0.931
    },
    "test": {
      "f1": 0.918,
      "precision": 0.925,
      "recall": 0.911,
      "map50": 0.947,
      "map50_95": 0.904
    }
  }
}
```

Values may be ratios (`0.951`) or percentages (`95.1`); the UI displays both as `95.10%`.
The frontend also accepts split aliases such as `val`, `validation`, or `dev` for the Valid tab, nested `summary.split_metrics`, top-level `train`/`valid`/`test` objects, and flat keys such as `train_f1_score`, `valid_precision`, `test_map50`, and `test_map50_95`.
Do not publish only global `f1_score`, `precision`, `recall`, `map50`, or `map50_95` if the three tabs should differ.

## Annotation workspace

- Route: `/datasets/[datasetId]/annotate/[mediaId]`
- Optional query: `?jobId=<labelingTaskId>` để load/save qua `GET` / `PATCH /api/v1/jobs/{id}/annotations/`
- **Box tool**: kéo thả trên ảnh. **Polygon tool**: chọn số đỉnh trong toolbar rồi click; **Esc** huỷ polygon đang vẽ.
- **Demo mode**: không có token → ảnh placeholder và labels demo; API calls bị skip cho đến khi đăng nhập.

## Login

1. Chạy Visiox API (`python manage.py runserver 0.0.0.0:8000` hoặc Docker).
2. Mở `/login`.
3. Dùng tài khoản thực (sau `seed_demo_data`: `demo@visiox.ai` / `Demo1234!`).

Nếu UI báo lỗi network, kiểm tra `NEXT_PUBLIC_API_URL` và truy cập thử `http://localhost:8000/api/docs/`.

## Agent / AI skills

- **VisioX design & patterns**: `.agents/skills/visiox-frontend-agent/SKILL.md`  
- **Hub**: `.agents/AGENTS.md`

## Design notes

Premium **light** workspace aesthetic (`bg-[#fcfaf7]`, stone palette, orange accents). The annotation screen uses the same system; `LayoutShell` gives annotate routes a full-width shell without the main sidebar.

---

Built for the VisioX platform.
