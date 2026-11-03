import { createClient } from "@libsql/client/web";

const FIELDS = ["id", "guild_id", "channel_id", "label", "date", "start", "tag", "time_zone", "fields", "thumbnail", "dimensions"];

export async function openDatabase({ url, authToken }) {
  const db = createClient({ url, authToken });

  await db.execute(`
    create table if not exists countdowns (
      id integer primary key autoincrement,
      guild_id text not null,
      channel_id text not null,
      label text not null,
      date text not null,
      start text,
      tag text,
      time_zone text not null,
      fields text,
      thumbnail text,
      unique (channel_id, label)
    )
  `);

  const { rows: columns } = await db.execute("pragma table_info(countdowns)");
  if (!columns.some((column) => column.name === "dimensions")) {
    await db.execute("alter table countdowns add column dimensions text");
  }

  const toCountdown = (row) => ({
    id: Number(row.id),
    guildId: row.guild_id,
    channelId: row.channel_id,
    label: row.label,
    date: row.date,
    start: row.start ?? undefined,
    tag: row.tag ?? undefined,
    timeZone: row.time_zone,
    fields: row.fields === null ? undefined : JSON.parse(row.fields),
    thumbnail: row.thumbnail ?? undefined,
    dimensions: row.dimensions ?? undefined,
  });

  return {
    async all() {
      const { rows } = await db.execute(`select ${FIELDS.join(", ")} from countdowns`);
      return rows.map(toCountdown);
    },

    async inGuild(guildId) {
      const { rows } = await db.execute({
        sql: `select ${FIELDS.join(", ")} from countdowns where guild_id = ? order by label`,
        args: [guildId],
      });
      return rows.map(toCountdown);
    },

    async inChannel(guildId, channelId) {
      const { rows } = await db.execute({
        sql: `select ${FIELDS.join(", ")} from countdowns where guild_id = ? and channel_id = ? order by label`,
        args: [guildId, channelId],
      });
      return rows.map(toCountdown);
    },

    async save(c) {
      await db.execute({
        sql: `
          insert into countdowns (guild_id, channel_id, label, date, start, tag, time_zone, fields, thumbnail, dimensions)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          on conflict (channel_id, label) do update set
            date = excluded.date,
            start = excluded.start,
            tag = excluded.tag,
            time_zone = excluded.time_zone,
            fields = excluded.fields,
            thumbnail = excluded.thumbnail,
            dimensions = excluded.dimensions
        `,
        args: [
          c.guildId,
          c.channelId,
          c.label,
          c.date,
          c.start ?? null,
          c.tag ?? null,
          c.timeZone,
          c.fields === undefined ? null : JSON.stringify(c.fields),
          c.thumbnail ?? null,
          c.dimensions ?? null,
        ],
      });
    },

    async remove(guildId, channelId, label) {
      const result = await db.execute({
        sql: "delete from countdowns where guild_id = ? and channel_id = ? and label = ?",
        args: [guildId, channelId, label],
      });
      return result.rowsAffected > 0;
    },
  };
}
