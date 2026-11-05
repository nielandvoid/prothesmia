const DAY = 86400000;
const HOUR = 3600000;
const MINUTE = 60000;

export const MIN_INTERVAL_HOURS = 1;
export const MAX_INTERVAL_HOURS = 24;

export const intervalOf = (countdown) => countdown.intervalHours ?? MIN_INTERVAL_HOURS;

export function measure(countdown, now) {
  const target = new Date(countdown.date);
  const left = Math.max(0, target - now);

  let elapsed = null;
  if (countdown.start) {
    const start = new Date(countdown.start);
    const span = target - start;
    elapsed = span > 0 ? Math.min(1, Math.max(0, (now - start) / span)) : 1;
  }

  return {
    target,
    left,
    days: Math.floor(left / DAY),
    hours: Math.floor((left % DAY) / HOUR),
    minutes: Math.floor((left % HOUR) / MINUTE),
    elapsed,
    done: left === 0,
  };
}

export function headline(m) {
  if (m.done) return { value: "0", unit: "time's up" };
  if (m.days >= 1) return { value: String(m.days), unit: m.days === 1 ? "day left" : "days left" };
  if (m.hours >= 1) return { value: String(m.hours), unit: m.hours === 1 ? "hour left" : "hours left" };
  return { value: "<1", unit: "hour left" };
}

export function timeLeft(m) {
  if (m.done) return "0m";
  if (m.days >= 1) return `${m.days}d ${m.hours}h`;
  if (m.hours >= 1) return `${m.hours}h ${m.minutes}m`;
  return `${m.minutes}m`;
}

export function dateText(m, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone,
  })
    .format(m.target)
    .toLowerCase();
}
