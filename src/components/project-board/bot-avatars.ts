import { BOT_TREE, type BotNode } from "@/components/openclaw/tree-data";

function walk(node: BotNode, acc: Record<string, string>) {
  if (node.kind === "bot" && node.image) {
    acc[node.name.toLowerCase()] = node.image;
  }
  // Boss also has an image and is a valid handoff owner
  if (node.kind === "boss" && node.image) {
    acc[node.name.toLowerCase()] = node.image;
  }
  node.children?.forEach((c) => walk(c, acc));
}

const MAP: Record<string, string> = {};
walk(BOT_TREE, MAP);

/** Returns a bot headshot image src if one exists for the given name. */
export function botImageFor(name?: string | null): string | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  if (!key) return undefined;
  if (MAP[key]) return MAP[key];
  // tolerate accents (e.g. "Raíz" vs "raiz")
  const normalized = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return MAP[normalized];
}

/** Initials fallback (max 2 chars). */
export function botInitials(name?: string | null): string {
  if (!name) return "?";
  const cleaned = name.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}