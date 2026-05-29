const { AttachmentBuilder } = require("discord.js");
const economyLog = require("./economyLog");

async function fetchAllMessages(channel) {
  const collected = [];
  let before;

  while (collected.length < 2000) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });
    if (batch.size === 0) break;
    collected.push(...batch.values());
    before = batch.last()?.id;
    if (batch.size < 100) break;
  }

  return collected.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function formatLine(message) {
  const time = message.createdAt.toISOString().replace("T", " ").slice(0, 16);
  const author = message.author?.tag || message.author?.id || "inconnu";
  let body = message.content || "";
  if (!body && message.embeds.length) body = `[embed: ${message.embeds[0].title || "sans titre"}]`;
  if (!body && message.attachments.size) body = `[piece jointe: ${message.attachments.first()?.name || "fichier"}]`;
  if (!body) body = "(vide)";
  return `[${time}] ${author}: ${body.replace(/\n/g, " ")}`;
}

async function buildTranscriptText(channel, meta = {}) {
  const messages = await fetchAllMessages(channel);
  const header = [
    "=== Transcript ticket ===",
    `Salon : #${channel.name} (${channel.id})`,
    meta.ownerId ? `Membre : ${meta.ownerId}` : null,
    meta.closedById ? `Ferme par : ${meta.closedById}` : null,
    meta.reason ? `Raison : ${meta.reason}` : null,
    `Messages : ${messages.length}`,
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const body = messages.map(formatLine).join("\n");
  return `${header}\n${body}\n`;
}

async function sendTranscript(client, channel, meta = {}) {
  const channelId = economyLog.getChannelId();
  if (!channelId) return;

  const logChannel = await client.channels.fetch(channelId).catch(() => null);
  if (!logChannel?.isTextBased()) return;

  const text = await buildTranscriptText(channel, meta);
  const safeName = channel.name.replace(/[^a-z0-9-_]/gi, "-").slice(0, 40);
  const file = new AttachmentBuilder(Buffer.from(text, "utf8"), {
    name: `${safeName}-transcript.txt`,
  });

  const lines = [
    meta.auto ? "Fermeture auto (inactivite)" : "Ticket ferme",
    meta.ownerId ? `Membre : <@${meta.ownerId}>` : null,
    meta.closedById ? `Ferme par : <@${meta.closedById}>` : null,
    `Salon : #${channel.name}`,
  ].filter(Boolean);

  await logChannel
    .send({
      content: lines.join("\n"),
      files: [file],
    })
    .catch((err) => console.warn("[tickets] transcript:", err.message));
}

module.exports = { buildTranscriptText, sendTranscript };
