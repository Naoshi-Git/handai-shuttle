# UI presentation architecture

## Purpose

The app previously accumulated `ui-v10.css` through `ui-v16.css` plus `ui-current.css`.
Those files described different generations of the same components, so the rendered result
depended on load order, selector specificity, `!important`, and body classes such as
`ui-v14 ui-v15 ui-current`.

PR #2 consolidates that presentation stack into one semantic authority:

- `src/ui-system.css` — current component presentation
- `src/view-lifecycle.css` — tab/view transition lifecycle only
- `ads.css` — ad component base/rendering
- `style.css`, `ui-v2.css`, `ui-v4.css`, `ui-v5.css` — older structural foundations that are
  still used by active DOM/behavior and are intentionally below the semantic system layer

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

## Compatibility boundary

Some active JavaScript modules still have historical filenames (`ui-v12.mjs`,
`ui-v13.mjs`, `ui-current.mjs`) and some generated DOM/runtime hooks still contain suffixes
such as `settings-subpage-v13`, `nav-glider-v15`, or CSS custom properties beginning with
`--v15-`.

Those names are behavior/DOM compatibility hooks, not CSS ownership. Do not create new
version-scoped styles for them. The `data-ui-v10` … `data-ui-current` attributes on the
single `ui-system.css` link are deliberate compatibility sentinels: older behavior modules
use those attributes only to decide whether they need to inject a stylesheet.

At runtime `features-v3.mjs` normalizes the current presentation class to `ui-system` and
removes the obsolete v10–v16/current scopes after module initialization. Older `ui-v5` and
`ui-v6` hooks remain temporarily where they still guard live compatibility rules.

## Rules for future agents

- Do not add a new `ui-v17.css`, `ui-v18.css`, or another “final override” file.
- Do not introduce new version-scoped component styling.
- Change the existing semantic owner instead of overriding it later in the cascade.
- If a rule is superseded, replace/delete it; do not keep both old and new values.
- Keep `view-lifecycle.css` free of ordinary component styling.
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

The next pass retired the old `body.ui-v6 .bottom-nav ...` presentation block. Bottom Nav
geometry, typography, active state, glider material, interaction and reduced-motion behavior
are now owned only by the `Navigation` and `Responsive / accessibility` sections of
`src/ui-system.css`. The `ui-v6` JavaScript behavior module remains active for favorites and
navigation icon markup; removing a presentation owner does not imply removing that behavior.

## Next safe cleanup boundary

The remaining legacy CSS (`style.css`, `ui-v2.css`, `ui-v4.css`, `ui-v5.css`) is not treated
as disposable version residue because it still contains structural/base rules used by the
active app. Continue migration component-by-component with regression guards. In
particular, the remaining `ui-v5` / `ui-v6` body-scoped rules include live Search banner,
sticky timetable, favorite controls and legacy-saved-route suppression responsibilities;
move those responsibilities explicitly before removing their scopes.
