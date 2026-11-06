import { Hono } from "hono";
import { formatDate, upcomingEvents } from "../../shared/countdown.ts";
import type { CountdownResponse, ErrorResponse } from "../../shared/api.ts";
import { loadConfig } from "../core/config.ts";

export const api = new Hono();

api.get("/countdown", async (c) => {
  try {
    const config = await loadConfig();
    const now = Date.now();
    const [event] = upcomingEvents(config.events, now);

    return c.json<CountdownResponse>({
      status: "ok",
      now,
      event: event ?? null,
      style: { ring: config.ring, dimensions: config.dimensions, fields: config.fields, tag: config.tag, clock: config.clock },
      targetText: event ? formatDate(event.target, config.timeZone) : null,
    });
  } catch (error) {
    console.error(`countdown failed: ${error}`);
    return c.json<ErrorResponse>({ status: "error", message: "couldn't load the countdown" }, 500);
  }
});
