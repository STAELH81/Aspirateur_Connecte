const { EmbedBuilder } = require("discord.js");

const COLOR = 0xeb459e;
const COLOR_GIVEAWAY = 0xfee75c;
const COLOR_SUCCESS = 0x57f287;
const FOOTER = "Aspirateur Connecte • Les Girlsss (3 s, toujours)";

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function mentionReply(user) {
  const lines = [
    `Salut ${user} — c'est moi, l'Aspirateur. (Spoiler : j'aspire pas, je bot.)`,
    `Hey ${user} ! Besoin d'un /help ? Les Girlsss.`,
    `${user} m'a ping ? J'suis la. Pas un vrai aspirateur hein.`,
    `Coucou ${user} — 3 s, toujours. Girlsss.`,
  ];
  return pick(lines);
}

function pingReply() {
  return pick([
    "Pong — moteur OK, filtre Girlsss installe.",
    "Pong ! (non je vacuum pas votre salon)",
    "Pong. L'Aspirateur est awake.",
    "Pong pong — version Girlsss premium.",
  ]);
}

function welcomeMessage(member, guildName, memberCount) {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("Bienvenue dans la commu")
        .setDescription(
          [
            `${member} vient d'arriver sur **${guildName}**.`,
            `Membre **#${memberCount}** — pas mal.`,
            "",
            "Prends tes roles, dis bonjour, et `/help` si tu veux voir ce que je fais.",
            "*Je suis l'Aspirateur Connecte. Oui le nom est random.*",
          ].join("\n")
        )
        .setFooter({ text: FOOTER }),
    ],
  };
}

function helpEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Aspirateur Connecte — mode d'emploi")
    .setDescription(
      "Bot maison des **Girlsss**. Pas un aspirateur, promis."
    )
    .addFields(
      {
        name: "Commu",
        value: [
          "`/ping` — je suis en vie ?",
          "`/girlsss` — message Girlsss",
          "`/random` — citation du chaos",
          "`/choose` — le hasard tranche",
          "`/avatar` · `/userinfo` · `/poll`",
          "`/anniv ajouter` · `/anniv liste`",
        ].join("\n"),
      },
      {
        name: "Modo",
        value: [
          "`/giveaway` — tirages + roles auto",
          "`/clear` · `/roles menu:jeux|notifs`",
        ].join("\n"),
      },
      {
        name: "Sans slash",
        value: "@moi = salut · nouveau membre = bienvenue",
      }
    )
    .setFooter({ text: FOOTER });
}

function chooseTitle() {
  return pick(["Le hasard a parle", "Verdict Girlsss", "J'ai tranche"]);
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
    titleActive: "Giveaway Girlsss",
    titleEnded: "Giveaway termine",
    buttonLabel: "Participer",
    enterOk: "T'es inscrit — bonne chance !",
    enterAlready: "Deja inscrit, calme-toi.",
    enterEnded: "C'est fini ce giveaway.",
    win: (winners, prize) =>
      `Felicitation ${winners} ! Lot : **${prize}**`,
    reroll: (winners, prize) =>
      `Re-tirage **${prize}** : ${winners}`,
    noParticipants: (prize) =>
      `Giveaway **${prize}** — zero participant. Awkward.`,
    roleOk: (name) => `Role **${name}** envoye au gagnant.`,
    roleHierarchy: (name) =>
      `Role **${name}** pas donne : mets le bot au-dessus du role VIP dans les parametres.`,
    rolePermission:
      "J'ai pas la perm **Gerer les roles** — je peux pas donner le lot.",
    roleMissing: "Role introuvable. Il a despawn ?",
    roleFailed: "Impossible d'attribuer le role (hierarchie ?).",
  },
  roles: {
    added: (name) => `Role **${name}** — c'est bon.`,
    removed: (name) => `Role **${name}** retire.`,
    error:
      "Nope — role trop haut pour moi. Monte l'Aspirateur dans la liste des roles.",
    notFound: "Role introuvable.",
  },
  errors: {
    command: "Oups, j'ai glisse sur une erreur. Reessaie.",
  },
};
