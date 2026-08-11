# UI presentation architecture

## Purpose

The app previously accumulated `ui-v10.css` through `ui-v16.css` plus `ui-current.css`.
Those files described different generations of the same components, so the rendered result
depended on load order, selector specificity, `!important`, and versioned body classes.

PR #2 consolidates the active presentation model into semantic layers:

- `src/ui-system.css` — current/final component presentation authority
- `src/ui-foundation.css` — active structural foundation still required by current DOM/behavior
- `src/view-lifecycle.css` — tab/view transition lifecycle only
- `ads.css` — ad component base/rendering
- `style.css`, `ui-v2.css`, `ui-v4.css` — older lower foundations still used by active DOM/behavior
- `ui-v5.css` — deprecated import-only compatibility shim pointing to `src/ui-foundation.css`

`src/ui-foundation.css` contains no `body.ui-v5` or `body.ui-v6` presentation scope. The old
`ui-v5.css` filename no longer owns implementation and must not receive new rules.

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

`src/ui-foundation.css` is not a second final visual owner. It exists only for structural rules
that are still required by active behavior and have not yet been folded into the matching
semantic sections. Final surface/color/motion values stay in `src/ui-system.css`.

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
`src/ui-v6.mjs` no longer add those classes. `features-v3.mjs` explicitly removes stale
`ui-v5` / `ui-v6` classes along with the obsolete v10–v16/current scopes and keeps
`ui-system` as the only current presentation body scope.

The behavior modules themselves remain active. In particular, `ui-v5.mjs` still owns Search
sheet construction, service-banner relocation, metadata normalization and sticky metrics;
`ui-v6.mjs` still owns saved-search/favorite behavior and Bottom Nav icon markup.

`ui-v5.css` is now only a compatibility import:

```css
@import url("./src/ui-foundation.css");
```

Do not put implementation back into that shim. New or migrated structural rules belong in
`src/ui-foundation.css` until they can be folded into `src/ui-system.css`.

## Rules for future agents

- Do not add a new `ui-v17.css`, `ui-v18.css`, or another “final override” file.
- Do not introduce or restore `body.ui-v5`, `body.ui-v6`, or another version-scoped presentation owner.
- Do not add implementation to the deprecated `ui-v5.css` shim.
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

The next physical cleanup moved the complete live implementation out of the historical file:

1. Active structural rules moved from `ui-v5.css` to `src/ui-foundation.css` without changing load order.
2. `ui-v5.css` became an import-only compatibility shim.
3. v5/v6/maintenance contracts were updated to validate the semantic foundation rather than the old filename.
4. Unused legacy tokens (`--ui-card-radius`, `--ui-panel-radius`, the duplicate `--ui-surface-soft`, and old warning tokens) were removed.
5. The obsolete `search-sheet-in` foundation animation was removed because current sheet motion is owned by `src/ui-system.css`.
6. Regression guards prevent those dead tokens/motion rules and version-scoped ownership from returning.

Each ownership boundary is validated by both contract tests and PR Preview deployment.

## Remaining live foundation responsibilities

`src/ui-foundation.css` still owns structural rules that have not yet been folded into
`src/ui-system.css`, including:

- duplicate page-heading suppression / active-view top padding
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

These responsibilities are semantic at runtime. The `ui-v5.css` shim itself owns none of them.

## Next safe cleanup boundary

Continue physical migration from `src/ui-foundation.css` into matching Search / Timetable /
Settings sections of `src/ui-system.css`, one component at a time. Keep `ui-v5.mjs` and
`ui-v6.mjs` behavior intact while moving presentation.

After the foundation is empty, change the HTML/behavior stylesheet reference to stop loading
the deprecated `ui-v5.css` shim, then delete the shim and `src/ui-foundation.css` in separate
checked changes. Do not delete or rename behavior modules merely because their filenames are
historical.
