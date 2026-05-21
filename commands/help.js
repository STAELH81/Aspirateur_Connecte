const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Liste les commandes du bot"),
  async execute(interaction) {
    await interaction.reply({
      content: [
        "**Commandes Les Girlsss**",
        "",
        "`/ping` — test",
        "`/girlsss [texte]` — message commu",
        "`/avatar [membre]` — photo de profil",
        "`/userinfo [membre]` — infos membre",
        "`/poll` — sondage (reactions)",
        "`/random` — phrase aleatoire",
        "`/anniv ajouter` — enregistre ton anniv",
        "`/anniv liste` — annivs a venir",
        "",
        "**Modo / admin**",
        "`/giveaway start` — lot texte ou @role (attribue auto au gagnant)",
        "`/giveaway end` / `reroll` / `liste`",
        "`/clear nombre` — supprime des messages",
        "`/roles menu:jeux` ou `notifs` — panels roles (remplace YAGPDB)",
        "",
        "**Sans commande**",
        "@bot — salut personnalise",
        "Nouveau membre → message de bienvenue (si configure)",
        "",
        "**Roles** : `/roles menu:jeux` et `/roles menu:notifs` dans les salons roles. Configure les IDs dans `data/self-roles.json`.",
      ].join("\n"),
      ephemeral: true,
    });
  },
};
