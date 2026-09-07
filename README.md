# @shipstack/panel-layout

A headless, drag-and-drop panel layout system for React. Tabs are draggable
between slots, panels are resizable, and the layout template (single /
side-by-side / four-pane, etc.) is user-switchable at runtime. State persists
to `localStorage` automatically.

Zero runtime dependencies beyond React itself.

![panel-layout demo](https://github.com/user-attachments/assets/33ee4166-1790-457f-a8c2-de6f6fc23bae)

## Install

```sh
npm install @shipstack/panel-layout
```

## Quick start

```tsx
import { usePanelLayout, PanelLayout } from "@shipstack/panel-layout";
import "@shipstack/panel-layout/panel-layout.css";

const tabs = [
  { id: "editor", label: "Editor", content: <Editor /> },
  { id: "preview", label: "Preview", content: <Preview /> },
  { id: "console", label: "Console", content: <Console /> },
];

export function App() {
  const handle = usePanelLayout(tabs);
  return <PanelLayout handle={handle} />;
}
```

The toolbar with the layout switcher is optional:

```tsx
import { PanelLayoutToolbar } from "@shipstack/panel-layout";

<PanelLayoutToolbar handle={handle} />
```

## API reference

### `usePanelLayout(tabs, storageKey?)`

- `tabs` — `TabDef[]`, list of tabs (see type below)
- `storageKey` — `string`, localStorage key (default `"panel-layout-v1"`).
  Change this if you use the layout in multiple apps on the same domain.

Returns a `PanelLayoutHandle`.

### `TabDef`

| field        | type        | notes                                              |
| ------------ | ----------- | --------------------------------------------------- |
| `id`         | `string`    |                                                       |
| `label`      | `string`    |                                                       |
| `icon`       | `ReactNode?`| shown in the tab strip before the label              |
| `activeIcon` | `ReactNode?`| shown when the tab is active (falls back to `icon`)  |
| `content`    | `ReactNode` | the panel body                                       |
| `minWidth`   | `number?`   | minimum px width when this tab is active             |
| `minHeight`  | `number?`   | minimum px height when this tab is active            |

### `PanelLayoutHandle` (returned by `usePanelLayout`)

- `state` — `LayoutState`, current layout state
- `tabMap` — `Record<string, TabDef>`
- `setTemplate(t: LayoutTemplate)`
- `setActiveTab(slotId, tabId)`
- `rootRef` — `React.RefObject<HTMLDivElement>`
- ...plus internal resize/drag handlers passed straight to `<PanelLayout>`

### `<PanelLayout handle={handle} className? />`

Renders the full layout. Wrap it in a height-constrained container.

### `<PanelLayoutToolbar handle={handle} className?>`

Renders the `LayoutPicker` button. Pass children to add extra controls.

### `<LayoutPicker current onChange trigger? />`

Standalone layout template switcher. Provide `trigger` to use a custom button:

```tsx
<LayoutPicker
  current={handle.state.template}
  onChange={handle.setTemplate}
  trigger={({ onClick, "aria-expanded": expanded }) => (
    <MyButton onClick={onClick} active={expanded}>Layout</MyButton>
  )}
/>
```

Available layout templates:

- `single` — one panel
- `two-h` — two panels side by side (default)
- `two-v` — two panels stacked
- `three-main-right` — main panel + two stacked on the right
- `three-main-left` — two stacked on the left + main panel
- `three-h` — three equal columns
- `four` — 2×2 grid

## Theming with CSS variables

Override any variable on `.pl-root` (or on `:root` for global scope):

```css
.pl-root {
  --pl-accent: #7c3aed; /* active tab & drop indicator */
  --pl-border: #d1d5db;
  --pl-bg: #f9fafb;
  --pl-tab-strip-bg: #f3f4f6;
  --pl-tab-color: #6b7280;
  --pl-tab-hover-color: #111827;
  --pl-tab-active-color: #7c3aed;
  --pl-tab-active-border: #7c3aed;
  --pl-gutter-size: 12px; /* resizer hit target width/height */
  --pl-gutter-line: #d1d5db;
  --pl-gutter-hover-bg: rgba(0, 0, 0, 0.03);
  --pl-gutter-active-bg: rgba(124, 58, 237, 0.08);
  --pl-gutter-active-line: #7c3aed;
  --pl-drop-target-bg: rgba(124, 58, 237, 0.05);
  --pl-empty-color: #9ca3af;
  --pl-picker-bg: #ffffff;
  --pl-picker-border: #e5e7eb;
  --pl-picker-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  --pl-picker-item-active-bg: rgba(124, 58, 237, 0.08);
  --pl-picker-item-active-border: #7c3aed;
}
```

Dark mode defaults are included in `panel-layout.css` via
`@media (prefers-color-scheme: dark)`. If you use a class-based dark mode
(e.g. Tailwind's `dark` class), add:

```css
.dark .pl-root {
  --pl-border: #262626;
  --pl-bg: #171717;
  /* ... etc */
}
```

## Using with Tailwind (skip the CSS file entirely)

If your project uses Tailwind v3/v4 you can style everything with utility
classes and skip `panel-layout.css` completely.

The CSS classes on each element are just hooks — they carry no built-in
styles if you don't import the CSS file. Apply Tailwind classes via
`className` props or by targeting the `pl-*` selectors in your own
stylesheet.

```tsx
// add a className to the root
<PanelLayout handle={handle} className="rounded-xl border border-zinc-200" />
```

```css
/* globals.css */
.pl-tab-strip { @apply bg-zinc-50 dark:bg-zinc-900; }
.pl-tab { @apply text-zinc-500 hover:text-zinc-800; }
.pl-tab--active { @apply text-blue-600 dark:text-blue-400; }
.pl-gutter { @apply hover:bg-zinc-100/50; }
```

For Tailwind v4 make sure you add the package's source path to your content
config so utility classes inside the package files are included:

```ts
// tailwind.config.ts (v3)
content: ["./node_modules/@shipstack/panel-layout/dist/**/*.js", ...]
```

```css
/* or CSS @source (v4) */
@source "../node_modules/@shipstack/panel-layout/dist";
```

## CSS class reference

```
.pl-root                   outermost wrapper
.pl-root-inner              flex container holding the layout tree
.pl-group                   a row or column group of children
.pl-group--h                horizontal (row) group
.pl-group--v                vertical (column) group
.pl-group-child              wrapper div around each child panel
.pl-group-child--border-h   right border on horizontal group children
.pl-group-child--border-v   bottom border on vertical group children
.pl-gutter                   resizer drag handle
.pl-gutter--h                horizontal (col-resize) gutter
.pl-gutter--v                vertical (row-resize) gutter
.pl-gutter--dragging          applied while a drag is active
.pl-gutter-line               the 1px visual line inside the gutter
.pl-slot                     a panel slot (contains tab strip + content)
.pl-tab-strip                 the horizontal tab list at the top of a slot
.pl-tab-strip--drop-target   highlighted when dragging over an empty strip
.pl-tab-wrapper               wrapper around each tab button
.pl-tab                       individual tab button
.pl-tab--active                the currently active tab
.pl-drop-indicator            insertion caret shown while dragging
.pl-drop-indicator--left      left-side caret
.pl-drop-indicator--right     right-side caret
.pl-tab-content                content area below the tab strip
.pl-tab-empty-hint            "Drop a tab here" hint in an empty strip
.pl-tab-empty                 "No tab selected" hint in empty content area
.pl-toolbar                   PanelLayoutToolbar wrapper
.pl-picker-root                LayoutPicker relative wrapper
.pl-picker-trigger             the trigger button
.pl-picker-popup                the floating popup panel
.pl-picker-label                "Layout" heading inside the popup
.pl-picker-grid                  grid of template preview buttons
.pl-picker-item                  individual template button
.pl-picker-item--active          the currently selected template
```

## License

MIT © Shipstack
