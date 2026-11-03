import { validZone, parseInstant } from "./zone.js";
import { refreshOne } from "./refresh.js";
import { cardName } from "./embed.js";

const MANAGE_GUILD = 1n << 5n;
const EPHEMERAL = 64;
const FIELD_KEYS = ["target", "timeLeft", "elapsed"];

const option = (name, description, required = false) => ({ type: 3, name, description, required });

const settings = (editing) => [
  option("deadline", editing ? "new deadline, like 2027-01-04 09:00" : "deadline as 2027-01-04 09:00", !editing),
  option("timezone", "iana zone like Asia/Kolkata, defaults to UTC"),
  option("start", "when the ring starts filling, none to clear"),
  option("tag", "small text in the top corner, none to hide it, default for the label"),
  option("fields", "rows beside the ring: target, timeLeft, elapsed, none or default"),
  option("thumbnail", "image url for the embed corner, none to clear"),
  {
    ...option("dimensions", "card shape, defaults to tall"),
    choices: [
      { name: "tall", value: "tall" },
      { name: "compact", value: "compact" },
    ],
  },
];

const picker = { ...option("label", "specify title if more than one countdown"), autocomplete: true };

export const command = {
  name: "countdown",
  description: "a countdown embed; updates itself every hour",
  default_member_permissions: String(MANAGE_GUILD),
  dm_permission: false,
  options: [
    {
      type: 1,
      name: "set",
      description: "post / replace a countdown in this channel",
      options: [option("label", "the title, for example JEE Main 2027", true), ...settings(false)],
    },
    {
      type: 1,
      name: "configure",
      description: "configure a countdown in this channel",
      options: [picker, ...settings(true)],
    },
    {
      type: 1,
      name: "remove",
      description: "delete a countdown from this channel",
      options: [{ ...picker, description: "which countdown to delete", required: true }],
    },
    {
      type: 1,
      name: "list",
      description: "show server-wide countdown config",
      options: [{ ...picker, description: "limit to one countdown, otherwise the whole server" }],
    },
  ],
};

function parseCommand(interaction) {
  const sub = interaction.data.options[0];
  const values = Object.fromEntries((sub.options ?? []).map((option) => [option.name, option.value]));
  return { name: sub.name, values };
}

function build(values, interaction) {
  const timeZone = values.timezone ?? "UTC";
  if (!validZone(timeZone)) return { error: `${timeZone} is not a time zone name. try Asia/Kolkata or Europe/London.` };

  const date = parseInstant(values.deadline, timeZone);
  if (!date) return { error: "couldn't read the date. write it like 2027-01-04 09:00." };

  let start;
  if (values.start && values.start.toLowerCase() !== "none") {
    start = parseInstant(values.start, timeZone);
    if (!start) return { error: "couldn't read the start date. write it like 2026-04-01." };
    if (start >= date) return { error: "start has to be before the deadline." };
  }

  let fields;
  if (values.fields !== undefined && values.fields.trim().toLowerCase() !== "default") {
    const raw = values.fields.trim();
    fields = raw.toLowerCase() === "none" ? [] : raw.split(/[\s,]+/).filter(Boolean);
    const unknown = fields.find((key) => !FIELD_KEYS.includes(key));
    if (unknown) return { error: `${unknown} isn't a field. use ${FIELD_KEYS.join(", ")}, none or default.` };
  }

  let thumbnail;
  if (values.thumbnail && values.thumbnail.toLowerCase() !== "none") {
    if (!/^https:\/\//.test(values.thumbnail)) return { error: "the thumbnail has to be an https image url." };
    thumbnail = values.thumbnail;
  }

  const rawTag = values.tag?.toLowerCase();
  const tag = values.tag === undefined || rawTag === "default" ? undefined : rawTag === "none" ? "" : values.tag;

  return {
    countdown: {
      guildId: interaction.guild_id,
      channelId: interaction.channel_id,
      label: values.label.trim().slice(0, 100),
      date: date.toISOString(),
      start: start?.toISOString(),
      tag,
      timeZone,
      fields,
      thumbnail,
      dimensions: values.dimensions,
    },
  };
}

function asInput(row) {
  const input = { label: row.label, deadline: row.date, timezone: row.timeZone };
  if (row.start) input.start = row.start;
  if (row.tag !== undefined) input.tag = row.tag === "" ? "none" : row.tag;
  if (row.fields !== undefined) input.fields = row.fields.length ? row.fields.join(", ") : "none";
  if (row.thumbnail) input.thumbnail = row.thumbnail;
  if (row.dimensions) input.dimensions = row.dimensions;
  return input;
}

const HOUR_SECONDS = 3300;

const stamp = (date, style) => `<t:${Math.floor(new Date(date) / 1000)}:${style}>`;

function describe(row, lastRun) {
  const tag = row.tag === undefined ? "the label" : row.tag === "" ? "hidden" : row.tag;
  const fields = row.fields === undefined ? "all" : row.fields.length ? row.fields.join(", ") : "none";
  const refreshed = lastRun
    ? `last refresh <t:${Math.floor(lastRun / 1000)}:R>, next <t:${Math.floor(lastRun / 1000) + HOUR_SECONDS}:R>`
    : "first refresh pending";

  return [
    `**${row.label}** in <#${row.channelId}>`,
    `deadline ${stamp(row.date, "f")}, ${stamp(row.date, "R")}`,
    `time zone ${row.timeZone}, start ${row.start ? stamp(row.start, "d") : "none"}`,
    `tag ${tag}, fields ${fields}, dimensions ${row.dimensions ?? "tall"}`,
    `thumbnail ${row.thumbnail ?? "none"}`,
    refreshed,
  ].join("\n");
}

export function createCommands({ db, client, lastRun = () => 0 }) {
  async function target(interaction, label) {
    const rows = await db.inChannel(interaction.guild_id, interaction.channel_id);
    if (!rows.length) return { error: "no countdowns in this channel. try `/countdown set`." };

    if (label === undefined) {
      if (rows.length > 1) return { error: `this channel has ${rows.length} countdowns. pick one with label.` };
      return { row: rows[0] };
    }

    const wanted = label.trim().toLowerCase();
    const row = rows.find((candidate) => candidate.label.toLowerCase() === wanted);
    return row ? { row } : { error: `no countdown called **${label.trim()}** in this channel.` };
  }

  async function run(interaction) {
    const { name, values } = parseCommand(interaction);

    if (name === "set") {
      const { countdown, error } = build(values, interaction);
      if (error) return error;
      await db.save(countdown);
      const result = await refreshOne(client, countdown);
      return `${result.action} **${countdown.label}** in <#${countdown.channelId}>. it refreshes every hour.`;
    }

    if (name === "configure") {
      const { label, ...changes } = values;
      if (!Object.keys(changes).length) return "nothing to change. pass at least one setting.";
      const found = await target(interaction, label);
      if (found.error) return found.error;
      const { countdown, error } = build({ ...asInput(found.row), ...changes }, interaction);
      if (error) return error;
      await db.save(countdown);
      await refreshOne(client, countdown);
      return `updated **${countdown.label}**.`;
    }

    if (name === "remove") {
      const found = await target(interaction, values.label);
      if (found.error) return found.error;
      const { label } = found.row;
      await db.remove(interaction.guild_id, interaction.channel_id, label);
      await client.remove({ channelId: interaction.channel_id, filename: cardName(label) }).catch(() => {});
      return `removed **${label}**.`;
    }

    const all = await db.inGuild(interaction.guild_id);
    const wanted = values.label?.trim().toLowerCase();
    const rows = wanted ? all.filter((row) => row.label.toLowerCase() === wanted) : all;
    if (!rows.length) return wanted ? "no countdown called **" + values.label.trim() + "** in this server." : "no countdowns in this server yet. try /countdown set.";

    const text = rows.map((row) => describe(row, lastRun())).join("\n\n");
    return text.length > 1900 ? `${text.slice(0, 1900)}...` : text;
  }

  async function autocomplete(interaction) {
    const sub = interaction.data.options[0];
    const typed = ((sub.options ?? []).find((option) => option.focused)?.value ?? "").toLowerCase();
    const rows = sub.name === "list"
      ? await db.inGuild(interaction.guild_id)
      : await db.inChannel(interaction.guild_id, interaction.channel_id);
    return rows
      .filter((row) => row.label.toLowerCase().includes(typed))
      .slice(0, 25)
      .map((row) => ({ name: row.label.slice(0, 100), value: row.label }));
  }

  function handle(interaction) {
    const allowed = BigInt(interaction.member?.permissions ?? 0) & MANAGE_GUILD;
    if (!allowed) {
      return { ack: { type: 4, data: { flags: EPHEMERAL, content: "you need manage server permission for this." } } };
    }

    return {
      ack: { type: 5, data: { flags: EPHEMERAL } },
      work: () =>
        run(interaction).catch((error) => {
          console.error(`${interaction.guild_id}: ${error.message}`);
          return `something went wrong: ${error.message.slice(0, 300)}`;
        }),
    };
  }

  return { handle, autocomplete };
}
