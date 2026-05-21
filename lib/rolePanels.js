const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { COLOR, FOOTER } = require("./personality");

function buildPanel(menu) {
  const configured = menu.roles.filter((r) => r.id && !String(r.id).startsWith("REMPLACER"));
  if (configured.length === 0) {
    return null;
  }

  const embed = new EmbedBuilder()
    .setTitle(menu.title)
    .setDescription(
      menu.description +
        "\n\n" +
        configured.map((r) => `${r.emoji || "•"} **${r.label}**`).join("\n")
    )
    .setColor(COLOR)
    .setFooter({ text: FOOTER });

  const rows = [];
  let row = new ActionRowBuilder();

  for (const r of configured) {
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`role:${r.id}`)
        .setLabel(r.label)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(r.emoji || undefined)
    );
  }
  if (row.components.length > 0) rows.push(row);

  return { embeds: [embed], components: rows };
}

module.exports = { buildPanel };
