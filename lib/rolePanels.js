const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { COLOR } = require("./personality");
const profile = require("./serverProfile");

function buildPanel(menu) {
  const configured = menu.roles.filter((r) => r.id && !String(r.id).startsWith("REMPLACER"));
  if (configured.length === 0) {
    return null;
  }

  const embed = new EmbedBuilder()
    .setTitle(menu.title)
    .setDescription(
      menu.description +
        (profile.isRockAndRoll() ? "" : "\n\n" + configured.map((r) => `${r.emoji || "•"} **${r.label}**`).join("\n"))
    )
    .setColor(COLOR)
    .setFooter({ text: profile.footerText() });

  const btnStyle = profile.isRockAndRoll() ? ButtonStyle.Primary : ButtonStyle.Secondary;
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
        .setStyle(btnStyle)
        .setEmoji(r.emoji || undefined)
    );
  }
  if (row.components.length > 0) rows.push(row);

  return { embeds: [embed], components: rows };
}

module.exports = { buildPanel };