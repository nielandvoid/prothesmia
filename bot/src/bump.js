import { bumpIntervalOf } from "./time.js";
import { postsLater } from "./refresh.js";

const HOUR = 3600000;

export const BUMP_MESSAGES = [
  "hi lol",
  "uwu",
  "nyan~",
  "rawr~",
  ":3",
  "meow",
  "ehe~",
  "onii-chan no baka!!",
  "<3",
];

const isDue = (countdown, now) =>
  countdown.bump && countdown.bumpedAt && now - new Date(countdown.bumpedAt) >= bumpIntervalOf(countdown) * HOUR;

const pick = () => BUMP_MESSAGES[Math.floor(Math.random() * BUMP_MESSAGES.length)];

export async function bumpAll(db, client, now = new Date()) {
  if (!BUMP_MESSAGES.length) return;

  const due = (await db.all()).filter((countdown) => !postsLater(countdown, now) && isDue(countdown, now));
  const bumped = new Set();

  for (const countdown of due) {
    try {
      if (!bumped.has(countdown.channelId)) {
        await client.flash({ channelId: countdown.channelId, content: pick() });
        bumped.add(countdown.channelId);
      }
      await db.markBumped(countdown.channelId, countdown.label, now);
    } catch (error) {
      console.error(`${countdown.guildId}/${countdown.channelId} ${countdown.label}: bump failed: ${error.message}`);
    }
  }
}
