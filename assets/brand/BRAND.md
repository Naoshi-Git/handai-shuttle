# 阪大シャトル Brand Assets v2

## Core colors
- OU / UI Indigo: `#2D287F`
- Gradient middle: `#393DCD`
- Gradient purple: `#7C3AED`
- Emblem: `#FFFFFF`

## Geometry policy
- App icon canvas is strictly `1:1`.
- The emblem geometry is derived from the supplied master artwork and scaled **uniformly**. Non-uniform stretching is prohibited.
- The 1024px master uses an 8px downward optical correction so the emblem does not appear top-heavy.
- Horizontal lockups reuse the exact same full-white emblem as the standalone icon.
- Japanese and English wordmarks use OU/UI Indigo (`#2D287F`) on light backgrounds. Black is not part of the core brand palette.

## Files
- `app-icon.svg`: full-bleed square app/PWA icon.
- `brand-icon-rounded.svg`: rounded transparent-context brand icon for page headers/cards.
- `logo-horizontal.svg`: horizontal lockup for light backgrounds.
- `logo-horizontal-white.svg`: reverse lockup for dark backgrounds.

## Usage
Use `app-icon.svg` for manifest/favicon purposes and `brand-icon-rounded.svg` inside the web UI. Keep the icon at `aspect-ratio: 1 / 1` and never resize width/height independently.
