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
Hard-coding of API URLs, static mock data arrays, or external source links directly within components is strictly prohibited. All data-fetching logic must be centralized in `lib/api.ts` or similar utilities, utilizing environment variables for configuration. This ensures that the frontend remains decoupled and easily integrable with a separate backend repository.

## Technology Guidelines
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4 + Framer Motion for smooth transitions
- **State Management**: Optimized for complex nested objects (datasets/labels)
- **API Strategy**: Centralized, modular fetchers using environment variables (e.g., `NEXT_PUBLIC_API_URL`) to support seamless integration with external AI inference and data services.

## Governance
This constitution is the source of truth for all architectural decisions. Any significant deviation must be documented and justified in a new RFC (Request for Comments).

**Version**: 1.1.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-04-01
