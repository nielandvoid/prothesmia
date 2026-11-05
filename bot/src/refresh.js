import { measure, intervalOf } from "./time.js";
import { drawCard } from "./card.js";
import { buildEmbed, cardName } from "./embed.js";

const HOUR = 3600000;

const stepOf = (countdown) => intervalOf(countdown) * HOUR;

const slotAt = (countdown, now) => {
  const target = new Date(countdown.date).getTime();
  const step = stepOf(countdown);
  return target + Math.floor((now - target) / step) * step;
};

export const nextRefresh = (countdown, now = new Date()) =>
  new Date(slotAt(countdown, now) + stepOf(countdown));

const isDue = (countdown, now) =>
  !countdown.refreshedAt || new Date(countdown.refreshedAt) < slotAt(countdown, now);

export const postsLater = (countdown, now = new Date()) =>
  Boolean(countdown.postAt) && new Date(countdown.postAt) > now;

export async function refreshOne(db, client, countdown, now = new Date()) {
  const png = await drawCard(countdown, measure(countdown, now));
  const result = await client.publish({
    channelId: countdown.channelId,
    embed: buildEmbed(countdown, now),
    png,
    filename: cardName(countdown.label),
  });
  await db.markRefreshed(countdown.channelId, countdown.label, now);
  return result;
}

export async function refreshAll(db, client, now = new Date()) {
  const due = (await db.all()).filter((countdown) => !postsLater(countdown, now) && isDue(countdown, now));
  let failed = 0;

  for (const countdown of due) {
    try {
      await refreshOne(db, client, countdown, now);
    } catch (error) {
      failed++;
      console.error(`${countdown.guildId}/${countdown.channelId} ${countdown.label}: ${error.message}`);
    }
  }

  if (due.length) console.log(`refreshed ${due.length - failed} of ${due.length} due`);
}
