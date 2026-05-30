const { MessageFlags } = require("discord.js");

/** Salon #money (ex-quetes Les Girlsss) — panneau daily/work/quetes/coop */
const DEFAULT_MONEY_HUB_CHANNEL_ID = "1510077978091061349";

function getMoneyHubChannelId() {
  return process.env.QUESTS_BOARD_CHANNEL_ID?.trim() || DEFAULT_MONEY_HUB_CHANNEL_ID;
}

function getAllowedGamblingChannelIds() {
  const ids = new Set();

  const multi = process.env.GAMBLING_CHANNEL_IDS?.trim();
  if (multi) {
    for (const part of multi.split(",")) {
      const id = part.trim();
      if (id) ids.add(id);
    }
  }

  for (const key of ["GAMBLING_CHANNEL_ID", "GAMBLING_TEST_CHANNEL_ID"]) {
    const id = process.env[key]?.trim();
    if (id) ids.add(id);
  }

  return [...ids];
}

function checkGamblingChannel(interaction) {
  const allowed = getAllowedGamblingChannelIds();
  if (allowed.length === 0) {
    return { ok: true };
  }
  if (allowed.includes(interaction.channelId)) {
    return { ok: true };
  }
  const channelName = String(interaction.channel?.name || "").toLowerCase();
  if (
    channelName.includes("banque") ||
    channelName.includes("bank") ||
    channelName.includes("money") ||
    channelName.includes("casino") ||
    channelName.includes("shop") ||
    channelName.includes("infos") ||
    channelName.includes("quete") ||
    channelName.includes("quest") ||
    channelName.includes("gambling")
  ) {
    return { ok: true };
  }

  const mentions = allowed.map((id) => `<#${id}>`).join(" ou ");
  return {
    ok: false,
    message: `L'economie et le casino sont uniquement dans ${mentions} (ou salons banque/money/casino/shop/infos).`,
  };
}

async function replyIfWrongChannel(interaction) {
  const check = checkGamblingChannel(interaction);
  if (check.ok) return true;
  await interaction.reply({
    content: check.message,
    flags: MessageFlags.Ephemeral,
  });
  return false;
}

/** Salon #money (ex-quetes) — daily, work, quetes, coop */
function isMoneyHubChannel(channel) {
  if (!channel) return false;
  if (channel.id === getMoneyHubChannelId()) return true;
  const name = String(channel.name || "").toLowerCase();
  if (name.includes("banque") || name.includes("bank")) return false;
  return name.includes("quete") || name.includes("quest") || name.includes("money");
}

module.exports = {
  getAllowedGamblingChannelIds,
  checkGamblingChannel,
  replyIfWrongChannel,
  isMoneyHubChannel,
  getMoneyHubChannelId,
  DEFAULT_MONEY_HUB_CHANNEL_ID,
};
