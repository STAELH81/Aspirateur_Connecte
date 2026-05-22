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
  const lines = [
    `${member}, bienvenue sur **${guildName}**.`,
    `Tu es le **${memberCount}e** membre du serveur.`,
    "",
        "Prends tes roles dans les salons dedies — `/help` · coins dans #gambling.",
  ];

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR)
        .setTitle("Nouveau membre")
        .setDescription(lines.join("\n"))
        .setFooter({ text: FOOTER }),
    ],
  };
}

function goodbyeMessage(member) {
  const name = member.user?.tag ?? member.displayName ?? "Quelqu'un";
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("Depart")
        .setDescription(`${member} (**${name}**) a quitte le serveur.`)
        .setFooter({ text: FOOTER }),
    ],
  };
}

/** Liste complete — a garder a jour quand une commande est ajoutee */
function helpEmbeds() {
  return [
    new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Aspirateur Connecte — aide")
      .setDescription(
        "Bot custom du serveur **Les Girlsss**. Pas un vrai aspirateur.\n" +
          "Tape `/help` pour cette liste."
      )
      .addFields(
        {
          name: "Commu",
          value: [
            "`/ping` — test",
            "`/girlsss [texte]` — message Girlsss",
            "`/random` — citation aleatoire",
            "`/quote add` — proposer une citation",
            "`/choose` — tirage entre 2 a 5 choix",
            "`/avatar [membre]` — photo de profil",
            "`/userinfo [membre]` — infos membre",
            "`/poll` — sondage boutons (v2)",
            "`/afk on` · `/afk off`",
            "`/level voir` · `/level top` — XP (messages)",
          ].join("\n"),
        },
        {
          name: "Anniversaires",
          value: [
            "`/anniv ajouter` — enregistre ton jour/mois",
            "`/anniv liste` — annivs dans les 30 prochains jours",
            "Jour J : message general + **VIP 5 jours** (BIRTHDAY_VIP_ROLE_ID)",
          ].join("\n"),
        },
        {
          name: "Economie & casino (#gambling)",
          value: [
            "`/money` balance · daily (streak) · work · pay · top · shop · jackpot",
            "`/money admin` donner/retirer (staff)",
            "`/casino` coinflip · slots · dice · roulette · blackjack · jackpot",
            "Soldes sauvegardes + backup auto (`economy.json.backup`)",
          ].join("\n"),
        }
      ),
    new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Admin & automatique")
      .addFields(
        {
          name: "Giveaways — /giveaway",
          value: [
            "`start` — lot, duree (30s, 1h, 2d…), gagnants, role optionnel",
            "`end` / `reroll` — avec l'ID du message",
            "`liste` — giveaways en cours",
            "Bouton **Participer** sous le message",
          ].join("\n"),
        },
        {
          name: "Moderation & roles",
          value: [
            "`/clear` — supprime des messages (modo)",
            "`/roles menu:jeux` · `menu:notifs` — panels boutons",
            "`/quote pending` · `approve` · `reject` (staff)",
            "`/ticket panel` — bouton ouvrir ticket (admin)",
          ].join("\n"),
        },
        {
          name: "Sans commande",
          value: [
            "@bot — salut",
            "Messages → gain XP (cooldown 60s)",
            "Arrivee → message + roles auto",
            "Logs casino → ECONOMY_LOG_CHANNEL_ID",
          ].join("\n"),
        }
      )
      .setFooter({ text: `${FOOTER} · /help` }),
  ];
}

function helpEmbed() {
  return helpEmbeds()[0];
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
  goodbyeMessage,
  helpEmbed,
  helpEmbeds,
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
