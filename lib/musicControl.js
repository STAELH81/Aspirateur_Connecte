const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { getRadio, loadTracks, trackLabel, formatDisplayTitle } = require("./musicPlayer");
const profile = require("./serverProfile");

function isMusicOwner(userId) {
  const ownerId = process.env.BOT_OWNER_USER_ID?.trim();
  if (!ownerId) return false;
  return String(userId) === ownerId;
}

function ownerOnlyReply(interaction) {
  return interaction.reply({
    content: "Reserve au DJ du bot (owner).",
    flags: MessageFlags.Ephemeral,
  });
}

function statusEmbed(radio) {
  const st = radio?.getStatus?.() || { label: null, playing: false, paused: false };
  const title = st.label ? formatDisplayTitle(st.label) : "Aucune piste";
  let state = "En pause";
  if (st.playing) state = "En lecture";
  else if (st.paused) state = "Pause";
  else if (!st.label) state = "Inactif";

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Radio — controle DJ")
    .setDescription("Seul le owner peut utiliser ces boutons.")
    .addFields(
      { name: "Piste", value: title, inline: false },
      { name: "Etat", value: state, inline: true }
    );
}

function controlRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("radio:play")
        .setLabel("Play")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("radio:pause")
        .setLabel("Pause")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("radio:skip")
        .setLabel("Skip")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

async function runAction(action, radio, extra) {
  if (!radio) return { ok: false, message: "Radio pas demarree." };
  switch (action) {
    case "play":
      return radio.resume();
    case "pause":
      return radio.pause();
    case "skip":
      return radio.skip();
    case "piste":
      return radio.playTrack(extra);
    default:
      return { ok: false, message: "Action inconnue." };
  }
}

async function replyActionResult(interaction, result) {
  const content = result.ok
    ? result.message || "OK."
    : result.message || "Impossible.";
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
}

async function handleRadioButton(interaction) {
  if (!profile.feature("music")) {
    await interaction.reply({ content: "Radio desactivee.", flags: MessageFlags.Ephemeral });
    return;
  }
  if (!isMusicOwner(interaction.user.id)) {
    await ownerOnlyReply(interaction);
    return;
  }

  const action = interaction.customId.split(":")[1];
  const radio = getRadio();
  await runAction(action, radio);
  await interaction.deferUpdate().catch(() => {});
  await interaction.message
    .edit({ embeds: [statusEmbed(getRadio())], components: controlRows() })
    .catch(() => {});
}

async function handleRadioSlash(interaction) {
  if (!profile.feature("music")) {
    await interaction.reply({ content: "Radio desactivee sur ce profil.", flags: MessageFlags.Ephemeral });
    return;
  }
  if (!isMusicOwner(interaction.user.id)) {
    await ownerOnlyReply(interaction);
    return;
  }

  const sub = interaction.options.getSubcommand();
  const radio = getRadio();

  if (sub === "panel") {
    await interaction.reply({
      embeds: [statusEmbed(radio)],
      components: controlRows(),
    });
    return;
  }

  if (sub === "now") {
    const st = radio?.getStatus?.();
    const title = st?.label ? formatDisplayTitle(st.label) : "Rien en cours";
    await interaction.reply({
      content: `**${title}** — ${st?.playing ? "lecture" : st?.paused ? "pause" : "idle"}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!radio) {
    await interaction.reply({ content: "Radio pas demarree.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (sub === "piste") {
    const name = interaction.options.getString("nom", true);
    const result = await runAction("piste", radio, name);
    await replyActionResult(interaction, result);
    return;
  }

  const result = await runAction(sub, radio);
  await replyActionResult(interaction, result);
}

async function handleRadioAutocomplete(interaction) {
  if (!isMusicOwner(interaction.user.id)) {
    await interaction.respond([]);
    return;
  }
  const q = (interaction.options.getFocused() || "").toLowerCase();
  const choices = loadTracks()
    .map((t) => trackLabel(t))
    .filter((label) => !q || label.toLowerCase().includes(q))
    .slice(0, 25)
    .map((label) => ({
      name: formatDisplayTitle(label).slice(0, 100),
      value: label.slice(0, 100),
    }));
  await interaction.respond(choices);
}

module.exports = {
  isMusicOwner,
  handleRadioButton,
  handleRadioSlash,
  handleRadioAutocomplete,
  statusEmbed,
  controlRows,
};
