import { createHash } from "node:crypto";

const ICON = "https://prothesmia.xyz/assets/192x192.png";

export function cardName(label) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const hash = createHash("sha1").update(label).digest("hex").slice(0, 6);
  return `${slug || "card"}-${hash}.png`;
}

function updatedAt(now, timeZone) {
  const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
    timeZone,
  }).format(now);
  return `${date.toLowerCase()}, ${time.toUpperCase()}`;
}

export function buildEmbed(countdown, now) {
  const embed = {
    color: 0x4a4a4a,
    image: { url: `attachment://${cardName(countdown.label)}` },
    footer: { text: `updated ${updatedAt(now, countdown.timeZone)} / prothesmia.xyz` },
  };
  if (countdown.thumbnail) {
    embed.thumbnail = { url: countdown.thumbnail };
    embed.author = { name: "προθεσμία", icon_url: ICON };
  }
  return embed;
}
