export type CountdownEvent = { label: string; target: string; start?: string };

export type Clock = { date: string; hour: number; minute: number };

const OFFSET_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/;
const LOCAL_FORM = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/;

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function validZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function zoneParts(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(instant);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: pick("year"), month: pick("month"), day: pick("day"), hour: pick("hour"), minute: pick("minute") };
}

function offsetAt(instant: number, timeZone: string): number {
  const p = zoneParts(instant, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(instant / MINUTE) * MINUTE;
}

export function parseInstant(text: string, timeZone: string): Date | null {
  const value = text.trim();

  if (OFFSET_SUFFIX.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match = LOCAL_FORM.exec(value);
  if (!match) return null;

  const [year = 0, month = 1, day = 1, hour = 0, minute = 0] = match.slice(1).map((part) => Number(part ?? 0));
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const date = new Date(guess - offsetAt(guess - offsetAt(guess, timeZone), timeZone));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseEvents(text: string, timeZone: string): { events: CountdownEvent[]; errors: string[] } {
  const events: CountdownEvent[] = [];
  const errors: string[] = [];

  for (const entry of text.split(";").map((part) => part.trim()).filter(Boolean)) {
    const [label, date, start] = entry.split("|").map((part) => part.trim());
    const target = date ? parseInstant(date, timeZone) : null;
    const from = start ? parseInstant(start, timeZone) : undefined;
    const broken = !label || !target || from === null || (from !== undefined && from >= target);
    if (broken) {
      errors.push(entry);
      continue;
    }
    events.push({ label, target: target.toISOString(), ...(from ? { start: from.toISOString() } : {}) });
  }

  events.sort((a, b) => Date.parse(a.target) - Date.parse(b.target));
  return { events, errors };
}

export function upcomingEvents(events: CountdownEvent[], now: number): CountdownEvent[] {
  return events.filter((event) => Date.parse(event.target) > now);
}

export function daysLeft(event: CountdownEvent, now: number): number {
  return Math.max(0, Math.floor((Date.parse(event.target) - now) / DAY));
}

export function split(ms: number) {
  const left = Math.max(0, ms);
  return {
    days: Math.floor(left / DAY),
    hours: Math.floor((left % DAY) / HOUR),
    minutes: Math.floor((left % HOUR) / MINUTE),
    seconds: Math.floor((left % MINUTE) / 1000),
  };
}

export function progress(event: CountdownEvent, now: number): number {
  if (!event.start) return 1;
  const start = Date.parse(event.start);
  const target = Date.parse(event.target);
  return Math.min(1, Math.max(0, (now - start) / (target - start)));
}

export function clockIn(instant: number, timeZone: string): Clock {
  const p = zoneParts(instant, timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, hour: p.hour, minute: p.minute };
}

export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone })
    .format(new Date(iso))
    .toLowerCase();
}

export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => String(values[key] ?? whole));
}
