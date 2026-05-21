const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "auto-roles.json");

function loadRoleIds() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (!Array.isArray(raw.roles)) return [];
    return raw.roles.filter((id) => id && !String(id).startsWith("REMPLACER"));
  } catch {
    return [];
  }
}

async function assignToMember(member) {
  const roleIds = loadRoleIds();
  if (roleIds.length === 0) return { added: [], skipped: [] };

  const me = member.guild.members.me;
  const added = [];
  const skipped = [];

  for (const roleId of roleIds) {
    const role = member.guild.roles.cache.get(roleId);
    if (!role) {
      skipped.push(roleId);
      continue;
    }
    if (!me || role.position >= me.roles.highest.position) {
      skipped.push(role.name);
      continue;
    }
    if (member.roles.cache.has(roleId)) {
      added.push(role.name);
      continue;
    }
    try {
      await member.roles.add(role);
      added.push(role.name);
    } catch {
      skipped.push(role.name);
    }
  }

  return { added, skipped };
}

module.exports = { loadRoleIds, assignToMember };
