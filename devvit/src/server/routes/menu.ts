import { Hono } from "hono";
import { context } from "@devvit/web/server";
import type { UiResponse } from "@devvit/web/shared";
import { createCountdownPost } from "../core/post.ts";
import { runScheduledThread } from "../core/scheduled.ts";

export const menu = new Hono();

menu.post("/create-post", async (c) => {
  try {
    const post = await createCountdownPost();
    return c.json<UiResponse>({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`could not create the countdown post: ${error}`);
    return c.json<UiResponse>({ showToast: "couldn't post it. try again." }, 400);
  }
});

menu.post("/scheduled-now", async (c) => {
  try {
    const result = await runScheduledThread({ force: true });
    return c.json<UiResponse>({ showToast: result });
  } catch (error) {
    console.error(`could not post the scheduled thread: ${error}`);
    return c.json<UiResponse>({ showToast: "couldn't post the thread. try again." }, 400);
  }
});
