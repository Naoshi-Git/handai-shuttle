# UI Runtime Dependency Map

Status: current dependency map after the 2026-08-12 cleanup incident and the completed presentation consolidation.

Verified pre-incident baseline: `4a44cf457c091a11fdf7754c3628c1b0d4651542`.

## Incident guardrail

The major cleanup regression was caused by a missing transitive ES module dependency, not by CSS removal alone.

```text
features-v3.mjs
  -> ui-v4.mjs
       -> share-card.mjs
            -> ui-v4-polish.mjs
```

A previous cleanup deleted `src/ui-v4-polish.mjs` while a cached parent could still request it. The enhancement graph then failed to resolve and `ui-v12.mjs#finishBoot()` never completed. The retained `ui-v4-polish.mjs` path is therefore a side-effect-free cache-compatibility stub; it must not be deleted until all consumer and cache paths are safe.

Regression guards remain mandatory:

1. `tests/module-graph-contract.test.mjs` checks that local relative imports resolve.
2. `tests/browser-ui-baseline.sh` checks that the enhanced product initializes and is interactive.
3. `tests/browser-style-inventory.sh` and `tests/ui-computed-baseline.json` protect representative geometry and computed style values.

## Static presentation assets

`index.html` loads presentation in this order:

| Order | Asset | Scope |
|---|---|---|
| 1 | `style.css` | Reset, primitives, and structural scaffolding. |
| 2 | `ads.css` | Advertisement creative and ad-slot geometry. |
| 3 | `src/ui-system.css` | All application component presentation. |

The body begins as `app-booting ui-system`. The retired `ui-v2.css`, `ui-v3.css`, and `ui-v4.css` files do not exist, are not linked, and are not copied by Pages Preview or production workflows.

## Enhancement graph

`src/enhancements.mjs` runs its synchronous compatibility pass and then dynamically imports `features-v3.mjs`.

```text
features-v3.mjs
├─ features-v3-core.mjs
├─ brand-integration.mjs
├─ ui-v4.mjs
│  ├─ crowding-prediction.mjs
│  └─ share-card.mjs
│     ├─ brand-canvas.mjs
│     └─ share-identity.mjs
├─ ads.mjs
│  └─ share-identity.mjs
├─ ui-v5.mjs
├─ pwa.mjs
├─ ui-v6.mjs
├─ route-preferences.mjs
├─ ui-v12.mjs
│  └─ share-identity.mjs
├─ ui-v13.mjs
├─ view-lifecycle.mjs
└─ ui-current.mjs
```

Historical module names identify behavior-compatibility boundaries. They do **not** identify presentation layers. No behavior module may create stylesheet links, inject style tags, or add presentation-purpose `ui-vN` body classes.

## Runtime responsibilities

| Module | Current responsibility | Presentation boundary |
|---|---|---|
| `app.mjs` | Base Home, Search, Timetable, Settings, navigation, and dialog behavior | Uses semantic hooks only; does not load styles. |
| `enhancements.mjs` | Synchronous Home, label, Suita-stop, Search-summary, and Minoh normalization | Does not load styles. |
| `features-v3-core.mjs` | Location assistance, custom stay time, Search stepper, route-based timetable controls, and feedback-card DOM | `src/ui-system.css` owns rendering. |
| `ui-v4.mjs` | Crowding, sharing, compact timetable transformation, detail sheet, and narrow observers | `src/ui-system.css` owns rendering. |
| `ui-v4-polish.mjs` | Side-effect-free cache-compatibility path | Must never create runtime styles. |
| `ui-v5.mjs` | Search sheets, shared service-banner positioning, and sticky measurements | `src/ui-system.css` owns rendering. |
| `ui-v6.mjs` | Saved-search and favorite-trip migration | `src/ui-system.css` owns rendering. |
| `route-preferences.mjs` | Current-campus and Suita preference normalization | Does not own presentation. |
| `ui-v12.mjs` | Boot completion, disclosures, install guide, and detail-sheet integration | `src/ui-system.css` owns rendering. |
| `ui-v13.mjs` | Settings subpage structure | `src/ui-system.css` owns rendering. |
| `ui-current.mjs` | Final DOM normalization, selection/glider state, and targeted observers | Must not add presentation scopes. |
| `view-lifecycle.mjs` | Main-view transitions | `src/view-lifecycle.css` only. |
| `ads.mjs` | Advertisement slots and sizing | `ads.css` owns creative geometry; `src/ui-system.css` owns app-surface integration. |

## Cross-module DOM contracts

```text
Home: app.mjs -> enhancements.mjs -> ui-v4.mjs -> ui-current.mjs
Search: app.mjs -> features-v3-core.mjs -> ui-v4.mjs -> ui-v5.mjs -> ui-current.mjs
Timetable: app.mjs -> features-v3-core.mjs -> ui-v4.mjs -> ui-v12.mjs -> ui-current.mjs
Settings: app.mjs + features-v3-core.mjs + ui-v4.mjs + pwa/ui-v6/route-preferences -> ui-v12.mjs -> ui-v13.mjs -> ui-current.mjs
```

A node may be created by one module and consumed by several later modules. Module removal is unsafe until every direct and transitive consumer is mapped and covered by a replacement contract.

## Presentation consolidation

The former versioned CSS rules are now grouped inside `src/ui-system.css` under descriptive ownership headings: migrated foundations, migrated timetable/sharing/crowding components, current semantic presentation, and migrated enhanced controls/feedback. This preserves verified computed results without retaining a load-order stack of versioned assets.

The previously guarded feedback-card values are now co-located with the semantic owner: muted `11px` copy with `line-height: 1.6`, plus the block-style, OU-purple, `12px` / `900` link with vertical `12px` padding. The direct-child crowding legend selector remains protected.

## Browser baseline contract

At a 390×844 Chromium viewport, checks cover boot completion, static active stylesheet links, Home skeleton completion, Search controls and sheets, route-based Timetable controls, compact rows, detail-sheet behavior, crowding Settings content, disclosures, saved-route migration, favorite-trip normalization, bottom-nav glider behavior, and representative computed geometry/style values.

Both the validation job and Pages Preview run the browser baseline before publishing. The deployment workflows also fail when any retired versioned stylesheet exists or is copied.

## Change rules

1. Do not delete a module before mapping every static and dynamic consumer.
2. Do not restore `ui-vN.css`, versioned stylesheet markers, runtime presentation injection, or presentation-specific `ui-vN` body classes.
3. Change application presentation in `src/ui-system.css`, ad creative geometry in `ads.css`, and view transitions in `src/view-lifecycle.css`.
4. Treat observers, storage migration, DOM replacement, and post-render normalization as active behavior until a replacement test proves otherwise.
5. Do not combine behavior initialization changes, DOM replacement, stylesheet ordering, and visual migration in one checkpoint.
6. Run the full contract suite and browser baseline before preview publication.
