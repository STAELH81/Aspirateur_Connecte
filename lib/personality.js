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
            "Jour J : message dans #general + role **VIP 5 jours**",
          ].join("\n"),
        }
      ),
    new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Economie & casino (2/3) — #gambling")
      .addFields(
        {
          name: "/money",
          value: [
            "`balance [membre]` — solde coins",
            "`daily` — bonus 24 h (+ **streak** si tu enchaines)",
            "`work` — petit job (45 min)",
            "`pay` — envoyer des coins",
            "`top` — classement richesse",
            "`shop-list` — voir la boutique",
            "`shop` — menu deroulant pour acheter un role",
            "`jackpot` — voir la cagnotte casino",
            "`admin donner` / `admin retirer` — **staff**",
          ].join("\n"),
        },
        {
          name: "/casino",
          value: [
            "`coinflip` — pile ou face (x1,9)",
            "`slots` — machine a sous",
            "`dice` — devine 1-6 (x5)",
            "`roulette` — rouge / noir / vert / numero",
            "`blackjack` — Hit & Stand (boutons)",
            "`jackpot` — infos cagnotte (3 % des mises)",
            "Mise min **10** · max **75 %** du solde · plafond **2000** coins",
            "Salons : #gambling + salon test (config bot)",
          ].join("\n"),
        },
        {
          name: "Tickets support",
          value: [
            "Staff : `/ticket panel` dans le salon souhaite",
            "Membres : bouton **Ouvrir un ticket** → salon prive",
            "Bouton **Fermer le ticket** dans le salon",
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
            "(`bot.cmd deploy` sur le PC dev) puis **redemarrer** sur Discloud.",
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
