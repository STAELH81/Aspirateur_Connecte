const { EmbedBuilder } = require("discord.js");

const COLOR = 0xeb459e;
const COLOR_UI = 0x0099ff;
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
      .setTitle("Aspirateur Connecte — aide (1/3)")
      .setDescription(
        "Bot du serveur **Les Girlsss**. Liste a jour des commandes slash.\n" +
          "Economie & casino : salon **#gambling** uniquement."
      )
      .addFields(
        {
          name: "Commu & fun",
          value: [
            "`/ping` — le bot repond",
            "`/girlsss [texte]` — message Girlsss",
            "`/random` — citation aleatoire",
            "`/quote add` — proposer une citation (validee par le staff)",
            "`/choose` — choix aleatoire (2 a 5 options)",
            "`/avatar [membre]` — photo de profil",
            "`/userinfo [membre]` — infos membre + roles",
            "`/poll` — sondage avec **boutons** (plus de reactions)",
          ].join("\n"),
        },
        {
          name: "AFK & niveaux (XP)",
          value: [
            "`/afk on [raison]` — absent : si on te @ping, le bot previent",
            "`/afk off` · `status` — desactiver ou verifier",
            "Envoie un message = AFK coupe automatiquement",
            "`/level voir` · `/level top` — XP (messages, ~60 s entre gains)",
          ].join("\n"),
        },
        {
          name: "Anniversaires — /anniv",
          value: [
            "`ajouter` — jour + mois",
            "`liste` — dans les 30 prochains jours",
            "Jour J + rappel la veille (#general) · VIP 5 jours",
          ].join("\n"),
        },
        {
          name: "Suggestions",
          value: [
            "`/suggest idee` — embed dans le salon suggestions",
            "Ou ecris direct dans le salon : reactions auto",
          ].join("\n"),
        }
      ),
    new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Economie & casino (2/3) — #gambling")
      .addFields(
        {
          name: "Panneaux (salons dedies)",
          value: [
            "**Money** — daily, work, balance, top, **Pay**",
            "**Shop** — boutique avec boutons d'achat",
            "**Casino** — jeux via menu + boutons Refaire / Autre jeu",
            "**Infos** — guide gambling",
          ].join("\n"),
        },
        {
          name: "/money admin · /casino",
          value: [
            "`/money admin panel|pay-panel|shop-panel|infos-panel` — poster panneaux (**staff**)",
            "`/money admin donner|retirer` — gerer les coins (**staff**)",
            "`/casino` — lancer une partie (tout le monde)",
            "`/money admin casino-panel` — panneau fixe salon casino (**staff**)",
            "Mise min **10** · max **75 %** du solde · plafond **2000** coins",
            "Resultats casino supprimes auto apres **2 jours**",
          ].join("\n"),
        },
        {
          name: "Tickets support",
          value: [
            "Staff : `/ticket panel` dans le salon souhaite",
            "Membres : bouton **Ouvrir un ticket** → salon prive",
            "Config : `TICKET_CATEGORY_ID` + `TICKET_STAFF_ROLE_IDS` (mods)",
            "Ouverture / fermeture loggee (salon logs)",
          ].join("\n"),
        },
        {
          name: "Moderation",
          value: [
            "`/warn ajouter` · `liste` · `retirer` — staff",
            "Logs warns + tickets dans le salon logs",
          ].join("\n"),
        }
      ),
    new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Staff & automatique (3/3)")
      .addFields(
        {
          name: "/giveaway",
          value: [
            "`start` — lot, duree (30s, 1h, 2d…), gagnants, role optionnel",
            "`end` / `reroll` — ID du message du giveaway",
            "`liste` — giveaways actifs",
            "Bouton **Participer** sous l'annonce",
          ].join("\n"),
        },
        {
          name: "Moderation, roles, citations",
          value: [
            "`/clear` — supprimer des messages (modo)",
            "`/roles menu:jeux` — panel roles jeux",
            "`/roles menu:notifs` — panel notifs / sorties",
            "`/quote pending` · `approve` · `reject` — citations (staff)",
          ].join("\n"),
        },
        {
          name: "Automatique (sans /)",
          value: [
            "**@bot** — reponse salut",
            "**Arrivee** — bienvenue + roles (`auto-roles.json`)",
            "**Depart** — message au revoir",
            "**Casino** — gros gains/pertes logges (salon staff)",
            "Coins sauvegardes + copie backup automatique",
          ].join("\n"),
        },
        {
          name: "Commande invisible ?",
          value:
            "Si une commande n'apparait pas dans Discord : le bot doit etre **deploy** " +
            "(`scripts/deploy.ps1` en local) puis **redemarrer** sur Discloud.",
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
  COLOR_UI,
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
