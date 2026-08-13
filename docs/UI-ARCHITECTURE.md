# UI presentation architecture

## Purpose

The application previously accumulated presentation styles in versioned files that relied on load order, selector specificity, and late repair layers. This made even small visual changes difficult to locate and unsafe to modify. The presentation system is now centralized so that every active component style has a **single CSS owner**.

> A visual change belongs in `src/ui-system.css`; behavior modules may retain historical filenames, but they must not own presentation loading or presentation scope.

## Active presentation graph

| Asset | Responsibility | Rule |
|---|---|---|
| `style.css` | Browser reset, primitives, and original structural scaffolding | Do not add component-specific visual overrides here. |
| `ads.css` | Advertisement rendering and ad-slot geometry | Do not use it for ordinary app components. |
| `src/ui-system.css` | All current app component presentation, including the migrated foundations, enhanced controls, compact timetable, sharing, and crowding UI | This is the only owner for app presentation changes. |
| `src/view-lifecycle.css` | Cross-view transition lifecycle only | It must not accumulate normal component styling. |

`index.html` loads only `style.css`, `ads.css`, and `src/ui-system.css`. The retired `ui-v2.css`, `ui-v3.css`, and `ui-v4.css` files are intentionally absent from the repository and must not be restored.

## `ui-system.css` organization

The stylesheet keeps migration history visible without preserving a versioned runtime stack. Its top-level sections are ordered to preserve the verified computed cascade and make a component owner easy to find.

| Section | Contents |
|---|---|
| Migrated presentation foundations | Home, Search, shared controls, responsive input containment, and baseline tokens formerly spread across an early compatibility layer. |
| Migrated timetable, sharing, and crowding components | Compact timetable rows, detail sheet layout, sharing affordances, and crowding indicators. |
| Current semantic presentation | Shell, navigation, selections, Search, Timetable, Settings, dialogs, motion, and accessibility rules. |
| Migrated enhanced controls and feedback | Location assistance, result stepping, timetable route controls, and feedback-card typography. |

The sections are ownership labels, not permission to reintroduce filename-based layers. When a component is modified, edit the section that already owns it; if ownership is unclear, resolve the duplicate rather than adding a later override.

## Runtime boundaries

`src/features-v3-core.mjs`, `src/ui-v4.mjs`, `src/ui-v5.mjs`, `src/ui-v6.mjs`, `src/ui-v12.mjs`, `src/ui-v13.mjs`, and `src/ui-current.mjs` retain behavior and DOM compatibility responsibilities. Historical names alone do not mean that a module is obsolete. They must not inject `<link>` or `<style>` nodes, or add presentation-purpose `ui-vN` body classes.

`src/ui-v4-polish.mjs` remains as a side-effect-free module path for cached-parent compatibility only. It must not create runtime presentation styles.

`src/view-lifecycle.mjs` exclusively owns main-view transitions. New entry points may prepare data for a target view, but must route view activation through this lifecycle rather than directly mutating `.view.is-active` or Bottom Navigation state.

## Rules for future changes

1. Make presentation changes in `src/ui-system.css`, under the existing component section.
2. Replace or delete superseded declarations instead of adding a new override file or a specificity escalation.
3. Keep `style.css` structural and `ads.css` ad-specific.
4. Do not add `ui-vN.css`, `data-ui-vN` markers, or presentation-purpose `body.ui-vN` classes.
5. Do not add runtime `<style>` or `<link>` injection for application presentation.
6. Preserve the Timetable stacking contract: selection material uses z-index `1`, button text uses z-index `2`, and the track does not create a `z-index: 0` stacking context.
7. Preserve the opaque Topbar during view dissolves and keep `view-lifecycle.css` limited to lifecycle presentation.
8. Keep `getServiceStatus().reason` as a noun phrase; the rendering view owns the complete Japanese sentence.

## Verification

A presentation change must pass all of the following before merge:

```bash
node --test tests/*.test.mjs
bash tests/browser-ui-baseline.sh .
```

The contract suite rejects versioned stylesheet links and verifies the single semantic owner. The browser baseline checks representative Home, Search, Timetable, and Settings behavior and computed visual values. CI and Pages Preview also verify that retired CSS files are absent and that deployment copies only the active stylesheet set.
