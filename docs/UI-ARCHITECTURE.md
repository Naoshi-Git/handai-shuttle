# UI presentation architecture

## Purpose

The app previously accumulated `ui-v10.css` through `ui-v16.css` plus `ui-current.css`.
Those files described different generations of the same components, so the rendered result
depended on load order, selector specificity, `!important`, and versioned body classes.

PR #2 consolidates that presentation stack into one semantic authority:

- `src/ui-system.css` — current component presentation
- `src/view-lifecycle.css` — tab/view transition lifecycle only
- `ads.css` — ad component base/rendering
- `style.css`, `ui-v2.css`, `ui-v4.css`, `ui-v5.css` — older structural foundations that are
  still used by active DOM/behavior and are intentionally below the semantic system layer

`ui-v5.css` remains a historical filename only. Its remaining body-scoped rules are keyed to
`body.ui-system`; it no longer depends on `body.ui-v5` or `body.ui-v6`.

## Ownership rules

New visual changes belong in the matching section of `src/ui-system.css`:

1. App shell — canvas, Topbar, shared type/surfaces
2. Navigation — Bottom Navigation only
3. Selections — persistent Home/Search segmented selection materials
4. Search — route editor and Search-specific controls
5. Timetable — route controls, rows, grouped list
6. Ad placement integration — layout interaction between ads and app surfaces
7. Settings — settings root/subpages/install guide
8. Motion — sheet/dialog motion only
9. Responsive/accessibility — viewport and user-preference adaptations

`src/view-lifecycle.css` must not become a second component stylesheet. It owns only the
cross-view dissolve, header-title dissolve, Search shared-banner transition, and Timetable
entry loader.

## Navigation lifecycle ownership

`src/view-lifecycle.mjs` is the current owner of visible view changes. A route into another
main view must not mutate `.view.is-active` / Bottom Nav state in isolation because that
bypasses header dissolve, shared-banner handling, persistent nav state, glider measurement,
and the `handai:viewchange` contract.

Bottom Navigation clicks are fully captured by the lifecycle owner. Home Search entry points
(`この区間を検索`, `到着時刻から`, `条件変更`) and legacy recent/saved route buttons are
pre-committed through the same lifecycle before their existing bubble handlers prepare the
Search parameters. Those parameter handlers intentionally continue to bubble; presentation
transition ownership and Search-condition ownership are separate responsibilities.

When future code introduces a new cross-view entry point, route it through the lifecycle
owner rather than adding another direct view toggle.

## Service status copy contract

`src/search-engine.mjs#getServiceStatus()` returns `reason` as a reason noun phrase suitable
for UI composition, not as a completed sentence. Examples are `祝日`, `土・日曜日`,
`夏季休業`, and `大学行事等`.

Do not return strings such as `祝日には運行しません` from the data/service layer and then
append `のため` in a view. Each UI surface owns the complete sentence around the reason.
This keeps Home banner, Timetable status, and Search warnings grammatically consistent.

Do not add a MutationObserver or other post-hoc repair layer that rewrites malformed copy
after render. Copy defects should be corrected at the service/view composition boundary.

## Compatibility boundary

Some active JavaScript modules still have historical filenames (`ui-v5.mjs`, `ui-v6.mjs`,
`ui-v12.mjs`, `ui-v13.mjs`, `ui-current.mjs`) and some generated DOM/runtime hooks still
contain suffixes such as `saved-searches-v6`, `settings-subpage-v13`, `nav-glider-v15`, or
CSS custom properties beginning with `--v15-`.

Those names are behavior/DOM compatibility hooks, not presentation ownership. Do not create
new version-scoped styles for them. The `data-ui-v10` … `data-ui-current` attributes on the
single `ui-system.css` link are deliberate compatibility sentinels: older behavior modules
use those attributes only to decide whether they need to inject a stylesheet.

The runtime `ui-v5` and `ui-v6` body presentation scopes are retired. `src/ui-v5.mjs` and
`src/ui-v6.mjs` no longer add those classes, and `ui-v5.css` contains no `body.ui-v5` or
`body.ui-v6` selectors. `features-v3.mjs` explicitly removes stale `ui-v5` / `ui-v6` classes
along with the obsolete v10–v16/current scopes and keeps `ui-system` as the only current
presentation scope.

The behavior modules themselves remain active. In particular, `ui-v5.mjs` still owns Search
sheet construction, service-banner relocation, metadata normalization and sticky metrics;
`ui-v6.mjs` still owns saved-search/favorite behavior and Bottom Nav icon markup.

## Rules for future agents

- Do not add a new `ui-v17.css`, `ui-v18.css`, or another “final override” file.
- Do not introduce or restore `body.ui-v5`, `body.ui-v6`, or another version-scoped presentation owner.
- Change the existing semantic owner instead of overriding it later in the cascade.
- If a rule is superseded, replace/delete it; do not keep both old and new values.
- Keep `view-lifecycle.css` free of ordinary component styling.
- Route new main-view entry points through `view-lifecycle.mjs` rather than toggling views directly.
- Keep `getServiceStatus().reason` as a reason noun phrase; views own complete Japanese sentences.
- Do not repair copy after render with MutationObservers or text replacement passes.
- Prefer low-specificity component selectors. Use `!important` only where the semantic
  system must override still-active pre-consolidation foundation CSS; remove it when that
  lower foundation is retired.
- Preserve the Timetable stacking contract: selection material at z-index 1, button text at
  z-index 2, and no `z-index: 0` stacking context on the segmented tracks.
- Preserve the stable opaque Topbar during tab dissolves.
- Run the contract tests after changing ownership boundaries.

## Completed foundation cleanup

The first foundation pass removed selectors from `style.css` that no longer correspond to
active DOM or behavior:

- legacy English `.eyebrow`
- first-generation Search layout `.route-fields`
- `.field-card`
- `.detail-stop-row`
- `.sub-field`

The active Search editor is the `.route-editor` / `.route-line` structure. Contract tests
prevent those superseded selectors from being reintroduced into the base stylesheet.

The next passes retired the old Bottom Nav presentation and additional `body.ui-v6`
declarations whose final values were already fully owned by `src/ui-system.css`, including
legacy Search/Settings surfaces, button surfaces, warning/soft pill colors, closed service
banner colors and the old Timetable `favorite-flash` animation.

The remaining live foundation selectors were then decoupled from versioned body state:

1. `body.ui-v5` selectors were changed to semantic `body.ui-system` selectors without changing values.
2. `src/ui-v5.mjs` stopped adding the obsolete `ui-v5` body class.
3. Remaining `body.ui-v6` selectors were changed to `body.ui-system` without changing values.
4. `src/ui-v6.mjs` stopped adding the obsolete `ui-v6` body class.
5. `features-v3.mjs` now treats stale `ui-v5` and `ui-v6` classes as retired presentation scopes.

Each boundary is covered by contract tests so a future change cannot silently restore the
version-scoped presentation model.

## Remaining live foundation responsibilities

`ui-v5.css` still contains active structural presentation that has not yet been physically
moved into `src/ui-system.css`, including:

- Search sheet base geometry
- Search summary structural grid
- Search-context service-banner geometry
- Timetable sticky / scroll offsets
- Search / Timetable metadata columns
- Favorite button geometry and saved state
- Search favorite-trip presentation
- Timetable favorite-button grid placement
- saved-search / favorite collection structure
- legacy saved-routes suppression

These are semantic at runtime despite the historical filename. Do not delete `ui-v5.css`
until each responsibility has been moved and its regression contract updated.

## Next safe cleanup boundary

The next useful step is physical migration of the remaining `ui-v5.css` responsibilities into
matching Search / Timetable / Settings sections of `src/ui-system.css`, one component at a
time. Keep `ui-v5.mjs` and `ui-v6.mjs` behavior intact while moving presentation. Once the
file has no remaining live rules, remove the `ui-v5.css` link/injection path and the file
itself in a separate checked change.
