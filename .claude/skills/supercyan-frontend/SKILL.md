---
name: supercyan-frontend
description: Use this skill when building any React component or UI feature for the SuperCyan web app (/web). Contains the exact OLED color palette, GlassCard usage, inline Tailwind hex patterns, section header conventions, button styles, and component structure. Any agent touching the frontend MUST use this skill to avoid introducing off-palette colours or inconsistent styling. Trigger on: "build a component", "add a section", "update the UI", "style", "add a view", anything involving web/src/components.
---

# SuperCyan Frontend Conventions

The web app is a React + Vite app with an OLED-first dark theme. All styling is done with **inline Tailwind utility classes using explicit hex values** — no separate CSS files for components, no CSS variables in component files. The theme system in `theme.css` is only used for global resets; component colours are all hard-coded from the palette below.

---

## Colour Palette

Always use these exact values — nothing else.

| Token | Hex | Use |
|-------|-----|-----|
| Cyan accent | `#00FFFF` | Primary accent, borders, headers, active states |
| Cyan dark | `#0099CC` | Gradient start, secondary accent |
| Primary text | `#DAE2FD` | Body text, titles |
| Muted text | `#BBC9CD` | Metadata, labels, inactive states |
| Card background | `#1A1A1A` | Surface cards, list items |
| Card dark | `#0D0D12` | Deeper card layer |
| Page background | `#080808` | Page/view background |
| Near-black | `#0D0D0D` | Input backgrounds, deepest layer |
| Separator | `#2A2A2A` | Borders, dividers |

**Urgency colours (task feature):**

| Level | Border / Badge | Background tint |
|-------|---------------|-----------------|
| High | `#FF4444` | `rgba(255,68,68,0.12)` |
| Medium | `#D97706` | `rgba(217,119,6,0.12)` |
| Low | `#4499DD` | `rgba(68,153,221,0.12)` |
| Overdue (always) | `#F59E0B` | `rgba(245,158,11,0.15)` |

---

## GlassCard

Import from `@/components/common/GlassCard` (or the path used in the file you're editing — check existing imports). Use it as the top-level wrapper for any card or panel section.

```tsx
<GlassCard className="p-6">
  {/* content */}
</GlassCard>
```

It provides the frosted-glass background and rounded corners. Do not replicate its styles manually.

---

## Section Headers

Every major section uses this pattern — a title with a cyan gradient underline:

```tsx
<div>
  <h2 className="text-xl font-bold" style={{ color: '#DAE2FD' }}>Section Title</h2>
  <div style={{ width: '60px', height: '2px', background: 'linear-gradient(to right, #00FFFF, transparent)', marginTop: '6px' }} />
</div>
```

---

## Stat Pills (compact metadata row)

Used for counts and percentages in header rows:

```tsx
<div className="flex gap-2">
  <div className="px-3 py-1 rounded-full text-xs" style={{ background: '#1A1A1A', color: '#BBC9CD' }}>
    5 tasks
  </div>
  <div className="px-3 py-1 rounded-full text-xs" style={{ background: '#1A1A1A', color: '#00FFFF' }}>
    2 done
  </div>
</div>
```

---

## Buttons

**Primary action (cyan gradient):**
```tsx
<button
  className="w-full py-2.5 rounded-xl font-bold text-sm"
  style={{ background: 'linear-gradient(135deg, #0099CC, #00FFFF)', color: '#000' }}
>
  Save
</button>
```

**Secondary / ghost:**
```tsx
<button
  className="px-3 py-1.5 rounded-lg text-xs"
  style={{ background: '#0D0D0D', border: '1px solid #333', color: '#BBC9CD' }}
>
  Cancel
</button>
```

**Destructive:**
```tsx
<button
  className="px-4 py-2 rounded-xl font-semibold text-sm"
  style={{ background: 'rgba(255,68,68,0.15)', border: '1px solid rgba(255,68,68,0.4)', color: '#FF4444' }}
>
  Delete
</button>
```

---

## Inputs

```tsx
<input
  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
  style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#DAE2FD' }}
  placeholder="Type here..."
/>
```

Focus ring: add `focus:border-[#00FFFF]` or handle with `onFocus`/`onBlur` state.

---

## List / Card Items

Standard list item (e.g. task card, email row):

```tsx
<div
  className="flex items-center gap-3 px-4 py-3 rounded-xl"
  style={{ background: '#1A1A1A', borderLeft: '3px solid #00FFFF' }}
>
  {/* left border colour changes per urgency/state */}
</div>
```

Completed / dimmed variant:
```tsx
style={{ background: '#0F0F0F', opacity: 0.5, borderLeft: '3px solid #333' }}
```

---

## Progress Bar

```tsx
<div className="h-1 rounded-full overflow-hidden" style={{ background: '#1A1A1A' }}>
  <div
    className="h-full rounded-full transition-all duration-500"
    style={{ width: `${pct}%`, background: 'linear-gradient(to right, #0099CC, #00FFFF)' }}
  />
</div>
```

---

## Component File Structure

New view components live in `web/src/components/cyan/`. New sub-components (reusable pieces used by one view) live alongside their parent or in `web/src/components/common/` if shared.

Each new file:
- Named `PascalCase.tsx`
- Exports a single default component
- Imports styles inline — no companion `.css` file
- Uses the palette above — no new colours

---

## Dos and Don'ts

**Do:**
- Use inline `style={{}}` for colours — Tailwind's JIT won't pick up arbitrary hex values reliably
- Keep components under ~300 lines; split if growing larger
- Use `GlassCard` for panels, not bare `div` with manual background
- Match existing icon library (check what's imported in nearby files — usually `lucide-react`)

**Don't:**
- Introduce new hex values not in the palette above
- Create companion `.css` files for new components
- Use Tailwind colour names (e.g. `bg-gray-800`) — always use explicit hex
- Add `className` for colours — use `style={{}}` for the palette
