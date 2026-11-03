import { readFile, mkdir, writeFile } from "node:fs/promises";
import { measure } from "./time.js";
import { drawCard } from "./card.js";
import { buildEmbed } from "./embed.js";
import { connect } from "./discord.js";

const dry = process.argv.includes("--dry");
const now = process.env.NOW ? new Date(process.env.NOW) : new Date();

if (Number.isNaN(now.getTime())) {
  console.error(`NOW is not a valid date: ${process.env.NOW}`);
  process.exit(1);
}

const countdowns = JSON.parse(
  await readFile(new URL("../countdowns.json", import.meta.url), "utf8"),
);

const token = process.env.DISCORD_TOKEN;
if (!dry && !token) {
  console.error("DISCORD_TOKEN is not set. Use --dry to render without Discord.");
  process.exit(1);
}

const client = dry ? null : connect(token);
let failed = false;

for (const countdown of countdowns) {
  try {
    const m = measure(countdown, now);
    const png = await drawCard(countdown, m);
    const embed = buildEmbed(countdown, now);

    if (dry) {
      const dir = new URL("../out/", import.meta.url);
      await mkdir(dir, { recursive: true });
      await writeFile(new URL(`${countdown.id}.png`, dir), png);
      console.log(`${countdown.id}: rendered out/${countdown.id}.png`);
      continue;
    }

    if (!countdown.channelId || countdown.channelId.startsWith("REPLACE")) {
      throw new Error("channelId is not set in countdowns.json");
    }
    const result = await client.publish({ channelId: countdown.channelId, embed, png });
    console.log(`${countdown.id}: ${result.action} message ${result.id}`);
  } catch (error) {
    failed = true;
    console.error(`${countdown.id}: ${error.message}`);
  }
}

process.exit(failed ? 1 : 0);
