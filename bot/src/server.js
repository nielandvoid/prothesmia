import { createServer } from "node:http";
import { createPublicKey, verify } from "node:crypto";
import { openDatabase } from "./db.js";
import { connect } from "./discord.js";
import { createCommands, helpText } from "./commands.js";
import { refreshAll } from "./refresh.js";
import { bumpAll } from "./bump.js";

const required = ["DISCORD_TOKEN", "DISCORD_APP_ID", "DISCORD_PUBLIC_KEY", "TURSO_URL", "TURSO_TOKEN"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`missing environment: ${missing.join(", ")}`);
  process.exit(1);
}

const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const publicKey = createPublicKey({
  key: Buffer.concat([SPKI_PREFIX, Buffer.from(process.env.DISCORD_PUBLIC_KEY, "hex")]),
  format: "der",
  type: "spki",
});

const API = "https://discord.com/api/v10";
const MIN_GAP = 60000;

const db = await openDatabase({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN });
const client = connect(process.env.DISCORD_TOKEN);
const commands = createCommands({ db, client });

let lastRun = 0;
let running = false;

async function refreshIfDue() {
  if (running || Date.now() - lastRun < MIN_GAP) return;
  running = true;
  try {
    await refreshAll(db, client);
    await bumpAll(db, client);
    lastRun = Date.now();
  } catch (error) {
    console.error(`refresh failed: ${error.message}`);
  } finally {
    running = false;
  }
}

function signed(req, body) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  if (!signature || !timestamp) return false;
  try {
    return verify(null, Buffer.from(timestamp + body), publicKey, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

async function response(token, content) {
  const res = await fetch(`${API}/webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
  });
  if (!res.ok) console.error(`reply failed: ${res.status}`);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    refreshIfDue();
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.method === "POST" && req.url === "/interactions") {
    const body = await readBody(req);
    if (!signed(req, body)) {
      res.writeHead(401).end();
      return;
    }

    const interaction = JSON.parse(body);
    if (interaction.type === 1) return send(res, 200, { type: 1 });
    if (interaction.type === 4 && interaction.data?.name === "countdown") {
      const choices = await commands.autocomplete(interaction).catch(() => []);
      return send(res, 200, { type: 8, data: { choices } });
    }
    if (interaction.type === 2 && interaction.data?.name === "help") {
      return send(res, 200, { type: 4, data: { flags: 64, content: helpText, allowed_mentions: { parse: [] } } });
    }
    if (interaction.type !== 2 || interaction.data?.name !== "countdown") return send(res, 400, {});

    const { ack, work } = commands.handle(interaction);
    send(res, 200, ack);
    if (work) work().then((content) => response(interaction.token, content));
    return;
  }

  res.writeHead(404).end();
});

server.listen(process.env.PORT ?? 3000, () => console.log("listening"));

setInterval(refreshIfDue, 5 * 60000);
refreshIfDue();
