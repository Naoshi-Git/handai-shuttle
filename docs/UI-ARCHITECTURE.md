# UI presentation architecture

## Purpose

The app accumulated multiple generations of presentation CSS and behavior modules. At its worst,
rendering depended on load order, selector specificity, `!important`, versioned body classes and
later repair layers.

PR #2 is retiring that model in checked boundaries while preserving the currently stable UX.
The target is simple: **a visual change should have one obvious semantic owner, and old presentation
must not win merely because it loads later.**

## Target architecture

The intended final presentation graph is:

- `src/ui-system.css` — current/final component presentation
- `src/view-lifecycle.css` — cross-view transition lifecycle only
- `ads.css` — ad component rendering/base
- `style.css` — primitive and structural base only

No `ui-vN.css` file, presentation-purpose `body.ui-vN` class, version compatibility marker or
runtime `<link>` / `<style>` injection should be needed in the final state.

## Current transitional architecture

The target above is **not yet fully reached**. The current branch still has active historical
presentation layers that must be migrated rather than deleted blindly:

- `style.css` — legacy/base rules; some presentation remains
- `ui-v2.css` — active historical presentation
- `ui-v3.css` — active historical presentation injected by `features-v3-core.mjs#installStyles()`
- `ui-v4.css` — active timetable/detail/crowding/share presentation; also linked by `index.html`
- `src/ui-v4-polish.mjs` — runtime `<style>` repair for a legacy broad selector
- `ads.css` — ad component rendering/base
- `src/ui-system.css` — semantic current/final presentation and absorbed compatibility rules
- `src/view-lifecycle.css` — view lifecycle presentation only

This means `src/ui-system.css` is the **destination and semantic authority for new work**, but the
repository is still completing migration from `ui-v2.css`, `ui-v3.css` and `ui-v4.css`.
Do not describe those historical stylesheets as harmless base layers without inspecting their rules.

Deleted presentation paths include:

- `ui-v5.css`
- `src/ui-foundation.css`
- `src/ui-v10.css` through `src/ui-v16.css`
- `src/ui-current.css`

## Presentation scope

`ui-system` is declared directly in `index.html`:

- the semantic stylesheet is linked with `data-ui-system`
- `<body>` carries the `ui-system` class from initial markup

The previous presentation compatibility shim has been retired:

- `ui-current.mjs` no longer injects `src/ui-current.css`
- `ui-current.mjs` no longer adds `ui-v11`, `ui-v14`, `ui-v15` or `ui-current` body classes
- `index.html` no longer fakes `data-ui-v10` through `data-ui-v15` / `data-ui-current` markers
- `features-v3.mjs` no longer adds `ui-system` and then removes `LEGACY_PRESENTATION_SCOPES`

Do not restore an add-then-remove presentation scope normalizer. Version presentation classes
should not be created in the first place.

## Semantic presentation ownership

New visual changes belong in the matching section of `src/ui-system.css`:

1. App shell — canvas, Topbar, shared type/surfaces
2. Navigation — Bottom Navigation
3. Selections — Home/Search segmented selection materials
4. Search — route editor, summary controls, sheets, metadata and contextual status banner
5. Timetable — route controls, sticky offsets, metadata, grouped rows and favorite placement
6. Ad placement integration — layout interaction between ads and app surfaces
7. Settings — settings root/subpages, saved-search/favorite collections and install guide
8. Motion — sheet/dialog motion
9. Responsive/accessibility — viewport and user-preference adaptations

The absorbed structural compatibility rules are declared before the final semantic sections in
`src/ui-system.css`. This preserves an earlier foundation → final-system cascade while the remaining
historical stylesheets are retired. Do not recreate a separate foundation stylesheet.

`src/view-lifecycle.css` must not become another component stylesheet. It owns only cross-view
dissolve, header-title dissolve, Search shared-banner transition and Timetable entry loading.

## Remaining stylesheet migration

The next cleanup boundary is `ui-v2.css` / `ui-v3.css` / `ui-v4.css`.

Migration must be performed by rule ownership, not by concatenating files blindly:

1. Inventory selectors and classify each as base, active presentation or dead.
2. Identify duplicate selectors and rules that depend on later cascade order or `!important`.
3. Move active presentation into the matching semantic section of `src/ui-system.css`.
4. Keep only genuine primitive/structural base in `style.css`.
5. Remove `features-v3-core.mjs#installStyles()` after `ui-v3.css` is absorbed.
6. Remove `ui-v4.mjs#installStyles()` after `ui-v4.css` is absorbed.
7. Move the `ui-v4-polish.mjs` repair into normal semantic CSS, then remove runtime `<style>` injection.
8. Delete `ui-v2.css`, `ui-v3.css`, `ui-v4.css` only after the equivalent active rules are owned elsewhere.
9. Update CI, Pages workflows and tests so version stylesheets cannot silently return.

Preserve computed appearance at each boundary. A temporary extra commit is preferable to a large
unverifiable cascade rewrite.

## Navigation lifecycle ownership

`src/view-lifecycle.mjs` owns visible main-view changes. New entry points must not independently
mutate `.view.is-active` or Bottom Nav state, because that bypasses header dissolve, shared-banner
handling, persistent nav state, glider measurement and the `handai:viewchange` contract.

Bottom Navigation and Home Search entry points (`この区間を検索`, `到着時刻から`, `条件変更`,
recent/saved routes) use the same lifecycle. Existing handlers may still prepare Search parameters;
view transition ownership and Search-condition ownership are separate responsibilities.

## Service status copy contract

`src/search-engine.mjs#getServiceStatus()` returns `reason` as a noun phrase suitable for UI
composition, such as `祝日`, `土・日曜日`, `夏季休業`, or `大学行事等`.

Views own the complete Japanese sentence. Do not return completed phrases such as
`祝日には運行しません` and then append `のため`, and do not repair malformed copy after render
with MutationObservers or replacement passes.

## Behavior compatibility boundary

Historical JavaScript filenames remain where they still own active behavior:

- `src/features-v3-core.mjs` — enhanced location, result/timetable behavior and currently `ui-v3.css` loading
- `src/ui-v4.mjs` — compact timetable, detail sheet, crowding and share behavior
- `src/ui-v5.mjs` — Search sheet construction, service-banner relocation, metadata normalization and sticky metrics
- `src/ui-v6.mjs` — saved-search/favorite behavior and Bottom Nav icon markup
- `src/ui-v12.mjs`, `src/ui-v13.mjs`, `src/ui-current.mjs` — active behavior/DOM integration

Historical DOM/class hooks may also remain, for example `journey-details-v5`,
`tt-compact-badges-v5`, `saved-searches-v6`, `favorite-trips-v6`, `settings-subpage-v13`, and
`nav-glider-v15`.

These are compatibility identifiers, not presentation-version owners. Do not rename them merely for
cosmetic cleanup. Rename only when the owning behavior and tests can migrate together.

## Completed cleanup boundaries

Completed work includes:

1. Removed obsolete first-generation Search/base selectors from `style.css`.
2. Retired legacy Bottom Nav and dead `body.ui-v6` presentation restatements.
3. Migrated remaining `body.ui-v5` / `body.ui-v6` selectors to semantic `body.ui-system` scope.
4. Removed runtime `ui-v5` / `ui-v6` body-class creation.
5. Temporarily isolated live historical foundation rules, then absorbed them into `src/ui-system.css`.
6. Removed unused foundation tokens and superseded sheet animation.
7. Deleted `ui-v5.css` and `src/ui-foundation.css`.
8. Deleted `src/ui-v10.css` through `src/ui-v16.css` and `src/ui-current.css`.
9. Updated Validate / PR Preview / production Pages contracts for deleted stylesheets.
10. Removed `ui-current.mjs` stylesheet injection and presentation body-class creation.
11. Removed fake `data-ui-v10`…`data-ui-current` stylesheet markers.
12. Removed `features-v3.mjs` presentation-scope normalization entirely.
13. Migrated tests from obsolete marker/scope existence to current ownership contracts.

Each ownership boundary must return Validate and PR Preview to green before the next destructive
step.

## Rules for future agents

- Do not create `ui-v17.css` or any new version override stylesheet.
- Do not restore `ui-v5.css`, `src/ui-foundation.css`, `src/ui-current.css` or deleted `src/ui-v1x.css` files.
- Do not add presentation-purpose `body.ui-vN` classes.
- Do not restore `data-ui-vN` compatibility markers for deleted layers.
- Do not introduce new runtime `<style>` or `<link>` presentation injection.
- Change the semantic owner in `src/ui-system.css` instead of adding a later override layer.
- If a rule is superseded, replace/delete it rather than retaining both values indefinitely.
- Keep `view-lifecycle.css` free of ordinary component styling.
- Route new main-view entry points through `view-lifecycle.mjs`.
- Keep `getServiceStatus().reason` as a reason noun phrase; views own complete sentences.
- Do not repair copy after render.
- Preserve the Timetable stacking contract: selection material z-index 1, button text z-index 2, and no `z-index: 0` track context.
- Preserve the stable opaque Topbar during tab dissolves.
- Treat historical `vN` DOM hooks as behavior compatibility identifiers, not permission to create versioned presentation.
- Tests should verify final behavior and ownership rather than requiring an obsolete implementation filename.
- Run contract tests and PR Preview after changing ownership boundaries.

## Definition of done for presentation cleanup

Presentation cleanup is complete only when all of the following are true:

1. No active `ui-vN.css` stylesheet remains.
2. `index.html` does not load versioned presentation CSS.
3. Runtime code does not create presentation-purpose `ui-vN` body classes.
4. Runtime code does not inject presentation `<link>` or `<style>` nodes.
5. `src/ui-system.css` is the unambiguous owner for current component presentation.
6. `style.css` contains only justified primitive/structural base.
7. `src/view-lifecycle.css` contains only view lifecycle styling.
8. Contract tests and PR Preview are green.
9. Home, Search, Timetable and Settings have been checked at representative mobile viewports without regression.
