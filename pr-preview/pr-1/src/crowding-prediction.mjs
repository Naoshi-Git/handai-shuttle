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
    if (after < 0 || after > 35) continue;
    const candidate = after <= 10
      ? { level: 4, reason: `${period.period}限終了${after}分後に出発`, period: period.period, after }
      : after <= 20
        ? { level: 3, reason: `${period.period}限終了${after}分後に出発`, period: period.period, after }
        : { level: 2, reason: `${period.period}限終了${after}分後に出発`, period: period.period, after };
    if (candidate.level > best.level) best = candidate;
  }
  return best;
}

export function predictCrowding({ departureTime, arrivalTime }) {
  const arrival = arrivalPressure(toMinutes(arrivalTime));
  const departure = departurePressure(toMinutes(departureTime));
  let level = Math.max(arrival.level, departure.level);

  // A bus that is simultaneously just after one class and close to the next class
  // is more likely to accumulate inter-campus demand from both directions of movement.
  if (arrival.level >= 4 && departure.level >= 3) level = Math.min(5, level + 1);

  const reasons = [arrival.reason, departure.reason].filter(Boolean);
  const descriptor = CROWDING_LEVELS[level] || CROWDING_LEVELS[1];
  return {
    ...descriptor,
    reasons,
    reason: reasons.length ? reasons.join("・") : "授業開始・終了のピーク時間帯から外れています",
    methodology: "2026年度の授業開始・終了時刻と便の発着時刻から推定した目安です。実測混雑ではありません。"
  };
}

export function crowdingBadgeText(prediction) {
  return `混雑予想 Lv${prediction.level} ${prediction.label}`;
}
