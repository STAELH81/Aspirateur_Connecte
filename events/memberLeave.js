const { Events } = require("discord.js");
const { goodbyeMessage } = require("../lib/personality");

function leaveChannelId() {
  return process.env.LEAVE_CHANNEL_ID || process.env.WELCOME_CHANNEL_ID;
}

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const channelId = leaveChannelId();
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return;

    await channel.send(goodbyeMessage(member));
  },
};
