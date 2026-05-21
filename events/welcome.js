const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const channelId = process.env.WELCOME_CHANNEL_ID;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return;

    await channel.send({
      content: [
        `Bienvenue sur **${member.guild.name}**, ${member} !`,
        `Tu es le **${member.guild.memberCount}e** membre.`,
        `Passe dans les salons, utilise \`/help\` pour voir le bot Les Girlsss.`,
      ].join("\n"),
    });
  },
};
