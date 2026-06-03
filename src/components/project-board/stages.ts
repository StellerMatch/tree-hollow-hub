import type { Handoff } from "./types";

export type StageDef = {
  id: string;
  label: string;
  blurb: string;
  match: string[];
  bot: string;
};

export const PIPELINE_STAGES: StageDef[] = [
  {
    id: "clarity",
    label: "Clarity",
    blurb: "Collect, organize, and deep-dive the project idea.",
    match: ["/ clarity", "clarity"],
    bot: "Clarity",
  },
  {
    id: "intake",
    label: "Intake",
    blurb: "Chief opens the path and core guardrail checks run.",
    match: ["/ intake", "war room gate", "dispatcher start", "safety and authority"],
    bot: "Chief",
  },
  {
    id: "trunk",
    label: "Trunk",
    blurb: "Compass, Vault, Bloom, and Luma shape R&D inputs.",
    match: ["/ trunk", "r&d owner", "sustainability", "audience", "design and trust"],
    bot: "Compass",
  },
  {
    id: "knowledge",
    label: "Knowledge",
    blurb: "Rook turns inputs into a Tinker-ready packet.",
    match: ["/ knowledge", "knowledge", "tinker-ready", "acceptance criteria"],
    bot: "Rook",
  },
  {
    id: "experiment",
    label: "Experiment",
    blurb: "Tinker and helper lanes prepare, test, and review the project result.",
    match: ["/ experiment", "tinker", "momma", "bear", "lovable", "prototype evidence", "demo notes"],
    bot: "Tinker",
  },
  {
    id: "branch-gate",
    label: "Branch Gate",
    blurb: "Memory alignment before the next major branch.",
    match: ["/ branch gate", "branch gate"],
    bot: "Echo",
  },
  {
    id: "weaver",
    label: "Weaver",
    blurb: "Weaver assembles and checks the final package.",
    match: ["/ weaver", "weaver", "final links"],
    bot: "Weaver",
  },
  {
    id: "council",
    label: "Council",
    blurb: "High Council review before Ward-level movement.",
    match: ["/ council", "high council"],
    bot: "High Council",
  },
  {
    id: "ward",
    label: "Ward",
    blurb: "Ward intake, setup orientation, receipt, and live watch.",
    match: ["/ ward", "ward", "boomer", "live watch", "final record receipt"],
    bot: "Ward",
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
    if (stage.match.some((kw) => hay.includes(kw))) return stage;
  }
  return OTHER_STAGE;
}

export type StageBucket = {
  stage: StageDef;
  items: Array<{ handoff: Handoff; globalIndex: number }>;
};

export function bucketHandoffs(handoffs: Handoff[]): StageBucket[] {
  const buckets = new Map<string, StageBucket>();
  for (const stage of PIPELINE_STAGES) buckets.set(stage.id, { stage, items: [] });
  buckets.set(OTHER_STAGE.id, { stage: OTHER_STAGE, items: [] });

  handoffs.forEach((h, i) => {
    const stage = stageForHandoff(h);
    buckets.get(stage.id)!.items.push({ handoff: h, globalIndex: i });
  });

  const ordered = PIPELINE_STAGES.map((s) => buckets.get(s.id)!);
  const other = buckets.get(OTHER_STAGE.id)!;
  if (other.items.length > 0) ordered.push(other);
  return ordered;
}

export type NestedStepTemplate = {
  mode: string;
  bot: string;
  assignment: string;
  authorityNotes?: string;
  nextBot?: string;
  nextStep?: string;
  /** Canonical row code (e.g. "wr1-s11"). Used by Ghost handoff payload + sync. */
  code?: string;
  /** Marks a row that is a group-gate, not a single-holder receipt. */
  groupGate?: boolean;
  /** Default expected-receipt path/label for terminal close-out. */
  expectedReceipt?: string;
  /** Default Done means line. */
  doneMeans?: string;
  /**
   * Optional per-assignee sub-checks for a group-gate row. Each sub-check
   * is independently trackable as Completed / Blocked / No finding. The
   * group-gate row only passes once all sub-checks are settled (no entry
   * still at "Not Started"). Empty / undefined means the gate is a
   * single-receipt gate, not a fan-out of named checks.
   */
  subChecks?: SubCheckTemplate[];
};

export type SubCheckTemplate = {
  /** Stable id used for canonical sync. Lowercase, kebab-case. */
  id: string;
  /** Short label of what this assignee is checking for. */
  label: string;
  /** Named assignee that owns this individual check. */
  assignee: string;
};

const step = (
  code: string,
  mode: string,
  bot: string,
  action: string,
  nextBot?: string,
  nextStep?: string,
  opts: {
    groupGate?: boolean;
    expectedReceipt?: string;
    doneMeans?: string;
    subChecks?: SubCheckTemplate[];
  } = {},
): NestedStepTemplate => ({
  mode,
  bot,
  assignment: `${code}: ${action}`,
  authorityNotes:
    "Source: WR1 handoff foundation sheet. Visible owner is the row owner; branch owner is context only.",
  nextBot,
  nextStep,
  code,
  groupGate: opts.groupGate,
  expectedReceipt: opts.expectedReceipt,
  doneMeans:
    opts.doneMeans ??
    "Terminal receipt filed as Completed, Blocked, or Needs Boss/Chief decision. Route success, acknowledgement, or Working does not complete this row.",
  subChecks: opts.subChecks,
});

export const STAGE_NESTED_STEPS: Record<string, NestedStepTemplate[]> = {
  clarity: [
    step("wr1-pre01", "Collection / Clarity", "Clarity", "Collect everything Boss gives for this project over time.", "Clarity", "Organize / Clarity"),
    step("wr1-pre02", "Organize / Clarity", "Clarity", "Organize the collected material and make the goal/order clear.", "Clarity", "Deep Dive / Clarity"),
    step("wr1-pre03", "Deep Dive / Clarity", "Clarity", "Deep dive this packet and find what makes it unique.", "Chief", "Chief War Room Gate / Intake"),
  ],
  intake: [
    step("wr1-s00", "Chief War Room Gate / Intake", "Chief", "Receive Clarity's clean packet and confirm/open the Project Creator / Project Board path before dispatch.", "Chief", "Chief Starts Project Board / Intake"),
    step("wr1-s01", "Chief Starts Project Board / Intake", "Chief", "Chief names the project in Project Creator / Project Board, enters Clarity's clean information, fills the required setup fields, gets the project ready, then presses Done / Go / Start. That Done / Go / Start action is the Ghost trigger that advances the workflow.", "Echo", "Memory Alignment / Intake"),
    step("wr1-s02", "Memory Alignment / Intake", "Echo", "Ghost brings Echo in after Chief wr1-s01 is done, then Echo checks Boss intent, installed memory, and drift risk before the project moves forward.", "Ledger", "Official Project Record / Intake"),
    step("wr1-s03", "Official Project Record / Intake", "Ledger", "Clarify the official project record path.", "Shield", "Safety and Authority / Intake"),
    step("wr1-s04", "Safety and Authority / Intake", "Shield", "Check safety, authority, account, privacy, and public-action risk.", "Compass", "R&D Owner / Trunk"),
  ],
  trunk: [
    step("wr1-s05", "R&D Owner / Trunk", "Compass", "Own Trunk R&D. Open the Past / Present / Future scaffold and request lane input from Vault, Bloom, and Luma where useful.", "Vault", "Money and Sustainability Input / Trunk"),
    step("wr1-s06", "Money and Sustainability Input / Trunk", "Vault", "Return money/risk/sustainability input as Past (prior monetization patterns), Present (current revenue role, constraints), Future (parked monetization hooks).", "Bloom", "Audience and Growth Input / Trunk"),
    step("wr1-s07", "Audience and Growth Input / Trunk", "Bloom", "Return audience/growth input as Past (prior audience patterns), Present (current user + story), Future (parked growth expansion).", "Luma", "Design and Trust Input / Trunk"),
    step("wr1-s08", "Design and Trust Input / Trunk", "Luma", "Return design/readability/trust input as Past (visual languages that earned trust), Present (current direction), Future (parked polish, themes, mobile reveals).", "Compass", "R&D Synthesis / Trunk"),
    step("wr1-s09", "R&D Synthesis / Trunk", "Compass", "Synthesize Trunk R&D into a deep Past / Present / Future file (history & rejects · current goal, constraints, active risks · future hooks & out-of-scope) plus a short Boss-facing highlight brief.", "Rook", "Knowledge Intake / Knowledge"),
  ],
  knowledge: [
    step("wr1-s10", "Knowledge Intake / Knowledge", "Rook", "Accept the project packet and start the Knowledge level.", "Squirrel Gate / Assigned Check Bots", "Narrow Checks / Knowledge"),
    step(
      "wr1-s11",
      "Narrow Checks / Knowledge",
      "Squirrel Gate / Assigned Check Bots",
      "Group gate: each assigned Squirrel runs its own narrow check and returns Completed, Blocked, or No finding. Gate passes only when every assigned check is settled (no Not Started).",
      "Luma",
      "Practical Design Input / Knowledge",
      {
        groupGate: true,
        subChecks: [
          { id: "knowledge-squirrel-fact", label: "Fact / source check", assignee: "Squirrel · Fact" },
          { id: "knowledge-squirrel-scope", label: "Scope / acceptance check", assignee: "Squirrel · Scope" },
          { id: "knowledge-squirrel-risk", label: "Risk / unknown check", assignee: "Squirrel · Risk" },
        ],
      },
    ),
    step("wr1-s12", "Practical Design Input / Knowledge", "Luma", "Return practical design input for Rook's Knowledge packet.", "Vault", "Practical Money Input / Knowledge"),
    step("wr1-s13", "Practical Money Input / Knowledge", "Vault", "Return practical money input for Rook's Knowledge packet.", "Bloom", "Practical Growth Input / Knowledge"),
    step("wr1-s14", "Practical Growth Input / Knowledge", "Bloom", "Return practical audience and growth input for Rook's Knowledge packet.", "Rook", "Tinker-Ready Packet / Knowledge"),
    step("wr1-s15", "Tinker-Ready Packet / Knowledge", "Rook", "Assemble the clean Tinker-ready packet.", "Tinker", "Tinker Intake / Experiment"),
  ],
  experiment: [
    step("wr1-s16", "Tinker Intake / Experiment", "Tinker", "Accept the Rook packet and organize the Experiment branch.", "Squirrel Gate / Assigned Squirrels", "Squirrel Help / Experiment"),
    step(
      "wr1-s17",
      "Squirrel Help / Experiment",
      "Squirrel Gate / Assigned Squirrels",
      "Group gate: each assigned Tinker helper Squirrel runs its own narrow check and returns Completed, Blocked, or No finding. Gate passes only when every assigned check is settled.",
      "Lantern Gate / Shield",
      "Trunk Help / Experiment",
      {
        groupGate: true,
        subChecks: [
          { id: "experiment-squirrel-build", label: "Build / feasibility helper check", assignee: "Squirrel · Build" },
          { id: "experiment-squirrel-test", label: "Test / evidence helper check", assignee: "Squirrel · Test" },
          { id: "experiment-squirrel-edge", label: "Edge case / regression helper check", assignee: "Squirrel · Edge" },
        ],
      },
    ),
    step("wr1-s18", "Trunk Help / Experiment", "Lantern Gate / Shield", "Coordinate trunk help through Lantern; Shield handles safety/authority only if called.", "Echo", "Pre-Momma Memory Alignment / Experiment"),
    step("wr1-s19", "Pre-Momma Memory Alignment / Experiment", "Echo", "Run the standard pre-Momma memory alignment check.", "Momma", "Momma Package Prep / Experiment"),
    step("wr1-s20", "Momma Package Prep / Experiment", "Momma", "Prepare the neutral Build-A-Bears package for the Bears group.", "Build-A-Bears Gate", "Baby Bear Directions / Experiment"),
    step("wr1-s21", "Baby Bear Directions / Experiment", "Build-A-Bears Gate", "Group gate: Ace, Bolt, and Craft create independent Bear directions and return receipts.", "Momma", "Bear Output Collection + Master Prompt Assembly / Experiment", { groupGate: true }),
    step("wr1-s22", "Bear Output Collection + Master Prompt Assembly / Experiment", "Momma", "Collect Bear outputs and assemble the Master Prompt.", "Echo", "Echo Lovable Build Pass / Experiment"),
    step("wr1-s23", "Echo Lovable Build Pass / Experiment", "Echo", "Review the Master Prompt and hold Lovable submission until approval is clear.", "Boss / Tinker / Chief", "Project Overlook / Next Movement Review / Experiment"),
    step("wr1-s24", "Project Overlook / Next Movement Review / Experiment", "Boss / Tinker / Chief", "Review the project result and decide the next movement.", "Echo", "Memory Alignment / Branch Gate"),
  ],
  "branch-gate": [
    step("wr1-s25", "Memory Alignment / Branch Gate", "Echo", "Run memory alignment before the next major branch handoff.", "Weaver", "Package Intake and Review / Weaver"),
  ],
  weaver: [
    step("wr1-s26", "Package Intake and Review / Weaver", "Weaver", "Accept the package and begin Weaver-level package review.", "Byte / Bubba", "Byte + Bubba Prototype Handoff / Weaver"),
    step("wr1-s27", "Byte + Bubba Prototype Handoff / Weaver", "Byte / Bubba", "Review prototype/build handoff needs and return next-slice guidance.", "Squirrel Gate / Assigned Squirrels", "Squirrel Checks / Weaver"),
    step(
      "wr1-s28",
      "Squirrel Checks / Weaver",
      "Squirrel Gate / Assigned Squirrels",
      "Group gate: each assigned Weaver Squirrel runs its own narrow check and returns Completed, Blocked, or No finding. Gate passes only when every assigned check is settled.",
      "Lantern Gate / Shadows Gate / Requested Groups",
      "Trunk Checks / Weaver",
      {
        groupGate: true,
        subChecks: [
          { id: "weaver-squirrel-links", label: "Final links / assets check", assignee: "Squirrel · Links" },
          { id: "weaver-squirrel-copy", label: "Copy / readability check", assignee: "Squirrel · Copy" },
          { id: "weaver-squirrel-receipt", label: "Receipt / handoff completeness check", assignee: "Squirrel · Receipt" },
        ],
      },
    ),
    step("wr1-s29", "Trunk Checks / Weaver", "Lantern Gate / Shadows Gate / Requested Groups", "Each group returns Completed or Blocked.", "Weaver", "Review and Final Package / Weaver", { groupGate: true }),
    step("wr1-s30", "Review and Final Package / Weaver", "Weaver", "Assemble the reviewed final package and return Completed or Blocked.", "High Council Gate", "High Council Review / Council"),
  ],
  council: [
    step("wr1-s31", "High Council Review / Council", "High Council Gate", "Group gate: complete High Council review and return Completed or Blocked.", "Ward", "Intake & Install / Ward", { groupGate: true }),
  ],
  ward: [
    step("wr1-s32", "Intake & Install / Ward", "Ward", "Accept the final package for Ward-level intake and install planning. Final canonical row.", undefined, "Workflow Complete"),
  ],
};

export const NESTED_STEP_RENAMES: Record<string, string> = {
  "mode 0 / raw idea": "Collection / Clarity",
  "mode 0 / clarity intake": "Collection / Clarity",
  "project type confirmation / clarity": "Chief War Room Gate / Intake",
  "mode 1 / shape": "Organize / Clarity",
  "mode 2 / project brief": "Deep Dive / Clarity",
  "chief intake summary / clarity": "Chief War Room Gate / Intake",
  "chief starts project board / intake": "Chief Starts Project Board / Intake",
  "ivy dispatcher start gate / intake": "Chief Starts Project Board / Intake",
  "ivy dispatcher start gate": "Chief Starts Project Board / Intake",
  "lantern team kickoff / r&d": "R&D Owner / Trunk",
  "past landscape pass / r&d": "Money and Sustainability Input / Trunk",
  "present landscape pass / r&d": "Audience and Growth Input / Trunk",
  "future hooks pass / r&d": "Design and Trust Input / Trunk",
  "risks and unknowns pass / r&d": "R&D Synthesis / Trunk",
  "research scope and synthesis / r&d": "R&D Synthesis / Trunk",
  "r&d highlight brief": "R&D Synthesis / Trunk",
  "acceptance criteria check [chief added] / knowledge": "Tinker-Ready Packet / Knowledge",
  "packet intake / knowledge packet": "Knowledge Intake / Knowledge",
  "business plan draft / knowledge packet": "Knowledge Intake / Knowledge",
  "tinker-ready handoff / knowledge packet": "Tinker-Ready Packet / Knowledge",
  "prototype kickoff / prototype": "Tinker Intake / Experiment",
  "build v1 / prototype": "Tinker Intake / Experiment",
  "self-test and evidence / prototype": "Tinker Intake / Experiment",
  "prototype evidence [chief added] / experiment": "Tinker Intake / Experiment",
  "demo notes / prototype": "Project Overlook / Next Movement Review / Experiment",
  "demo notes [chief added] / experiment": "Project Overlook / Next Movement Review / Experiment",
  "prototype handoff / prototype": "Project Overlook / Next Movement Review / Experiment",
  "visual review / design polish": "Package Intake and Review / Weaver",
  "package intake / final package": "Package Intake and Review / Weaver",
  "final links and assets / final package": "Review and Final Package / Weaver",
  "final links and assets [chief added] / weaver": "Review and Final Package / Weaver",
  "decision record / official record": "Live Watch / Ward",
  "final record receipt [chief added] / ward": "Intake & Install / Ward",
  "squirrel and trunk orientation / ward": "Intake & Install / Ward",
  "boomer setup / ward": "Intake & Install / Ward",
  "live watch / ward": "Intake & Install / Ward",
  "official record": "Official Project Record / Intake",
  "memory alignment": "Memory Alignment / Intake",
};

export function handoffMatchesNestedStep(handoff: Handoff, template: NestedStepTemplate): boolean {
  return (handoff.mode ?? "").trim().toLowerCase() === template.mode.trim().toLowerCase();
}
