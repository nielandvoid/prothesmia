import { settings } from "@devvit/web/server";
import { parseEvents, validZone, type CountdownEvent } from "../../shared/countdown.ts";

export type Config = {
  timeZone: string;
  events: CountdownEvent[];
  scheduledEnabled: boolean;
  scheduledHour: number;
  scheduledTitle: string;
  scheduledBody: string;
  ring: string;
  dimensions: string;
  fields: string[];
  tag: string;
  clock: boolean;
  postTitle: string;
};

export const DEFAULT_ZONE = "Asia/Kolkata";
const DEFAULT_TITLE = "Scheduled thread: {days} days to {event}";
const DEFAULT_POST_TITLE = "Event countdown";
const RINGS = ["default", "pride", "trans"];
const SIZES = ["tall", "compact", "desktop"];
const FIELDS = ["target", "timeLeft", "elapsed"];

const choice = (value: string | string[] | undefined, allowed: string[], fallback: string) => {
  const picked = Array.isArray(value) ? value[0] : value;
  return picked !== undefined && allowed.includes(picked) ? picked : fallback;
};

export async function loadConfig(): Promise<Config> {
  const [events, zone, enabled, hour, title, body, ring, dimensions, fields, tag, clock, postTitle] = await Promise.all([
    settings.get<string>("events"),
    settings.get<string>("timezone"),
    settings.get<boolean>("scheduledEnabled"),
    settings.get<number>("scheduledHour"),
    settings.get<string>("scheduledTitle"),
    settings.get<string>("scheduledBody"),
    settings.get<string | string[]>("ring"),
    settings.get<string | string[]>("dimensions"),
    settings.get<string[]>("fields"),
    settings.get<string>("tag"),
    settings.get<boolean>("clock"),
    settings.get<string>("postTitle"),
  ]);

  const timeZone = zone && validZone(zone) ? zone : DEFAULT_ZONE;

  return {
    timeZone,
    events: parseEvents(events ?? "", timeZone).events,
    scheduledEnabled: enabled === true,
    scheduledHour: Number.isInteger(hour) ? Number(hour) : 0,
    scheduledTitle: title?.trim() || DEFAULT_TITLE,
    scheduledBody: body ?? "",
    ring: choice(ring, RINGS, "default"),
    dimensions: choice(dimensions, SIZES, "tall"),
    fields: Array.isArray(fields) ? fields.filter((key) => FIELDS.includes(key)) : FIELDS,
    tag: tag?.trim() ?? "",
    clock: clock === true,
    postTitle: postTitle?.trim() || DEFAULT_POST_TITLE,
  };
}
