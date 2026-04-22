# VisioX UI Source Diagrams

These diagrams were derived from the current `visiox-ui` repository structure and runtime configuration, mainly from:

- `package.json`
- `next.config.mjs`
- `app/layout.tsx`
- `components/LayoutShell.tsx`
- `lib/auth.tsx`
- `lib/api.ts`
- `lib/api/client.ts`
- `lib/api/datasets.ts`
- `lib/api/jobs.ts`
- `lib/annotation/*`
- `components/annotate/AnnotationEditor.tsx`
- `app/datasets/[id]/DatasetDetailClient.tsx`
- `app/datasets/[id]/annotate/[imageId]/AnnotatePageClient.tsx`
- `app/datasets/[id]/annotate/cvat/page.tsx`

They intentionally mirror the style of `cvat/ARCHITECTURE_DIAGRAMS.md`, but describe the VisioX Next.js app as the frontend workspace layered over the VisioX Django API and optional CVAT annotation surfaces.

You can render these blocks directly in GitHub Markdown or in Mermaid Live.

## 1. Architecture Diagram

```mermaid
flowchart LR
    User[Workspace user / Visitor]

    subgraph Browser[Browser]
        Next["Next.js 16 App Router<br/>React 19"]
        AuthProvider[AuthProvider]
        LayoutShell[LayoutShell]
        Marketing["Marketing routes<br/>home, products, solutions, about"]
        Platform["Platform routes<br/>overview, projects, teams, datasets, train, deploy"]
        Annotate["Annotation workspace<br/>native Konva editor"]
        CvatEmbed["CVAT iframe route<br/>/datasets/{id}/annotate/cvat"]
    end

    subgraph ClientLayers[Client Libraries]
        ApiClient["lib/api.ts<br/>JWT fetch wrapper"]
        ModularApi["lib/api/*<br/>jobs, datasets, classes, labels"]
        AnnotationCore["lib/annotation<br/>runtime, geometry, labels, mappers"]
        Mocks["lib/mocks<br/>demo fallback data"]
    end

    subgraph UIComponents[UI Components]
        Shell["Header, Footer,<br/>Sidebar, TopBar"]
        DataGrid["ImageGrid<br/>dataset browser"]
        Editor["AnnotationEditor<br/>Konva + react-konva"]
        Shared["Badge, BlueprintGrid,<br/>Solution templates"]
    end

    subgraph External[External Backends]
        VisioXAPI["VisioX Django API<br/>NEXT_PUBLIC_API_URL"]
        CVAT["CVAT web app<br/>NEXT_PUBLIC_CVAT_URL"]
    end

    User --> Next
    Next --> AuthProvider
    Next --> LayoutShell
    LayoutShell --> Marketing
    LayoutShell --> Platform
    LayoutShell --> Annotate
    LayoutShell --> CvatEmbed

    Marketing --> Shared
    Platform --> Shell
    Platform --> DataGrid
    Annotate --> Editor
    Annotate --> AnnotationCore
    CvatEmbed --> CVAT

    AuthProvider --> ApiClient
    Platform --> ApiClient
    Annotate --> ModularApi
    ApiClient --> VisioXAPI
    ModularApi --> VisioXAPI
    DataGrid --> Mocks
```

## 2. Data Flow Diagram

```mermaid
flowchart TD
    User[User]
    UI[Next.js browser UI]
    Auth[AuthProvider and token storage]
    API[VisioX Django API]
    CVAT[CVAT iframe / frame source]

    P1[Process: login, refresh, logout]
    P2[Process: workspace shell and route gating]
    P3[Process: project and dataset browsing]
    P4[Process: upload, delete, version, sync]
    P5[Process: data browser and frame overlay rendering]
    P6[Process: native annotation editor]
    P7[Process: CVAT annotation handoff]
    P8[Process: training and deployment dashboards]

    D1[(localStorage JWT and user)]
    D2[(React component state)]
    D3[(Mock demo data)]

    User --> UI
    UI --> P1
    P1 --> API
    P1 --> D1
    D1 --> Auth

    UI --> P2
    Auth --> P2
    P2 -->|platform route guard| UI

    UI --> P3
    P3 --> API
    P3 --> D2
    D3 --> P3

    UI --> P4
    P4 -->|FormData and JSON requests| API
    P4 --> D2

    UI --> P5
    P5 -->|GET /api/datasets/{id}/browser/| API
    P5 -->|GET /api/datasets/{id}/frames/{frame}/?token=...| API
    P5 --> D2

    UI --> P6
    P6 -->|GET/PATCH /api/jobs/{id}/annotations/| API
    P6 -->|GET/PUT media or frame annotations| API
    P6 --> D2

    UI --> P7
    P7 -->|GET /api/datasets/{id}/annotate_url/| API
    P7 -->|iframe navigation| CVAT

    UI --> P8
    P8 -->|training jobs, experiments, endpoints, registry| API
```

## 3. Frontend Component Diagram

```mermaid
flowchart LR
    subgraph AppRouter[app/ routes]
        Root["layout.tsx<br/>AuthProvider + LayoutShell"]
        Home["/"]
        Marketing["/products/*<br/>/solutions/*<br/>/about/*"]
        Login["/login"]
        Overview["/overview"]
        Projects["/projects and /projects/{id}"]
        Datasets["/datasets and /datasets/{id}"]
        AnnotateNative["/datasets/{id}/annotate/{imageId}"]
        AnnotateCVAT["/datasets/{id}/annotate/cvat"]
        Train["/train"]
        Deploy["/deploy"]
    end

    subgraph Shell[Chrome and Shared UI]
        LayoutShell[LayoutShell]
        Header[Header]
        Footer[Footer]
        Sidebar[Sidebar]
        TopBar[TopBar]
        Badge[Badge]
        BlueprintGrid[BlueprintGrid]
        SolutionTemplate[SolutionPageTemplate]
    end

    subgraph DataUI[Data and Annotation UI]
        DatasetClient[DatasetDetailClient]
        DatasetsPage[DatasetsPageClient]
        ImageGrid[ImageGrid]
        AnnotateClient[AnnotatePageClient]
        Editor[AnnotationEditor]
        VersionPanel[GenerateVersionSlideover]
    end

    Root --> LayoutShell
    LayoutShell --> Header
    LayoutShell --> Footer
    LayoutShell --> Sidebar
    LayoutShell --> TopBar

    Home --> Badge
    Marketing --> SolutionTemplate
    Overview --> BlueprintGrid
    Projects --> BlueprintGrid
    Datasets --> DatasetsPage
    Datasets --> DatasetClient
    DatasetClient --> ImageGrid
    DatasetClient --> VersionPanel
    AnnotateNative --> AnnotateClient
    AnnotateClient --> Editor
    AnnotateCVAT --> LayoutShell
    Train --> BlueprintGrid
    Deploy --> BlueprintGrid
```

## 4. Client/API Layer Diagram

```mermaid
flowchart LR
    subgraph Runtime[Browser Runtime]
        LocalStorage[(localStorage)]
        Fetch[fetch]
        Router[Next navigation]
    end

    subgraph APIClient[API Client Layer]
        Base["lib/api.ts<br/>request, refresh, typed resources"]
        ApiFetch["lib/api/client.ts<br/>shared modular fetch"]
        DatasetApi["lib/api/datasets.ts"]
        JobsApi["lib/api/jobs.ts"]
        ClassesApi["lib/api/classes.ts"]
        LabelsApi["lib/api/labelProfile.ts"]
    end

    subgraph Backend[VisioX Backend]
        AuthAPI[/api/auth/*/]
        ProjectAPI[/api/projects/]
        DatasetAPI[/api/datasets/*/]
        AnnotationAPI[/api/jobs, media, frames, classes/]
        TrainingAPI[/api/training-jobs, experiments/]
        DeployAPI[/api/registry, endpoints/]
    end

    LocalStorage --> Base
    Base -->|Bearer access token| Fetch
    Base -->|401 token refresh| AuthAPI
    Base --> Router

    ApiFetch --> Fetch
    DatasetApi --> ApiFetch
    JobsApi --> ApiFetch
    ClassesApi --> ApiFetch
    LabelsApi --> ApiFetch

    Fetch --> AuthAPI
    Fetch --> ProjectAPI
    Fetch --> DatasetAPI
    Fetch --> AnnotationAPI
    Fetch --> TrainingAPI
    Fetch --> DeployAPI
```

## 5. Annotation Flow Diagram

```mermaid
sequenceDiagram
    participant User as User
    participant Page as AnnotatePageClient
    participant Editor as AnnotationEditor
    participant Core as annotation
    participant API as VisioX API
    participant CVAT as CVAT

    User->>Page: Open /datasets/{id}/annotate/{imageId}
    Page->>API: Load labels and existing annotations
    Page->>API: Build frame or media image URL
    Page->>Editor: Render image, boxes, polygons, labels
    User->>Editor: Draw, select, drag, resize
    Editor->>Core: Normalize geometry and payload mapping
    Page->>API: Save annotations by job, media, or frame
    API-->>Page: Persisted annotations

    User->>Page: Open CVAT annotation route
    Page->>API: Request dataset annotate URL
    API->>CVAT: Resolve linked task / SSO-style next path
    Page->>CVAT: Render iframe for CVAT task
```

## 6. Route Shell Diagram

```mermaid
flowchart TB
    Path[Current pathname]
    Bare{Login or register?}
    Annotate{Dataset annotation route?}
    Platform{Platform workspace route?}
    Marketing[Marketing shell]
    BareShell[No app chrome]
    AnnotateShell[Full-screen light annotation shell]
    PlatformShell[Sidebar + TopBar]
    PublicShell[Header + Footer]

    Path --> Bare
    Bare -->|yes| BareShell
    Bare -->|no| Annotate
    Annotate -->|yes| AnnotateShell
    Annotate -->|no| Platform
    Platform -->|yes| PlatformShell
    Platform -->|no| Marketing
    Marketing --> PublicShell
```

## Notes

- `LayoutShell` is the route-level composition point. Marketing pages get `Header` and `Footer`, platform pages get `Sidebar` and `TopBar`, auth pages get no chrome, and annotation routes get a full-screen workspace without the platform shell.
- `lib/api.ts` is the main typed client and owns JWT storage, refresh-on-401, and browser-host URL normalization. `lib/api/*` contains smaller annotation-focused helpers used by the editor.
- `lib/annotation` is the unified annotation module. It now holds shared types, geometry helpers, object state, history, session management, and API mappers in one place.
- Native annotation is implemented in VisioX with `konva` and `react-konva`; CVAT remains available as an embedded task workflow through the dataset CVAT route.
- Static export is configured through `next.config.mjs`, so dynamic App Router pages use static params/client wrappers where needed.
