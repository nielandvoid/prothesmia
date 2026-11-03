const OFFSET_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/;
const LOCAL_FORM = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/;

export function validZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function offsetAt(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(instant);
  const pick = (type) => Number(parts.find((part) => part.type === type).value);
  const local = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute"));
  return local - Math.floor(instant / 60000) * 60000;
}

export function parseInstant(text, timeZone) {
  const value = text.trim();

  if (OFFSET_SUFFIX.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match = LOCAL_FORM.exec(value);
  if (!match) return null;

  const [year, month, day, hour, minute] = match.slice(1).map((part) => Number(part ?? 0));
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const date = new Date(guess - offsetAt(guess - offsetAt(guess, timeZone), timeZone));
  return Number.isNaN(date.getTime()) ? null : date;
}
