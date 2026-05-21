const { Events } = require("discord.js");
const { welcomeMessage } = require("../lib/personality");
const { assignToMember, loadRoleIds } = require("../lib/autoRoles");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const { added } = await assignToMember(member);

    const channelId = process.env.WELCOME_CHANNEL_ID;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return;

    const payload = welcomeMessage(
      member,
      member.guild.name,
      member.guild.memberCount,
      added,
      loadRoleIds().length > 0
    );

    await channel.send(payload);
  },
};
