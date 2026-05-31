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
      mode: "Lantern Team Kickoff / R&D",
      bot: "Compass",
      assignment:
        "Name the research question, assign the lantern passes, and clarify what each lane (Compass, Vault, Bloom, Luma) should look for.",
      authorityNotes:
        "Compass leads the lantern team. Each lantern owns its own pass; Compass orchestrates.",
    },
    {
      mode: "Past Landscape Pass / R&D",
      bot: "Compass",
      assignment:
        "Each lantern captures the past in its lane — Compass: prior examples and lessons; Vault: money history and prior pricing; Bloom: audience history and prior launches; Luma: design history and prior visual patterns.",
      authorityNotes:
        "Lanterns: Compass / Vault / Bloom / Luma. Research-only. Cite sources where possible.",
    },
    {
      mode: "Present Landscape Pass / R&D",
      bot: "Compass",
      assignment:
        "Each lantern captures the present — Compass: current market and tools; Vault: current money realities and pricing; Bloom: current audience expectations and channels; Luma: current design expectations and active constraints.",
      authorityNotes:
        "Lanterns: Compass / Vault / Bloom / Luma. Research-only. Cite sources where possible.",
    },
    {
      mode: "Future Hooks Pass / R&D",
      bot: "Compass",
      assignment:
        "Each lantern captures future possibilities — Compass: future framing; Vault: future money paths and revenue models; Bloom: future growth and distribution paths; Luma: future design and product opportunities. Park forward-looking ideas without expanding current scope.",
      authorityNotes:
        "Lanterns: Compass / Vault / Bloom / Luma. Park futures here; do not let them expand current scope.",
    },
    {
      mode: "Risks and Unknowns Pass / R&D",
      bot: "Compass",
      assignment:
        "Each lantern names missing information, risks, blockers, and assumptions — Compass: research gaps; Vault: financial concerns; Bloom: audience concerns; Luma: design concerns.",
      authorityNotes:
        "Lanterns: Compass / Vault / Bloom / Luma. Surface risk; Boss decides whether to proceed.",
    },
    {
      mode: "Research Scope and Synthesis / R&D",
      bot: "Compass",
      assignment:
        "Compass reviews the lantern passes, narrows what matters, separates current scope from future hooks, and prepares the final research direction.",
      authorityNotes:
        "Compass synthesizes. Decisions about scope vs. future hooks happen here.",
    },
    {
      mode: "R&D Highlight Brief",
      bot: "Compass",
      assignment:
        "Create a short Boss-facing summary of the most important findings, risks, recommendations, and next-step implications.",
      authorityNotes:
        "Highlight brief is the handoff packet out of R&D into Knowledge Packet.",
    },
  ],
};

/**
 * One-time renames so handoffs created under the previous R&D nested-step
 * names migrate cleanly into the new lantern-team names instead of being
 * left behind as legacy duplicates next to the freshly-backfilled steps.
 * Key: old mode text (case-insensitive, trimmed). Value: new mode text.
 */
export const NESTED_STEP_RENAMES: Record<string, string> = {
  "research scope / r&d": "Research Scope and Synthesis / R&D",
  "past landscape / r&d": "Past Landscape Pass / R&D",
  "present landscape / r&d": "Present Landscape Pass / R&D",
  "future hooks / r&d": "Future Hooks Pass / R&D",
  "risks and unknowns / r&d": "Risks and Unknowns Pass / R&D",
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