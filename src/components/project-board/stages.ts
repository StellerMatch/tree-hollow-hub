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
    match: ["/ trunk", "compass opens trunk", "r&d owner", "sustainability", "audience", "design and trust"],
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
    step("1.1", "Collection / Clarity", "Clarity", "Collect everything Boss gives for this project over time.", "Clarity", "Organize / Clarity"),
    step("1.2", "Organize / Clarity", "Clarity", "Organize the collected material and make the goal/order clear.", "Clarity", "Deep Dive / Clarity"),
    step("1.3", "Deep Dive / Clarity", "Clarity", "Deep dive this packet and find what makes it unique.", "Chief", "Chief War Room Gate / Intake"),
  ],
  intake: [
    step("2.1", "Chief War Room Gate / Intake", "Chief", "Receive Clarity's clean packet and confirm/open the Project Creator / Project Board path before dispatch.", "Chief", "Chief Starts Project Board / Intake"),
    step("2.2", "Chief Starts Project Board / Intake", "Chief", "Chief names the project in Project Creator / Project Board, enters Clarity's clean information, fills the required setup fields, gets the project ready, then presses Done / Go / Start. That Done / Go / Start action is the Ghost trigger that advances the workflow.", "Echo", "Memory Alignment / Intake"),
    step("2.3", "Memory Alignment / Intake", "Echo", "Ghost brings Echo in after Chief 2.2 is done, then Echo checks Boss intent, installed memory, and drift risk before the project moves forward.", "Ledger", "Official Project Record / Intake"),
    step("2.4", "Official Project Record / Intake", "Ledger", "Clarify the official project record path.", "Shield", "Safety and Authority / Intake"),
    step("2.5", "Safety and Authority / Intake", "Shield", "Check safety, authority, account, privacy, and public-action risk.", "Compass", "Compass Opens Trunk / R&D"),
  ],
  trunk: [
    step("3.1", "Trunk Intake / Compass Opens R&D", "Compass", "Compass receives the project packet from Chief / Project Board and confirms the project goal, the current question, and what Trunk needs to answer.", "Compass", "Past Scan / Trunk"),
    step("3.2", "Past Scan / Trunk", "Compass", "Compass reviews prior history, old attempts, saved memory, old examples, rejected ideas, lessons learned, and anything already decided. Output: what we already know, what not to repeat, and what old context still matters.", "Compass", "Present Scan / Trunk"),
    step("3.3", "Present Scan / Trunk", "Compass", "Compass reviews the current project state, active goal, current constraints, current risks, current resources, and what must be true now. Output: the real present situation and the current decision/work boundary.", "Compass", "Future Scan / Trunk"),
    step("3.4", "Future Scan / Trunk", "Compass", "Compass identifies future hooks, expansion paths, later upgrades, and future revenue/design/growth possibilities that should stay out of current scope. Output: future opportunities clearly separated from current scope.", "Vault / Bloom / Luma", "Lane Inputs Into Trunk / Trunk"),
    step(
      "3.5",
      "Lane Inputs Into Trunk / Trunk",
      "Vault / Bloom / Luma",
      "Vault adds money/cost/pricing/sustainability/revenue-risk notes. Bloom adds audience/growth/distribution/retention notes. Luma adds design/readability/trust/accessibility/UI-packaging notes. These are inputs to Compass, not separate final decisions.",
      "Compass",
      "Compass R&D Synthesis / Trunk",
      {
        groupGate: true,
        subChecks: [
          { id: "trunk-lane-vault", label: "Vault money/sustainability input", assignee: "Vault" },
          { id: "trunk-lane-bloom", label: "Bloom audience/growth input", assignee: "Bloom" },
          { id: "trunk-lane-luma", label: "Luma design/trust input", assignee: "Luma" },
        ],
      },
    ),
    step("3.6", "Compass R&D Synthesis / Trunk", "Compass", "Compass combines Past, Present, Future, plus Vault/Bloom/Luma inputs into the deep R&D file: what happened before, what matters now, what belongs later, risks, open questions, and recommended direction.", "Compass", "Boss Brief / Rook Handoff / Trunk"),
    step("3.7", "Boss Brief / Rook Handoff / Trunk", "Compass", "Compass produces a short Boss-facing highlight brief and hands the clean R&D synthesis to Rook for the business-plan / knowledge-packet level. Future hooks stay marked as future hooks, not current scope.", "Rook", "Knowledge Intake / Knowledge"),
  ],
  knowledge: [
    step("4.1", "Knowledge Intake / Knowledge", "Rook", "Accept the project packet and start the Knowledge level.", "Squirrel Gate / Assigned Check Bots", "Narrow Checks / Knowledge"),
    step(
      "4.2",
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
    step("4.3", "Practical Design Input / Knowledge", "Luma", "Return practical design input for Rook's Knowledge packet.", "Vault", "Practical Money Input / Knowledge"),
    step("4.4", "Practical Money Input / Knowledge", "Vault", "Return practical money input for Rook's Knowledge packet.", "Bloom", "Practical Growth Input / Knowledge"),
    step("4.5", "Practical Growth Input / Knowledge", "Bloom", "Return practical audience and growth input for Rook's Knowledge packet.", "Rook", "Tinker-Ready Packet / Knowledge"),
    step("4.6", "Tinker-Ready Packet / Knowledge", "Rook", "Assemble the clean Tinker-ready packet.", "Tinker", "Tinker Intake / Experiment"),
  ],
  experiment: [
    step("5.1", "Tinker Intake / Experiment", "Tinker", "Accept the Rook packet and organize the Experiment branch.", "Squirrel Gate / Assigned Squirrels", "Squirrel Help / Experiment"),
    step(
      "5.2",
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
    step("5.3", "Trunk Help / Experiment", "Lantern Gate / Shield", "Coordinate trunk help through Lantern; Shield handles safety/authority only if called.", "Echo", "Pre-Momma Memory Alignment / Experiment"),
    step("5.4", "Pre-Momma Memory Alignment / Experiment", "Echo", "Run the standard pre-Momma memory alignment check.", "Momma", "Momma Package Prep / Experiment"),
    step("5.5", "Momma Package Prep / Experiment", "Momma", "Prepare the neutral Build-A-Bears package for the Bears group.", "Build-A-Bears Gate", "Baby Bear Directions / Experiment"),
    step("5.6", "Baby Bear Directions / Experiment", "Build-A-Bears Gate", "Group gate: Ace, Bolt, and Craft create independent Bear directions and return receipts.", "Momma", "Bear Output Collection + Master Prompt Assembly / Experiment", { groupGate: true }),
    step("5.7", "Bear Output Collection + Master Prompt Assembly / Experiment", "Momma", "Collect Bear outputs and assemble the Master Prompt.", "Echo", "Echo Lovable Build Pass / Experiment"),
    step("5.8", "Echo Lovable Build Pass / Experiment", "Echo", "Review the Master Prompt and hold Lovable submission until approval is clear.", "Boss / Tinker / Chief", "Project Overlook / Next Movement Review / Experiment"),
    step("5.9", "Project Overlook / Next Movement Review / Experiment", "Boss / Tinker / Chief", "Review the project result and decide the next movement.", "Echo", "Memory Alignment / Branch Gate"),
  ],
  "branch-gate": [
    step("6.1", "Memory Alignment / Branch Gate", "Echo", "Run memory alignment before the next major branch handoff.", "Weaver", "Package Intake and Review / Weaver"),
  ],
  weaver: [
    step("7.1", "Package Intake and Review / Weaver", "Weaver", "Accept the package and begin Weaver-level package review.", "Byte / Bubba", "Byte + Bubba Prototype Handoff / Weaver"),
    step("7.2", "Byte + Bubba Prototype Handoff / Weaver", "Byte / Bubba", "Review prototype/build handoff needs and return next-slice guidance.", "Squirrel Gate / Assigned Squirrels", "Squirrel Checks / Weaver"),
    step(
      "7.3",
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
    step("7.4", "Trunk Checks / Weaver", "Lantern Gate / Shadows Gate / Requested Groups", "Each group returns Completed or Blocked.", "Weaver", "Review and Final Package / Weaver", { groupGate: true }),
    step("7.5", "Review and Final Package / Weaver", "Weaver", "Assemble the reviewed final package and return Completed or Blocked.", "High Council Gate", "High Council Review / Council"),
  ],
  council: [
    step("8.1", "High Council Review / Council", "High Council Gate", "Group gate: complete High Council review and return Completed or Blocked.", "Ward", "Intake & Install / Ward", { groupGate: true }),
  ],
  ward: [
    step("9.1", "Intake & Install / Ward", "Ward", "Accept the final package for Ward-level intake and install planning. Final canonical row.", undefined, "Workflow Complete"),
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
  "lantern team kickoff / r&d": "Compass Opens Trunk / R&D",
  "r&d owner / trunk": "Compass Opens Trunk / R&D",
  "trunk intake / compass opens r&d": "Compass Opens Trunk / R&D",
  "compass opens trunk / r&d intake": "Compass Opens Trunk / R&D",
  "past landscape pass / r&d": "Past Scan / Trunk",
  "present landscape pass / r&d": "Present Scan / Trunk",
  "future hooks pass / r&d": "Future Scan / Trunk",
  "money and sustainability input / trunk": "Vault Trunk Input / Trunk",
  "audience and growth input / trunk": "Bloom Trunk Input / Trunk",
  "design and trust input / trunk": "Luma Trunk Input / Trunk",
  "lane inputs / trunk": "Vault Trunk Input / Trunk",
  "lane inputs into trunk / trunk": "Vault Trunk Input / Trunk",
  "risks and unknowns pass / r&d": "Compass R&D Synthesis / Trunk",
  "research scope and synthesis / r&d": "Compass R&D Synthesis / Trunk",
  "r&d synthesis / trunk": "Compass R&D Synthesis / Trunk",
  "r&d highlight brief": "Boss Brief / Rook Handoff / Trunk",
  "boss brief & rook handoff / trunk": "Boss Brief / Rook Handoff / Trunk",
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
