const { EmbedBuilder } = require("discord.js");
const pollVotes = require("./pollVotes");
const { COLOR } = require("./personality");

const LABELS = ["1", "2", "3", "4", "5"];

function buildDescription(question, choices, messageId) {
  const counts = pollVotes.countVotes(messageId, choices.length);
  const total = counts.reduce((a, b) => a + b, 0);
  const lines = choices.map((c, i) => {
    const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
    return `**${LABELS[i]}** — ${c} · **${counts[i]}** (${pct}%)`;
  });
  return `**${question}**\n\n${lines.join("\n")}`;
}

function parsePollEmbed(embed) {
  const desc = embed.description || "";
  const questionMatch = desc.match(/^\*\*(.+?)\*\*/);
  const question = questionMatch ? questionMatch[1] : "Sondage";
  const choices = [];
  for (const line of desc.split("\n")) {
    const m = line.match(/^\*\*\d\*\* — (.+?) ·/);
    if (m) choices.push(m[1]);
  }
  return { question, choices };
}

async function refreshPollMessage(message) {
  const embed = message.embeds[0];
  if (!embed) return;

  const { question, choices } = parsePollEmbed(embed);
  if (choices.length === 0) return;

  const newEmbed = EmbedBuilder.from(embed)
    .setColor(COLOR)
    .setDescription(buildDescription(question, choices, message.id));

  await message.edit({ embeds: [newEmbed] });
}

module.exports = { refreshPollMessage, buildDescription };
