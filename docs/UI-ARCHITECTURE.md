# UI presentation architecture

## Purpose

The app previously accumulated multiple generations of presentation CSS (`ui-v10.css` through
`ui-v16.css`, `ui-current.css`, and a historical `ui-v5.css` foundation). Rendering depended on
load order, selector specificity, `!important`, and versioned body classes.

PR #2 consolidates the current presentation model around one semantic authority while retaining
only lower base styles that still belong to active DOM structure.

Current layers:

- `src/ui-system.css` — single current component presentation authority, including the absorbed structural compatibility rules
- `src/view-lifecycle.css` — cross-view transition lifecycle only
- `ads.css` — ad component base/rendering
- `style.css`, `ui-v2.css`, `ui-v4.css` — lower structural/base layers still used by active markup

Deleted presentation paths include `ui-v5.css`, `src/ui-foundation.css`, `src/ui-v10.css` through
`src/ui-v16.css`, and `src/ui-current.css`.

## Presentation ownership

New visual changes belong in the matching section of `src/ui-system.css`:

1. App shell — canvas, Topbar, shared type/surfaces
2. Navigation — Bottom Navigation
3. Selections — Home/Search segmented selection materials
4. Search — route editor, summary controls, sheets, Search metadata and contextual status banner
5. Timetable — route controls, sticky offsets, metadata, grouped rows and favorite placement
6. Ad placement integration — layout interaction between ads and app surfaces
7. Settings — settings root/subpages, saved-search/favorite collections and install guide
8. Motion — sheet/dialog motion
9. Responsive/accessibility — viewport and user-preference adaptations

The absorbed structural compatibility rules are declared at the beginning of `src/ui-system.css`,
before the final semantic sections. This preserves the previous foundation → final-system cascade
without requiring a second stylesheet. Do not split them back into a separate foundation file.

`src/view-lifecycle.css` must not become another component stylesheet. It owns only cross-view
dissolve, header-title dissolve, Search shared-banner transition and Timetable entry loading.

## Navigation lifecycle ownership

`src/view-lifecycle.mjs` owns visible main-view changes. New entry points must not independently
mutate `.view.is-active` or Bottom Nav state, because that bypasses header dissolve, shared-banner
handling, persistent nav state, glider measurement and the `handai:viewchange` contract.

Bottom Navigation and Home Search entry points (`この区間を検索`, `到着時刻から`, `条件変更`,
recent/saved routes) use the same lifecycle. Existing bubble handlers may still prepare Search
parameters; view transition ownership and Search-condition ownership are separate responsibilities.

## Service status copy contract

`src/search-engine.mjs#getServiceStatus()` returns `reason` as a noun phrase suitable for UI
composition, such as `祝日`, `土・日曜日`, `夏季休業`, or `大学行事等`.

Views own the complete Japanese sentence. Do not return completed phrases such as
`祝日には運行しません` and then append `のため`, and do not repair malformed copy after render
with MutationObservers or replacement passes.

## Compatibility boundary

Historical JavaScript filenames remain where they still own active behavior:

- `src/ui-v5.mjs` — Search sheet construction, service-banner relocation, metadata normalization and sticky metrics
- `src/ui-v6.mjs` — saved-search/favorite behavior and Bottom Nav icon markup
- `src/ui-v12.mjs`, `src/ui-v13.mjs`, `src/ui-current.mjs` — active behavior/DOM integration

Historical DOM/class hooks may also remain, for example `journey-details-v5`,
`tt-compact-badges-v5`, `saved-searches-v6`, `favorite-trips-v6`, `settings-subpage-v13`, and
`nav-glider-v15`. These are compatibility hooks, not presentation owners; do not rename them only
for cosmetic cleanup unless behavior and tests are migrated together.

The runtime `ui-v5` and `ui-v6` body presentation scopes are retired. `features-v3.mjs` removes
stale version scopes and keeps `ui-system` as the only current presentation body scope.

`src/ui-v5.mjs` no longer injects or owns any stylesheet. `index.html` links no `ui-v5.css` or
`src/ui-foundation.css` path.

## Completed consolidation

The cleanup was performed in checked boundaries rather than deleting versioned files wholesale:

1. Removed obsolete first-generation Search/base selectors from `style.css`.
2. Retired legacy Bottom Nav and other dead `body.ui-v6` presentation restatements.
3. Migrated remaining `body.ui-v5` / `body.ui-v6` selectors to semantic `body.ui-system` scope.
4. Removed runtime `ui-v5` / `ui-v6` body-class creation.
5. Moved the remaining live historical CSS into `src/ui-foundation.css` while preserving load order.
6. Removed unused foundation tokens and the superseded `search-sheet-in` animation.
7. Absorbed the complete structural foundation into the beginning of `src/ui-system.css`, preserving cascade order.
8. Removed the `ui-v5.css` HTML link and the `ui-v5.mjs` stylesheet injection path.
9. Deleted `ui-v5.css` and `src/ui-foundation.css`.
10. Updated Validate, PR Preview and production Pages workflows so deleted stylesheets cannot silently return.
11. Migrated tests from filename-existence contracts to current behavior/ownership contracts.

During the final deletion boundary, CI initially failed only because one lifecycle test and Pages
workflow still referenced the removed file. Those stale references were updated; the application
contracts themselves remained green.

## Rules for future agents

- Do not create `ui-v17.css`, another version override, or a new structural foundation stylesheet.
- Do not restore `ui-v5.css`, `src/ui-foundation.css`, `body.ui-v5`, or `body.ui-v6`.
- Change the existing semantic owner in `src/ui-system.css` instead of adding a later override layer.
- If a rule is superseded, replace/delete it rather than retaining both values.
- Keep `view-lifecycle.css` free of ordinary component styling.
- Route new main-view entry points through `view-lifecycle.mjs`.
- Keep `getServiceStatus().reason` as a reason noun phrase; views own complete sentences.
- Do not repair copy after render.
- Preserve the Timetable stacking contract: selection material z-index 1, button text z-index 2, and no `z-index: 0` track context.
- Preserve the stable opaque Topbar during tab dissolves.
- Treat historical `vN` DOM hooks as behavior compatibility identifiers, not permission to create versioned presentation.
- Tests should verify final behavior and ownership rather than requiring an obsolete implementation filename.
- Run contract tests and PR Preview after changing ownership boundaries.

## Remaining maintenance boundary

The `ui-v5.css` / `src/ui-foundation.css` absorption is complete. Further cleanup is no longer a
stylesheet-consolidation task. Any future work should be justified component-by-component, such as
renaming compatibility DOM hooks or decomposing historical behavior modules, and should only be done
when it improves maintainability without changing the currently stable UX.
