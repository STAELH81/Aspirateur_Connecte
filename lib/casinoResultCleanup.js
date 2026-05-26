const path = require("path");
const { createStore } = require("./jsonStore");

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const store = createStore(path.join(__dirname, "..", "data", "casino-result-cleanup.json"), {
  defaultData: [],
});

function scheduleCasinoResultDeletion(client, channelId, messageId) {
  if (!channelId || !messageId) return;
  const data = store.load();
  data.push({
    channelId,
    messageId,
    deleteAt: Date.now() + TWO_DAYS_MS,
  });
  store.save(data);
}

function startCasinoResultCleanup(client) {
  const tick = async () => {
    const now = Date.now();
    const data = store.load();
    const kept = [];

    for (const entry of data) {
      if (entry.deleteAt > now) {
        kept.push(entry);
        continue;
      }
      try {
        const channel = await client.channels.fetch(entry.channelId);
        if (channel?.isTextBased()) {
          const msg = await channel.messages.fetch(entry.messageId);
          await msg.delete();
        }
      } catch {
        // deja supprime
      }
    }

    store.save(kept);
  };

  setInterval(() => tick().catch(() => {}), 60 * 60 * 1000);
  tick().catch(() => {});
}

module.exports = { scheduleCasinoResultDeletion, startCasinoResultCleanup };
