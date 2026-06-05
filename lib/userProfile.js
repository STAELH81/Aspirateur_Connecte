const { EmbedBuilder } = require("discord.js");
const { COLOR } = require("./personality");
const xp = require("./xp");
const economy = require("./economy");
const gamblingProgress = require("./gamblingProgress");
const coopGoal = require("./coopGoal");
const profile = require("./serverProfile");
const { questDot, coopDot } = require("./questsBoard");
const bankLoans = require("./bankLoans");
const warns = require("./warns");
const { isModerator } = require("./permissions");

function formatCooldown(ms) {
  if (!ms || ms <= 0) return "pret";
  return economy.formatCooldown(ms);
}

function buildUserProfileEmbed(user, member, viewerMember) {
  const xpProfile = xp.getProfile(user.id);
  const gamble = gamblingProgress.getProfile(user.id);
  const questStatus = gamblingProgress.getQuestStatus(user.id);
  const coopStatus = coopGoal.getStatus(user.id);
  const questsChannelId = process.env.QUESTS_BOARD_CHANNEL_ID?.trim();
  const detailHint = questsChannelId ? `<#${questsChannelId}>` : "salon quetes";
  const loan = bankLoans.getStatus(user.id);
  const acc = economy.getAccount(user.id);
  const showWarns = viewerMember && isModerator(viewerMember);

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(member?.displayName || user.username)
    .setThumbnail(user.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: "ID", value: user.id, inline: true },
      {
        name: "Compte cree",
        value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
        inline: true,
      },
      {
        name: "Niveau XP",
        value: `**${xpProfile.level}** (${xpProfile.xpInLevel}/${xpProfile.xpNeeded} XP)`,
        inline: true,
      },
      {
        name: "Economie",
        value: [
          `Solde : ${economy.formatCoins(gamble.balance)}`,
          `Streak daily : **${acc.dailyStreak || 0}**`,
          `Daily : ${formatCooldown(economy.getDailyWait(user.id))}`,
          `Work : ${formatCooldown(economy.getWorkWait(user.id))}`,
          loan.hasDebt ? `Dette banque : **${loan.owed}** coins` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        inline: false,
      },
      {
        name: "Casino",
        value: [
          `Parties : **${gamble.casinoGames}** · Wins **${gamble.casinoWins}** (${gamble.winrate}%)`,
          `Net : **${gamble.casinoNet >= 0 ? `+${gamble.casinoNet}` : gamble.casinoNet}** coins`,
          `Jeu prefere : **${gamble.favoriteGame}**`,
          `Record win/loss : **+${gamble.biggestWin}** / **${gamble.biggestLoss}**`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "Quete & Coop",
        value: `Quete ${questDot(questStatus)} · Coop ${coopDot(coopStatus)} — detail : ${detailHint}`,
        inline: false,
      }
    );

  if (member) {
    embed.addFields(
      {
        name: "A rejoint le serveur",
        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
        inline: true,
      },
      {
        name: "Roles",
        value:
          member.roles.cache
            .filter((r) => r.id !== member.guild.id)
            .map((r) => r.toString())
            .join(", ") || "Aucun",
        inline: false,
      }
    );
  }

  if (showWarns) {
    const list = warns.list(user.id);
    embed.addFields({
      name: "Avertissements (staff)",
      value: list.length ? `**${list.length}** warn(s)` : "Aucun",
      inline: true,
    });
  }

  embed.setFooter({ text: `${profile.footerText()} · profil` });
  return embed;
}

module.exports = { buildUserProfileEmbed };
