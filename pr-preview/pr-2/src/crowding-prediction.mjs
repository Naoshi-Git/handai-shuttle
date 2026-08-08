import { CLASS_PERIODS } from "../data/class-periods-2026.mjs";

export const CROWDING_LEVELS = {
  1: { level: 1, label: "空きやすい" },
  2: { level: 2, label: "混雑小" },
  3: { level: 3, label: "やや混雑" },
  4: { level: 4, label: "混雑" },
  5: { level: 5, label: "かなり混雑" }
};

function toMinutes(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function arrivalPressure(arrivalMinutes) {
  if (arrivalMinutes == null) return { level: 1, reason: null, period: null, margin: null };
  for (const period of CLASS_PERIODS) {
    const start = toMinutes(period.start);
    const margin = start - arrivalMinutes;
    if (margin < 0 || margin > 60) continue;
    if (margin <= 10) return { level: 5, reason: `${period.period}限開始${margin}分前に到着`, period: period.period, margin };
    if (margin <= 20) return { level: 4, reason: `${period.period}限開始${margin}分前に到着`, period: period.period, margin };
    if (margin <= 35) return { level: 3, reason: `${period.period}限開始${margin}分前に到着`, period: period.period, margin };
    return { level: 2, reason: `${period.period}限開始${margin}分前に到着`, period: period.period, margin };
  }
  return { level: 1, reason: null, period: null, margin: null };
}

function departurePressure(departureMinutes) {
  if (departureMinutes == null) return { level: 1, reason: null, period: null, after: null };
  let best = { level: 1, reason: null, period: null, after: null };

  for (const period of CLASS_PERIODS) {
    const end = toMinutes(period.end);
    const after = departureMinutes - end;
    if (after < 0) continue;

    let candidate = null;
    if (period.finalRush) {
      // Period 5 is the final meaningful daytime class peak. Students leaving
      // campus after 18:20 concentrate into the following shuttle departures.
      if (after <= 15) candidate = { level: 5, reason: `5限終了${after}分後の移動ラッシュ`, period: 5, after };
      else if (after <= 30) candidate = { level: 4, reason: `5限終了${after}分後の移動ラッシュ`, period: 5, after };
      else if (after <= 50) candidate = { level: 3, reason: `5限終了${after}分後の移動ラッシュ`, period: 5, after };
      else if (after <= 75) candidate = { level: 2, reason: `5限終了${after}分後の移動ラッシュ`, period: 5, after };
    } else if (after <= 35) {
      candidate = after <= 10
        ? { level: 4, reason: `${period.period}限終了${after}分後に出発`, period: period.period, after }
        : after <= 20
          ? { level: 3, reason: `${period.period}限終了${after}分後に出発`, period: period.period, after }
          : { level: 2, reason: `${period.period}限終了${after}分後に出発`, period: period.period, after };
    }

    if (candidate && candidate.level > best.level) best = candidate;
  }
  return best;
}

export function predictCrowding({ departureTime, arrivalTime }) {
  const arrival = arrivalPressure(toMinutes(arrivalTime));
  const departure = departurePressure(toMinutes(departureTime));
  let level = Math.max(arrival.level, departure.level);

  // Inter-class movement can combine students leaving one class with students
  // trying to reach the next class. Period 5's final rush is already scored
  // strongly above, so this correction mainly applies to periods 1-4.
  if (arrival.level >= 4 && departure.level >= 3) level = Math.min(5, level + 1);

  const reasons = [arrival.reason, departure.reason].filter(Boolean);
  const descriptor = CROWDING_LEVELS[level] || CROWDING_LEVELS[1];
  return {
    ...descriptor,
    reasons,
    reason: reasons.length ? reasons.join("・") : "1〜5限の授業開始・終了ピークから外れています",
    methodology: "1〜5限の授業開始・終了時刻と便の発着時刻から推定した目安です。5限終了後は最終の移動ラッシュとして補正しています。実測混雑ではありません。"
  };
}

export function crowdingBadgeText(prediction) {
  return `混雑予想 Lv${prediction.level} ${prediction.label}`;
}
