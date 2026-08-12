# UI Component Ownership Map

Purpose: define cleanup/migration boundaries by **component responsibility**, not by historical filename.

Verified product baseline before the 2026-08-12 incident:

`4a44cf457c091a11fdf7754c3628c1b0d4651542`

The cleanup branch now has module, browser-behavior and computed-style guards around that behavior. A version-named file is neither automatically obsolete nor automatically permanent; migration decisions are made from the effective owner/consumer chain below.

## Reading this map

- **DOM owner**: creates or materially replaces the node structure.
- **Behavior owner**: binds interaction, lifecycle, storage or observers.
- **Presentation owner**: contributes current winning visual rules.
- **Downstream consumer**: assumes that DOM/class/storage contract exists.
- **Risk**: migration risk if changed without an explicit replacement test.

## Current stylesheet ownership state

Current static order:

1. `style.css`
2. `ui-v2.css`
3. `ui-v4.css`
4. `ads.css`
5. `src/ui-system.css`
6. `ui-v3.css`

Both `ui-v3.css` and `ui-v4.css` are now statically declared in `index.html`. `features-v3-core.mjs` and `ui-v4.mjs` no longer create stylesheet links at runtime.

`ui-v3.css` intentionally remains after `ui-system.css`, matching the effective cascade position it previously received when appended dynamically.

The remaining cleanup is therefore primarily **winning-rule migration**, not runtime stylesheet-loader removal.

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
- `src/ui-system.css`: later system rules for shared controls/favorites, but it does not yet own the core next-card geometry.

**Risk: HIGH**

Do not migrate the whole Home card as one CSS block. The current card is composed across renderers and layers.

### Bottom Navigation

**DOM / behavior**

- base markup: `index.html`
- view switching: `app.mjs`
- icon/portal compatibility behavior: `ui-v6.mjs`
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
- `ui-v3.css`: result stepper and custom stay control.
- `src/ui-system.css`: final current route-editor layout, Search sheets and control geometry.

Current 390×844 baseline includes:

- `#search-form`: ~358×272, 22px radius
- `.search-timing-button`: ~336×43, 16px radius

**Risk: HIGH**

Do not combine date/time/iOS cleanup with sheet or route-editor migration.

### Search result stepper (`#result-stepper`)

**DOM / behavior owner**: `features-v3-core.mjs`

**Presentation owner**: `ui-v3.css`

**Downstream behavior**: changes Search date/time and submits the Search form.

A same-layer cleanup already consolidated its effective `min-height:44px` and `font-size:12px` into the primary stepper rule and removed the later duplicate declaration.

**Risk: MEDIUM**

The v3 stylesheet load-order boundary is now stable/static, but the stepper's live visual properties still need explicit semantic transfer before retirement.

## Timetable

### Route controls (`#timetable-route-controls`)

**DOM owner**: `features-v3-core.mjs` replaces legacy `.timetable-direction`.

**Behavior owner**: `features-v3-core.mjs` campus/destination/Suita-stop selection and route rendering.

**Presentation chain**

- `ui-v3.css`: base controls and sticky behavior.
- `src/ui-system.css`: later sticky offsets/current adjustments.

Current 390×844 baseline: approximately 343×179, sticky, 9px gap.

A same-layer dead `scroll-margin-top:110px` declaration was removed after confirming that a later rule in the same file always superseded it.

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

`ui-v4.mjs` no longer injects `ui-v4.css`; the stylesheet is statically declared in `index.html` and guarded by maintenance tests.

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

The source selector is now correctly scoped:

```css
.crowding-legend-item > span:last-child
```

Completed guarded migration:

1. narrow the source selector while retaining runtime repair,
2. confirm browser behavior + computed parity,
3. guard the narrow selector,
4. convert `ui-v4-polish.mjs` to a side-effect-free compatibility stub,
5. verify no runtime `#ui-v4-polish` style exists and fifth-person color remains correct,
6. remove the current `share-card.mjs` import while retaining the historical stub path for stale cached parents.

**Current risk: LOW** for the migrated selector. Physical deletion of the compatibility path remains deferred.

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

**Presentation owner**: **partial**.

A guarded removal experiment intentionally let the computed baseline fail and proved the following properties are still won by `ui-v3.css`:

- feedback copy: muted color, `11px`, `line-height:1.6`
- feedback link: `display:block`, OU-purple color, `12px`, weight `900`, vertical `12px` padding

Other box properties are already won by later semantic presentation, including the current transparent link background, zero radius and horizontal padding.

**Risk: LOW-MEDIUM**, but it is not removable yet.

Correct migration sequence:

1. add only the still-live properties to the semantic owner,
2. confirm computed/behavior parity,
3. suppress the old v3 feedback rules in a later checkpoint,
4. delete the old rules only after another green Preview checkpoint.

Do not weaken the computed baseline to make a deletion pass; a baseline failure is ownership evidence.

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
3. `ui-v3.css` still owns live components created by `features-v3-core.mjs`, but its **loading is now static**, not a behavior-side runtime responsibility.
4. `ui-v4.css` owns live compact timetable/detail/crowding/share presentation, while its behavior module no longer owns loading.
5. `src/ui-system.css` is already the final owner for several current surfaces, notably Navigation and large portions of Search/Settings, but it is not yet the single owner of the whole product.
6. JavaScript historical filenames are not reliable indicators of obsolescence.
7. Physical deletion happens only after direct/transitive consumers are gone and stale-browser-path compatibility is addressed.

## Next recommended migration boundary

Feedback card CSS remains the best mapped semantic candidate, but only after a safe edit path for `src/ui-system.css` is available. Until then, safe progress should focus on same-layer dead/duplicate declarations whose equivalence can be proved without crossing presentation ownership boundaries.

Do not simultaneously change:

- stylesheet load order,
- behavior initialization order,
- component DOM,
- and presentation ownership.

Those remain separate checkpoints.
