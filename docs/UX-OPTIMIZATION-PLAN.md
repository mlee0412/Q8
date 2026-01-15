# Q8 Web UI/UX Optimization Plan

This document defines the design spec and rollout plan to elevate the `apps/web`
experience while preserving all existing functionality and flows.

## Goals

- Balance “glass/neon cyber” identity with a calm productivity suite baseline.
- Increase readability, scannability, and confidence across dashboard, chat, settings.
- Keep all feature flows intact (chat, voice, command palette, widgets, settings).
- Improve accessibility, interaction polish, and performance without regressions.

## Principles

- Glass is a surface, not the content itself.
- Neon is an accent, not a background.
- Fewer, clearer UI states beat richer but noisier visuals.
- Motion should explain state changes and not distract.

## Design Spec (Tokens)

### Typography

- Scale: `xs` 12, `sm` 13, `base` 14, `lg` 16, `xl` 18, `2xl` 22.
- Weights: `400` body, `500` labels, `600` headings.
- Rules: headings only for primary widget title and chat section headers.

### Spacing

- Base: 4px scale (4/8/12/16/20/24/32/40/48).
- Widget padding: 16px content, 12px header.
- Grid gap: 16px on desktop, 12px on tablet, 8px on mobile.

### Radius

- `--radius-sm: 8px`
- `--radius-md: 12px`
- `--radius-lg: 16px`
- `--radius-xl: 24px`

### Surfaces

- `--surface-1`: app background, low contrast.
- `--surface-2`: widget/content containers, calm matte.
- `--surface-3`: glass highlight, used sparingly.
- `--surface-4`: hover/active overlays.

### Borders & Elevation

- `--border-subtle`: thin, low-contrast stroke.
- `--border-strong`: used for active/selected states.
- `--shadow-1/2/3`: consistent elevation tiers for overlays and modals.

### Colors

- `--accent-primary`: neon purple (existing).
- `--accent-secondary`: neon green (existing).
- `--text-primary`: high contrast.
- `--text-secondary`: medium contrast.
- `--text-muted`: low contrast (avoid below 4.5:1).
- State colors: `--success`, `--warning`, `--danger`, `--info`.

### Focus & Selection

- `--focus-ring`: 2px, accent-primary with 40–60% opacity.
- Selected rows/items: subtle background + border-strong.

## UI Primitives (Standardize)

- `Button`: solid, ghost, subtle, and neon-accent.
- `Input/Textarea`: solid matte with clear focus ring.
- `Card/Panel`: calm matte for content, glass only for accents.
- `Badge/Pill`: label-only, muted background, accent for status.
- `Tabs`: underline style + subtle selected background.
- `Tooltip`: small radius, 80–90% opacity.

## Layout Standards

- Widget headers: icon 16px, title 14px semibold, actions aligned right.
- Cards: 16px padding, 12px header height.
- Empty states: icon + title + 1-line guidance + 1 CTA.
- Loading states: single skeleton style to avoid inconsistency.

## Dashboard Optimization (Priority 1)

### Layout & Hierarchy

- Emphasize primary widgets (Weather, Content Hub, Chat) with spacing and size.
- Reduce visual noise in small widgets by lowering neon density.
- Increase whitespace and align all widget headers.

### Widget Chrome Consistency

- Consolidate all widget wrappers into `WidgetWrapper`.
- Use surface tokens instead of inline glass classes.
- Apply a single typography rule for titles and body text.

### Widget Content Pass

- Reduce overuse of glass panels inside widgets.
- Standardize list rows and card items.
- Normalize loading and error UX for all widgets.

## Chat Optimization (Priority 2)

- Improve readability: larger body text, better line-height.
- Message grouping: tighter same-speaker grouping with subtle dividers.
- Agent state: clear badge + short inline status.
- Empty state: intent-based quick actions (Weather, Notes, Home, Focus).
- Actions: compact, consistent icon buttons with labels on hover.

## Settings Optimization (Priority 3)

- Group by domain (Profile, Sync, Agents, Privacy, Appearance).
- Use consistent toggle/row pattern with clear descriptions.
- Reduce neon usage to toggles and primary buttons only.
- Introduce “dirty” state when changes are unsaved.

## Accessibility Pass

- Ensure focus states on all buttons and inputs.
- Confirm text contrast for glass + muted text.
- Expand hit areas to 40x40 on icon buttons.
- Ensure keyboard navigation in command palette and chat.

## Performance Pass

- Reduce `use client` where possible by splitting static shells.
- Throttle or reduce continuous animation.
- Lazy-load heavy widgets when off-screen.

## QA & Safeguards

- Visual QA checklist for each surface.
- Regression checklist for voice, chat, command palette, settings.
- Required quality gates:
  - `pnpm turbo typecheck`
  - `pnpm turbo build --filter=@q8/web`
  - `pnpm test -- run`
  - `pnpm playwright test --project=chromium`

## Rollout Sequence

1. Add tokens + update globals and tailwind extensions.
2. Refactor `WidgetWrapper` and shared UI primitives.
3. Apply dashboard changes across widgets.
4. Update chat layout and message rendering.
5. Refresh settings layout and toggles.
6. A11y + performance passes.
7. QA + regression checks.

## File Touchpoints (Expected)

- `apps/web/src/app/globals.css`
- `apps/web/tailwind.config.ts`
- `apps/web/src/components/ui/*`
- `apps/web/src/components/dashboard/widgets/*`
- `apps/web/src/components/chat/*`
- `apps/web/src/components/settings/*`
- `apps/web/src/components/shared/*`

## Non-Goals

- No change to backend APIs or data architecture.
- No feature removal or flow changes.
- No new dependencies unless strictly required.
