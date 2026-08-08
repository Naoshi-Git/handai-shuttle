// Small compatibility overrides for v4 UI that must win over legacy broad selectors.
// Kept separate so the pre-v4 stylesheets can remain untouched while the migration PR is open.
const STYLE_ID = "ui-v4-polish";

if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    /* Legacy .crowding-legend-item span:last-child also matched the fifth person icon. */
    .crowding-legend-item .crowding-person {
      font-size: inherit !important;
      font-weight: inherit !important;
      color: #d7d8df !important;
      white-space: normal !important;
    }
    .crowding-legend-item .crowding-person.is-active {
      color: var(--crowd-color) !important;
    }
  `;
  document.head.append(style);
}
