# VisioX UI Design System & Rules Guide

This document establishes the design principles, color system, typography hierarchy, component specifications, and accessibility rules for the VisioX frontend. All new features and UI refactors must follow these rules to maintain a modern, uniform, and premium user experience.

---

## 1. Core Design Principles

1. **Clean, High-Contrast Workspaces**:
   - The workspace background is always clean light stone `#fcfaf7` (`bg-[#fcfaf7]`).
   - Cards and interactive surfaces are crisp white (`bg-white`) with subtle, single-layer borders (`border-stone-200/80`).
   - Avoid heavy full-page color gradients or muddy tints on base surfaces.

2. **Purposeful Accent Color**:
   - **VisioX Orange** (`#FF7300` / `orange-500` / `orange-600`) is reserved for primary actions, active navigation states, progress bars, and key status indicators.
   - Do not overuse orange on backgrounds or static text. Keep backgrounds neutral and let orange draw attention to action points.

3. **Consistent Sizing & Radii Geometry**:
   - **Control Radius** (`rounded-xl` / 12px): Buttons, text inputs, dropdowns, badges, and segmented tab triggers.
   - **Card Radius** (`rounded-2xl` / 16px): Content containers, data sections, and workflow step cards.
   - **Modal / Dialog Radius** (`rounded-3xl` / 24px): Floating modals, popovers, slide-overs, and major hub headers.

4. **Clutter-Free Elevations**:
   - Use single subtle shadows (`shadow-xs` or `shadow-sm`) on cards and buttons.
   - Avoid stacking multiple heavy borders, outlines, and harsh colored drop shadows around nested containers.

---

## 2. Color Palette & Token Roles

| Role | Color / Hex | Tailwind Token | Semantic Usage |
|---|---|---|---|
| **Canvas Background** | `#fcfaf7` | `bg-[#fcfaf7]` | Base page & layout background |
| **Card Surface** | `#ffffff` | `bg-white` | Content cards, modals, dropdown menus |
| **Subtle Neutral Surface** | `#f5f5f4` | `bg-stone-50` / `bg-stone-100/60` | Input backgrounds, code blocks, table headers |
| **Primary Accent** | `#FF7300` | `bg-orange-500` / `hover:bg-orange-600` | Primary CTAs, active pills, step markers |
| **Primary Soft Accent** | `#fff7ed` | `bg-orange-50` / `border-orange-200` | Selected list items, active tab highlights |
| **Text Primary** | `#1c1917` | `text-stone-900` | Headings, primary labels, table values |
| **Text Secondary** | `#57534e` | `text-stone-600` | Descriptions, subtitles, form field labels |
| **Text Muted** | `#a8a29e` | `text-stone-400` | Captions, placeholders, timestamps, icons |
| **Border Standard** | `#e7e5e4` | `border-stone-200` | Standard card, input, and separator borders |
| **Border Subtle** | `#f5f5f4` | `border-stone-100` | Inner item dividers, light card borders |
| **Success / Verified** | `#10b981` | `text-emerald-600`, `bg-emerald-50` | Verified status, train-ready, completed jobs |
| **Warning** | `#f59e0b` | `text-amber-600`, `bg-amber-50` | Unsaved draft warnings, quota thresholds |
| **Destructive / Error** | `#ef4444` | `text-red-600`, `bg-red-50` | Deletion dialogs, error banners, failed jobs |
| **Tech / Metric Accent** | `#8b5cf6` | `text-violet-600`, `bg-violet-50` | Model metrics, dataset split charts |

---

## 3. Typography Scale & Hierarchy

| Element | Size & Weight | Tailwind Classes | Application |
|---|---|---|---|
| **Page Title** | 24px–28px, Bold | `text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl` | Page top headers |
| **Section Title** | 16px–18px, Bold | `text-base font-bold text-stone-900 sm:text-lg` | Major card section headers |
| **Card / Modal Title** | 14px–16px, Bold | `text-sm sm:text-base font-bold text-stone-900` | Modal headers, subcards |
| **Body & Form Labels** | 13px–14px, Semibold | `text-sm font-semibold text-stone-700` | Input labels, action text |
| **Secondary Descriptions**| 12px–13px, Regular | `text-xs leading-relaxed text-stone-500` | Help text, subtitles |
| **Badges & Meta Pills** | 10px–11px, Bold | `text-[11px] font-bold uppercase tracking-wider` | Status badges, format tags |

---

## 4. Component Design Patterns

### 1. Buttons
```tsx
// Primary CTA Button
<button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50">
  <Sparkles className="h-4 w-4" />
  Primary Action
</button>

// Secondary / Outline Button
<button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 shadow-xs transition-all hover:bg-stone-50 hover:text-stone-900 active:scale-[0.98]">
  Secondary Action
</button>

// Ghost / Icon Button
<button className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900">
  <Search className="h-4 w-4" />
</button>
```

### 2. Form Inputs & Selects
```tsx
<input
  type="text"
  className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
  placeholder="Search or enter text…"
/>
```

### 3. Content Cards & Workflow Steps
```tsx
<div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs transition-all hover:border-stone-300">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-base font-bold text-stone-900">Section Title</h3>
    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 border border-orange-200/60">
      Active
    </span>
  </div>
  <p className="text-xs text-stone-500 leading-relaxed">
    Detailed content and descriptions go here.
  </p>
</div>
```

---

## 5. Layout & Navigation Standard

- **Platform Shell**:
  - Sidebar width: 260px (`w-64` / `w-[260px]`), fixed on left.
  - Sidebar background: `bg-[#faf8f5]/95 backdrop-blur-md` with `border-r border-stone-200/80`.
  - Sidebar nav items: `h-10 px-3 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900`. Active state: `bg-orange-50/80 text-orange-700 font-semibold border border-orange-200/60`.
  - Main container offset: `md:ml-[260px]` with `min-h-screen bg-[#fcfaf7]`.
- **TopBar**:
  - Height: `h-14` / `h-16`, sticky top, `bg-[#fcfaf7]/85 backdrop-blur-md border-b border-stone-200/80`.

---

## 6. Accessibility & Motion Guidelines

- **Focus Visibility**: Every interactive control must have an accessible focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-500`.
- **Micro-Animations**: Use subtle transitions (`duration-150 ease-out`). Avoid aggressive scaling or jumpy transforms on hover.
- **Form Controls**: Always include semantic labels, `aria-describedby`, and accessible `aria-expanded` attributes for accordions and popovers.
