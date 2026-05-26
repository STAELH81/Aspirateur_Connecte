const { SlashCommandBuilder } = require("discord.js");
const { loadConfig } = require("./shop");

function truncate(str, max) {
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
}

function buildMoneyCommandData() {
  const builder = new SlashCommandBuilder()
    .setName("money")
    .setDescription("Economie du serveur (coins)")
    .addSubcommand((sub) =>
      sub
        .setName("balance")
        .setDescription("Voir ton solde ou celui de quelqu'un")
        .addUserOption((opt) =>
          opt.setName("membre").setDescription("Autre membre").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("daily").setDescription("Bonus quotidien (24h) + streak")
    )
    .addSubcommand((sub) =>
      sub.setName("work").setDescription("Petit job (cooldown 45 min)")
    )
    .addSubcommand((sub) =>
      sub
        .setName("pay")
        .setDescription("Envoyer des coins")
        .addUserOption((opt) =>
          opt.setName("membre").setDescription("Destinataire").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("montant")
            .setDescription("Nombre de coins")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("top").setDescription("Classement des plus riches")
    )
    .addSubcommand((sub) =>
      sub.setName("jackpot").setDescription("Voir la cagnotte casino")
    )
    .addSubcommand((sub) =>
      sub.setName("shop-list").setDescription("Voir la boutique (prix et durees)")
    );

  const items = loadConfig();
  if (items.length > 0) {
    builder.addSubcommand((sub) => {
      sub
        .setName("shop")
        .setDescription("Acheter un article boutique (role ou bonus)")
        .addStringOption((opt) => {
          opt
            .setName("article")
            .setDescription("Choisir dans la liste")
            .setRequired(true);
          for (const item of items.slice(0, 25)) {
            opt.addChoices({
              name: truncate(`${item.label} — ${item.price} coins`, 100),
              value: item.id,
            });
          }
          return opt;
        });
      return sub;
    });
  }

  builder.addSubcommandGroup((group) =>
    group
      .setName("admin")
      .setDescription("Staff — gerer les coins")
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
          .setDescription("Poster le panneau interactif money dans ce salon")
      )
  );

  return builder;
}

module.exports = { buildMoneyCommandData };
