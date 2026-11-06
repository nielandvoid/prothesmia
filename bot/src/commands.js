import { validZone, parseInstant } from "./zone.js";
import { refreshOne, postsLater, nextRefresh } from "./refresh.js";
import { cardName } from "./embed.js";
import {
  MIN_INTERVAL_HOURS,
  MAX_INTERVAL_HOURS,
  MIN_BUMP_HOURS,
  MAX_BUMP_HOURS,
  DEFAULT_BUMP_HOURS,
  intervalOf,
  bumpIntervalOf,
} from "./time.js";
import { RING_STYLES } from "./ring.js";

const MANAGE_GUILD = 1n << 5n;
const EPHEMERAL = 64;
const FIELD_KEYS = ["target", "timeLeft", "elapsed"];
const SCHEDULES = ["now", "start", "custom"];
const NO_ACCESS = /"code": (50013|50001)/;

const option = (name, description, required = false) => ({ type: 3, name, description, required });

const settings = (editing) => [
  option("date", editing ? "new date, like 2027-01-04 09:00" : "date as 2027-01-04 09:00", !editing),
  option("timezone", "IANA zone like Asia/Kolkata, defaults to UTC"),
  option("start", "when the countdown is set, before the set date, none to clear"),
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
  {
    ...option("ring", "color of the progress ring, default is white"),
    choices: [
      { name: "default (white)", value: "default" },
      ...Object.keys(RING_STYLES).map((name) => ({ name, value: name })),
    ],
  },
  {
    ...option("interval", `hours between updates, ${MIN_INTERVAL_HOURS} to ${MAX_INTERVAL_HOURS}, defaults to ${MIN_INTERVAL_HOURS}`),
    type: 4,
    min_value: MIN_INTERVAL_HOURS,
    max_value: MAX_INTERVAL_HOURS,
  },
  {
    ...option("schedule", "when to post the countdown; defaults to now"),
    choices: SCHEDULES.map((name) => ({ name, value: name })),
  },
  option("post_at", "post time for a custom schedule, like 2027-01-04 09:00"),
  { ...option("bump", "post a short message that deletes itself, to wake the channel; on or off"), type: 5 },
  {
    ...option("bump-interval", `hours between bumps, ${MIN_BUMP_HOURS} to ${MAX_BUMP_HOURS}, defaults to ${DEFAULT_BUMP_HOURS}`),
    type: 4,
    min_value: MIN_BUMP_HOURS,
    max_value: MAX_BUMP_HOURS,
  },
];

const picker = { ...option("label", "specify title if more than one countdown"), autocomplete: true };

export const command = {
  name: "countdown",
  description: "a countdown embed; updates itself every 1 to 24 hours",
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

export const helpCommand = {
  name: "help",
  description: "how the countdown commands and settings work",
  dm_permission: false,
};

export const helpText = [
  "**/countdown** needs the manage server permission. each countdown is one embed, edited on a schedule.",
  "",
  "`/countdown set` post or replace a countdown in this channel",
  "`/countdown configure` change settings on one that already exists",
  "`/countdown list` show every countdown in the server, with its timers",
  "`/countdown remove` delete a countdown and its card",
  "",
  "**config**",
  "`label` the title, for example JEE Main 2027",
  "`date` written like 2027-01-04 09:00",
  "`timezone` an IANA name such as Asia/Kolkata; defaults to UTC",
  "`start` when the countdown is set, before the set date; optional",
  "`tag` small text in the top-right corner, none to hide",
  "`fields` beside the ring: target, timeLeft, elapsed, or none for nothing",
  "`thumbnail` an image url for the top-right corner / thumbnail of the embed",
  "`dimensions` tall by default, or compact",
  "`ring` default / pride / trans",
  "`schedule` now / start / custom",
  "`post_at` the post time for a custom schedule; must be before the date",
  `\`interval\` hours between updates, ${MIN_INTERVAL_HOURS} to ${MAX_INTERVAL_HOURS}; defaults to ${MIN_INTERVAL_HOURS}`,
  "`bump` on or off; a short message that deletes itself after 5 seconds, to wake the channel",
  `\`bump-interval\` hours between bumps, ${MIN_BUMP_HOURS} to ${MAX_BUMP_HOURS}; defaults to ${DEFAULT_BUMP_HOURS}`,
  "",
  "several countdowns can share a channel.",
  "",
  "prothesmia.xyz",
  "src: <https://github.com/nielandvoid/prothesmia>",
].join("\n");

function parseCommand(interaction) {
  const sub = interaction.data.options[0];
  const values = Object.fromEntries((sub.options ?? []).map((option) => [option.name, option.value]));
  return { name: sub.name, values };
}

function build(values, interaction) {
  const timeZone = values.timezone ?? "UTC";
  if (!validZone(timeZone)) return { error: `${timeZone} is not a timezone name. try Asia/Kolkata or Europe/London.` };

  const date = values.date ? parseInstant(values.date, timeZone) : null;
  if (!date) return { error: "couldn't read the date. write it like 2027-01-04 09:00." };

  let start;
  if (values.start && values.start.toLowerCase() !== "none") {
    start = parseInstant(values.start, timeZone);
    if (!start) return { error: "couldn't read the start date. write it like 2026-04-01." };
    if (start >= date) return { error: "start has to be before the date." };
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

  let intervalHours;
  if (values.interval !== undefined) {
    const valid = Number.isInteger(values.interval) && values.interval >= MIN_INTERVAL_HOURS && values.interval <= MAX_INTERVAL_HOURS;
    if (!valid) return { error: `interval has to be a whole number of hours from ${MIN_INTERVAL_HOURS} to ${MAX_INTERVAL_HOURS}.` };
    intervalHours = values.interval;
  }

  const bump = values.bump === true;

  let bumpIntervalHours;
  if (values["bump-interval"] !== undefined) {
    const hours = values["bump-interval"];
    const valid = Number.isInteger(hours) && hours >= MIN_BUMP_HOURS && hours <= MAX_BUMP_HOURS;
    if (!valid) return { error: `bump-interval has to be a whole number of hours from ${MIN_BUMP_HOURS} to ${MAX_BUMP_HOURS}.` };
    bumpIntervalHours = hours;
  }

  const ringStyle = Object.hasOwn(RING_STYLES, values.ring) ? values.ring : undefined;

  const schedule = values.schedule ?? "now";
  let postAt;
  if (schedule === "start") {
    if (!start) return { error: "schedule start needs a start date." };
    postAt = start;
  }
  if (schedule === "custom") {
    postAt = values.post_at ? parseInstant(values.post_at, timeZone) : null;
    if (!postAt) return { error: "schedule custom needs post_at, written like 2027-01-04 09:00." };
    if (postAt >= date) return { error: "post_at has to be before the date." };
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
      intervalHours,
      ringStyle,
      schedule: schedule === "now" ? undefined : schedule,
      postAt: postAt?.toISOString(),
      bump,
      bumpIntervalHours,
    },
  };
}

function asInput(row) {
  const input = { label: row.label, date: row.date, timezone: row.timeZone };
  if (row.start) input.start = row.start;
  if (row.tag !== undefined) input.tag = row.tag === "" ? "none" : row.tag;
  if (row.fields !== undefined) input.fields = row.fields.length ? row.fields.join(", ") : "none";
  if (row.thumbnail) input.thumbnail = row.thumbnail;
  if (row.dimensions) input.dimensions = row.dimensions;
  if (row.intervalHours) input.interval = row.intervalHours;
  if (row.ringStyle) input.ring = row.ringStyle;
  if (row.schedule) input.schedule = row.schedule;
  if (row.schedule === "custom") input.post_at = row.postAt;
  if (row.bump) input.bump = true;
  if (row.bumpIntervalHours) input["bump-interval"] = row.bumpIntervalHours;
  return input;
}

const cadence = (hours) => (hours === 1 ? "every hour" : `every ${hours} hours`);

const stamp = (date, style) => `<t:${Math.floor(new Date(date) / 1000)}:${style}>`;

function describe(row) {
  const tag = row.tag === undefined ? "the label" : row.tag === "" ? "hidden" : row.tag;
  const fields = row.fields === undefined ? "all" : row.fields.length ? row.fields.join(", ") : "none";
  const hours = intervalOf(row);
  const refreshed = postsLater(row)
    ? `posts ${stamp(row.postAt, "f")}, ${stamp(row.postAt, "R")}, then every ${hours}h`
    : row.refreshedAt
      ? `every ${hours}h, last refresh ${stamp(row.refreshedAt, "R")}, next ${stamp(nextRefresh(row), "R")}`
      : `every ${hours}h, first refresh pending`;

  return [
    `**${row.label}** in <#${row.channelId}>`,
    `date ${stamp(row.date, "f")}, ${stamp(row.date, "R")}`,
    `timezone ${row.timeZone}, start ${row.start ? stamp(row.start, "d") : "none"}`,
    `tag ${tag}, fields ${fields}, dimensions ${row.dimensions ?? "tall"}, ring ${row.ringStyle ?? "default"}`,
    `thumbnail ${row.thumbnail ?? "none"}`,
    row.bump
      ? `bump every ${bumpIntervalOf(row)}h${row.bumpedAt ? `, last ${stamp(row.bumpedAt, "R")}` : ""}`
      : "bump off",
    refreshed,
  ].join("\n");
}

export function createCommands({ db, client }) {
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
      if (postsLater(countdown)) {
        return `scheduled **${countdown.label}** in <#${countdown.channelId}> to post ${stamp(countdown.postAt, "f")}, ${stamp(countdown.postAt, "R")}.`;
      }
      const result = await refreshOne(db, client, countdown);
      return `${result.action} **${countdown.label}** in <#${countdown.channelId}>. it refreshes ${cadence(intervalOf(countdown))}.`;
    }

    if (name === "configure") {
      const { label, ...changes } = values;
      if (!Object.keys(changes).length) return "nothing to change. pass at least one setting.";
      const found = await target(interaction, label);
      if (found.error) return found.error;
      const { countdown, error } = build({ ...asInput(found.row), ...changes }, interaction);
      if (error) return error;
      await db.save(countdown);
      if (!postsLater(countdown)) await refreshOne(db, client, countdown);
      return `updated **${countdown.label}**: ${Object.keys(changes).join(", ")}.`;
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

    const text = rows.map(describe).join("\n\n");
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
      return { ack: { type: 4, data: { flags: EPHEMERAL, content: "you need `manage server` permission for this." } } };
    }

    return {
      ack: { type: 5, data: { flags: EPHEMERAL } },
      work: () =>
        run(interaction).catch((error) => {
          console.error(`${interaction.guild_id}: ${error.message}`);
          if (NO_ACCESS.test(error.message)) {
            return `i can't post in <#${interaction.channel_id}>. give my role view channel, send messages, embed links, attach files and read message history there.`;
          }
          return `something went wrong: ${error.message.slice(0, 300)}`;
        }),
    };
  }

  return { handle, autocomplete };
}
