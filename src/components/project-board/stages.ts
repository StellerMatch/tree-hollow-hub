import type { Handoff } from "./types";

export type StageDef = {
  id: string;
  label: string;
  blurb: string;
  /** Lowercase substrings; first match wins. */
  match: string[];
  /** Avatar bot for the stage header. */
  bot: string;
};

/**
 * User-facing pipeline stages. Each stage groups one or more handoffs whose
 * `mode` text contains any of the listed keywords (case-insensitive). The
 * first stage whose keywords match a handoff wins; unmatched handoffs fall
 * into the "Other steps" bucket so nothing is ever hidden.
 */
export const PIPELINE_STAGES: StageDef[] = [
  {
    id: "modes",
    label: "Modes",
    blurb: "Boss clarity — Mode 0, Mode 1, Mode 2.",
    match: ["mode 0", "mode 1", "mode 2", "clarity", "shape", "plan"],
    bot: "Clarity",
  },
  {
    id: "rd",
    label: "R&D",
    blurb: "Compass research — past, present, future notes.",
    match: ["r&d", "rd", "research", "compass", "trunk"],
    bot: "Compass",
  },
  {
    id: "knowledge-packet",
    label: "Knowledge Packet",
    blurb: "Rook synthesizes clarity + research into a business plan.",
    match: ["knowledge packet", "rook", "business plan", "packet"],
    bot: "Rook",
  },
  {
    id: "prototype",
    label: "Prototype",
    blurb: "Tinker builds and tests a working prototype.",
    match: ["prototype", "tinker", "build"],
    bot: "Tinker",
  },
  {
    id: "design-polish",
    label: "Design Polish",
    blurb: "Luma reviews visual trust, readability, and accessibility.",
    match: ["design polish", "luma", "polish", "visual review"],
    bot: "Luma",
  },
  {
    id: "final-package",
    label: "Final Package",
    blurb: "Weaver bundles the final handoff package.",
    match: ["final package", "weaver", "package", "bundle"],
    bot: "Weaver",
  },
  {
    id: "official-record",
    label: "Official Record",
    blurb: "Ledger files the immutable decision record.",
    match: ["official record", "ledger", "record", "decision"],
    bot: "Ledger",
  },
  {
    id: "memory-alignment",
    label: "Memory Alignment",
    blurb: "Echo decides what gets remembered, and what does not.",
    match: ["memory alignment", "echo", "memory"],
    bot: "Echo",
  },
];

export const OTHER_STAGE: StageDef = {
  id: "other",
  label: "Other steps",
  blurb: "Custom or unclassified handoffs.",
  match: [],
  bot: "",
};

export function stageForHandoff(h: Handoff): StageDef {
  const hay = `${h.mode ?? ""} ${h.bot ?? ""}`.toLowerCase();
  for (const stage of PIPELINE_STAGES) {
    if (stage.match.some((kw) => {
      if (kw === "rd") return /(^|[^a-z0-9])rd([^a-z0-9]|$)/.test(hay);
      return hay.includes(kw);
    })) return stage;
  }
  return OTHER_STAGE;
}

export type StageBucket = {
  stage: StageDef;
  /** Items keep their original global index so reorder/edit handlers still target the right handoff. */
  items: Array<{ handoff: Handoff; globalIndex: number }>;
};

export function bucketHandoffs(handoffs: Handoff[]): StageBucket[] {
  const buckets = new Map<string, StageBucket>();
  for (const stage of PIPELINE_STAGES) {
    buckets.set(stage.id, { stage, items: [] });
  }
  buckets.set(OTHER_STAGE.id, { stage: OTHER_STAGE, items: [] });

  handoffs.forEach((h, i) => {
    const stage = stageForHandoff(h);
    buckets.get(stage.id)!.items.push({ handoff: h, globalIndex: i });
  });

  // Preserve declared stage order; always include empty stages so users see the full pipeline.
  const ordered: StageBucket[] = PIPELINE_STAGES.map((s) => buckets.get(s.id)!);
  const other = buckets.get(OTHER_STAGE.id)!;
  if (other.items.length > 0) ordered.push(other);
  return ordered;
}