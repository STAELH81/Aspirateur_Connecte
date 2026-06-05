const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { loadMenus, getMenu } = require("../lib/selfRoles");
const { buildPanel } = require("../lib/rolePanels");
const { isModerator } = require("../lib/permissions");

function buildRolesCommandData() {
  const menus = loadMenus();
  const builder = new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Poster un menu de roles")
    .addStringOption((opt) => {
      opt.setName("menu").setDescription("Quel panneau poster").setRequired(true);
      for (const menu of menus) {
        const name = (menu.title || menu.id).slice(0, 100);
        opt.addChoices({ name, value: menu.id });
      }
      if (menus.length === 0) {
        opt.addChoices({ name: "jeux", value: "jeux" });
      }
      return opt;
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);
  return builder;
}

module.exports = {
  get data() {
    return buildRolesCommandData();
  },
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

    await interaction.channel.send(panel);
    await interaction.reply({ content: "Panneau roles poste.", ephemeral: true });
  },
};
