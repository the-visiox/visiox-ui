# VisioX Documentation

Go from raw images to a deployed vision model — without writing a single line of training code.

---

## What is VisioX?

VisioX is an end-to-end computer-vision platform built for teams that need to annotate, train, deploy, and monitor vision models at scale. Every step — data management, annotation, model training, and inference endpoints — lives in one workspace so your team stops context-switching between disconnected tools.

> **Note:** VisioX consists of two services that work together: the Django backend (`visiox/`) and this frontend (`visiox-ui/`).

---

## Platform Overview

| Pillar | What it does |
|---|---|
| **Datasets** | Upload images, browse frames, manage versions, and sync annotations |
| **Annotation** | Label data with the native Konva editor |
| **Training** | Launch training jobs, track experiments, and compare metrics |
| **Deployment** | Push models to inference endpoints and monitor production traffic |
| **Workflows** | Chain vision tasks into multi-stage automated pipelines |
| **DataVerse** | Discover and share datasets across teams and projects |

---

## Quickstart

Get the platform running locally and annotate your first image in under 10 minutes.

### Prerequisites

- **Node.js** ≥ 18 and **pnpm** ≥ 10
- **Python** ≥ 3.10 (for the Django backend)

- Git

### Step 1 — Clone the repositories

```bash
git clone https://github.com/your-org/visiox-ui.git
git clone https://github.com/your-org/visiox.git
```

### Step 2 — Start the Django backend

```bash
cd visiox
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
# API available at http://localhost:8000
```

### Step 3 — Configure the frontend

```bash
cd visiox-ui
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 4 — Run the frontend

```bash
pnpm install
pnpm dev
# Frontend available at http://localhost:3000
```

### Step 5 — Create your first project

1. Open `http://localhost:3000` in your browser.
2. Register an account at `/register` or log in at `/login`.
3. Navigate to **Projects** → **New Project**.
4. Enter a project name and click **Create**.
5. From the project page, click **New Dataset** to upload your first images.

---

## Authentication

VisioX supports three authentication methods.

### Email & Password

```http
POST /api/auth/login/
Content-Type: application/json

{
  "email": "you@example.com",
  "password": "your-password"
}
```

**Response:**

```json
{
  "access": "<JWT access token>",
  "refresh": "<JWT refresh token>",
  "user": {
    "id": 1,
    "email": "you@example.com",
    "username": "you"
  }
}
```

### OAuth (Google / GitHub)

```http
POST /api/auth/oauth/
Content-Type: application/json

{
  "provider": "google",
  "code": "<OAuth authorization code>"
}
```

### Token Refresh

Access tokens expire after a short window. The frontend automatically refreshes them on 401 responses. To refresh manually:

```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "<your refresh token>"
}
```

> **Security:** Tokens are stored in `localStorage` under `visiox_access_token` and `visiox_refresh_token`. Never expose these values to third-party scripts.

---

## Datasets

### Create a Dataset

```http
POST /api/datasets/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Traffic Cameras Q3",
  "project": 42
}
```

### Upload Images

Upload media files to an existing dataset using `multipart/form-data`:

```http
POST /api/datasets/{id}/media/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file=@/path/to/image.jpg
```

### Browse a Dataset

The data browser returns paginated frames with their annotation overlays in a single request:

```http
GET /api/datasets/{id}/browser/?page=1&page_size=50
Authorization: Bearer <access_token>
```

**Response fields:**

| Field | Type | Description |
|---|---|---|
| `count` | integer | Total number of frames |
| `results` | array | Frame objects with `id`, `filename`, `width`, `height`, `annotations` |
| `next` | string \| null | URL for the next page |

### Retrieve a Frame Image

Frames are served as a proxied image stream from the backend. Append your access token as a query parameter:

```
GET /api/datasets/{id}/frames/{frame_number}/?token=<access_token>
```

This URL can be used directly as an `<img src>` or as the canvas background in the annotation editor.

---

## Annotation

VisioX provides two annotation surfaces. Choose based on your team's needs.

### Native Editor (recommended)

The native editor is a full-featured Konva canvas that loads instantly without any additional services.

**Navigate to:**

```
/datasets/{id}/annotate/{imageId}
```

#### Supported Shape Types

| Shape | Key | Use case |
|---|---|---|
| Rectangle | `n` | Bounding boxes, object detection |
| Polygon | `p` | Segmentation, irregular shapes |
| Polyline | `l` | Lines, roads, skeleton joints |
| Points | `k` | Keypoint detection, pose estimation |
| Tag | — | Image-level classification (no geometry) |

#### Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Select tool | `v` |
| Rectangle tool | `n` |
| Polygon tool | `p` |
| Polyline tool | `l` |
| Points tool | `k` |
| Cancel polygon in progress | `Esc` |
| Undo | `Ctrl + Z` |
| Redo | `Ctrl + Y` |
| Zoom in | `Ctrl + scroll up` / `+` |
| Zoom out | `Ctrl + scroll down` / `-` |
| Fit to screen | `1` (1:1 scale) |
| Pan | Scroll wheel |
| Delete selected shape | `Delete` / `Backspace` |

#### Save Annotations

Annotations are saved per job or per media item. The editor calls one of the following depending on the data source:

```http
PATCH /api/jobs/{job_id}/annotations/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "shapes": [
    {
      "type": "rectangle",
      "label_id": 3,
      "x": 120, "y": 80, "width": 200, "height": 150
    },
    {
      "type": "polygon",
      "label_id": 5,
      "points": [100, 50, 200, 50, 250, 150, 100, 150]
    }
  ]
}
```

---

## Label Management

### Define Labels for a Project

Labels (classes) are defined at the project level and shared across all datasets in that project.

```http
POST /api/projects/{project_id}/classes/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Car",
  "color": "#FF7300",
  "supercategory": "vehicle"
}
```

### List Labels

```http
GET /api/projects/{project_id}/classes/
Authorization: Bearer <access_token>
```

**Response:**

```json
[
  { "id": 1, "name": "Car", "color": "#FF7300" },
  { "id": 2, "name": "Pedestrian", "color": "#3B82F6" },
  { "id": 3, "name": "Bicycle", "color": "#10B981" }
]
```

---

## Model Training

### Launch a Training Job

```http
POST /api/training-jobs/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "dataset_version": 7,
  "model_architecture": "yolov8n",
  "epochs": 100,
  "batch_size": 16,
  "image_size": 640
}
```

### Monitor Training Progress

```http
GET /api/training-jobs/{id}/
Authorization: Bearer <access_token>
```

**Status values:**

| Status | Meaning |
|---|---|
| `queued` | Job is waiting for compute resources |
| `running` | Training is in progress |
| `completed` | Training finished successfully |
| `failed` | Training failed — check `error_message` |

### View Experiment Metrics

```http
GET /api/metrics/?job={training_job_id}
Authorization: Bearer <access_token>
```

Returns epoch-by-epoch `loss`, `mAP50`, `mAP50-95`, `precision`, and `recall`.

---

## Deployment

### Push a Model to an Endpoint

```http
POST /api/endpoints/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "traffic-cam-v2-prod",
  "model": 15,
  "hardware": "gpu"
}
```

### Run Inference

Once an endpoint is active, send images directly:

```http
POST /api/endpoints/{id}/infer/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

image=@/path/to/frame.jpg
confidence=0.5
```

**Response:**

```json
{
  "predictions": [
    {
      "class": "Car",
      "confidence": 0.92,
      "x": 320, "y": 240, "width": 180, "height": 110
    }
  ],
  "inference_time_ms": 24
}
```

---

## Teams & Collaboration

### Create a Team

Navigate to **Teams** → **New Team** in the sidebar, or call the API:

```http
POST /api/teams/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Computer Vision Team"
}
```

### Invite Members

```http
POST /api/teams/{id}/invite/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "colleague@example.com",
  "role": "annotator"
}
```

The invitee receives a link at `/invite/{token}`. When they click it, they are automatically added to the team.

**Available roles:**

| Role | Can annotate | Can manage datasets | Can train | Can manage team |
|---|---|---|---|---|
| `viewer` | — | — | — | — |
| `annotator` | ✓ | — | — | — |
| `editor` | ✓ | ✓ | — | — |
| `admin` | ✓ | ✓ | ✓ | ✓ |

---

## DataVerse

DataVerse is VisioX's dataset-sharing marketplace. Teams can publish annotated datasets for others to discover and import.

Navigate to **DataVerse** in the sidebar to:

- Search public datasets by domain, label type, or image count.
- Import a public dataset directly into your project with one click.
- Publish your own dataset with a description and license.

---

## API Reference

All endpoints require a Bearer token unless marked **public**.

### Base URL

```
http://localhost:8000    (development)
https://api.visiox.ai   (production)
```

### Endpoint Index

| Resource | Method | Path |
|---|---|---|
| Login | POST | `/api/auth/login/` |
| Register | POST | `/api/auth/register/` |
| Token refresh | POST | `/api/auth/token/refresh/` |
| OAuth | POST | `/api/auth/oauth/` |
| Logout | POST | `/api/auth/logout/` |
| List projects | GET | `/api/projects/` |
| Create project | POST | `/api/projects/` |
| Get project | GET | `/api/projects/{id}/` |
| List datasets | GET | `/api/datasets/` |
| Create dataset | POST | `/api/datasets/` |
| Get dataset | GET | `/api/datasets/{id}/` |
| Update dataset | PATCH | `/api/datasets/{id}/` |
| Delete dataset | DELETE | `/api/datasets/{id}/` |
| Browse frames | GET | `/api/datasets/{id}/browser/` |
| Get frame image | GET | `/api/datasets/{id}/frames/{n}/` |
| Upload media | POST | `/api/datasets/{id}/media/` |
| Get job annotations | GET | `/api/jobs/{id}/annotations/` |
| Save job annotations | PATCH | `/api/jobs/{id}/annotations/` |
| Get media annotations | GET | `/api/media/{id}/annotations/` |
| Save media annotations | PUT | `/api/media/{id}/annotations/` |
| List training jobs | GET | `/api/training-jobs/` |
| Create training job | POST | `/api/training-jobs/` |
| Get training job | GET | `/api/training-jobs/{id}/` |
| List experiments | GET | `/api/experiments/` |
| Get metrics | GET | `/api/metrics/` |
| List model registry | GET | `/api/registry/` |
| List endpoints | GET | `/api/endpoints/` |
| Create endpoint | POST | `/api/endpoints/` |
| Run inference | POST | `/api/endpoints/{id}/infer/` |

---

## Error Handling

All API errors return a JSON body with a `detail` or `message` field.

| HTTP Status | Meaning | Common cause |
|---|---|---|
| `400` | Bad Request | Missing or invalid fields in request body |
| `401` | Unauthorized | Missing, expired, or invalid Bearer token |
| `403` | Forbidden | Authenticated user lacks permission for this resource |
| `404` | Not Found | Resource does not exist |
| `422` | Unprocessable Entity | Validation error on input data |
| `500` | Server Error | Internal backend error — check Django logs |

**Example error response:**

```json
{
  "detail": "Authentication credentials were not provided."
}
```

> **401 auto-retry:** The frontend's `lib/api.ts` automatically calls `POST /api/auth/token/refresh/` on a 401 and retries the original request once. If the refresh also fails, the user is redirected to `/login`.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8000` | VisioX Django backend URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | No | — | GitHub OAuth client ID |
| `GITHUB_REPOSITORY` | No | — | Sets `basePath` for GitHub Pages deployment (`org/repo`) |

---

## Troubleshooting

### "Cannot reach API" error in the browser

The frontend could not connect to `NEXT_PUBLIC_API_URL`. Verify:

1. The Django backend is running: `python manage.py runserver`
2. `NEXT_PUBLIC_API_URL` in `.env.local` matches the backend address exactly.
3. If accessing from another device on the same LAN, set `NEXT_PUBLIC_API_URL` to the machine's LAN IP (e.g., `http://192.168.1.10:8000`). The frontend automatically replaces `localhost` in the API URL with `window.location.hostname` for this case.

### Port 3000 is already in use

Next.js will automatically try port 3001, 3002, etc. To force port 3000:

```bash
pnpm exec next dev -p 3000
```

Stop any other process listening on port 3000 first.

### Annotations are not saving

- Confirm the request reaches the backend (check Network tab in DevTools).
- Verify the job or media ID in the URL is correct.
- Check that your user has at least the `annotator` role for the project.

---

## Next Steps

- [Architecture Diagrams](../ARCHITECTURE_DIAGRAMS.md) — System diagrams and data flow
- [Agent Configuration](../AGENTS.md) — Directory structure and integration points for AI agents
- Feature Specifications (`specs/001-roboflow-ui/`) — Detailed implementation plans
