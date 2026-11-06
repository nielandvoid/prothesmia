import { context, reddit, redis } from "@devvit/web/server";
import { clockIn, daysLeft, fillTemplate, formatDate, upcomingEvents } from "../../shared/countdown.ts";
import { loadConfig } from "./config.ts";

const LAST_DATE_KEY = "scheduled:last-date";
const LAST_POST_KEY = "scheduled:last-post";

const isPostId = (id: string | undefined): id is `t3_${string}` => Boolean(id?.startsWith("t3_"));

export async function runScheduledThread({ force }: { force: boolean }): Promise<string> {
  const config = await loadConfig();
  const now = Date.now();
  const clock = clockIn(now, config.timeZone);

  if (!force) {
    if (!config.scheduledEnabled) return "scheduled thread is switched off";
    if (clock.hour !== config.scheduledHour) return "not the posting hour yet";
    if ((await redis.get(LAST_DATE_KEY)) === clock.date) return "already posted today";
  }

  const event = upcomingEvents(config.events, now)[0];
  if (!event) return "no upcoming event in events";

  const subredditName = context.subredditName;
  if (!subredditName) throw new Error("subredditName is missing from the context");

  const values = {
    event: event.label,
    exam: event.label,
    days: daysLeft(event, now),
    date: formatDate(event.target, config.timeZone),
  };

  const post = await reddit.submitPost({
    subredditName,
    title: fillTemplate(config.scheduledTitle, values),
    text: fillTemplate(config.scheduledBody, values),
  });

  const previousId = await redis.get(LAST_POST_KEY);
  await redis.set(LAST_DATE_KEY, clock.date);
  await redis.set(LAST_POST_KEY, post.id);

  if (isPostId(previousId)) {
    await reddit
      .getPostById(previousId)
      .then((previous) => previous.unsticky())
      .catch((error: unknown) => console.error(`could not unsticky ${previousId}: ${error}`));
  }
  await post.sticky(2).catch((error: unknown) => console.error(`could not sticky ${post.id}: ${error}`));

  return "posted";
}
