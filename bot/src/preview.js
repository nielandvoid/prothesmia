import { mkdir, writeFile } from "node:fs/promises";
import { measure } from "./time.js";
import { drawCard } from "./card.js";

const now = process.env.NOW ? new Date(process.env.NOW) : new Date();
if (Number.isNaN(now.getTime())) {
  console.error(`NOW is not a valid date: ${process.env.NOW}`);
  process.exit(1);
}

const sample = {
  label: "JEE Main 2027",
  date: "2027-01-04T09:00:00+05:30",
  start: "2026-04-01T00:00:00+05:30",
  timeZone: "Asia/Kolkata",
};

const variants = {
  table: sample,
  ring: { ...sample, fields: [] },
  compact: { ...sample, dimensions: "compact" },
};

const dir = new URL("../out/", import.meta.url);
await mkdir(dir, { recursive: true });

for (const [name, countdown] of Object.entries(variants)) {
  await writeFile(new URL(`${name}.png`, dir), await drawCard(countdown, measure(countdown, now)));
  console.log(`out/${name}.png`);
}
