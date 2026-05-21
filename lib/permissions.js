const { PermissionFlagsBits } = require("discord.js");

function isModerator(member) {
  if (!member) return false;
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageMessages) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

module.exports = { isModerator };
