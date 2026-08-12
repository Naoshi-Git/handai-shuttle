# UI presentation migration map

This document is the working map for PR #2. It describes the active presentation layers that still need to move into semantic ownership without changing the current UX.

## Current load order

`index.html` currently loads presentation in this order:

1. `style.css`
2. `ui-v2.css`
3. `ui-v4.css`
4. `ads.css`
5. `src/ui-system.css`
6. `ui-v3.css`

`ui-v3.css` intentionally remains last for now because it previously arrived through a runtime `<link>` append. The runtime injection has been removed, but moving the stylesheet earlier before its rules are migrated could change cascade behavior.

There is no longer a runtime stylesheet injector in `features-v3-core.mjs`, `ui-v4.mjs`, `ui-current.mjs`, or `ui-v5.mjs`. The obsolete `src/ui-v4-polish.mjs` repair file has also been removed; its underlying broad selector was fixed at source.

## Layer classification

### `style.css`

Status: mixed legacy base + first-generation component presentation.

Keep candidates until semantic migration is complete:

- universal `box-sizing`
- document/body structural defaults
- form font inheritance / tap highlight baseline
- `.app-shell` structural width and viewport shell behavior
- generic visibility/accessibility utilities only when they are not already owned elsewhere

Presentation that should not remain in the final base layer:

- green-era design tokens and green brand palette
- Topbar / brand mark visual treatment
- service banner colors and spacing
- Home next-card presentation
- chips, primary/secondary buttons and journey cards
- Search panel, segmented controls, inputs and toggles
- timetable cards and stop chips
- Settings cards
- Bottom Navigation presentation
- campus dialog presentation

Important dependency: `style.css .next-meta span` applies presentation to every nested `span`. `ui-v4.css` currently has explicit resets for nested crowding icons because of this broad selector. When the Home metadata presentation moves to `src/ui-system.css`, narrow the selector rather than carrying the reset forward.

### `ui-v2.css`

Status: current presentation layered over the first-generation green UI.

Semantic groups:

- **tokens / brand:** Osaka University palette, `--ou-*`, compatibility aliases for old `--green-*`
- **Home:** location controls, next-card sizing/colors, remaining summary, pills, destination chips, action buttons, journey cards
- **Search:** compact page heading, route editor, role chips, select layout, swap button, segmented mode, date/time geometry, search options and submit
- **Timetable:** direction controls, card heading colors, Minoh focus state
- **Settings/dialog:** campus dialog, campus options, Suita stop controls, `sr-only`
- **responsive/iOS:** native date/time containment and narrow-width route layout

Migration rule: move current values into matching semantic sections of `src/ui-system.css`; do not preserve `ui-v2` as a permanent “theme” layer. Remove `--green-*` aliases only after all live consumers have been migrated to semantic tokens.

### `ui-v3.css`

Status: current component presentation. No base rules.

Semantic owners:

- `location-assist` → location / Home assistance
- `stay-custom-input`, `result-stepper` → Search
- `timetable-route-controls`, `tt-campus-tabs`, `tt-destination-*`, `tt-suita-stop`, `tt-current-status` → Timetable controls
- `route-timetable-card.is-next`, `next-marker`, `tt-route-caption` → Timetable current-bus state
- `feedback-card`, `feedback-link` → Settings / feedback
- sticky `#timetable-route-controls` → Timetable sticky stack
- touch/user-select rules → interaction/accessibility rules for the owning components

Risk: this stylesheet currently loads after `src/ui-system.css`, preserving the old runtime-append cascade. Migrate a semantic group completely before removing its rule from `ui-v3.css`.

### `ui-v4.css`

Status: current feature/component presentation. No base rules.

Semantic owners:

- compact timetable row and current-bus state
- Home next-card share action and compact metadata
- crowding icon and level colors
- result/upcoming share affordance
- timetable detail bottom sheet
- route-axis / stop timeline
- crowding explanation/legend in Settings
- branded share-card preview sheet
- narrow viewport adjustments

Known legacy dependencies to remove during migration:

- `.route-timetable-card[data-v4-compact="true"] { padding: 0 !important; ... }`
- `.next-meta.next-meta-v4 { flex-wrap: nowrap !important; ... }`
- `.next-meta .crowding-icon` and `.next-meta .crowding-person` use `!important` primarily to defeat `style.css .next-meta span`

The old `src/ui-v4-polish.mjs` workaround is retired. The crowding legend label now uses the direct-child selector `.crowding-legend-item > span:last-child`, so nested person icons are not matched.

## Safe migration order

### Step 1 — `ui-v3.css` isolated components

Move one semantic group at a time into `src/ui-system.css`:

1. feedback card
2. location assist
3. Search result stepper / custom stay input
4. timetable route controls
5. sticky/touch refinements

For each group: migrate rules → remove old group from `ui-v3.css` → Validate → Preview → inspect relevant screen.

### Step 2 — `ui-v4.css` feature groups

Recommended order:

1. crowding legend/icon
2. share-card preview and share buttons
3. timetable detail sheet
4. compact timetable row
5. Home compact metadata

Home compact metadata is intentionally last because it has the strongest dependency on broad `style.css` selectors.

### Step 3 — `ui-v2.css`

Move component presentation to the semantic system in screen-sized slices:

1. Settings/dialog
2. Timetable
3. Search
4. Home
5. design tokens / compatibility aliases

The token aliases are retired only after all component consumers have been checked.

### Step 4 — shrink `style.css`

Once the final component values are owned by `src/ui-system.css`, delete superseded component blocks from `style.css` instead of leaving them underneath as overridden defaults.

Target end state for `style.css`: structural primitives only. If a selector describes a named app component, its final presentation belongs in `src/ui-system.css`.

### Step 5 — retire version stylesheets

Only after the relevant rules have moved and Preview is verified:

- delete `ui-v3.css` and remove its HTML/workflow references
- delete `ui-v4.css` and remove its HTML/workflow references
- delete `ui-v2.css` and remove its HTML/workflow references
- add CI guards preventing any `ui-vN.css` reintroduction

## Regression boundaries

At every migration boundary, preserve:

- Home next bus and upcoming list
- Home → Search entry lifecycle
- Search date/time layout on iOS
- result previous/next controls
- timetable sticky selector position
- compact timetable rows and detail sheet
- crowding icon level rendering and Settings legend
- share actions and share-card preview
- Settings subpage and saved/favorite collections
- Bottom Navigation and reduced-motion behavior

The fixed PR Preview URL is the visual source of truth after both `Validate app` and `Deploy PR Pages preview` are green:

`https://naoshi-git.github.io/handai-shuttle/pr-preview/pr-2/`
