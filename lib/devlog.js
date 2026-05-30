const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const { COLOR_UI, FOOTER } = require("./personality");

const DOCS_DIR = path.join(__dirname, "..", "docs");
const ANNONCE_PREFIX = "annonce-";
const ANNONCE_SUFFIX = "-discord.md";

function listDevlogFiles() {
  if (!fs.existsSync(DOCS_DIR)) return [];
  return fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.startsWith(ANNONCE_PREFIX) && f.endsWith(ANNONCE_SUFFIX))
    .map((f) => f.slice(ANNONCE_PREFIX.length, -ANNOUNCE_SUFFIX.length))
    .sort()
    .reverse();
}

function resolveDevlogPath(slug) {
  const key = String(slug || "")
    .trim()
    .replace(/\.md$/i, "")
    .replace(/^annonce-/i, "")
    .replace(/-discord$/i, "");
  const filename = `${ANNONCE_PREFIX}${key}${ANNONCE_SUFFIX}`;
  const full = path.join(DOCS_DIR, filename);
  if (!fs.existsSync(full)) return null;
  return full;
}

function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "\n");
}

function splitMessageParts(raw) {
  if (/<!--\s*MESSAGE\s+\d+\/\d+/i.test(raw)) {
    const markerParts = raw.split(/(?=<!--\s*MESSAGE\s+\d+\/\d+)/i).filter((p) => p.trim());
    const stripped = markerParts
      .map((p) => p.replace(/<!--[\s\S]*?-->/, "").trim())
      .filter(Boolean);
    if (stripped.length) return stripped;
  }
  const h1Parts = raw.split(/(?=^#\s+)/m).filter((p) => p.trim() && /^#\s+/m.test(p.trim()));
  if (h1Parts.length) return h1Parts;
  return [raw.trim()];
}

function isTableLine(line) {
  return /^\|/.test(line.trim());
}

function formatTableBlock(lines) {
  const rows = lines.filter((l) => isTableLine(l));
  if (!rows.length) return lines.join("\n");
  const parsed = rows
    .map((row) =>
      row
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
    )
    .filter((cells) => cells.length && !/^[-:]+$/.test(cells[0]));
  if (parsed.length < 2) return lines.join("\n");
  const out = parsed.map((cells) => cells.join(" · ")).join("\n");
  return ["```", out, "```"].join("\n");
}

function formatBlock(text) {
  const lines = text.split("\n");
  const out = [];
  let tableBuf = [];

  const flushTable = () => {
    if (!tableBuf.length) return;
    out.push(formatTableBlock(tableBuf));
    tableBuf = [];
  };

  for (const line of lines) {
    if (isTableLine(line)) {
      tableBuf.push(line);
      continue;
    }
    flushTable();
    const t = line.trimEnd();
    if (!t) {
      out.push("");
      continue;
    }
    if (t.startsWith("### ")) {
      out.push(`**${t.slice(4).trim()}**`);
      continue;
    }
    out.push(t);
  }
  flushTable();
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseSignature(text) {
  const m = text.match(/\n—\s*\*([^*]+)\*\s*$/);
  if (!m) return { body: text, footer: null };
  return {
    body: text.slice(0, m.index).trim(),
    footer: m[1].trim(),
  };
}

function parseChunk(rawChunk, index, total) {
  let text = rawChunk.trim();
  text = text.replace(/<!--[\s\S]*?-->/g, "").trim();

  const lines = text.split("\n");
  let title = "Aspirateur Connecte";
  let subtitle = "";
  let i = 0;

  if (lines[i]?.trim().startsWith("# ")) {
    title = lines[i].trim().slice(2).trim();
    i += 1;
  }
  if (lines[i]?.trim().startsWith("## ")) {
    subtitle = lines[i].trim().slice(3).trim();
    i += 1;
  }

  let body = lines.slice(i).join("\n").trim();
  const { body: mainBody, footer } = parseSignature(body);
  body = mainBody;

  const sections = body.split(/\n---+\n/);
  const descriptionParts = [];
  const fields = [];

  for (const section of sections) {
    const block = section.trim();
    if (!block) continue;
    const blockLines = block.split("\n");
    const head = blockLines[0].trim();
    if (head.startsWith("## ") || head.startsWith("### ")) {
      const name = head.replace(/^#+\s*/, "").slice(0, 256);
      const value = formatBlock(blockLines.slice(1).join("\n"));
      if (value) {
        fields.push({
          name,
          value: value.length > 1024 ? `${value.slice(0, 1021)}…` : value,
          inline: false,
        });
      }
    } else {
      descriptionParts.push(formatBlock(block));
    }
  }

  let description = descriptionParts.join("\n\n").trim();
  if (description.length > 4096) {
    const overflow = description.slice(4096);
    description = description.slice(0, 4093) + "…";
    fields.push({
      name: "Suite",
      value: overflow.length > 1024 ? `${overflow.slice(0, 1021)}…` : overflow,
      inline: false,
    });
  }

  const embedTitle = subtitle ? `${title} — ${subtitle}`.slice(0, 256) : title.slice(0, 256);
  const embed = new EmbedBuilder()
    .setColor(COLOR_UI)
    .setTitle(embedTitle)
    .setDescription(description || "\u200b");

  for (const field of fields.slice(0, 25)) {
    embed.addFields(field);
  }

  const footerText = footer || FOOTER;
  embed.setFooter({
    text: total > 1 ? `${footerText} · ${index + 1}/${total}` : footerText,
  });

  return embed;
}

function parseDevlogMarkdown(raw) {
  const cleaned = raw.replace(/\r\n/g, "\n");
  const parts = splitMessageParts(cleaned);
  return parts.map((part, i) => parseChunk(part, i, parts.length));
}

function loadDevlogEmbeds(slug) {
  const filePath = resolveDevlogPath(slug);
  if (!filePath) return { ok: false, reason: `Fichier introuvable : **${slug}** (docs/annonce-${slug}-discord.md).` };
  const raw = fs.readFileSync(filePath, "utf8");
  const embeds = parseDevlogMarkdown(raw);
  if (!embeds.length) return { ok: false, reason: "Aucun contenu parse dans ce fichier." };
  return { ok: true, slug, filePath, embeds, messageCount: embeds.length };
}

function getUpdatesChannelId() {
  return (
    process.env.UPDATES_CHANNEL_ID?.trim() ||
    process.env.GENERAL_CHANNEL_ID?.trim() ||
    null
  );
}

async function postDevlog(client, slug, { pingRoleId = null } = {}) {
  const loaded = loadDevlogEmbeds(slug);
  if (!loaded.ok) return loaded;

  const channelId = getUpdatesChannelId();
  if (!channelId) {
    return {
      ok: false,
      reason: "Salon manquant : definis **UPDATES_CHANNEL_ID** (ou **GENERAL_CHANNEL_ID**) dans `.env`.",
    };
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    return { ok: false, reason: `Salon updates inaccessible (<#${channelId}>).` };
  }

  const messageIds = [];
  for (let i = 0; i < loaded.embeds.length; i += 1) {
    const content =
      i === loaded.embeds.length - 1 && pingRoleId ? `<@&${pingRoleId}>` : undefined;
    const msg = await channel.send({
      content,
      embeds: [loaded.embeds[i]],
    });
    messageIds.push(msg.id);
  }

  return {
    ok: true,
    channelId,
    messageIds,
    messageCount: loaded.messageCount,
    slug: loaded.slug,
  };
}

module.exports = {
  listDevlogFiles,
  resolveDevlogPath,
  loadDevlogEmbeds,
  parseDevlogMarkdown,
  postDevlog,
  getUpdatesChannelId,
};
