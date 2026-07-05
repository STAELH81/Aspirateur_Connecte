const { SlashCommandBuilder } = require("discord.js");
const {
  handleRadioSlash,
  handleRadioAutocomplete,
} = require("../lib/musicControl");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("radio")
    .setDescription("Controle DJ de la radio (owner uniquement)")
    .addSubcommand((sub) => sub.setName("play").setDescription("Reprendre la lecture"))
    .addSubcommand((sub) => sub.setName("pause").setDescription("Mettre en pause"))
    .addSubcommand((sub) => sub.setName("skip").setDescription("Piste suivante"))
    .addSubcommand((sub) => sub.setName("now").setDescription("Afficher la piste en cours"))
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Poster le panneau Play / Pause / Skip dans ce salon")
    )
    .addSubcommand((sub) =>
      sub
        .setName("piste")
        .setDescription("Lancer une piste precise")
        .addStringOption((opt) =>
          opt
            .setName("nom")
            .setDescription("Nom du fichier")
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),
  async autocomplete(interaction) {
    await handleRadioAutocomplete(interaction);
  },
  async execute(interaction) {
    await handleRadioSlash(interaction);
  },
};
