import { command, helpCommand } from "./commands.js";

const { DISCORD_TOKEN, DISCORD_APP_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_APP_ID) {
  console.error("set DISCORD_TOKEN and DISCORD_APP_ID first");
  process.exit(1);
}

const res = await fetch(`https://discord.com/api/v10/applications/${DISCORD_APP_ID}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${DISCORD_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify([command, helpCommand]),
});

if (!res.ok) {
  console.error(`${res.status} ${await res.text()}`);
  process.exit(1);
}

console.log("registered /countdown, /help");
