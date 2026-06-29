---
name: visiox-frontend-agent
description: Build, modify, and review VisioX React/Next.js frontend UI while preserving its light workspace design system, responsive behavior, interaction state, accessibility, and Django REST integration. Use for VisioX pages, components, Tailwind styling, dataset/training workflows, annotation UI, sliders, accordions, forms, API-connected states, and frontend refactors.
---

# VisioX Frontend Engineering

## Workflow

1. Inspect the target component, nearby components, `lib/api.ts`, and existing types before editing.
2. Reuse established component and state patterns. Do not add a second visual representation of the same state.
3. Preserve server/client boundaries: keep `generateStaticParams()` in server `page.tsx` files and interactive code in `*Client.tsx`.
4. Implement the complete interaction, including loading, empty, disabled, error, saved, dirty, and completed states.
5. Validate the edited file with ESLint. Run `pnpm build` for structural, routing, or TypeScript-sensitive changes.

## Stack and integration

- Use Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Framer Motion, and Lucide icons.
- Use `lib/api.ts` as the primary typed API client. Keep endpoints under `/api/v1/` and preserve JWT refresh and LAN hostname behavior.
- Use `NEXT_PUBLIC_API_URL` without a trailing slash.
- Use Konva/react-konva only in annotation canvas code; keep annotation business logic in `lib/annotation/`.
- Do not add Redux or Zustand for local page workflows; prefer focused React state or extracted hooks.
- Do not import platform chrome into pages. `LayoutShell` owns Sidebar, TopBar, Header, and Footer selection.

## Visual system

- Use light workspace backgrounds: `#fcfaf7`, `stone-50`, and white cards.
- Use stone text and borders; reserve orange (`#FF7300` family) for the primary action/current state.
- Use emerald for completed/success, amber for warning, red for destructive/error, and violet sparingly for dataset split or model accents.
- Prefer `rounded-xl` for controls and inner options; use `rounded-2xl` or `rounded-3xl` for outer cards.
- Use one subtle outer shadow. Avoid stacking shadows and borders around every nested container.
- Use Lucide icons only. Standard control icons are `h-4 w-4`; section icons/markers are `h-5 w-5` or a `h-10 w-10` container.

## Spacing, type, and controls

Use these defaults unless the surrounding UI establishes a stronger pattern:

- Outer workflow cards: `rounded-2xl border border-stone-200 bg-white shadow-sm`.
- Expanded card body: `border-t border-stone-200 p-5`.
- Card groups: `space-y-4` or `gap-4`; never rely on `space-y-*` through a `display: contents` wrapper.
- Accordion header: `min-h-[4.5rem] w-full items-center gap-3 p-5`.
- Reuse one shared accordion-trigger class for sibling cards; do not mix a full-width header trigger with a separate square Chevron button.
- Section heading: `text-base font-bold text-stone-900`.
- Option heading: `text-sm font-bold`; descriptions: `text-xs leading-relaxed text-stone-400/500`.
- Standard buttons/selects: `h-10 rounded-xl px-4 text-sm font-bold`.
- Primary buttons: orange background, white text, color transition. Avoid scale animation on frequently clicked or drag-adjacent controls.
- Keep sibling cards, buttons, icons, and labels the same height, padding, radius, and font size.

## Workflow and accordion state

- Give each workflow step exactly one outer card. Put its header and expanded body inside that border.
- Show the current step as a numbered orange marker; show preceding steps as emerald checks; show future steps as neutral numbers.
- When navigating forward, mark preceding optional steps complete without requiring an option selection.
- Keep optional steps independently selectable unless product requirements explicitly require sequential locking.
- Separate persisted state from draft state. For example, distinguish `isConfigured` from `isSaved`/`hasUnsavedChanges`; do not collapse or recolor the whole workflow on every draft edit.
- Disable irreversible or backend actions when the draft is unsaved, but keep configuration sections stable to prevent layout jumps.
- Collapsed headers remain usable and communicate status without duplicating a separate stepper card.
- Put the Chevron inside the full header trigger. Keep Verify, Reset, Edit, or Delete as sibling buttons in the same header row so interactive elements are never nested.

## Sliders and pointer interactions

- Use pointer capture for custom range handles and support ArrowLeft/ArrowRight keyboard control.
- Preserve the pointer-to-handle offset on pointer down; do not snap the handle center to the cursor.
- Clear drag state on pointer up, cancel, and lost capture.
- Skip state updates when the computed value did not change.
- Avoid hover scaling or transform transitions on draggable handles; they cause flicker.
- Keep handles inside the visual track at 0% and 100%, and use tabular numbers for changing percentages/counts.

## Responsive and accessible behavior

- Start with mobile-safe layouts, then add `sm`, `md`, and `xl` grid enhancements.
- Let action rows wrap; do not force controls beyond their container.
- Provide `type="button"`, disabled states, focus-visible rings, `aria-expanded` for accordions, `aria-checked` for switches, and slider ARIA values.
- Do not nest interactive elements. If an accordion header also has Reset/Edit actions, use sibling buttons inside a shared header row.
- Preserve readable labels; do not depend on color alone for state.

## Performance

- Avoid duplicate fetches and derived state that can be computed locally.
- Memoize callbacks only when they stabilize effects or expensive children.
- Lazy-load gallery images and prefetch only a small useful set of annotation routes.
- Keep animation subtle: short fade/translate entrances and lightweight color transitions.

## Validation

Run the narrowest useful checks first:

```powershell
pnpm exec eslint "app/path/Component.tsx"
pnpm build
```

Treat existing unrelated lint warnings separately; do not introduce new errors or warnings in edited files.
