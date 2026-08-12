# UI Runtime Dependency Map

Status: current dependency map after the 2026-08-12 cleanup incident and the first guarded retirement checkpoints.

Verified pre-incident baseline:

`4a44cf457c091a11fdf7754c3628c1b0d4651542`

The cleanup branch preserves that product behavior while reducing historical presentation/runtime ownership one checkpoint at a time.

## 1. Incident root cause

The major regression was caused by a missing transitive ES module dependency, not merely by removing old-looking CSS.

At the time of the incident the graph contained:

```text
features-v3.mjs
  -> ui-v4.mjs
       -> share-card.mjs
            -> ui-v4-polish.mjs
```

The failed cleanup physically deleted `src/ui-v4-polish.mjs` while `src/share-card.mjs` still statically imported it. That prevented the larger enhancement graph from resolving. `ui-v12.mjs#finishBoot()` was therefore never reached, so Opening remained visible; forcing Opening to fail-open only exposed a partially initialized base UI.

Regression guards now include:

1. `tests/module-graph-contract.test.mjs` — every local relative module import must resolve.
2. `tests/browser-ui-baseline.sh` — the enhanced product must actually initialize and remain interactive.
3. `tests/browser-style-inventory.sh` + `tests/ui-computed-baseline.json` — representative current geometry/computed style must remain stable.

## 2. Current static presentation order

`index.html` now loads presentation in this order:

1. `style.css`
2. `ui-v2.css`
3. `ui-v4.css` (`data-ui-v4`)
4. `ads.css`
5. `src/ui-system.css` (`data-ui-system`)
6. `ui-v3.css` (`data-ui-v3`)

`ui-v3.css` intentionally remains last because its previous runtime append also placed it after the static presentation stack. Staticization changed ownership/timing, not effective cascade order.

The body begins as:

```text
app-booting ui-system
```

Top-level module scripts:

```text
src/app.mjs
src/enhancements.mjs
```

## 3. Current enhancement graph

`src/enhancements.mjs` performs its synchronous compatibility pass and then dynamically imports `features-v3.mjs`.

`features-v3.mjs` statically composes the broad enhancement graph:

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

`ui-v4-polish.mjs` is **not in the current active import graph**. It remains on disk as a side-effect-free compatibility stub so an older cached parent module that still requests the historical path does not receive a 404.

## 4. Runtime responsibilities

### `app.mjs`

Base renderer/behavior for Home, Search, Timetable, Settings, bottom navigation and campus dialog. Its DOM is still input to later enhancement modules.

### `enhancements.mjs`

Synchronous Home/label/Suita-stop/Search-summary/Minoh compatibility work, then enhancement-graph bootstrap.

### `features-v3-core.mjs`

Behavior only; it **no longer creates or loads a stylesheet**.

It still owns:

- location assist and enhanced geolocation fallback
- custom stay-time input
- Search previous/next result stepper
- replacement of legacy timetable direction controls with `#timetable-route-controls`
- route-oriented timetable rendering
- feedback/debug Settings card DOM

### `ui-v4.mjs`

Behavior only with respect to stylesheet ownership; it **no longer creates or loads a stylesheet**.

It still owns:

- crowding decoration on Home/Search/Timetable
- share controls
- duplicate Upcoming repair
- compact timetable transformation
- timetable detail sheet
- crowding Settings card
- narrow dynamic observers

### `share-card.mjs`

Current share-card behavior and Canvas rendering. It no longer imports `ui-v4-polish.mjs`.

### `ui-v4-polish.mjs`

Side-effect-free compatibility stub only. The old runtime repair was retired after the source selector was corrected from a broad descendant selector to a direct-child label selector and browser/computed regression coverage was added.

### `ui-v5.mjs`

Later Search/header/sticky interaction behavior. Historical filename; still active behavior.

### `ui-v6.mjs`

Saved-search/favorite migrations and related behavior. Storage migration is an active compatibility boundary.

### `route-preferences.mjs`

Current-campus/Suita preference normalization and legacy storage migration.

### `ui-v12.mjs`

High-level lifecycle behavior including Opening completion, Settings disclosures, install-guide behavior and timetable-detail integration.

### `ui-v13.mjs`

Settings subpage behavior and later Settings structure.

### `ui-current.mjs`

Late current-state behavior/normalization: current Home rendering, utility normalization, persistent selection/glider behavior and targeted dynamic-surface integration.

## 5. Cross-module DOM contracts

### Home

```text
app.mjs base render
  -> enhancements.mjs normalize/rerender
  -> ui-v4.mjs crowding/share/duplicate repair
  -> ui-current.mjs current render + final normalization
```

### Search

```text
app.mjs form/results
  -> features-v3-core.mjs stay/result-stepper behavior
  -> ui-v4.mjs crowding/share
  -> ui-v5.mjs timing/condition sheets
  -> ui-current.mjs final interaction normalization
```

### Timetable

```text
app.mjs legacy direction/rows
  -> features-v3-core.mjs route controls + route rows
  -> ui-v4.mjs compact rows + detail sheet
  -> ui-v12.mjs detail lifecycle/ad integration
  -> ui-current.mjs final normalization
```

### Settings

```text
app.mjs base cards
  + features-v3-core.mjs feedback card
  + ui-v4.mjs crowding card
  + pwa/ui-v6/route-preferences generated content
  -> ui-v12.mjs disclosures
  -> ui-v13.mjs subpage behavior
  -> ui-current.mjs final normalization
```

A node can still be produced by one module and consumed by several later modules. File-level deletion remains unsafe without consumer mapping.

## 6. Runtime style ownership

Version behavior modules `features-v3-core.mjs`, `ui-v4.mjs`, `ui-v5.mjs` and `ui-current.mjs` no longer own their historical presentation via runtime stylesheet creation.

Known active runtime-generated styling that remains for separate reasons includes brand integration (`brand-assets-v2-style`). Do not conflate that with the retired version-CSS loaders.

The current presentation migration problem is now primarily **rule ownership/cascade**, not stylesheet injection.

## 7. Browser baseline contract

At a 390×844 Chromium viewport, cleanup checkpoints verify at least:

- Opening reaches `app-ready` and is removed
- Home exits skeleton state
- static `ui-v3.css` and `ui-v4.css` links are present
- v3 timetable route controls exist
- Search previous/next stepper exists
- Search timing and condition sheets open/close
- v4 compact timetable rows exist
- timetable detail sheet opens/closes and renders stops
- v4 crowding Settings surface exists
- v12 Settings disclosures exist
- v13 Settings subpage opens/closes
- saved-route → saved-search migration persists
- favorite trip IDs normalize correctly
- current bottom-nav glider exists
- navigation returns successfully to Home
- representative computed geometry/styles stay within baseline tolerance

Both `Validate app` and PR Preview deployment run the browser baseline before a checkpoint is accepted/published.

## 8. Guarded retirements completed after the incident

### Crowding legend runtime polish

- reproduced the fifth-person selector conflict
- narrowed `.crowding-legend-item span:last-child` to `.crowding-legend-item > span:last-child`
- verified computed color in browser
- made `ui-v4-polish.mjs` side-effect-free
- removed its import from current `share-card.mjs`
- retained the old path as a cache-compatibility stub

### v4 stylesheet injection

- proved `index.html` already statically owned `ui-v4.css`
- removed `ui-v4.mjs#installStyles()` and its call
- added a maintenance contract preventing runtime reintroduction

### v3 stylesheet injection

- first added `ui-v3.css` statically after `ui-system.css`, preserving its previous effective final cascade position
- verified behavior/computed parity and Preview
- then removed `features-v3-core.mjs#installStyles()` and its call
- added a maintenance contract requiring static v3/v4 stylesheet ownership

### Same-layer v3 cleanup

- removed an earlier `scroll-margin-top:110px` declaration that was always superseded later in the same stylesheet
- consolidated the Search stepper's effective `min-height:44px` / `font-size:12px` into its primary rule and removed the later duplicate rule

## 9. Feedback-card finding

The feedback rules in `ui-v3.css` are **partially live**, not obsolete.

A guarded removal experiment proved these values still come from the v3 rule:

- feedback copy: muted color, `11px`, `line-height:1.6`
- feedback link: block display, OU purple color, `12px`, weight `900`, vertical `12px` padding

Other properties such as the current transparent link background/radius/horizontal padding are already won by later semantic presentation.

Therefore the feedback rule must not be deleted until only its still-live properties are explicitly transferred to the semantic owner.

## 10. Migration rules

1. Do not delete a module until every static/dynamic import consumer is mapped.
2. CI must reject missing local module imports.
3. Browser behavior and computed baseline must pass before Preview publication.
4. A boot watchdog is never sufficient proof of feature initialization.
5. Do not change stylesheet load order and rule ownership in the same checkpoint.
6. Do not change JS initialization order and presentation ownership in the same checkpoint.
7. Migrate one component/responsibility at a time.
8. Prefer additive shadow migration, then disable the old owner, then delete only after a later checkpoint.
9. For historically public module paths, use an explicit cache-compatibility strategy before physical deletion.
10. Treat MutationObserver, storage migration, DOM replacement and post-render normalization as active behavior until a replacement test proves otherwise.
11. For large full-file connector writes, inspect the resulting Git diff and reject any unrelated textual change before relying on CI.

## 11. Next work

The next semantic migration should operate on a component whose remaining winning properties are explicitly known. Feedback card is mapped but requires a safe `ui-system.css` edit path before retirement. In parallel, same-layer dead/duplicate declarations in remaining version CSS can be removed when equivalence is provable without crossing ownership boundaries.
