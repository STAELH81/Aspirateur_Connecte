const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { loadMenus, getMenu } = require("../lib/selfRoles");
const { buildPanel } = require("../lib/rolePanels");
const { isModerator } = require("../lib/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Poster un menu de roles (remplace YAGPDB)")
    .addStringOption((opt) =>
      opt
        .setName("menu")
        .setDescription("Quel panneau poster")
        .setRequired(true)
        .addChoices(
          { name: "Jeux (Valorant, MC, CS, LoL)", value: "jeux" },
          { name: "Notifs (Events, Sorties, Updates Bot)", value: "notifs" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    if (!isModerator(interaction.member)) {
      await interaction.reply({
        content: "Reserve aux admins (pour poster le panel).",
        ephemeral: true,
      });
      return;
    }

    const menuId = interaction.options.getString("menu");
    const menu = getMenu(menuId);

    if (!menu) {
      await interaction.reply({
        content: `Menu \`${menuId}\` introuvable dans data/self-roles.json`,
        ephemeral: true,
      });
      return;
    }

    const panel = buildPanel(menu);
    if (!panel) {
      await interaction.reply({
        content:
          `Roles pas configures pour **${menu.title}**. Remplace les IDs REMPLACER_* dans data/self-roles.json (mode dev → clic droit sur le role → copier l'identifiant).`,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(panel);
  },
};
