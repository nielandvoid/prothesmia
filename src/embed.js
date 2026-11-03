export const FILENAME = "card.png";
export const FOOTER_TEXT = "updates hourly • prothesmia.xyz";

const ICON = "https://prothesmia.xyz/assets/192x192.png";

export function buildEmbed(countdown, now) {
  const embed = {
    title: countdown.label,
    color: 0x4a4a4a,
    author: { name: "προθεσμία", icon_url: ICON },
    image: { url: `attachment://${FILENAME}` },
    footer: { text: FOOTER_TEXT, icon_url: ICON },
    timestamp: now.toISOString(),
  };
  if (countdown.thumbnail) embed.thumbnail = { url: countdown.thumbnail };
  return embed;
}
