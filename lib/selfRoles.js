const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "self-roles.json");

function loadMenus() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (Array.isArray(raw.menus)) {
      return raw.menus.filter((m) => Array.isArray(m.roles) && m.roles.length > 0);
    }
    if (Array.isArray(raw.roles) && raw.roles.length > 0) {
      return [
        {
          id: "default",
          title: "Roles au choix",
          description: "Clique pour ajouter ou retirer un role.",
          roles: raw.roles,
        },
      ];
    }
    return [];
  } catch {
    return [];
  }
}

function getMenu(menuId) {
  const menus = loadMenus();
  if (!menuId) return menus[0] ?? null;
  return menus.find((m) => m.id === menuId) ?? null;
}

module.exports = { loadMenus, getMenu };
