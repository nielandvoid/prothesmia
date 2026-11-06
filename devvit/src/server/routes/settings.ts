import { Hono } from "hono";
import { settings } from "@devvit/web/server";
import type { SettingsValidationRequest, SettingsValidationResponse } from "@devvit/web/shared";
import { parseEvents, validZone } from "../../shared/countdown.ts";
import { DEFAULT_ZONE } from "../core/config.ts";

export const settingsRoutes = new Hono();

settingsRoutes.post("/validate-events", async (c) => {
  const { value } = await c.req.json<SettingsValidationRequest<string>>();
  const zone = await settings.get<string>("timezone");
  const { events, errors } = parseEvents(value ?? "", zone && validZone(zone) ? zone : DEFAULT_ZONE);

  if (errors.length) {
    return c.json<SettingsValidationResponse>({ success: false, error: `can't read: ${errors.join(" ; ")}` });
  }
  if (!events.length) {
    return c.json<SettingsValidationResponse>({ success: false, error: "add an event" });
  }
  return c.json<SettingsValidationResponse>({ success: true });
});

settingsRoutes.post("/validate-timezone", async (c) => {
  const { value } = await c.req.json<SettingsValidationRequest<string>>();
  if (!value || !validZone(value)) {
    return c.json<SettingsValidationResponse>({ success: false, error: "not a timezone. try Asia/Kolkata" });
  }
  return c.json<SettingsValidationResponse>({ success: true });
});

settingsRoutes.post("/validate-hour", async (c) => {
  const { value } = await c.req.json<SettingsValidationRequest<number>>();
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 23) {
    return c.json<SettingsValidationResponse>({ success: false, error: "enter a whole number, 0 to 23" });
  }
  return c.json<SettingsValidationResponse>({ success: true });
});
