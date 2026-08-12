# UI Component Ownership Map

Purpose: define cleanup/migration boundaries by **component responsibility**, not by historical filename.

Verified product baseline before the 2026-08-12 incident:

`4a44cf457c091a11fdf7754c3628c1b0d4651542`

The cleanup branch now has browser/module/computed-style guards around that behavior. A version-named file is neither automatically obsolete nor automatically permanent; migration decisions are made from the effective owner/consumer chain below.

## Reading this map

- **DOM owner**: creates or materially replaces the node structure.
- **Behavior owner**: binds interaction, lifecycle, storage or observers.
- **Presentation owner**: contributes current winning visual rules.
- **Downstream consumer**: assumes that DOM/class/storage contract exists.
- **Risk**: migration risk if changed without an explicit replacement test.

## Home

### Next bus card (`#next-card` / `#next-card-content`)

**DOM / behavior chain**

```text
app.mjs base Home render
  -> enhancements.mjs Home rerender/normalization
  -> ui-v4.mjs crowding/share/featured-duplicate repair
  -> ui-current.mjs current Home rerender + final normalization
```

**Presentation chain**

- `style.css`: first-generation card structure, radius, padding, gradient/shadow defaults.
- `ui-v2.css`: current 18px padding, 220px minimum height and OU-purple gradient/shadow. These values match the current 390×844 computed baseline.
- `ui-v4.css`: one-line next-card metadata and crowding/share presentation.
- `src/ui-system.css`: later system rules for shared controls/favorites, but it does not own the core next-card geometry.

**Risk: HIGH**

Do not migrate the whole Home card as one CSS block. The current card is composed across renderers and layers.

### Bottom Navigation

**DOM / behavior**

- base markup: `index.html`
- view switching: `app.mjs`
- icon/portal and related compatibility behavior: `ui-v6.mjs`
- current glider and normalization: `ui-current.mjs`

**Presentation**

- old/base rules exist in `style.css` / `ui-v2.css`.
- `src/ui-system.css` is the clear final owner of current fixed positioning, floating surface, button typography and glider presentation.

Current 390×844 baseline: approximately 355×60, fixed, 30px radius.

**Risk: MEDIUM-HIGH** because DOM and presentation owners are separate.

## Search

### Search form / route editor

**DOM / behavior**

- base form and search execution: `app.mjs`
- summary synchronization: `enhancements.mjs`
- stay-time enhancement + previous/next result stepper: `features-v3-core.mjs`
- timing/condition bottom-sheet interaction: `ui-v5.mjs`
- current utility/glider normalization: `ui-current.mjs`

**Presentation**

- `style.css`: original form primitives.
- `ui-v2.css`: current route editor/date-time foundations and iOS native date/time containment.
- `ui-v3.css`: `result-stepper` and custom stay control.
- `src/ui-system.css`: final current route-editor layout, Search sheets and control geometry.

Current 390×844 baseline includes:

- `#search-form`: ~358×272, 22px radius
- `.search-timing-button`: ~336×43, 16px radius

**Risk: HIGH**

Do not combine date/time/iOS cleanup with sheet or route-editor migration.

### Search result stepper (`#result-stepper`)

**DOM owner**: `features-v3-core.mjs`

**Presentation owner**: `ui-v3.css`

**Downstream behavior**: calls Search form submit after changing departure time.

**Risk: MEDIUM**

This is a possible future semantic migration candidate, but only after `ui-v3.css` load-order behavior is separately stabilized. Migrating the CSS and changing dynamic stylesheet loading in one checkpoint is prohibited.

## Timetable

### Route controls (`#timetable-route-controls`)

**DOM owner**: `features-v3-core.mjs` replaces legacy `.timetable-direction`.

**Behavior owner**: `features-v3-core.mjs` campus/destination/Suita-stop selection and route rendering.

**Presentation chain**

- `ui-v3.css`: base controls and sticky behavior.
- `src/ui-system.css`: later sticky offsets / semantic current adjustments.

Current 390×844 baseline: approximately 343×179, sticky, 9px gap.

**Risk: HIGH**

A CSS-only migration can still break auto-scroll/sticky interaction because scroll margins and top offsets are shared across layers.

### Compact timetable rows / detail sheet

**DOM / behavior owner**: `ui-v4.mjs`

- consumes route cards produced by `features-v3-core.mjs`
- rewrites them into `.tt-compact-row`
- attaches detail data
- creates/opens `#tt-detail-sheet`

**Presentation chain**

- `ui-v4.css`: principal compact-row/detail-sheet presentation.
- `src/ui-system.css`: later favorite-button grid changes, sticky offsets and semantic current adjustments.

Current 390×844 baseline:

- route card ~343×48
- compact inner row ~315×48

**Risk: HIGH**

DOM rewrite and presentation cannot be retired independently without a replacement contract.

## Settings

### Crowding information card

**DOM owner**: `ui-v4.mjs`

**Presentation owner**: `ui-v4.css`

Historical compatibility chain:

```text
ui-v4.css broad `.crowding-legend-item span:last-child`
  -> accidentally matched fifth `.crowding-person`
  -> ui-v4-polish.mjs runtime style repaired it
```

### First completed additive migration

The source selector is now correctly scoped:

```css
.crowding-legend-item > span:last-child
```

Migration sequence completed:

1. Narrow source selector while retaining runtime repair.
2. Browser behavior + computed geometry stayed green.
3. Guard narrow selector in `ui-v4-contract.test.mjs`.
4. Convert `ui-v4-polish.mjs` to a side-effect-free compatibility stub, keeping the path resolvable.
5. Browser test verifies no `#ui-v4-polish` runtime style is injected and the fifth crowding person retains the correct inactive color.
6. Remove the no-op import from new `share-card.mjs` while retaining the stub file for stale cached parent modules.

**Current risk: LOW** for the migrated rule. Physical deletion of the compatibility path remains deferred.

### Settings menu / subpage

**DOM / behavior chain**

- base cards: `app.mjs`
- feedback card: `features-v3-core.mjs`
- crowding card: `ui-v4.mjs`
- saved/favorite collections: `ui-v6.mjs`
- preference migration: `route-preferences.mjs`
- disclosure IA / install guide: `ui-v12.mjs`
- current subpage: `ui-v13.mjs`
- late normalization: `ui-current.mjs`

**Presentation**

- legacy/base card presentation is distributed across older sheets.
- current menu/subpage presentation is primarily `src/ui-system.css`.

Current 390×844 baseline:

- `#settings-menu-v13`: ~343×324
- `.settings-nav-row-v13`: ~343×54

**Risk: HIGH** because storage migration and DOM restructuring sit underneath the visible menu.

### Feedback card (`#debug-feedback-card`)

**DOM owner**: `features-v3-core.mjs`

**Presentation owner**: `ui-v3.css` (`.feedback-card`, `.feedback-link`).

No matching feedback-card presentation rule is currently present in `src/ui-system.css`.

**Risk: LOW-MEDIUM** and therefore a good candidate for the next additive semantic CSS migration:

1. Record computed values for the card/link.
2. Add equivalent semantic rules without changing `ui-v3.css` loading.
3. Confirm no computed/geometry change.
4. In a later checkpoint, suppress only the old feedback rules from `ui-v3.css`.
5. Delete old rules only after another green checkpoint / Preview confirmation.

## Saved searches / favorite trips

**Behavior / migration owner**: `ui-v6.mjs`

**Presentation**: current compact saved/favorite presentation is mainly in `src/ui-system.css`.

The browser baseline seeds legacy storage and verifies:

- `ou-bus:saved-routes` migrates to `ou-bus:saved-searches`
- Suita default stop survives migration
- favorite trip ID `E1便` normalizes to `E1`
- Settings collections render
- saved search reopens Search and restores route

**Risk: HIGH for behavior; LOW for purely cosmetic semantic adjustments once storage tests remain green.**

## Ownership conclusions

1. `style.css` still owns real first-generation structure and cannot yet be reduced to primitives.
2. `ui-v2.css` still owns current Home and Search geometry; it is not merely a color compatibility layer.
3. `ui-v3.css` owns live components created by `features-v3-core.mjs` and is dynamically appended; load order is a behaviorally relevant presentation boundary.
4. `ui-v4.css` owns live compact timetable / detail / crowding / share presentation.
5. `src/ui-system.css` is already the final owner for several current surfaces (notably Navigation and large portions of Search/Settings), but it is not yet the single owner of the whole product.
6. JavaScript historical filenames are not reliable indicators of obsolescence.
7. Physical deletion happens only after both direct and transitive consumers are gone and stale-browser-path compatibility is addressed.

## Next recommended migration boundary

**Feedback card CSS only** is the next low-risk candidate.

Do not simultaneously:

- staticize `ui-v3.css`,
- remove `features-v3-core.mjs#installStyles()`,
- change the feedback DOM,
- or modify Settings IA.

Those are separate checkpoints.
