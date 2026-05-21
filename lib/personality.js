const { EmbedBuilder } = require("discord.js");

const COLOR = 0xeb459e;
const COLOR_GIVEAWAY = 0xfee75c;
const COLOR_SUCCESS = 0x57f287;
const FOOTER = "Les Girlsss";

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function mentionReply(user) {
  return pick([
    `Salut ${user}`,
    `Hey ${user} — tape /help si tu cherches un truc`,
    `${user} ? Oui`,
  ]);
}

function pingReply() {
  return pick(["Pong", "Pong.", "Oui je suis la — pong"]);
}

function welcomeMessage(member, guildName, memberCount) {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(`Bienvenue sur ${guildName}`)
        .setDescription(
          [
            `${member}, contente de t'avoir ici.`,
            `Tu es le **${memberCount}e** membre du serveur.`,
            "",
            "Va prendre tes roles, puis `/help` pour la liste des commandes.",
          ].join("\n")
        )
        .setFooter({ text: FOOTER }),
    ],
  };
}

function helpEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Commandes")
    .setDescription("Bot du serveur **Les Girlsss**.")
    .addFields(
      {
        name: "Tout le monde",
        value: [
          "`/ping` · `/girlsss` · `/random` · `/choose`",
          "`/avatar` · `/userinfo` · `/poll`",
          "`/anniv ajouter` · `/anniv liste`",
        ].join("\n"),
      },
      {
        name: "Admin / modo",
        value: [
          "`/giveaway` · `/clear`",
          "`/roles menu:jeux` · `/roles menu:notifs`",
        ].join("\n"),
      },
      {
        name: "Divers",
        value: "@bot pour me parler · message auto quand quelqu'un arrive",
      }
    )
    .setFooter({ text: FOOTER });
}

function chooseTitle() {
  return "Resultat";
}

module.exports = {
  COLOR,
  COLOR_GIVEAWAY,
  COLOR_SUCCESS,
  FOOTER,
  pick,
  mentionReply,
  pingReply,
  welcomeMessage,
  helpEmbed,
  chooseTitle,
  giveaway: {
    titleActive: "Giveaway",
    titleEnded: "Giveaway termine",
    buttonLabel: "Participer",
    enterOk: "Inscription enregistree.",
    enterAlready: "Tu es deja inscrit.",
    enterEnded: "Giveaway termine.",
    win: (winners, prize) =>
      `Bravo ${winners} — tu gagnes **${prize}**`,
    reroll: (winners, prize) =>
      `Nouveau tirage (**${prize}**) : ${winners}`,
    noParticipants: (prize) =>
      `Giveaway **${prize}** termine : aucun participant.`,
    roleOk: (name) => `Role **${name}** attribue.`,
    roleHierarchy: (name) =>
      `Role **${name}** non attribue : place le role du bot au-dessus dans les parametres du serveur.`,
    rolePermission:
      "Permission **Gerer les roles** manquante pour le bot.",
    roleMissing: "Role introuvable.",
    roleFailed: "Impossible d'attribuer le role.",
  },
  roles: {
    added: (name) => `Role **${name}** ajoute.`,
    removed: (name) => `Role **${name}** retire.`,
    error:
      "Impossible : le role est au-dessus du bot. Monte le role du bot dans la liste.",
    notFound: "Role introuvable.",
  },
  errors: {
    command: "Erreur. Reessaie dans un instant.",
  },
};
