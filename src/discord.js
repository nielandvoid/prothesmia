const API = "https://discord.com/api/v10";
const SUPPRESS_NOTIFICATIONS = 1 << 12;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function connect(token) {
  async function request(method, path, body) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const isForm = body instanceof FormData;
      const res = await fetch(API + path, {
        method,
        headers: {
          Authorization: `Bot ${token}`,
          ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
        },
        body: !body ? undefined : isForm ? body : JSON.stringify(body),
      });

      if (res.status === 429) {
        const { retry_after } = await res.json();
        await sleep(retry_after * 1000 + 250);
        continue;
      }
      if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
      return res.status === 204 ? null : res.json();
    }
    throw new Error(`${method} ${path}: still rate limited after retries`);
  }

  function form(payload, png, filename) {
    const data = new FormData();
    data.append(
      "payload_json",
      JSON.stringify({ ...payload, attachments: [{ id: 0, filename }] }),
    );
    data.append("files[0]", new Blob([png], { type: "image/png" }), filename);
    return data;
  }

  async function locate(channelId, filename) {
    const me = await request("GET", "/users/@me");
    const recent = await request("GET", `/channels/${channelId}/messages?limit=50`);
    return recent.find(
      (message) =>
        message.author.id === me.id &&
        message.attachments.some((attachment) => attachment.filename === filename),
    );
  }

  async function remove({ channelId, filename }) {
    const existing = await locate(channelId, filename);
    if (!existing) return false;
    await request("DELETE", `/channels/${channelId}/messages/${existing.id}`);
    return true;
  }

  async function publish({ channelId, embed, png, filename }) {
    const existing = await locate(channelId, filename);

    if (existing) {
      await request(
        "PATCH",
        `/channels/${channelId}/messages/${existing.id}`,
        form({ embeds: [embed] }, png, filename),
      );
      return { action: "edited", id: existing.id };
    }

    const created = await request(
      "POST",
      `/channels/${channelId}/messages`,
      form({ embeds: [embed], flags: SUPPRESS_NOTIFICATIONS, allowed_mentions: { parse: [] } }, png, filename),
    );
    return { action: "posted", id: created.id };
  }

  return { publish, remove };
}
