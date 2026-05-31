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

/**
 * Default nested-step templates for stages that have been expanded from a
 * single broad handoff into a real sub-step chain. Each template describes
 * one editable step row inside the stage. Steps are matched against
 * existing handoffs by case-insensitive `mode` text; missing steps get
 * appended by the backfill, existing/custom handoffs in that stage are
 * preserved as legacy steps.
 */
export type NestedStepTemplate = {
  mode: string;
  bot: string;
  assignment: string;
  authorityNotes?: string;
};

export const STAGE_NESTED_STEPS: Record<string, NestedStepTemplate[]> = {
  modes: [
    {
      mode: "Mode 0 / Raw Idea",
      bot: "Boss",
      assignment:
        "Capture the plain-language idea exactly enough that it does not get lost. Voice, context, and any constraints Boss already has in mind.",
      authorityNotes:
        "Boss + Clarity. Raw intake only — no shaping or filtering yet.",
    },
    {
      mode: "Project Type Confirmation / Clarity",
      bot: "Chief",
      assignment:
        "Confirm the Project Type field and make sure the project is classified before deeper planning. Flag if the type is unclear or likely to change.",
      authorityNotes:
        "Chief + Clarity. Classification gate before Mode 1 work begins.",
    },
    {
      mode: "Mode 1 / Shape",
      bot: "Clarity",
      assignment:
        "Turn the raw idea into a clearer direction, audience, goal, and rough boundaries.",
      authorityNotes:
        "Clarity owns shaping. May ask Boss for clarifications; cannot lock the brief yet.",
    },
    {
      mode: "Mode 2 / Project Brief",
      bot: "Clarity",
      assignment:
        "Create a project-ready brief that Chief can use to open or continue the project.",
      authorityNotes:
        "Clarity owns the brief. Brief is the handoff packet to Chief.",
    },
    {
      mode: "Chief Intake Summary / Clarity",
      bot: "Chief",
      assignment:
        "Summarize what is known, what is missing, and what should happen next.",
      authorityNotes:
        "Chief owns intake summary. Names open questions before R&D begins.",
    },
  ],
  rd: [
    {
      mode: "Research Scope / R&D",
      bot: "Compass",
      assignment:
        "Define what needs to be researched before building. Name the questions, not the answers.",
      authorityNotes: "Compass scopes research; does not decide outcomes.",
    },
    {
      mode: "Past Landscape / R&D",
      bot: "Compass",
      assignment:
        "Capture relevant history, similar attempts, prior examples, and lessons.",
      authorityNotes: "Research-only. Cite sources where possible.",
    },
    {
      mode: "Present Landscape / R&D",
      bot: "Compass",
      assignment:
        "Capture current competitors, patterns, tools, audience expectations, and constraints.",
      authorityNotes: "Research-only. Cite sources where possible.",
    },
    {
      mode: "Future Hooks / R&D",
      bot: "Compass",
      assignment:
        "Capture future possibilities without adding them to current scope too early.",
      authorityNotes:
        "Park forward-looking ideas here; do not let them expand current scope.",
    },
    {
      mode: "Risks and Unknowns / R&D",
      bot: "Compass",
      assignment:
        "Name missing information, risks, blockers, and assumptions.",
      authorityNotes:
        "Compass surfaces risk; Boss decides whether to proceed.",
    },
    {
      mode: "R&D Highlight Brief",
      bot: "Compass",
      assignment:
        "Create a short Boss-facing summary of the most important research findings.",
      authorityNotes:
        "Highlight brief is the handoff packet out of R&D into Knowledge Packet.",
    },
  ],
};

/** True if any existing handoff's mode matches the template's mode (case-insensitive, trimmed). */
export function handoffMatchesNestedStep(
  handoff: Handoff,
  template: NestedStepTemplate,
): boolean {
  const a = (handoff.mode ?? "").trim().toLowerCase();
  const b = template.mode.trim().toLowerCase();
  return a === b;
}