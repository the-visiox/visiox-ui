# Visiox Constitution

## Core Principles

### I. Component-First Architecture
UI elements must be built as modular, reusable components. This ensures that the platform remains scalable and consistent as new computer vision tools are added.

### II. Strict Type Safety
Strict TypeScript usage is mandatory across the entire codebase. Every data structure, image metadata object, and API response must be explicitly typed to ensure long-term maintainability.

### III. Data-Centric Design
Visiox is a data-heavy platform. Architectural decisions must prioritize efficient handling of large image datasets, high-speed rendering of annotations, and streamlined data throughput.

### IV. Red-Green-Refactor (TDD)
Test-Driven Development is the standard. Features must be defined by tests first to ensure that new vision tools do not break existing functionality.

### V. Performance for Vision
Image processing and canvas-based annotation tools must be optimized for framerate and latency. Any UI blockage during image heavy operations is unacceptable.

### VI. Backend Integration Readiness
Hard-coding API URLs or scattering ad-hoc `fetch` calls across UI components is prohibited. Use **`lib/api.ts`** as the primary JWT-aware client (`API_BASE_URL` from `NEXT_PUBLIC_API_URL`); feature-specific helpers may live under **`lib/api/`** (e.g. jobs, datasets) but must use the same base URL and auth patterns. Demo fallbacks belong in page-level or hook logic, not inlined magic URLs in presentational components.

## Technology Guidelines
- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 4 + Framer Motion
- **Canvas**: Konva / react-konva for annotation (`AnnotationEditor`)
- **State Management**: Suited for nested dataset / label / shape models
- **API Strategy**: Visiox Django REST API; env-driven base URL; OpenAPI at `/api/docs/` on the backend

## Governance
This constitution is the source of truth for all architectural decisions. Any significant deviation must be documented and justified in a new RFC (Request for Comments).

**Version**: 1.2.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-04-12
