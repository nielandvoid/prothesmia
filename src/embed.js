export const FILENAME = "card.png";
export const AUTHOR = "προθεσμία";

const ICON = "https://prothesmia.xyz/assets/192x192.png";

export function buildEmbed(countdown, now) {
  const embed = {
    title: countdown.label,
    color: 0x4a4a4a,
    author: { name: AUTHOR, icon_url: ICON },
    image: { url: `attachment://${FILENAME}` },
    timestamp: now.toISOString(),
  };
  if (countdown.thumbnail) embed.thumbnail = { url: countdown.thumbnail };
  return embed;
}
