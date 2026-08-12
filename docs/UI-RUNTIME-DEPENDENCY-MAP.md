# UI Runtime Dependency Map

Status: baseline mapping after the 2026-08-12 cleanup incident.

Verified normal baseline commit before the incident:

`4a44cf457c091a11fdf7754c3628c1b0d4651542`

The current cleanup branch is allowed to add tests and documentation around this baseline, but presentation/runtime owners must not be removed until their consumers and browser behavior are proven equivalent.

## 1. Incident root cause

The major regression was not evidence that every version-named file was independently essential. The immediate module-graph failure was more specific:

```text
features-v3.mjs
  -> ui-v4.mjs
       -> share-card.mjs
            -> ui-v4-polish.mjs
```

`src/share-card.mjs` statically imports `./ui-v4-polish.mjs`.

During the failed Phase 3 attempt, `src/ui-v4-polish.mjs` was deleted without first removing that import. A browser resolving the module graph therefore received a missing-module failure. Because `features-v3.mjs` statically depends on `ui-v4.mjs`, the enhancement graph could not complete.

Consequences matched the observed incident:

- `ui-v12.mjs` did not reach `finishBoot()` -> Opening remained visible.
- forcing Opening to fail-open exposed the base app, but much of the accumulated UI was absent because the enhancement graph still had not executed.
- a boot-only smoke test could therefore pass after a watchdog while the actual product UI was still broken.

This is now guarded in two ways:

1. `tests/module-graph-contract.test.mjs` rejects missing relative module imports.
2. `tests/browser-ui-baseline.sh` requires the actual enhanced Home/Search/Timetable/Settings DOM to exist in Chromium.

## 2. HTML entry points

`index.html` loads these static presentation layers in this order:

1. `style.css`
2. `ui-v2.css`
3. `ui-v4.css` (`data-ui-v4`)
4. `ads.css`
5. `src/ui-system.css` (`data-ui-system`)

The body begins as:

```text
app-booting ui-system
```

Two top-level module scripts are declared at the end of body:

```text
src/app.mjs
src/enhancements.mjs
```

## 3. Base app layer

`src/app.mjs` is the base behavioral renderer.

Its `init()` runs immediately and owns the first pass of:

- base Home rendering
- base Search event handling and results
- base Timetable rendering
- base Settings rendering
- bottom navigation view switching
- campus dialog and geolocation entry points

Later enhancement modules deliberately replace or decorate portions of this DOM. Therefore the base DOM is an input to the enhancement system, not dead code by default.

## 4. Enhancement bootstrap

`src/enhancements.mjs` runs its own synchronous enhancement pass before requesting the larger feature graph.

It currently performs:

- Home re-rendering / label normalization
- Suita stop synchronization
- Search summary synchronization
- Minoh timetable compatibility rendering
- event binding
- MutationObserver-based Home re-render repair

Only after those calls does it execute:

```js
void import("./features-v3.mjs");
```

This means a failure while executing the synchronous part of `enhancements.mjs`, or a failure resolving the subsequent module graph, can prevent later modules from running.

## 5. `features-v3.mjs` dependency graph

`features-v3.mjs` is a compatibility entry point whose static imports currently define the broad enhancement graph:

```text
features-v3.mjs
├─ features-v3-core.mjs
├─ brand-integration.mjs
├─ ui-v4.mjs
│  ├─ crowding-prediction.mjs
│  └─ share-card.mjs
│     ├─ ui-v4-polish.mjs
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

The important property is not the historical file names. These modules form one cooperating runtime system.

## 6. Active responsibility chain

### `features-v3-core.mjs`

This is not only a stylesheet loader.

It:

- appends `ui-v3.css` at runtime through `installStyles()`
- creates the location-assist UI
- creates custom stay-time controls
- creates the Search previous/next result stepper
- replaces the legacy `.timetable-direction` DOM with `#timetable-route-controls`
- renders route-oriented timetable rows
- creates the feedback/debug Settings card
- binds enhanced geolocation behavior

The timetable DOM created here is subsequently consumed and rewritten by `ui-v4.mjs`.

### `ui-v4.mjs`

It:

- decorates Home/Search journeys with crowding indicators
- adds share controls
- removes the duplicate first Upcoming journey
- observes dynamic Home/Search DOM with `MutationObserver`
- creates the timetable detail sheet
- rewrites route timetable cards into `.tt-compact-row`
- stores detail data used by the timetable sheet
- creates the crowding information Settings card
- observes timetable re-renders and re-applies compact rendering

`ui-v4.mjs` imports `share-card.mjs`, which means `ui-v4-polish.mjs` is a real transitive runtime dependency.

### `ui-v4-polish.mjs`

This module injects a late runtime `<style>` block that repairs a legacy broad selector affecting the fifth crowding person icon.

It must not be deleted simply because it is not listed directly in `features-v3.mjs`. Its consumer is transitive through `share-card.mjs`.

If it is eventually replaced:

1. reproduce the selector conflict in a contract/browser test,
2. fix the source selector or semantic owner,
3. remove the import from `share-card.mjs`,
4. keep a compatibility stub at the old path during a transition because browsers may have cached parent modules that still reference it,
5. only consider physical deletion after the compatibility strategy is explicit.

### `ui-v5.mjs`

Owns later interaction/presentation behavior such as header/view synchronization, sticky metrics, compact Search summaries and Search sheets. It should be treated as behavior-bearing code even though the filename is historical.

### `ui-v6.mjs`

Owns saved-search/favorite migrations and later navigation/settings behavior. Storage migration logic is a compatibility boundary and must not be removed with presentation cleanup.

### `route-preferences.mjs`

Normalizes current campus and Suita origin/destination preferences and migrates legacy storage values into the newer preference keys.

### `ui-v12.mjs`

Owns several high-level lifecycle behaviors:

- `finishBoot()` removes `app-booting` and adds `app-ready`
- location-source state
- timetable-detail advertising
- Settings information architecture (`settings-disclosure`)
- install-guide carousel
- MutationObserver-based Settings/timetable normalization

Because Opening completion lives here, any earlier module-graph resolution failure can appear to the user as an Opening freeze.

### `ui-v13.mjs`

Owns the newer Settings subpage behavior and removes obsolete saved-route UI. It consumes the Settings structure produced by earlier modules.

### `ui-current.mjs`

This is a late current-state normalizer, not just cosmetic code.

It:

- validates newer storage keys
- re-renders the current Home experience
- normalizes utility icons/text
- creates and updates Home/Search/Timetable/bottom-nav gliders
- intercepts redundant interactions
- observes dynamic surfaces and favorite content
- adds dialog close motion

Multiple earlier Home renderers therefore intentionally feed into this final current-state renderer.

## 7. Runtime presentation order

Static CSS is present before the enhancement graph begins:

```text
style.css
ui-v2.css
ui-v4.css
ads.css
ui-system.css
```

`features-v3-core.mjs#installStyles()` then appends `ui-v3.css` dynamically when the enhancement graph evaluates.

Additional runtime style owners include at least:

- `brand-integration.mjs` (`brand-assets-v2-style`)
- `ui-v4-polish.mjs` (`ui-v4-polish`)

Therefore changing a dynamic stylesheet into a static link is a cascade/load-order migration, not merely a file-reference cleanup. It must be tested independently from rule migration or module removal.

## 8. Cross-module DOM contracts

### Home

```text
app.mjs base render
  -> enhancements.mjs rerender/normalize
  -> ui-v4.mjs crowding/share/duplicate repair
  -> ui-current.mjs current render + glider/icon normalization
```

### Search

```text
app.mjs form/results
  -> features-v3-core.mjs result stepper + stay enhancements
  -> ui-v4.mjs crowding/share decoration
  -> ui-v5.mjs compact timing/condition interaction
  -> ui-current.mjs interaction/glider normalization
```

### Timetable

```text
app.mjs legacy direction + rows
  -> features-v3-core.mjs replaces direction controls and renders route rows
  -> ui-v4.mjs compacts route rows and creates detail sheet
  -> ui-v12.mjs decorates detail lifecycle / ad
  -> ui-current.mjs glider/icon normalization
```

### Settings

```text
app.mjs base cards
  + features-v3-core.mjs feedback card
  + ui-v4.mjs crowding card
  + pwa/ui-v6/route-preferences generated sections
  -> ui-v12.mjs disclosure information architecture
  -> ui-v13.mjs subpage behavior / legacy removal
  -> ui-current.mjs final normalization
```

A selector or DOM node can therefore be produced by one module and consumed by several later modules. File-level deletion is unsafe without consumer mapping.

## 9. Browser baseline contract

`tests/browser-ui-baseline.sh` starts the app in Chromium at a 390×844 viewport and verifies the enhanced product, not just successful page load.

It currently requires:

- Opening reaches `app-ready` and the splash is removed
- runtime `ui-v3.css` is installed
- v3 timetable route controls exist
- Search previous/next stepper exists
- v4 timetable detail sheet exists
- v4 crowding Settings card exists
- v12 Settings disclosures exist
- all five active presentation layers are present
- Home exits skeleton state
- current bottom-nav glider exists
- navigation successfully reaches Search, Timetable, Settings and back Home
- timetable rows are actually rewritten into v4 compact rows
- feedback and crowding Settings surfaces remain present

Both `Validate app` and PR Preview deployment run this browser baseline before a cleanup change is accepted/published.

## 10. Migration rules from this point

1. Do not delete a module until every static/dynamic import consumer is mapped.
2. CI must reject missing local module imports.
3. Browser baseline must pass before Preview publication.
4. Do not use a boot watchdog as proof that feature initialization succeeded.
5. Do not change stylesheet load order and stylesheet rules in the same checkpoint.
6. Do not change JS initialization order and presentation ownership in the same checkpoint.
7. Migrate one component/responsibility at a time.
8. Prefer additive shadow migration: copy equivalent behavior/rules first, compare, then disable the old owner, then delete only after another checkpoint.
9. For historically public module paths, prefer compatibility stubs over immediate physical deletion unless cache/version behavior is explicitly handled.
10. Treat `MutationObserver`, storage migration, DOM replacement and post-render normalization as active behavior until a replacement test proves otherwise.

## 11. Next mapping work

Before the next production-code cleanup:

- record computed-style snapshots for representative Home/Search/Timetable/Settings elements
- identify the winning source layer for high-risk properties
- add behavior coverage for Search sheets, timetable detail opening, Settings subpage opening and saved/favorite routes
- only then choose the first low-risk semantic shadow migration candidate
