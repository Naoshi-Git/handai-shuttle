# Settings / Install / Share review — 2026-08-11

## Install guide

- Screenshot assets are intentionally not rendered until clean source screenshots are available.
- The guide uses an empty 9:19.5 phone frame as the insertion target.
- Frame height is viewport-bounded so the step title and description remain visible on a typical iPhone screen.
- Do not add image probing, low-resolution heuristics, artificial crop, shadow, or screenshot-specific scaling.

## Settings subpage

### Problems found

- Historical `ui-v12` / `ui-v13` behavior layers still attempted to inject deleted version CSS and add retired body presentation classes.
- The settings subpage lived inside the app shell, making its relationship to the portaled Bottom Navigation dependent on stacking contexts.
- Closing restored the moved settings card after a fixed timeout rather than when the transform actually finished.
- The panel bottom edge could overlap the floating Bottom Navigation.
- A settings subpage could remain open while a Bottom Navigation transition started.

### Current contract

- `ui-v12.mjs` and `ui-v13.mjs` are behavior-only and do not inject retired stylesheets or add version body classes.
- `#settings-subpage-v13` is portaled to `document.body`.
- Bottom Navigation stays above the subpage; the subpage also reserves nav height + safe area + 18px clearance.
- Closing uses `transitionend` with a timeout fallback, then restores the moved card.
- Bottom Navigation clicks and cross-view lifecycle changes close the subpage immediately.
- Edge-swipe back starts only near the left edge and ignores form controls and the install-guide horizontal carousel.

## Share identity

The Web Share API does not expose a caller-controlled icon field. The app therefore uses one shared URL identity instead of attempting to pass an unsupported `icon` property.

- Existing raster app icons are the source of truth:
  - `assets/brand/app-icon-32.png`
  - `assets/brand/app-icon-180.png`
- `src/share-identity.mjs` installs the raster favicon / Apple Touch Icon and resolves the current-scope `share.html` URL.
- `share.html` contains static favicon, Apple Touch Icon, Open Graph, and Twitter image metadata before JavaScript runs.
- Route sharing, ordinary house-ad sharing, and timetable-detail house-ad sharing all use this same identity URL.
- `manifest.webmanifest` prefers the PNG icon and retains the SVG maskable fallback.

## Regression boundary

This pass does not modify `index.html` or `src/ui-system.css`. The broad DOM rollback incident must not be repeated just to change share metadata or icons.
