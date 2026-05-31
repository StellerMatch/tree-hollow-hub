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
    blurb: "Compass leads product R&D with Vault, Bloom, and Luma lantern passes.",
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
  /** Default next-step chain hint for this nested step. */
  nextBot?: string;
  nextStep?: string;
};

export const STAGE_NESTED_STEPS: Record<string, NestedStepTemplate[]> = {
  modes: [
    {
      mode: "Mode 0 / Raw Idea",
      bot: "Clarity",
      assignment:
        "Capture the plain-language idea exactly enough that it does not get lost. Voice, context, and any constraints Boss already has in mind.",
      authorityNotes:
        "Clarity owns intake with Boss. Raw intake only — no shaping or filtering yet.",
      nextBot: "Chief",
      nextStep: "Project Type Confirmation / Clarity",
    },
    {
      mode: "Project Type Confirmation / Clarity",
      bot: "Chief",
      assignment:
        "Confirm the Project Type field and make sure the project is classified before deeper planning. Flag if the type is unclear or likely to change.",
      authorityNotes:
        "Chief + Clarity. Classification gate before Mode 1 work begins.",
      nextBot: "Clarity",
      nextStep: "Mode 1 / Shape",
    },
    {
      mode: "Mode 1 / Shape",
      bot: "Clarity",
      assignment:
        "Turn the raw idea into a clearer direction, audience, goal, and rough boundaries.",
      authorityNotes:
        "Clarity owns shaping. May ask Boss for clarifications; cannot lock the brief yet.",
      nextBot: "Clarity",
      nextStep: "Mode 2 / Project Brief",
    },
    {
      mode: "Mode 2 / Project Brief",
      bot: "Clarity",
      assignment:
        "Create a project-ready brief that Chief can use to open or continue the project.",
      authorityNotes:
        "Clarity owns the brief. Brief is the handoff packet to Chief.",
      nextBot: "Chief",
      nextStep: "Chief Intake Summary / Clarity",
    },
    {
      mode: "Chief Intake Summary / Clarity",
      bot: "Chief",
      assignment:
        "Summarize what is known, what is missing, and what should happen next.",
      authorityNotes:
        "Chief owns intake summary. Names open questions before R&D begins.",
      nextBot: "Compass",
      nextStep: "Lantern Team Kickoff / R&D",
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
      nextBot: "Compass",
      nextStep: "Past Landscape Pass / R&D",
    },
    {
      mode: "Past Landscape Pass / R&D",
      bot: "Compass",
      assignment:
        "Each lantern captures the past in its lane — Compass: prior examples and lessons; Vault: money history and prior pricing; Bloom: audience history and prior launches; Luma: design history and prior visual patterns.",
      authorityNotes:
        "Lanterns: Compass / Vault / Bloom / Luma. Research-only. Cite sources where possible.",
      nextBot: "Compass",
      nextStep: "Present Landscape Pass / R&D",
    },
    {
      mode: "Present Landscape Pass / R&D",
      bot: "Compass",
      assignment:
        "Each lantern captures the present — Compass: current market and tools; Vault: current money realities and pricing; Bloom: current audience expectations and channels; Luma: current design expectations and active constraints.",
      authorityNotes:
        "Lanterns: Compass / Vault / Bloom / Luma. Research-only. Cite sources where possible.",
      nextBot: "Compass",
      nextStep: "Future Hooks Pass / R&D",
    },
    {
      mode: "Future Hooks Pass / R&D",
      bot: "Compass",
      assignment:
        "Each lantern captures future possibilities — Compass: future framing; Vault: future money paths and revenue models; Bloom: future growth and distribution paths; Luma: future design and product opportunities. Park forward-looking ideas without expanding current scope.",
      authorityNotes:
        "Lanterns: Compass / Vault / Bloom / Luma. Park futures here; do not let them expand current scope.",
      nextBot: "Compass",
      nextStep: "Risks and Unknowns Pass / R&D",
    },
    {
      mode: "Risks and Unknowns Pass / R&D",
      bot: "Compass",
      assignment:
        "Each lantern names missing information, risks, blockers, and assumptions — Compass: research gaps; Vault: financial concerns; Bloom: audience concerns; Luma: design concerns.",
      authorityNotes:
        "Lanterns: Compass / Vault / Bloom / Luma. Surface risk; Boss decides whether to proceed.",
      nextBot: "Compass",
      nextStep: "Research Scope and Synthesis / R&D",
    },
    {
      mode: "Research Scope and Synthesis / R&D",
      bot: "Compass",
      assignment:
        "Compass reviews the lantern passes, narrows what matters, separates current scope from future hooks, and prepares the final research direction.",
      authorityNotes:
        "Compass synthesizes. Decisions about scope vs. future hooks happen here.",
      nextBot: "Compass",
      nextStep: "R&D Highlight Brief",
    },
    {
      mode: "R&D Highlight Brief",
      bot: "Compass",
      assignment:
        "Create a short Boss-facing summary of the most important findings, risks, recommendations, and next-step implications.",
      authorityNotes:
        "Highlight brief is the handoff packet out of R&D into Knowledge Packet.",
      nextBot: "Rook",
      nextStep: "Rook / Knowledge Packet",
    },
  ],
};

// --- Phases 4–8: detailed hand-down checklist ----------------------------
// Restores the full internal handoff sequence under each creator-facing
// phase. Counts: Modes 5 (Clarity 4 + Chief Review 1) + R&D 7 +
// Knowledge Packet 6 + Prototype 6 + Design Polish 5 + Final Package 5 +
// Official Record 4 + Memory 5 = 43 detailed steps.

STAGE_NESTED_STEPS["knowledge-packet"] = [
  {
    mode: "Packet Intake / Knowledge Packet",
    bot: "Rook",
    assignment:
      "Rook reads Clarity brief + Compass R&D highlight brief and confirms the inputs needed to assemble the knowledge packet.",
    authorityNotes: "Rook owns intake. Flags missing inputs before synthesis.",
    nextBot: "Squirrels",
    nextStep: "Risk and Sanity Check / Knowledge Packet",
  },
  {
    mode: "Risk and Sanity Check / Knowledge Packet",
    bot: "Squirrels",
    assignment:
      "Squirrels review the intake for risk, missing assumptions, and sanity issues before drafting begins. Flag concerns; cannot block delivery.",
    authorityNotes: "Squirrels advise. Rook decides whether to revise.",
    nextBot: "Rook",
    nextStep: "Business Plan Draft / Knowledge Packet",
  },
  {
    mode: "Business Plan Draft / Knowledge Packet",
    bot: "Rook",
    assignment:
      "Draft the business-plan / knowledge packet: problem, audience, offer, scope, success criteria, and next-step plan.",
    authorityNotes: "Rook owns synthesis. Pulls from Clarity + R&D only.",
    nextBot: "Vault",
    nextStep: "Practical Lane Checks / Knowledge Packet",
  },
  {
    mode: "Practical Lane Checks / Knowledge Packet",
    bot: "Vault",
    assignment:
      "Vault and Bloom run lane-specific checks against the draft — money realism, audience realism, and any operational gaps Rook should fold in.",
    authorityNotes: "Vault + Bloom advise. Rook decides whether to revise the draft.",
    nextBot: "Rook",
    nextStep: "Packet Finalization / Knowledge Packet",
  },
  {
    mode: "Packet Finalization / Knowledge Packet",
    bot: "Rook",
    assignment:
      "Finalize the knowledge packet: incorporate lane checks, attach links and receipts, and lock the version.",
    authorityNotes: "Rook owns the final packet. No further edits after this gate.",
    nextBot: "Rook",
    nextStep: "Tinker-Ready Handoff / Knowledge Packet",
  },
  {
    mode: "Tinker-Ready Handoff / Knowledge Packet",
    bot: "Rook",
    assignment:
      "Hand the locked packet, scope notes, and any open questions to Tinker so the prototype can start cleanly.",
    authorityNotes: "Handoff packet out of Phase 4.",
    nextBot: "Tinker",
    nextStep: "Prototype Kickoff / Prototype",
  },
];

STAGE_NESTED_STEPS["prototype"] = [
  {
    mode: "Prototype Kickoff / Prototype",
    bot: "Tinker",
    assignment:
      "Tinker reads the knowledge packet, confirms scope, picks the build path (Lovable or other), and names the v1 target.",
    authorityNotes: "Tinker may build, not ship. Scope is locked at kickoff.",
    nextBot: "Tinker",
    nextStep: "Build v1 / Prototype",
  },
  {
    mode: "Build v1 / Prototype",
    bot: "Tinker",
    assignment:
      "Build the first working prototype. Capture the prototype URL and any setup notes needed to open it.",
    authorityNotes: "Tinker owns the build. No scope expansion mid-build.",
    nextBot: "Tinker",
    nextStep: "Self-Test and Evidence / Prototype",
  },
  {
    mode: "Self-Test and Evidence / Prototype",
    bot: "Tinker",
    assignment:
      "Walk through the prototype end-to-end. Log evidence, screenshots, and any failed tests or blockers.",
    authorityNotes: "Tinker logs blockers honestly. Failed tests must be named.",
    nextBot: "Tinker",
    nextStep: "Demo Notes / Prototype",
  },
  {
    mode: "Demo Notes / Prototype",
    bot: "Tinker",
    assignment:
      "Write a short demo note: what works, what to click, what is rough, what is intentionally out of scope.",
    authorityNotes: "Demo note travels with the prototype to Luma.",
    nextBot: "Tinker",
    nextStep: "Prototype Handoff / Prototype",
  },
  {
    mode: "Prototype Handoff / Prototype",
    bot: "Tinker",
    assignment:
      "Hand the prototype URL, evidence, and demo note to Luma for design polish review.",
    authorityNotes: "Handoff packet out of the build lane.",
    nextBot: "Tinker",
    nextStep: "Tinker Result Review / Prototype",
  },
  {
    mode: "Tinker Result Review / Prototype",
    bot: "Tinker",
    assignment:
      "Review the prototype against the knowledge packet: scope match, blockers logged, evidence attached, and Luma handoff confirmed.",
    authorityNotes: "Final gate out of Phase 5. Confirms Tinker's result before Luma takes it.",
    nextBot: "Luma",
    nextStep: "Visual Review / Design Polish",
  },
];

STAGE_NESTED_STEPS["design-polish"] = [
  {
    mode: "Visual Review / Design Polish",
    bot: "Luma",
    assignment:
      "Luma reviews the prototype for visual trust, hierarchy, and overall feel. Note what reads as trustworthy and what does not.",
    authorityNotes: "Luma may reject for trust; cannot change scope.",
    nextBot: "Luma",
    nextStep: "Readability and Accessibility / Design Polish",
  },
  {
    mode: "Readability and Accessibility / Design Polish",
    bot: "Luma",
    assignment:
      "Check readability, contrast, font sizes, tap targets, and basic accessibility. Note required fixes vs. nice-to-haves.",
    authorityNotes: "Required fixes block packaging. Nice-to-haves go to backlog.",
    nextBot: "Luma",
    nextStep: "UI and Packaging Polish / Design Polish",
  },
  {
    mode: "UI and Packaging Polish / Design Polish",
    bot: "Luma",
    assignment:
      "Apply polish to UI surfaces, packaging, and any cover/share assets so the project presents cleanly.",
    authorityNotes: "Luma owns visual polish. No scope changes.",
    nextBot: "Luma",
    nextStep: "Design Polish Sign-off / Design Polish",
  },
  {
    mode: "Design Polish Sign-off / Design Polish",
    bot: "Luma",
    assignment:
      "Sign off on the polished prototype and write the handoff note to Weaver for final packaging.",
    authorityNotes: "Luma owns sign-off. Closes the polish lane.",
    nextBot: "Luma",
    nextStep: "Luma Result Review / Design Polish",
  },
  {
    mode: "Luma Result Review / Design Polish",
    bot: "Luma",
    assignment:
      "Review the polished result end-to-end: visual trust, accessibility, packaging, and readiness for Weaver.",
    authorityNotes: "Final gate out of Phase 6.",
    nextBot: "Weaver",
    nextStep: "Package Intake / Final Package",
  },
];

STAGE_NESTED_STEPS["final-package"] = [
  {
    mode: "Package Intake / Final Package",
    bot: "Weaver",
    assignment:
      "Weaver gathers the polished prototype, packet, design notes, and any final assets needed for delivery.",
    authorityNotes: "Weaver owns packaging. Cannot alter Rook or Luma decisions.",
    nextBot: "Weaver",
    nextStep: "Final Links and Assets / Final Package",
  },
  {
    mode: "Final Links and Assets / Final Package",
    bot: "Weaver",
    assignment:
      "Collect every final link and asset (prototype URL, packet doc, design files, receipts) into one place.",
    authorityNotes: "Single source of truth for the delivery bundle.",
    nextBot: "Weaver",
    nextStep: "Delivery Checklist / Final Package",
  },
  {
    mode: "Delivery Checklist / Final Package",
    bot: "Weaver",
    assignment:
      "Run the delivery checklist: links open, scope matches brief, receipts attached, owner named, next action clear.",
    authorityNotes: "Checklist must pass before handoff to Ledger.",
    nextBot: "Weaver",
    nextStep: "Final Package Handoff / Final Package",
  },
  {
    mode: "Final Package Handoff / Final Package",
    bot: "Weaver",
    assignment:
      "Hand the final package and delivery note to Ledger for the official record.",
    authorityNotes: "Weaver closes the packaging lane.",
    nextBot: "Weaver",
    nextStep: "Weaver Result Review / Final Package",
  },
  {
    mode: "Weaver Result Review / Final Package",
    bot: "Weaver",
    assignment:
      "Review the assembled package end-to-end: links resolve, receipts attached, delivery note clear, owner named.",
    authorityNotes: "Final gate out of Phase 7.",
    nextBot: "Ledger",
    nextStep: "Decision Record / Official Record",
  },
];

STAGE_NESTED_STEPS["official-record"] = [
  {
    mode: "Decision Record / Official Record",
    bot: "Ledger",
    assignment:
      "Ledger files the official decision: what shipped, what was parked, who owns next, and any outstanding risks.",
    authorityNotes: "Ledger is the official record. No edits to past entries.",
    nextBot: "Ledger",
    nextStep: "Receipts and Artifacts / Official Record",
  },
  {
    mode: "Receipts and Artifacts / Official Record",
    bot: "Ledger",
    assignment:
      "Attach receipts, artifacts, and the final package links to the official record so the project is fully reconstructable.",
    authorityNotes: "Ledger owns receipts. Append-only.",
    nextBot: "Ledger",
    nextStep: "Record Handoff / Official Record",
  },
  {
    mode: "Record Handoff / Official Record",
    bot: "Ledger",
    assignment:
      "Hand the filed record to Echo for memory alignment.",
    authorityNotes: "Closes the record lane before memory work begins.",
    nextBot: "Ledger",
    nextStep: "Official Record / Official Record",
  },
  {
    mode: "Official Record / Official Record",
    bot: "Ledger",
    assignment:
      "Confirm the official record is filed, immutable, and discoverable. Final ledger gate before memory alignment.",
    authorityNotes: "Final gate out of Phase 8a.",
    nextBot: "Echo",
    nextStep: "Brain Update Requests / Memory Alignment",
  },
];

STAGE_NESTED_STEPS["memory-alignment"] = [
  {
    mode: "Brain Update Requests / Memory Alignment",
    bot: "Echo",
    assignment:
      "Name any brain / system memory updates that should follow from this project, with reasons.",
    authorityNotes: "Requests only. Boss approves brain changes.",
    nextBot: "Echo",
    nextStep: "Memory Alignment / Memory Alignment",
  },
  {
    mode: "Memory Alignment / Memory Alignment",
    bot: "Echo",
    assignment:
      "Reconcile requested brain updates with current memory. Resolve conflicts, note what shifts, what holds.",
    authorityNotes: "Echo owns alignment. No silent overwrites.",
    nextBot: "Echo",
    nextStep: "Memory Decisions / Memory Alignment",
  },
  {
    mode: "Memory Decisions / Memory Alignment",
    bot: "Echo",
    assignment:
      "Decide what is remembered, what is intentionally forgotten, and where each decision is recorded.",
    authorityNotes: "Echo guards memory. Decisions are append-only.",
    nextBot: "Echo",
    nextStep: "Project Close / Memory Alignment",
  },
  {
    mode: "Project Close / Memory Alignment",
    bot: "Echo",
    assignment:
      "Close out the project: confirm record is filed, memory is aligned, and nothing important is left dangling.",
    authorityNotes: "Project moves to Complete after sign-off.",
    nextBot: "Echo",
    nextStep: "Final Memory Receipt / Memory Alignment",
  },
  {
    mode: "Final Memory Receipt / Memory Alignment",
    bot: "Echo",
    assignment:
      "Issue the final memory receipt: a short note linking record, memory decisions, and any open follow-ups.",
    authorityNotes: "Final gate out of Phase 8b. Receipt is the project's closing artifact.",
  },
];

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
  // Legacy single broad handoffs migrate into the first new default step
  // for their stage so they stop appearing as duplicate cards above the
  // new defaults. User-saved data (status, artifact, receipt, output) is
  // preserved because only the `mode` text is renamed.
  "mode 0 / clarity intake": "Mode 0 / Raw Idea",
  "clarity / mode 0": "Mode 0 / Raw Idea",
  // Legacy "Trunk / R&D" carried Compass's synthesis/research content, so
  // it migrates into Research Scope and Synthesis (not Kickoff).
  "trunk / r&d": "Research Scope and Synthesis / R&D",
  // Legacy pipeline-seed broad cards collapse into the canonical first
  // checkpoint of their phase so the rail does not show summary-style
  // duplicates next to the freshly-backfilled nested steps.
  "rook / knowledge packet": "Business Plan Draft / Knowledge Packet",
  "tinker / prototype": "Build v1 / Prototype",
  "luma / design polish": "Visual Review / Design Polish",
  "weaver / final package": "Package Intake / Final Package",
  "ledger / official record": "Decision Record / Official Record",
  "echo / memory alignment": "Memory Decisions / Memory Alignment",
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