// Compatibility module retained intentionally.
//
// `src/share-card.mjs` historically imports this path for side effects. Removing
// the file outright can break cached parent modules and, as the 2026-08-12
// incident showed, can invalidate the entire enhancement module graph.
//
// The original runtime <style> repair is no longer needed because the semantic
// presentation system scopes the crowding legend label selector to a direct child:
// `.crowding-legend-item > span:last-child`.
// Keep this module resolvable while the import/cache compatibility boundary is
// retired separately from the presentation migration.

export const UI_V4_POLISH_COMPAT = true;
