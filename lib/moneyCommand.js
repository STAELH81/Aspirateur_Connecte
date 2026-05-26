const { SlashCommandBuilder } = require("discord.js");

function buildMoneyCommandData() {
  return new SlashCommandBuilder()
    .setName("money")
    .setDescription("Economie — panneaux et admin")
    .addSubcommandGroup((group) =>
      group
        .setName("admin")
        .setDescription("Staff — gerer l'economie et les panneaux")
        .addSubcommand((sub) =>
          sub
            .setName("donner")
            .setDescription("Donner des coins")
            .addUserOption((opt) =>
              opt.setName("membre").setDescription("Joueur").setRequired(true)
            )
            .addIntegerOption((opt) =>
              opt.setName("montant").setDescription("Coins").setRequired(true).setMinValue(1)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("retirer")
            .setDescription("Retirer des coins")
            .addUserOption((opt) =>
              opt.setName("membre").setDescription("Joueur").setRequired(true)
            )
            .addIntegerOption((opt) =>
              opt.setName("montant").setDescription("Coins").setRequired(true).setMinValue(1)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("panel")
            .setDescription("Poster le panneau money dans ce salon")
        )
        .addSubcommand((sub) =>
          sub
            .setName("shop-panel")
            .setDescription("Poster le panneau shop")
        )
        .addSubcommand((sub) =>
          sub
            .setName("infos-panel")
            .setDescription("Poster le guide gambling")
        )
        .addSubcommand((sub) =>
          sub
            .setName("casino-panel")
            .setDescription("Poster le panneau casino fixe dans ce salon")
        )
    );
}

module.exports = { buildMoneyCommandData };
