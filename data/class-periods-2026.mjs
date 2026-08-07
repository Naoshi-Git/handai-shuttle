// Osaka University 2026 class periods used only for heuristic crowding estimates.
// Official references checked 2026-08-07:
// - Human Sciences 2026 handbook
// - School of Letters 2026 handbook
// This is not a passenger-count dataset.
//
// Crowding prediction intentionally uses periods 1-5 only. Period 6 has little
// practical impact on the daytime inter-campus shuttle demand model; instead,
// the post-period-5 departure rush is treated as the final daily peak.
export const CLASS_PERIOD_SOURCE = {
  label: "大阪大学 2026年度 授業時間（混雑予想は1〜5限を使用）",
  urls: [
    "https://www.hus.osaka-u.ac.jp/ja/students/handbook/2026/handbook_undergraduate.pdf",
    "https://www.let.osaka-u.ac.jp/ja/files/7jnox9"
  ]
};

export const CLASS_PERIODS = [
  { period: 1, start: "08:50", end: "10:20" },
  { period: 2, start: "10:30", end: "12:00" },
  { period: 3, start: "13:30", end: "15:00" },
  { period: 4, start: "15:10", end: "16:40" },
  { period: 5, start: "16:50", end: "18:20", finalRush: true }
];
