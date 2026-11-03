import { measure } from "./time.js";
import { drawCard } from "./card.js";
import { buildEmbed, cardName } from "./embed.js";

export async function refreshOne(client, countdown, now = new Date()) {
  const png = await drawCard(countdown, measure(countdown, now));
  return client.publish({
    channelId: countdown.channelId,
    embed: buildEmbed(countdown, now),
    png,
    filename: cardName(countdown.label),
  });
}

export async function refreshAll(db, client, now = new Date()) {
  const countdowns = await db.all();
  let failed = 0;

  for (const countdown of countdowns) {
    try {
      await refreshOne(client, countdown, now);
    } catch (error) {
      failed++;
      console.error(`${countdown.guildId}/${countdown.channelId} ${countdown.label}: ${error.message}`);
    }
  }

  console.log(`refreshed ${countdowns.length - failed} of ${countdowns.length}`);
}
