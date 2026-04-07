# [PROJECT NAME] Development Guidelines

Auto-generated from all feature plans. Last updated: [DATE]

## Active Technologies

[EXTRACTED FROM ALL PLAN.MD FILES]

## Project Structure

```text
[ACTUAL STRUCTURE FROM PLANS]
```

## Commands

[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]

## Code Style
- **Component-First**: Use modular components for UI.
- **Strict Typing**: TypeScript interfaces are required for all data models.
- **No Hard-coding**: Never hard-code API URLs or static data arrays in components.

## Backend Integration Rules
- **Centralized Logic**: Move all data fetching to `lib/api.ts` or module-specific API files.
- **Mocks**: Store mock data in `lib/mocks/` to keep components clean.
- **Env Vars**: Use `process.env.NEXT_PUBLIC_API_URL` for backend endpoints.
- **Dynamic Assets**: Always use `assetPath()` for assets in `public/`.

## Recent Changes

[LAST 3 FEATURES AND WHAT THEY ADDED]

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
