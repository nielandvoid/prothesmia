import { validZone, parseInstant } from "./zone.js";
import { refreshOne } from "./refresh.js";

const MANAGE_GUILD = 1n << 5n;
const EPHEMERAL = 64;
const FIELD_KEYS = ["target", "timeLeft", "elapsed"];

const option = (name, description, required = false) => ({ type: 3, name, description, required });

export const command = {
  name: "countdown",
  description: "a countdown card that updates itself every hour",
  default_member_permissions: String(MANAGE_GUILD),
  dm_permission: false,
  options: [
    {
      type: 1,
      name: "set",
      description: "post or update a countdown in this channel",
      options: [
        option("label", "the title, for example JEE Main 2027", true),
        option("date", "deadline as 2027-01-04 09:00", true),
        option("timezone", "iana zone like Asia/Kolkata, defaults to UTC"),
        option("start", "when the ring starts filling, same format as date"),
        option("tag", "small text in the top corner, none to hide it"),
        option("fields", "rows beside the ring: target, timeLeft, elapsed, or none"),
        option("thumbnail", "image url for the embed corner"),
      ],
    },
    {
      type: 1,
      name: "remove",
      description: "delete a countdown from this channel",
      options: [option("label", "the title it was created with", true)],
    },
    { type: 1, name: "list", description: "show the countdowns in this server" },
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

  const date = parseInstant(values.date, timeZone);
  if (!date) return { error: "couldn't read the date. write it like 2027-01-04 09:00." };

  let start;
  if (values.start) {
    start = parseInstant(values.start, timeZone);
    if (!start) return { error: "couldn't read the start date. write it like 2026-04-01." };
    if (start >= date) return { error: "start has to be before the deadline." };
  }

  let fields;
  if (values.fields !== undefined) {
    const raw = values.fields.trim();
    fields = raw.toLowerCase() === "none" ? [] : raw.split(/[\s,]+/).filter(Boolean);
    const unknown = fields.find((key) => !FIELD_KEYS.includes(key));
    if (unknown) return { error: `${unknown} isn't a field. use ${FIELD_KEYS.join(", ")} or none.` };
  }

  let thumbnail;
  if (values.thumbnail) {
    if (!/^https:\/\//.test(values.thumbnail)) return { error: "the thumbnail has to be an https image url." };
    thumbnail = values.thumbnail;
  }

  const tag = values.tag === undefined ? undefined : values.tag.toLowerCase() === "none" ? "" : values.tag;

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
    },
  };
}

export function createCommands({ db, client }) {
  async function run(interaction) {
    const { name, values } = parseCommand(interaction);

    if (name === "set") {
      const { countdown, error } = build(values, interaction);
      if (error) return error;
      await db.save(countdown);
      const result = await refreshOne(client, countdown);
      return `${result.action} **${countdown.label}** in <#${countdown.channelId}>. it refreshes every hour.`;
    }

    if (name === "remove") {
      const label = values.label.trim();
      const removed = await db.remove(interaction.guild_id, interaction.channel_id, label);
      if (!removed) return `no countdown called **${label}** in this channel.`;
      await client.remove({ channelId: interaction.channel_id, title: label }).catch(() => {});
      return `removed **${label}**.`;
    }

    const rows = await db.inGuild(interaction.guild_id);
    if (!rows.length) return "no countdowns in this server yet. try `/countdown set`.";
    return rows
      .map((row) => `**${row.label}** in <#${row.channelId}>, ends <t:${Math.floor(new Date(row.date) / 1000)}:f>`)
      .join("\n");
  }

  function handle(interaction) {
    const allowed = BigInt(interaction.member?.permissions ?? 0) & MANAGE_GUILD;
    if (!allowed) {
      return { ack: { type: 4, data: { flags: EPHEMERAL, content: "you need the manage server permission for this." } } };
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

  return { handle };
}
