import { Hono } from "hono";
import type { TaskResponse } from "@devvit/web/server";
import { runScheduledThread } from "../core/scheduled.ts";

export const scheduler = new Hono();

scheduler.post("/scheduled-thread", async (c) => {
  try {
    const result = await runScheduledThread({ force: false });
    if (result.startsWith("posted")) console.log(`scheduled thread: ${result}`);
  } catch (error) {
    console.error(`scheduled thread failed: ${error}`);
  }
  return c.json<TaskResponse>({ status: "ok" }, 200);
});
