# UI Component Ownership Map

## Reading this map

This map separates **DOM ownership**, **behavior ownership**, and **presentation ownership**. A module's historical filename is a compatibility detail, not evidence that it should own CSS. Every current component presentation is owned by `src/ui-system.css`.

| Component | DOM owner | Behavior owner | Presentation owner | Migration risk |
|---|---|---|---|---|
| App shell, Topbar, and shared typography | `index.html` | `src/ui-current.mjs` | `src/ui-system.css` | Medium: header is persistent through tab transitions. |
| Bottom Navigation | `index.html`, then portalized | `src/app.mjs`, `src/ui-v6.mjs`, `src/ui-current.mjs` | `src/ui-system.css` | Medium–high: fixed positioning and glider geometry depend on DOM movement. |
| Home next-bus card | `src/app.mjs` | `src/enhancements.mjs`, `src/ui-v4.mjs`, `src/ui-current.mjs` | `src/ui-system.css` | High: rendering is composed across multiple behavior modules. |
| Search route editor and timing controls | `index.html` | `src/app.mjs`, `src/enhancements.mjs`, `src/features-v3-core.mjs`, `src/ui-v5.mjs` | `src/ui-system.css` | High: native iOS date/time containment and bottom sheets are separate concerns. |
| Search result stepper and custom stay input | `src/features-v3-core.mjs` | `src/features-v3-core.mjs` | `src/ui-system.css` | Medium: update the enhanced-controls section rather than adding local overrides. |
| Timetable route controls | `src/features-v3-core.mjs` | `src/features-v3-core.mjs` | `src/ui-system.css` | High: sticky offsets interact with the timetable ad stack. |
| Compact timetable rows and detail sheet | `src/ui-v4.mjs` | `src/ui-v4.mjs` | `src/ui-system.css` | High: compact-row rewriting and detail-sheet behavior must remain in sync. |
| Crowding information and sharing | `src/ui-v4.mjs` | `src/ui-v4.mjs`, `src/share-card.mjs` | `src/ui-system.css` | Medium: preserve the direct-child crowding legend selector. |
| Settings, saved searches, and favorites | `src/app.mjs`, `src/ui-v12.mjs`, `src/ui-v13.mjs` | `src/ui-v6.mjs`, `src/route-preferences.mjs`, `src/ui-current.mjs` | `src/ui-system.css` | High: storage migration and subpage DOM changes are independent of presentation. |
| Feedback card | `src/features-v3-core.mjs` | `src/features-v3-core.mjs` | `src/ui-system.css` | Low–medium: copy typography and link geometry now have the same semantic owner as the card surface. |
| View transitions | `src/view-lifecycle.mjs` | `src/view-lifecycle.mjs` | `src/view-lifecycle.css` | High: no ordinary component rules belong here. |
| Advertisements | `src/ads.mjs` | `src/ads.mjs` | `ads.css` | Medium: app-surface integration belongs in `src/ui-system.css`; creative geometry belongs in `ads.css`. |

## Presentation invariants

The active static stylesheet order is `style.css`, `ads.css`, then `src/ui-system.css`. Versioned UI stylesheets are retired. This deliberately makes `src/ui-system.css` the final app-presentation authority while keeping the ad component self-contained.

The migrated rules remain grouped under descriptive headings inside `src/ui-system.css`. These headings preserve an auditable migration boundary, but all future edits should be made by component responsibility rather than by the historical `vN` origin.

## Safe change sequence

Do not combine behavior initialization changes, DOM replacement, stylesheet ordering, and visual migration in one checkpoint. For a presentation-only change, modify the relevant semantic section, run the full contract suite and browser baseline, then check representative mobile views. For a behavior or DOM change, first maintain the existing presentation hooks and migrate them separately after an explicit ownership review.

The crowding legend has a specific guard: `.crowding-legend-item > span:last-child` must remain a direct-child selector. A broad descendant selector incorrectly styles nested crowding icons and must not be reintroduced.

## Verification

```bash
node --test tests/*.test.mjs
bash tests/browser-ui-baseline.sh .
```

The tests cover the absence of retired versioned CSS, no runtime presentation injection, the computed-style baseline, component behavior, storage migration, and the main mobile viewport flows.
