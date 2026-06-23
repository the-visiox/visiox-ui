# VisioX UI — Architecture Diagrams

Derived from the current `visiox-ui` repository (Next.js 16, React 19, App Router).

Source files referenced:
- `package.json`, `next.config.mjs`, `tsconfig.json`
- `app/layout.tsx`, `components/LayoutShell.tsx`
- `lib/auth.tsx`, `lib/api.ts`, `lib/api/client.ts`
- `lib/api/{datasets,jobs,classes,labelProfile}.ts`
- `lib/annotation/{types,geometry,labels,mappers,session,object-state,annotations-collection,annotations-history}.ts`
- `components/annotate/AnnotationEditor.tsx`
- `app/datasets/[id]/DatasetDetailClient.tsx`
- `app/datasets/[id]/annotate/[imageId]/AnnotatePageClient.tsx`


Render these blocks in GitHub Markdown or [Mermaid Live](https://mermaid.live).

---

## 1. System Architecture

High-level view of the platform and how the Next.js frontend fits in.

```mermaid
flowchart LR
    User[Workspace user / Visitor]

    subgraph Browser[Browser — visiox-ui]
        direction TB
        Next["Next.js 16 App Router\nReact 19 + TypeScript 5"]
        AuthProvider["AuthProvider\n(React Context)"]
        LayoutShell["LayoutShell\n(route-level chrome router)"]

        subgraph Routes[Route Groups]
            Marketing["Marketing\n/products/* /solutions/* /about/*"]
            Platform["Platform workspace\n/overview /projects /datasets\n/teams /train /deploy /workflows /dataverse"]
            Annotate["Annotation workspace\n/datasets/{id}/annotate/{imageId}"]
            Auth["Auth\n/login /register /auth/callback"]
        end

        subgraph Libs[Client Libraries]
            ApiClient["lib/api.ts\nJWT fetch wrapper + token refresh"]
            ModularApi["lib/api/*\njobs · datasets · classes · labelProfile"]
            AnnotationLib["lib/annotation/*\ntypes · geometry · labels · mappers\nsession · collection · history"]
        end
    end

    subgraph Backends[External Backends]
        VisioXAPI["VisioX Django API\nNEXT_PUBLIC_API_URL\n(default :8000)"]
    end

    User --> Next
    Next --> AuthProvider
    Next --> LayoutShell
    LayoutShell --> Routes

    Platform --> ApiClient
    Annotate --> ModularApi
    Annotate --> AnnotationLib
    AuthProvider --> ApiClient

    ApiClient --> VisioXAPI
    ModularApi --> VisioXAPI
```

---

## 2. Route Structure & Shell Logic

```mermaid
flowchart TB
    Path["Current pathname"]

    Bare{"login · register\nauth/callback?"}
    IsAnnotate{"annotate/{imageId}?"}
    IsPlatform{"overview · projects · datasets\nteams · train · deploy\nworkflows · dataverse · home?"}

    BareShell["No chrome\n(bare page)"]
    AnnotateShell["Full-screen annotation shell\n(light header only)"]
    PlatformShell["Sidebar + TopBar\n(workspace shell)"]
    PublicShell["Header + Footer\n(marketing shell)"]

    Path --> Bare
    Bare -->|yes| BareShell
    Bare -->|no| IsAnnotate
    IsAnnotate -->|yes| AnnotateShell
    IsAnnotate -->|no| IsPlatform
    IsPlatform -->|yes| PlatformShell
    IsPlatform -->|no| PublicShell
```

### Route Inventory

| Route Group | Paths | Shell |
|---|---|---|
| **Auth** | `/login` `/register` `/auth/callback` `/invite/[token]` | Bare |
| **Marketing — Landing** | `/` | Header + Footer |
| **Marketing — Products** | `/products` `/products/annotation` `/products/datahub` `/products/deploy` `/products/model-train` `/products/workflows` | Header + Footer |
| **Marketing — Solutions** | `/solutions` `/solutions/healthcare-medical` `/solutions/manufacturing-industrial` `/solutions/robotics-automation` `/solutions/surveillance-security` `/solutions/transportation-smart-cities` `/solutions/logistics-warehousing` `/solutions/retail-commerce` `/solutions/smart-agriculture` `/solutions/entertainment-sports` | Header + Footer |
| **Marketing — About** | `/about` `/about/company` `/about/blog` `/about/contact` | Header + Footer |
| **Platform** | `/home` `/overview` `/projects` `/projects/new` `/projects/[id]` `/datasets/[id]` `/teams` `/teams/new` `/train` `/deploy` `/workflows` `/dataverse` | Sidebar + TopBar |
| **Annotation (native)** | `/datasets/[id]/annotate/[imageId]` | Full-screen annotation shell |

---

## 3. Component Tree

```mermaid
flowchart LR
    subgraph Root["app/layout.tsx"]
        AuthProvider["AuthProvider\n(React Context)"]
        LS["LayoutShell"]
    end

    subgraph Chrome["Chrome — components/"]
        Header["Header.tsx\n(marketing nav)"]
        Footer["Footer.tsx"]
        Sidebar["platform/Sidebar.tsx\n(workspace nav)"]
        TopBar["platform/TopBar.tsx"]
    end

    subgraph Shared["Shared UI — components/"]
        Badge["Badge.tsx"]
        BlueprintGrid["BlueprintGrid.tsx"]
        CardMenu["CardMenu.tsx"]
        SolutionLayout["SolutionLayout.tsx"]
        SolutionTemplate["SolutionPageTemplate.tsx"]
    end

    subgraph DataUI["Data UI — components/"]
        ImageGrid["datasets/ImageGrid.tsx\n(media browser grid)"]
        VersionPanel["versions/GenerateVersionSlideover.tsx"]
    end

    subgraph AnnotateUI["Annotation UI — components/annotate/"]
        Editor["AnnotationEditor.tsx\n(1 189 lines)\nKonva canvas · tools · handles\nzoom · pan · undo/redo · context menu"]
    end

    AuthProvider --> LS
    LS --> Header
    LS --> Footer
    LS --> Sidebar
    LS --> TopBar

    LS -->|marketing routes| Shared
    LS -->|platform routes| BlueprintGrid
    LS -->|datasets route| ImageGrid
    LS -->|datasets route| VersionPanel
    LS -->|annotate route| Editor
```

---

## 4. Client / API Layer

```mermaid
flowchart LR
    subgraph BrowserRuntime["Browser Runtime"]
        LS2[("localStorage\naccess_token\nrefresh_token\nuser")]
        FetchAPI["fetch()"]
    end

    subgraph APIClientLayer["API Client Layer — lib/"]
        Base["api.ts\nrequest() · tryRefresh()\nauth · projects · datasets\nmedia · classes · training_jobs · endpoints"]
        ApiFetch["api/client.ts\napiFetch() shared helper"]
        DSApi["api/datasets.ts\ngetDataset()\ngetDatasetMedia()"]
        JobsApi["api/jobs.ts\ngetJobAnnotations()\npatchJobAnnotations()\npostJobIssue()\ngetMediaAnnotations()\nputMediaAnnotations()"]
        ClassApi["api/classes.ts"]
        LabelApi["api/labelProfile.ts"]
    end

    subgraph BackendAPI["VisioX Django — /api/*"]
        AuthEP["/api/auth/*\nlogin · register · oauth\nlogout · token/refresh"]
        ProjEP["/api/projects/"]
        DSEP["/api/datasets/*\nbrowser · frames · annotate_url"]
        AnnEP["/api/jobs · media\nframes · classes"]
        TrainEP["/api/training-jobs\nexperiments · metrics"]
        DeployEP["/api/registry\nendpoints"]
    end

    LS2 -->|"Bearer token injection"| Base
    Base -->|"401 → refresh"| AuthEP
    Base --> FetchAPI
    FetchAPI --> AuthEP
    FetchAPI --> ProjEP
    FetchAPI --> DSEP
    FetchAPI --> AnnEP
    FetchAPI --> TrainEP
    FetchAPI --> DeployEP

    ApiFetch --> FetchAPI
    DSApi --> ApiFetch
    JobsApi --> ApiFetch
    ClassApi --> ApiFetch
    LabelApi --> ApiFetch
```

---

## 5. Annotation System Architecture

```mermaid
flowchart TB
    subgraph EditorComponent["components/annotate/AnnotationEditor.tsx"]
        Canvas["Konva Stage + Layer"]
        Tools["Tool palette\nselect · rectangle · polygon\npolyline · points · cuboid · tag"]
        Handles["Corner resize handles\nShape selection · deletion"]
        ZoomPan["Zoom (Ctrl+scroll, ±, 1:1, fit)\nPan (scroll wheel)"]
        UndoRedo["Undo Ctrl+Z\nRedo Ctrl+Y"]
        CtxMenu["Context menu\n(right-click)"]
        Shortcuts["Keyboard shortcuts\nn p l k v Esc"]
    end

    subgraph AnnotationLib["lib/annotation/*"]
        Types["types.ts\nTool · ShapeType · EditorShape\nLabelDefinition · TOOL_SHORTCUTS"]
        Geometry["geometry.ts\nbboxFromPoints()\nclamp()"]
        Labels["labels.ts\nbuildLabelMetaMap()\ncolorFor() · labelNameFor()"]
        Mappers["mappers.ts\napiShapesToEditor()\neditorToApiPayload()\nmergeProjectClassesWithProfile()"]
        ObjState["object-state.ts\nshape object state"]
        Collection["annotations-collection.ts\nin-memory shape store"]
        History["annotations-history.ts\nundo/redo stack"]
        Session["session.ts\nAnnotationSession\nhydrate() · export()\nupdate() · undo() · redo()\ncanUndo · canRedo"]
    end

    subgraph APILayer["API (save/load)"]
        JobAnn["GET/PATCH /api/jobs/{id}/annotations/"]
        MediaAnn["GET/PUT /api/media/{id}/annotations/"]
        FrameAnn["GET /api/datasets/{id}/frames/{n}/"]
    end

    Canvas --> Tools
    Canvas --> Handles
    Canvas --> ZoomPan
    Canvas --> UndoRedo
    Canvas --> CtxMenu
    Canvas --> Shortcuts

    EditorComponent --> Session
    Session --> Collection
    Session --> History
    Session --> Mappers
    Mappers --> Types
    Mappers --> Geometry
    Mappers --> Labels
    Collection --> ObjState

    Session -->|"load"| JobAnn
    Session -->|"load"| MediaAnn
    Session -->|"save"| JobAnn
    Session -->|"save"| MediaAnn
    Canvas -->|"image src"| FrameAnn
```

---

## 6. Authentication & Token Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Next.js UI
    participant Auth as AuthProvider
    participant LS as localStorage
    participant API as VisioX API

    User->>UI: Submit login credentials
    UI->>API: POST /api/auth/login/
    API-->>UI: {access, refresh, user}
    UI->>LS: Store access_token, refresh_token, user
    UI->>Auth: Update user state (isLoggedIn = true)

    Note over UI,API: Subsequent authenticated requests
    UI->>API: GET /api/... (Bearer access_token)
    API-->>UI: 401 Unauthorized (token expired)
    UI->>API: POST /api/auth/token/refresh/ (refresh_token)
    API-->>UI: {access}
    UI->>LS: Update access_token
    UI->>API: Retry original request
    API-->>UI: 200 OK + data

    Note over User,LS: OAuth flow (Google / GitHub)
    User->>UI: Click OAuth button
    UI->>API: POST /api/auth/oauth/ {provider, code}
    API-->>UI: {access, refresh, user}
    UI->>LS: Persist tokens
```

---

## 7. Annotation Workflow

```mermaid
sequenceDiagram
    participant User
    participant Page as AnnotatePageClient
    participant Editor as AnnotationEditor
    participant Session as AnnotationSession
    participant Mappers as annotation/mappers
    participant API as VisioX API

    User->>Page: Navigate to /datasets/{id}/annotate/{imageId}
    Page->>API: GET labels, classes, label profiles
    Page->>API: GET /api/jobs/{id}/annotations/ or /api/media/{id}/annotations/
    API-->>Page: Raw annotation rows
    Page->>Mappers: apiShapesToEditor(rows)
    Mappers-->>Page: EditorShape[]
    Page->>Session: hydrate(shapes)
    Page->>Editor: Render image + shapes

    loop Draw / Edit
        User->>Editor: Select tool, draw shape
        Editor->>Session: update(action)
        Session->>History: record snapshot
    end

    User->>Editor: Ctrl+Z (undo)
    Editor->>Session: undo()
    Session->>History: pop snapshot
    Session-->>Editor: previous EditorShape[]

    User->>Page: Click Save
    Page->>Session: export()
    Session->>Mappers: editorToApiPayload(shapes)
    Mappers-->>Page: API payload
    Page->>API: PATCH /api/jobs/{id}/annotations/ or PUT /api/media/{id}/annotations/
    API-->>Page: Saved

```

---

## 8. Data Flow Diagram

```mermaid
flowchart TD
    User[User]

    subgraph UI[Next.js Browser UI]
        P1["Auth: login · refresh · logout"]
        P2["Route guard (LayoutShell)"]
        P3["Project & dataset browsing"]
        P4["Upload · delete · version · sync"]
        P5["Data browser + frame overlay"]
        P6["Native annotation editor"]
        P7["Training & deployment dashboards"]
        P8["Team management & invitations"]
    end

    D1[("localStorage\nJWT + user")]
    D2[("React component state")]

    API["VisioX Django API"]

    User --> UI

    P1 --> API
    P1 --> D1
    D1 --> P2
    P2 -->|"guard platform routes"| UI

    P3 --> API
    P3 --> D2

    P4 -->|"FormData + JSON"| API

    P5 -->|"GET /api/datasets/{id}/browser/"| API
    P5 -->|"GET /api/datasets/{id}/frames/{n}/?token=..."| API

    P6 -->|"GET·PATCH /api/jobs/{id}/annotations/"| API
    P6 -->|"GET·PUT /api/media/{id}/annotations/"| API

    P7 -->|"training-jobs · experiments · metrics\nregistry · endpoints"| API

    P8 -->|"teams · invitations"| API
```

---

## Notes

- **LayoutShell** (`components/LayoutShell.tsx`) is the single composition point for all page chrome. It inspects `pathname` at render time and injects the appropriate shell (bare, annotation, platform, or marketing).
- **`lib/api.ts`** owns JWT storage, auto-refresh-on-401, and LAN hostname normalization (replaces `localhost` with `window.location.hostname` so the browser can reach the API when accessed from another device on the same network).
- **`lib/annotation/`** is the unified annotation runtime. It exposes a clean public API via `index.ts` and keeps all canvas-independent logic (geometry, label utilities, API mapping, session management, undo/redo) separate from the Konva component.
- **Static export**: Dynamic App Router routes use client wrappers and static params. Base path is set dynamically via the `GITHUB_REPOSITORY` environment variable for GitHub Pages deployment.
