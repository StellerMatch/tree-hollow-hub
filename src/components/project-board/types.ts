export type ProjectStatus = "Draft" | "Active" | "Waiting" | "Blocked" | "Complete";
export type HandoffStatus = "Not Started" | "Sent" | "Working" | "Complete" | "Blocked";

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
};

export type Artifact = {
  id: string;
  title: string;
  kind: string; // e.g. "master prompt", "prototype link"
  body?: string;
  link?: string;
  bot: string;
  createdAt: string;
};

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
  currentMode: string;
  currentBot: string;
  nextAction: string;
  blocker?: string;
  updatedAt: string;
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