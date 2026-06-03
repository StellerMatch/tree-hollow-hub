export type ProjectStatus =
  | "Draft"
  | "Active"
  | "Waiting"
  | "Blocked"
  | "Review"
  | "Complete"
  | "Parked";
export type HandoffStatus =
  | "Not Started"
  | "Sent"
  | "Working"
  | "Needs Review"
  | "Complete"
  | "Blocked"
  | "Parked";

export const PROJECT_TYPES = [
  "App / Software",
  "Website",
  "AI System",
  "Business / Offer",
  "Book",
  "TV / Film Idea",
  "Podcast",
  "Content / Social Media Project",
  "Personal / Family Project",
  "Other / Custom",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_STATUSES: ProjectStatus[] = [
  "Draft",
  "Active",
  "Waiting",
  "Blocked",
  "Review",
  "Complete",
  "Parked",
];
export const HANDOFF_STATUSES: HandoffStatus[] = [
  "Not Started",
  "Sent",
  "Working",
  "Needs Review",
  "Complete",
  "Blocked",
  "Parked",
];

export type Handoff = {
  id: string;
  step: number;
  mode: string; // e.g. "Mode 0 / Clarity"
  bot: string;
  assignment: string;
  status: HandoffStatus;
  receiptLink?: string;
  artifactLink?: string;
  artifactBody?: string;
  artifactTitle?: string;
  completedAt?: string;
  nextBot?: string;
  nextStep?: string;
  authorityNotes?: string;
  /**
   * Structured per-step output values keyed by template field key. Lets
   * each workflow step capture meaningful, named outputs (e.g. prototype
   * URL, lantern lane notes) without losing them. Preserved alongside
   * legacy artifactBody/artifactLink so existing data keeps working.
   */
  stepOutput?: Record<string, string>;
  /**
   * Per-assignee sub-check tracking for group-gate rows (e.g. Squirrel
   * fan-out at wr1-s11 / s17 / s28). Each entry tracks one named check
   * with an independent status so Ghost/controller and the visible board
   * can show individual Squirrel progress rather than one merged blob.
   */
  subChecks?: HandoffSubCheck[];
};

export type SubCheckStatus = "Not Started" | "Completed" | "Blocked" | "No finding";

export const SUB_CHECK_STATUSES: SubCheckStatus[] = [
  "Not Started",
  "Completed",
  "Blocked",
  "No finding",
];

export type HandoffSubCheck = {
  id: string;
  label: string;
  assignee: string;
  status: SubCheckStatus;
  note?: string;
};

export type Artifact = {
  id: string;
  title: string;
  kind: string; // legacy free-text label (kept for compatibility)
  type?: ArtifactType;
  source?: ArtifactSource;
  body?: string;
  link?: string;
  bot: string;
  createdAt: string;
  updatedAt?: string;
};

export const ARTIFACT_TYPES = [
  "prompt",
  "report",
  "prototype",
  "design note",
  "receipt",
  "link",
  "final package",
  "other",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_SOURCES = [
  "Mode 0",
  "Mode 1",
  "Mode 2",
  "Handoff",
  "Activity",
  "Manual",
] as const;
export type ArtifactSource = (typeof ARTIFACT_SOURCES)[number];

export type ActivityEntry = {
  id: string;
  at: string;
  bot: string;
  action: string;
  status?: HandoffStatus | ProjectStatus;
  receipt?: string;
  blocker?: string;
  link?: string;
};

export type Project = {
  id: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  projectType?: ProjectType;
  projectTypeCustom?: string;
  currentMode: string;
  currentBot: string;
  nextAction: string;
  blocker?: string;
  updatedAt: string;
  /** Creator involvement preference. UI-only for now. Defaults to "Better". */
  creatorMode?: "Good" | "Better" | "Best";
  /** Optional creator-facing guidance text shown above the selected step. */
  creatorGuidance?: string;
  clarity: string; // Mode 0
  shapeNotes: string; // Mode 1 structured notes
  shapeBotOutput: string;
  shapeArtifact?: string;
  planNotes: string; // Mode 2
  planBotOutput: string;
  planArtifact?: string;
  handoffs: Handoff[];
  artifacts: Artifact[];
  activity: ActivityEntry[];
};