import type { Handoff } from "./types";

export type PipelineStageTemplate = {
  stage: string;
  bot: string;
  assignment: string;
  authorityNotes: string;
  nextBot?: string;
  nextStep?: string;
};

export const DABOTTREE_PIPELINE_NAME = "DaBotTree Project Pipeline";

export const DABOTTREE_PIPELINE: PipelineStageTemplate[] = [
  {
    stage: "Clarity / Mode 0",
    bot: "Boss",
    assignment:
      "Write the Boss idea, goal, audience, done-state, and constraints in plain language.",
    authorityNotes:
      "Boss authority. No bot work begins downstream until Clarity is signed.",
    nextBot: "Compass",
    nextStep: "Trunk / R&D",
  },
  {
    stage: "Trunk / R&D",
    bot: "Compass",
    assignment:
      "Compass synthesis. Gather Past / Present / Future notes. Pull optional Vault, Bloom, and Luma lane inputs.",
    authorityNotes:
      "Research-only. No decisions, no shipping. Cite sources where possible.",
    nextBot: "Rook",
    nextStep: "Rook / Knowledge Packet",
  },
  {
    stage: "Rook / Knowledge Packet",
    bot: "Rook",
    assignment:
      "Turn Clarity + R&D into a clean business-plan / knowledge packet. Include optional Squirrels checks.",
    authorityNotes:
      "Rook owns synthesis. Squirrels may flag risks but cannot block delivery.",
    nextBot: "Tinker",
    nextStep: "Tinker / Prototype",
  },
  {
    stage: "Tinker / Prototype",
    bot: "Tinker",
    assignment:
      "Build prototype (Lovable or other). Return prototype link, evidence, test notes, and any blockers.",
    authorityNotes:
      "Tinker may build, not ship. Blockers and failed tests must be logged here.",
    nextBot: "Luma",
    nextStep: "Luma / Design Polish",
  },
  {
    stage: "Luma / Design Polish",
    bot: "Luma",
    assignment:
      "Review prototype for visual trust, readability, accessibility, and UI / packaging.",
    authorityNotes:
      "Luma owns visual review. May reject for trust or readability; cannot change scope.",
    nextBot: "Weaver",
    nextStep: "Weaver / Final Package",
  },
  {
    stage: "Weaver / Final Package",
    bot: "Weaver",
    assignment:
      "Bundle final package: handoff summary, asset links, readiness notes.",
    authorityNotes:
      "Weaver owns packaging. Cannot alter Rook's decisions or Luma's review.",
    nextBot: "Ledger",
    nextStep: "Ledger / Official Record",
  },
  {
    stage: "Ledger / Official Record",
    bot: "Ledger",
    assignment:
      "File decision record: approval status, what changed, what did not change.",
    authorityNotes:
      "Ledger is the official record. No edits to past entries — only new ones.",
    nextBot: "Echo",
    nextStep: "Echo / Memory Alignment",
  },
  {
    stage: "Echo / Memory Alignment",
    bot: "Echo",
    assignment:
      "Note what should be remembered, what should not, and whether brain / memory updates are needed.",
    authorityNotes:
      "Echo guards memory. May request brain updates; cannot perform them silently.",
  },
];

export function createPipelineHandoffs(
  uid: () => string,
  template: PipelineStageTemplate[] = DABOTTREE_PIPELINE,
): Handoff[] {
  return template.map((s, i) => ({
    id: uid(),
    step: i + 1,
    mode: s.stage,
    bot: s.bot,
    assignment: s.assignment,
    status: "Not Started",
    authorityNotes: s.authorityNotes,
    nextBot: s.nextBot,
    nextStep: s.nextStep,
  }));
}

// Find the active stage: first handoff that isn't Complete or Parked.
export function activeHandoff(handoffs: Handoff[]): Handoff | null {
  return (
    handoffs.find((h) => h.status !== "Complete" && h.status !== "Parked") ??
    null
  );
}