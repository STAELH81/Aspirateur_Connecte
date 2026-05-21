const { Events } = require("discord.js");
const { welcomeMessage } = require("../lib/personality");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const channelId = process.env.WELCOME_CHANNEL_ID;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return;

    await channel.send(
      welcomeMessage(member, member.guild.name, member.guild.memberCount)
    );
  },
};
