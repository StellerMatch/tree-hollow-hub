import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type {
  Project,
  Handoff,
  HandoffStatus,
  ProjectStatus,
  Artifact,
  ArtifactType,
  ArtifactSource,
  ProjectType,
} from "@/components/project-board/types";
import {
  ARTIFACT_TYPES,
  ARTIFACT_SOURCES,
  PROJECT_STATUSES,
  HANDOFF_STATUSES,
  PROJECT_TYPES,
} from "@/components/project-board/types";
import { SEED_PROJECTS } from "@/components/project-board/seed";
import {
  DABOTTREE_PIPELINE,
  DABOTTREE_PIPELINE_NAME,
  createPipelineHandoffs,
} from "@/components/project-board/pipeline";
import { botImageFor, botInitials } from "@/components/project-board/bot-avatars";
import {
  bucketHandoffs,
  PIPELINE_STAGES,
  stageForHandoff,
  STAGE_NESTED_STEPS,
  handoffMatchesNestedStep,
  NESTED_STEP_RENAMES,
  type StageBucket,
} from "@/components/project-board/stages";

function BotAvatar({
  name,
  size = 32,
  ring,
}: {
  name?: string | null;
  size?: number;
  ring?: string;
}) {
  const img = botImageFor(name);
  const initials = botInitials(name);
  const dim = { width: size, height: size };
  const borderColor = ring ?? "oklch(0.78 0.18 50 / 0.45)";
  const label = name?.trim() || "unassigned bot";
  if (img) {
    return (
      <img
        src={img}
        alt={label}
        title={label}
        loading="lazy"
        className="shrink-0 rounded-full border object-cover"
        style={{ ...dim, borderColor, background: "oklch(0.2 0.02 60)" }}
      />
    );
  }
  return (
    <div
      title={label}
      aria-label={label}
      className="flex shrink-0 items-center justify-center rounded-full border font-display font-semibold"
      style={{
        ...dim,
        borderColor,
        background: "oklch(0.22 0.03 60)",
        color: "oklch(0.85 0.12 70)",
        fontSize: Math.max(10, Math.round(size * 0.38)),
        lineHeight: 1,
      }}
    >
      {initials}
    </div>
  );
}

export const Route = createFileRoute("/project-creator")({
  component: ProjectCreatorPage,
  head: () => ({
    meta: [
      { title: "DaBotTree Project Board" },
      {
        name: "description",
        content:
          "One source of truth per project — clarity, handoffs, receipts, artifacts. The operations room behind the canopy door.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const AMBER = "oklch(0.78 0.18 50)";
const AMBER_SOFT = "oklch(0.78 0.18 50 / 0.18)";
const AMBER_LINE = "oklch(0.78 0.18 50 / 0.35)";
const EMERALD = "oklch(0.7 0.14 160)";

const STORAGE_KEY = "dabottree.projects.v1";
const SCHEMA_KEY = "dabottree.projects.schemaVersion";
const SCHEMA_VERSION = 5; // bump when adding new seeded projects / migrations
const DABOTTREE_BOARD_ID = "dabottree-project-board";

type ProjectSettingsInput = {
  name: string;
  summary: string;
  status: ProjectStatus;
  projectType?: ProjectType;
  projectTypeCustom: string;
  currentMode: string;
  currentBot: string;
  nextAction: string;
  blocker: string;
};

function loadProjects(): Project[] {
  if (typeof window === "undefined") return SEED_PROJECTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PROJECTS;
    const parsed = JSON.parse(raw) as Project[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_PROJECTS;
    return parsed;
  } catch {
    return SEED_PROJECTS;
  }
}

// Apply forward-only migrations to existing localStorage data.
// Never wipes or overwrites user-edited projects.
function migrateProjects(existing: Project[]): { projects: Project[]; changed: boolean } {
  if (typeof window === "undefined") return { projects: existing, changed: false };
  let stored = 0;
  try {
    stored = Number(localStorage.getItem(SCHEMA_KEY) ?? "1");
  } catch {
    stored = 1;
  }
  if (stored >= SCHEMA_VERSION) return { projects: existing, changed: false };

  let next = existing;
  let changed = false;

  // v2: add seeded "DaBotTree Project Board" if it's missing.
  if (stored < 2) {
    const hasBoard = next.some((p) => p.id === DABOTTREE_BOARD_ID);
    if (!hasBoard) {
      const seeded = SEED_PROJECTS.find((p) => p.id === DABOTTREE_BOARD_ID);
      if (seeded) {
        next = [seeded, ...next];
        changed = true;
      }
    }
  }

  // v3: backfill missing pipeline stages so every staged workflow card has
  // at least one editable handoff (Modes → Memory Alignment). Existing
  // handoffs and their edits are preserved; only missing stages are appended.
  if (stored < 3) {
    next = next.map((p) => {
      const present = new Set(
        p.handoffs.map((h) => stageForHandoff(h).id),
      );
      const missing = PIPELINE_STAGES.filter((s) => !present.has(s.id));
      if (missing.length === 0) return p;
      const baseStep = p.handoffs.length;
      const appended: Handoff[] = missing.map((stage, idx) =>
        createRequiredStageHandoff(p.id, stage.id, baseStep + idx + 1, "backfill"),
      );
      changed = true;
      return { ...p, handoffs: [...p.handoffs, ...appended] };
    });
  }

  // v4: repair projects whose project-level currentMode/currentBot/nextAction
  // were rewound by an earlier sync bug to "Project Type Confirmation /
  // Clarity" even though the project already had real later-stage work.
  // Known seeded projects are restored from seed; other projects keep their
  // saved project-level state because current-stage display is now read-only.
  if (stored < 4) {
    next = next.map((p) => {
      const rewound =
        workflowTextKey(p.currentMode) === "project type confirmation / clarity";
      if (!rewound) return p;
      const seed = SEED_PROJECTS.find((s) => s.id === p.id);
      if (!seed) return p;
      changed = true;
      return {
        ...p,
        currentMode: seed.currentMode,
        currentBot: seed.currentBot,
        nextAction: seed.nextAction,
      };
    });
  }

  // v5: repair the follow-up regression that persisted computed R&D steps
  // as the project current state. Do not infer new state here; only restore
  // known corrupted records or the new-project Mode 0 → Project Type gate.
  if (stored < 5) {
    next = next.map((p) => {
      const modeKey = workflowTextKey(p.currentMode);
      const nextActionKey = workflowTextKey(p.nextAction);
      const seed = SEED_PROJECTS.find((s) => s.id === p.id || s.name === p.name);
      const isComputedGate =
        modeKey === "project type confirmation / clarity" ||
        modeKey === "research scope and synthesis / r&d";

      if (p.id === "bot-card-studio" || p.name === "Bot Card Studio") {
        changed = true;
        return {
          ...p,
          status: "Active",
          currentMode: "Mode 2 / Plan",
          currentBot: "Tinker",
          nextAction: "Tinker delivers v1 prototype URL",
          handoffs: p.handoffs.map((h) =>
            workflowTextKey(h.mode) === "prototype"
              ? { ...h, status: "Working", completedAt: undefined }
              : h,
          ),
        };
      }

      if (seed && isComputedGate && workflowTextKey(seed.currentMode) !== modeKey) {
        changed = true;
        return {
          ...p,
          currentMode: seed.currentMode,
          currentBot: seed.currentBot,
          nextAction: seed.nextAction,
        };
      }

      if (
        modeKey === "research scope and synthesis / r&d" &&
        nextActionKey === "confirm project type"
      ) {
        changed = true;
        return {
          ...p,
          currentMode: "Project Type Confirmation / Clarity",
          currentBot: "Chief",
          nextAction: "Confirm Project Type",
        };
      }

      return p;
    });
  }

  try {
    localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
  } catch {
    /* ignore */
  }
  return { projects: next, changed };
}

function createRequiredStageHandoff(
  projectId: string,
  stageId: string,
  step: number,
  prefix: string,
): Handoff {
  const stage = PIPELINE_STAGES.find((s) => s.id === stageId);
  const tpl = DABOTTREE_PIPELINE.find(
    (t) =>
      stageForHandoff({
        id: "tpl",
        step: 0,
        mode: t.stage,
        bot: t.bot,
        assignment: t.assignment,
        status: "Not Started",
      }).id === stageId,
  );
  return {
    id: `${prefix}-${projectId}-${stageId}-${step}`,
    step,
    mode: tpl?.stage ?? stage?.label ?? "Required stage",
    bot: tpl?.bot ?? stage?.bot ?? "",
    assignment: tpl?.assignment ?? "",
    status: "Not Started",
    authorityNotes: tpl?.authorityNotes,
    nextBot: tpl?.nextBot,
    nextStep: tpl?.nextStep,
  };
}

function officialRecordHandoffCount(handoffs: Handoff[]): number {
  return bucketHandoffs(handoffs).find(
    (bucket) => bucket.stage.id === "official-record",
  )?.items.length ?? 0;
}

function ensureOfficialRecordHandoff(project: Project): { project: Project; changed: boolean } {
  if (officialRecordHandoffCount(project.handoffs) > 0) {
    return { project, changed: false };
  }
  return {
    project: {
      ...project,
      handoffs: [
        ...project.handoffs,
        createRequiredStageHandoff(
          project.id,
          "official-record",
          project.handoffs.length + 1,
          "official-record-repair",
        ),
      ],
    },
    changed: true,
  };
}

/**
 * For every stage that has a defined nested-step template (Modes, R&D, …),
 * ensure each required nested step exists as an editable handoff. Existing
 * handoffs (including legacy single ones and user edits) are preserved;
 * only missing nested steps are appended. Matching is by case-insensitive
 * `mode` text.
 */
function ensureNestedSteps(project: Project): { project: Project; changed: boolean } {
  let changed = false;
  // Content-based migration: a previous backfill renamed legacy "Trunk / R&D"
  // (whose assignment is Compass's synthesis content) into "Lantern Team
  // Kickoff / R&D". That synthesis content actually belongs to Research
  // Scope and Synthesis. Detect it by the legacy assignment marker and
  // move it back before the regular rename pass runs.
  let preMigrated = project.handoffs.map((h) => {
    const modeKey = (h.mode ?? "").trim().toLowerCase();
    const assignment = (h.assignment ?? "").trim().toLowerCase();
    const isLegacyTrunkContent = assignment.startsWith(
      "compass synthesis. gather past / present / future",
    );
    if (
      isLegacyTrunkContent &&
      modeKey === "lantern team kickoff / r&d"
    ) {
      changed = true;
      return { ...h, mode: "Research Scope and Synthesis / R&D" };
    }
    return h;
  });
  // Then, migrate any old nested-step names to their new names so the
  // existing handoff (with all user edits) becomes the canonical step
  // instead of being left as a legacy duplicate.
  let handoffs = preMigrated.map((h) => {
    const key = (h.mode ?? "").trim().toLowerCase();
    const renamed = NESTED_STEP_RENAMES[key];
    if (renamed && renamed !== h.mode) {
      changed = true;
      return { ...h, mode: renamed };
    }
    return h;
  });
  // After renaming legacy handoffs into canonical nested-step names, two
  // handoffs may now share the same mode (e.g. a legacy "Trunk / R&D" got
  // renamed to "Lantern Team Kickoff / R&D" but a freshly-backfilled
  // nested-* placeholder for that step already exists). Collapse duplicates
  // by keeping the one with the most user-saved data; prefer the legacy /
  // user-edited handoff over the auto-generated `nested-*` placeholder so
  // saved status, artifact links, receipts, and outputs are preserved.
  const score = (h: Handoff) => {
    let s = 0;
    if (h.status && h.status !== "Not Started") s += 4;
    if (h.artifactLink) s += 2;
    if (h.receiptLink) s += 2;
    if (h.artifactBody) s += 2;
    if (h.artifactTitle) s += 1;
    if (h.completedAt) s += 1;
    if (!h.id.startsWith("nested-")) s += 1;
    return s;
  };
  const byMode = new Map<string, Handoff>();
  const deduped: Handoff[] = [];
  for (const h of handoffs) {
    const key = (h.mode ?? "").trim().toLowerCase();
    const existing = byMode.get(key);
    if (!existing) {
      byMode.set(key, h);
      deduped.push(h);
      continue;
    }
    changed = true;
    if (score(h) > score(existing)) {
      // Replace the existing entry with the richer one.
      const idx = deduped.indexOf(existing);
      if (idx >= 0) deduped[idx] = h;
      byMode.set(key, h);
    }
    // else: drop h
  }
  handoffs = deduped;
  for (const [stageId, templates] of Object.entries(STAGE_NESTED_STEPS)) {
    const stage = PIPELINE_STAGES.find((s) => s.id === stageId);
    if (!stage) continue;
    const inStage = handoffs.filter((h) => stageForHandoff(h).id === stageId);
    const toAppend: Handoff[] = [];
    templates.forEach((tpl, i) => {
      if (inStage.some((h) => handoffMatchesNestedStep(h, tpl))) return;
      toAppend.push({
        id: `nested-${project.id}-${stageId}-${i + 1}`,
        step: handoffs.length + toAppend.length + 1,
        mode: tpl.mode,
        bot: tpl.bot,
        assignment: tpl.assignment,
        status: "Not Started",
        authorityNotes: tpl.authorityNotes,
        nextBot: tpl.nextBot,
        nextStep: tpl.nextStep,
      });
    });
    if (toAppend.length > 0) {
      handoffs = [...handoffs, ...toAppend];
      changed = true;
    }
    // Backfill default next-step chain hints onto existing handoffs that
    // match a template. Preserve real user edits, but repair known legacy
    // chain hints that still point Mode 0 straight to Trunk / R&D.
    handoffs = handoffs.map((h) => {
      const tpl = templates.find((t) => handoffMatchesNestedStep(h, t));
      if (!tpl) return h;
      const legacyMode0Next =
        (h.mode ?? "").trim().toLowerCase() === "mode 0 / raw idea" &&
        ((h.nextStep ?? "").trim().toLowerCase() === "trunk / r&d" ||
          (h.nextBot ?? "").trim().toLowerCase() === "compass");
      const wantNextBot = tpl.nextBot && (!h.nextBot || legacyMode0Next);
      const wantNextStep = tpl.nextStep && (!h.nextStep || legacyMode0Next);
      if (!wantNextBot && !wantNextStep) return h;
      changed = true;
      return {
        ...h,
        nextBot: wantNextBot ? tpl.nextBot : h.nextBot,
        nextStep: wantNextStep ? tpl.nextStep : h.nextStep,
      };
    });
  }
  // Reorder handoffs within each templated stage to match the template
  // order. Templated steps come first in template order; any unmatched
  // legacy/custom handoffs in that stage keep their relative order at the
  // end. Handoffs in other stages keep their existing positions.
  const mutable = [...handoffs];
  for (const [stageId, templates] of Object.entries(STAGE_NESTED_STEPS)) {
    const indices: number[] = [];
    mutable.forEach((h, i) => {
      if (stageForHandoff(h).id === stageId) indices.push(i);
    });
    if (indices.length === 0) continue;
    const group = indices.map((i) => mutable[i]);
    const sortKey = (h: Handoff) => {
      const idx = templates.findIndex((t) => handoffMatchesNestedStep(h, t));
      return idx === -1 ? templates.length + 1000 : idx;
    };
    const sorted = [...group]
      .map((h, originalIdx) => ({ h, originalIdx }))
      .sort((a, b) => {
        const d = sortKey(a.h) - sortKey(b.h);
        return d !== 0 ? d : a.originalIdx - b.originalIdx;
      })
      .map((x) => x.h);
    indices.forEach((origIdx, k) => {
      if (mutable[origIdx].id !== sorted[k].id) changed = true;
      mutable[origIdx] = sorted[k];
    });
  }
  handoffs = mutable;
  return { project: changed ? { ...project, handoffs } : project, changed };
}

// Version-independent safety net: every project must have at least one
// handoff bucketing into each pipeline stage. Runs on every load regardless
// of SCHEMA_VERSION so projects saved before a stage was required still get
// the missing handoff appended (existing handoffs and edits are preserved).
function ensureRequiredStages(
  projects: Project[],
): { projects: Project[]; changed: boolean } {
  let changed = false;
  const next = projects.map((p) => {
    const officialRecordRepair = ensureOfficialRecordHandoff(p);
    let repairedProject = officialRecordRepair.project;
    if (officialRecordRepair.changed) changed = true;
    const present = new Set(repairedProject.handoffs.map((h) => stageForHandoff(h).id));
    const missing = PIPELINE_STAGES.filter(
      (s) => s.id !== "official-record" && !present.has(s.id),
    );
    if (missing.length > 0) {
      const baseStep = repairedProject.handoffs.length;
      const appended: Handoff[] = missing.map((stage, idx) =>
        createRequiredStageHandoff(repairedProject.id, stage.id, baseStep + idx + 1, "ensure"),
      );
      repairedProject = { ...repairedProject, handoffs: [...repairedProject.handoffs, ...appended] };
      changed = true;
    }
    const nested = ensureNestedSteps(repairedProject);
    if (nested.changed) changed = true;
    return nested.project;
  });
  return { projects: next, changed };
}

function saveProjects(projects: Project[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    /* ignore */
  }
}

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    // Deterministic UTC format to avoid SSR/client hydration mismatches.
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const m = months[d.getUTCMonth()];
    const day = d.getUTCDate();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${m} ${day}, ${hh}:${mm} UTC`;
  } catch {
    return iso;
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function workflowTextKey(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Strip the bot/team name from a workflow step's `mode` string so the
 * workflow rail and selected-step header read as creator-facing labels
 * (e.g. "Prototype / Tinker" → "Prototype"). The bot name is kept as
 * separate metadata ("Owner: Tinker") in the UI.
 */
function stepTitleOnly(mode?: string | null, _bot?: string | null): string {
  return splitStepTitle(mode).title;
}

/**
 * Creator-facing split of a workflow step's `mode` string.
 * Convention: "<Step title> / <Phase>" (e.g. "Project Type Confirmation / Clarity"
 * → title "Project Type Confirmation", phase "Clarity"). The phase is rendered
 * underneath the title as metadata, never as part of the primary label.
 * Strings without a slash return the whole text as the title and an empty phase.
 */
function splitStepTitle(mode?: string | null): { title: string; phase: string } {
  const m = (mode ?? "").trim();
  if (!m) return { title: "", phase: "" };
  const idx = m.indexOf("/");
  if (idx === -1) return { title: m, phase: "" };
  const title = m.slice(0, idx).trim();
  const phase = m.slice(idx + 1).trim();
  return { title: title || m, phase };
}

type WorkflowEntry = { handoff: Handoff; displayStep: number };

function workflowEntries(handoffs: Handoff[]): WorkflowEntry[] {
  return bucketHandoffs(handoffs).flatMap((bucket) =>
    bucket.items.map(({ handoff }, idx) => ({ handoff, displayStep: idx + 1 })),
  );
}

function activeWorkflowEntry(handoffs: Handoff[]): WorkflowEntry | null {
  const entries = workflowEntries(handoffs);
  return entries.find(({ handoff }) => handoff.status !== "Complete" && handoff.status !== "Parked") ?? null;
}

function currentStageEntry(project: Project): WorkflowEntry | null {
  const entries = workflowEntries(project.handoffs);
  const modeKey = workflowTextKey(project.currentMode);
  const botKey = workflowTextKey(project.currentBot);
  const nextActionKey = workflowTextKey(project.nextAction);
  const inFlight = new Set<HandoffStatus>(["Sent", "Working", "Needs Review", "Blocked"]);
  const isOpen = (h: Handoff) => h.status !== "Complete" && h.status !== "Parked";
  const findMode = (mode: string) =>
    entries.find(({ handoff }) => workflowTextKey(handoff.mode) === mode && isOpen(handoff)) ??
    entries.find(({ handoff }) => workflowTextKey(handoff.mode) === mode) ??
    null;

  if (nextActionKey === "confirm project type") {
    const projectTypeGate = findMode("project type confirmation / clarity");
    if (projectTypeGate) return projectTypeGate;
  }

  const ownedInFlight = entries.find(
    ({ handoff }) => inFlight.has(handoff.status) && (!botKey || workflowTextKey(handoff.bot) === botKey),
  );
  if (ownedInFlight) return ownedInFlight;

  if (modeKey) {
    const savedMode = findMode(modeKey);
    if (savedMode) return savedMode;
  }

  return entries.find(({ handoff }) => inFlight.has(handoff.status)) ?? null;
}

function nextOpenWorkflowEntryAfter(handoffs: Handoff[], id: string): WorkflowEntry | null {
  const entries = workflowEntries(handoffs);
  const start = entries.findIndex(({ handoff }) => handoff.id === id);
  if (start === -1) return null;
  return entries
    .slice(start + 1)
    .find(({ handoff }) => handoff.status !== "Complete" && handoff.status !== "Parked") ?? null;
}

function requiredActionForHandoff(handoff: Handoff | null, fallback = "") {
  const mode = workflowTextKey(handoff?.mode);
  if (mode === "mode 0 / raw idea") return "Fill Mode 0 / Raw Idea";
  if (mode === "project type confirmation / clarity") return "Confirm Project Type";
  if (fallback && fallback.trim()) return fallback;
  if (!handoff) return fallback;
  return `Complete ${handoff.mode || "current step"}`;
}

function moveProjectToWorkflowEntry(
  project: Project,
  entry: WorkflowEntry,
  { updateMode, fallbackAction = "" }: { updateMode: boolean; fallbackAction?: string },
): Project {
  return {
    ...project,
    currentMode: updateMode ? entry.handoff.mode : project.currentMode,
    currentBot: entry.handoff.bot || project.currentBot,
    nextAction: requiredActionForHandoff(entry.handoff, fallbackAction),
  };
}

function advanceProjectAfterHandoffStatusChange(
  previousProject: Project,
  nextProject: Project,
  previousHandoff: Handoff,
  updatedHandoff: Handoff,
): Project {
  const beforeCurrent = currentStageEntry(previousProject)?.handoff;
  const wasCurrent =
    beforeCurrent?.id === previousHandoff.id ||
    workflowTextKey(previousProject.currentMode) === workflowTextKey(previousHandoff.mode);

  if ((updatedHandoff.status === "Complete" || updatedHandoff.status === "Parked") && wasCurrent) {
    const nextEntry = nextOpenWorkflowEntryAfter(nextProject.handoffs, updatedHandoff.id);
    return nextEntry
      ? moveProjectToWorkflowEntry(nextProject, nextEntry, { updateMode: true })
      : nextProject;
  }

  if (["Sent", "Working", "Needs Review", "Blocked"].includes(updatedHandoff.status)) {
    const entry = workflowEntries(nextProject.handoffs).find(
      ({ handoff }) => handoff.id === updatedHandoff.id,
    );
    return entry
      ? moveProjectToWorkflowEntry(nextProject, entry, {
          updateMode: false,
          fallbackAction: nextProject.nextAction,
        })
      : nextProject;
  }

  return nextProject;
}

function createInitialWorkflowHandoffs(projectId: string): Handoff[] {
  const handoffs: Handoff[] = [];
  for (const stage of PIPELINE_STAGES) {
    const templates = STAGE_NESTED_STEPS[stage.id];
    if (templates) {
      for (const tpl of templates) {
        handoffs.push({
          id: `nested-${projectId}-${stage.id}-${handoffs.length + 1}`,
          step: handoffs.length + 1,
          mode: tpl.mode,
          bot: tpl.bot,
          assignment: tpl.assignment,
          status: "Not Started",
          authorityNotes: tpl.authorityNotes,
          nextBot: tpl.nextBot,
          nextStep: tpl.nextStep,
        });
      }
      continue;
    }
    handoffs.push(
      createRequiredStageHandoff(projectId, stage.id, handoffs.length + 1, "initial"),
    );
  }
  return handoffs;
}

// ---------- Status pill ----------
function StatusPill({ status }: { status: ProjectStatus | HandoffStatus }) {
  const color: Record<string, string> = {
    Draft: "oklch(0.7 0.05 80)",
    Active: EMERALD,
    Waiting: "oklch(0.78 0.16 75)",
    Blocked: "oklch(0.65 0.22 25)",
    Review: "oklch(0.72 0.13 290)",
    Complete: "oklch(0.7 0.14 160)",
    Parked: "oklch(0.6 0.03 80)",
    "Not Started": "oklch(0.65 0.04 80)",
    Sent: "oklch(0.72 0.13 230)",
    Working: AMBER,
    "Needs Review": "oklch(0.72 0.13 290)",
  };
  const c = color[status] ?? AMBER;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]"
      style={{ borderColor: `${c}`, color: c, background: `${c}1a` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {status}
    </span>
  );
}

function ProjectCreatorPage() {
  // Initialize with deterministic seed so SSR and client first render match.
  // localStorage is read after mount in a useEffect.
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [selectedId, setSelectedId] = useState<string>(SEED_PROJECTS[0]?.id ?? "");
  const [hydrated, setHydrated] = useState(false);
  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingHandoff, setEditingHandoff] = useState<{
    handoff: Handoff;
    isNew: boolean;
  } | null>(null);
  const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(null);
  const [commandReceiptOpen, setCommandReceiptOpen] = useState(false);

  // Load from localStorage after mount.
  useEffect(() => {
    const stored = loadProjects();
    const { projects: migrated } = migrateProjects(stored);
    const { projects: ensured } = ensureRequiredStages(migrated);
    setProjects(ensured);
    setSelectedId(ensured[0]?.id ?? "");
    setHydrated(true);
  }, []);

  // Persist only after hydration so we never overwrite stored data with seed.
  // Also keep a runtime safety net for already-mounted or imported projects:
  // append missing required stage handoffs before writing back to localStorage.
  useEffect(() => {
    if (!hydrated) return;
    const { projects: ensured, changed } = ensureRequiredStages(projects);
    if (changed) {
      setProjects(ensured);
      return;
    }
    saveProjects(projects);
  }, [projects, hydrated]);

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? projects[0] ?? null,
    [projects, selectedId],
  );

  // Reset selected step when switching projects; default to active stage.
  useEffect(() => {
    if (!selected) {
      setSelectedHandoffId(null);
      return;
    }
    const active = currentStageEntry(selected)?.handoff;
    setSelectedHandoffId(active?.id ?? selected.handoffs[0]?.id ?? null);
    setCommandReceiptOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.status, p.currentBot, p.currentMode, p.summary,
        p.projectType === "Other / Custom"
          ? p.projectTypeCustom || "Other / Custom"
          : p.projectType || "Unclassified",
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [projects, query]);

  function logActivity(
    p: Project,
    entry: { bot?: string; action: string; status?: HandoffStatus | ProjectStatus; receipt?: string; blocker?: string; link?: string },
  ): Project {
    return {
      ...p,
      activity: [
        ...p.activity,
        {
          id: uid(),
          at: new Date().toISOString(),
          bot: entry.bot ?? p.currentBot ?? "—",
          action: entry.action,
          status: entry.status,
          receipt: entry.receipt,
          blocker: entry.blocker,
          link: entry.link,
        },
      ],
    };
  }

  function updateSelected(mut: (p: Project) => Project) {
    if (!selected) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === selected.id ? { ...mut(p), updatedAt: new Date().toISOString() } : p)),
    );
  }

  function saveProjectSettings(input: ProjectSettingsInput) {
    if (!editingProjectId) return;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== editingProjectId) return p;
        const changed: string[] = [];
        if (input.name !== p.name) changed.push("name");
        if (input.summary !== p.summary) changed.push("summary");
        if (input.status !== p.status) changed.push("status");
        if (input.projectType !== p.projectType) changed.push("project type");
        if (
          input.projectType === "Other / Custom" &&
          (input.projectTypeCustom.trim() || undefined) !== p.projectTypeCustom
        )
          changed.push("custom type");
        if (input.currentMode !== p.currentMode) changed.push("mode");
        if (input.currentBot !== p.currentBot) changed.push("owner");
        if (input.nextAction !== p.nextAction) changed.push("next action");
        if ((input.blocker.trim() || undefined) !== p.blocker) changed.push("blocker");
        const next: Project = {
          ...p,
          name: input.name.trim() || p.name,
          summary: input.summary,
          status: input.status,
          projectType: input.projectType,
          projectTypeCustom:
            input.projectType === "Other / Custom"
              ? input.projectTypeCustom.trim() || undefined
              : undefined,
          currentMode: input.currentMode,
          currentBot: input.currentBot,
          nextAction: input.nextAction,
          blocker: input.blocker.trim() || undefined,
          updatedAt: new Date().toISOString(),
        };
        if (changed.length === 0) return next;
        return logActivity(next, {
          action: `updated project settings (${changed.join(", ")})`,
          status: next.status,
          blocker: next.blocker,
        });
      }),
    );
    setEditingProjectId(null);
  }

  function createProject(input: ProjectSettingsInput, fromPipeline = false) {
    const id = uid();
    const ts = new Date().toISOString();
    const pipelineHandoffs = fromPipeline ? createPipelineHandoffs(uid) : createInitialWorkflowHandoffs(id);
    const initialWorkflow = activeWorkflowEntry(pipelineHandoffs)?.handoff ?? null;
    const fresh: Project = {
      id,
      name: input.name.trim() || "Untitled Project",
      summary: input.summary,
      status: input.status,
      projectType: input.projectType,
      projectTypeCustom:
        input.projectType === "Other / Custom"
          ? input.projectTypeCustom.trim() || undefined
          : undefined,
      currentMode: fromPipeline
        ? DABOTTREE_PIPELINE[0].stage
        : initialWorkflow?.mode || input.currentMode || "Mode 0 / Raw Idea",
      currentBot: fromPipeline
        ? DABOTTREE_PIPELINE[0].bot
        : initialWorkflow?.bot || input.currentBot || "Boss",
      nextAction: fromPipeline ? input.nextAction : requiredActionForHandoff(initialWorkflow, input.nextAction),
      blocker: input.blocker.trim() || undefined,
      updatedAt: ts,
      clarity: "",
      shapeNotes: "",
      shapeBotOutput: "",
      planNotes: "",
      planBotOutput: "",
      handoffs: pipelineHandoffs,
      artifacts: [],
      activity: [
        {
          id: uid(),
          at: ts,
          bot: input.currentBot || "Boss",
          action: fromPipeline
            ? `created project from ${DABOTTREE_PIPELINE_NAME}`
            : "created project",
          status: input.status,
        },
      ],
    };
    setProjects((prev) => [fresh, ...prev]);
    setSelectedId(id);
    setShowNewProject(false);
  }

  // One-click "+ new" project. Creates an editable project seeded with
  // the canonical Mode 0 defaults; nested Modes + R&D steps are appended
  // automatically by ensureRequiredStages on the next render tick.
  function quickCreateProject() {
    const id = uid();
    const ts = new Date().toISOString();
    const handoffs = createInitialWorkflowHandoffs(id);
    const fresh: Project = {
      id,
      name: "Untitled Project",
      summary: "",
      status: "Draft",
      projectType: undefined, // displayed as "Unclassified" until set
      projectTypeCustom: undefined,
      currentMode: "Mode 0 / Raw Idea",
      currentBot: "Boss",
      nextAction: "Fill Mode 0 / Raw Idea",
      blocker: undefined,
      updatedAt: ts,
      clarity: "",
      shapeNotes: "",
      shapeBotOutput: "",
      planNotes: "",
      planBotOutput: "",
      handoffs,
      artifacts: [],
      activity: [
        {
          id: uid(),
          at: ts,
          bot: "Boss",
          action: "created project",
          status: "Draft",
        },
      ],
    };
    setProjects((prev) => [fresh, ...prev]);
    setSelectedId(id);
  }

  function exportJSON() {
    if (typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify(projects, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dabottree-projects-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importJSON(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error("Expected an array of projects");
        for (const p of parsed) {
          if (typeof p?.id !== "string" || typeof p?.name !== "string") {
            throw new Error("Project entries missing id/name");
          }
        }
        const ts = new Date().toISOString();
        const stamped = (parsed as Project[]).map((p) => ({
          ...p,
          activity: [
            ...(p.activity ?? []),
            { id: uid(), at: ts, bot: "—", action: "data imported" },
          ],
        }));
        setProjects(stamped);
        setSelectedId(stamped[0]?.id ?? "");
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Invalid JSON");
      }
    };
    reader.readAsText(file);
  }

  function openNewHandoff() {
    if (!selected) return;
    setEditingHandoff({
      isNew: true,
      handoff: {
        id: uid(),
        step: selected.handoffs.length + 1,
        mode: "",
        bot: "",
        assignment: "",
        status: "Not Started",
      },
    });
  }

  function saveHandoff(h: Handoff, isNew: boolean) {
    if (!selected) return;
    const prev = selected.handoffs.find((x) => x.id === h.id);
    updateSelected((p) => {
      const next: Project = {
        ...p,
        handoffs: isNew ? [...p.handoffs, h] : p.handoffs.map((x) => (x.id === h.id ? h : x)),
      };
      const moved =
        prev && prev.status !== h.status
          ? advanceProjectAfterHandoffStatusChange(p, next, prev, h)
          : isNew && h.status !== "Not Started"
            ? advanceProjectAfterHandoffStatusChange(p, next, { ...h, status: "Not Started" }, h)
            : next;
      if (isNew) {
        return logActivity(moved, {
          bot: h.bot || p.currentBot,
          action: `added handoff "${h.mode || "untitled"}"`,
          status: h.status,
        });
      }
      const events: string[] = [];
      if (prev && prev.status !== h.status) events.push(`status → ${h.status}`);
      events.push("edited");
      return logActivity(moved, {
        bot: h.bot || p.currentBot,
        action: `handoff "${h.mode || "untitled"}" ${events.join(", ")}`,
        status: h.status,
      });
    });
    setEditingHandoff(null);
  }

  function moveHandoff(id: string, dir: -1 | 1) {
    updateSelected((p) => {
      const idx = p.handoffs.findIndex((h) => h.id === id);
      if (idx < 0) return p;
      const target = idx + dir;
      if (target < 0 || target >= p.handoffs.length) return p;
      const next = [...p.handoffs];
      [next[idx], next[target]] = [next[target], next[idx]];
      const renumbered = next.map((h, i) => ({ ...h, step: i + 1 }));
      return { ...p, handoffs: renumbered };
    });
  }

  function removeHandoff(id: string) {
    updateSelected((p) => {
      const h = p.handoffs.find((x) => x.id === id);
      const next = {
        ...p,
        handoffs: p.handoffs.filter((x) => x.id !== id).map((x, i) => ({ ...x, step: i + 1 })),
      };
      return logActivity(next, {
        bot: h?.bot,
        action: `removed handoff "${h?.mode || "untitled"}"`,
      });
    });
  }

  function changeHandoffStatus(id: string, status: HandoffStatus) {
    updateSelected((p) => {
      const h = p.handoffs.find((x) => x.id === id);
      if (!h || h.status === status) return p;
      const updated: Handoff = {
        ...h,
        status,
        // Stamp completion when newly Complete; clear stamp when the step
        // moves away from Complete so the card no longer shows a stale
        // "completed …" line under a Working / Blocked / etc. status.
        completedAt:
          status === "Complete"
            ? h.completedAt ?? new Date().toISOString()
            : undefined,
      };
      const nextHandoffs = p.handoffs.map((x) => (x.id === id ? updated : x));
      const next = advanceProjectAfterHandoffStatusChange(
        p,
        { ...p, handoffs: nextHandoffs },
        h,
        updated,
      );
      return logActivity(next, {
        bot: h.bot,
        action: `handoff "${h.mode || "untitled"}" status → ${status}`,
        status,
      });
    });
  }

  function addArtifact() {
    if (!selected) return;
    const ts = new Date().toISOString();
    const a: Artifact = {
      id: uid(),
      title: "Untitled artifact",
      kind: "note",
      type: "other",
      source: "Manual",
      body: "",
      bot: selected.currentBot || "—",
      createdAt: ts,
      updatedAt: ts,
    };
    updateSelected((p) =>
      logActivity({ ...p, artifacts: [...p.artifacts, a] }, {
        bot: a.bot,
        action: `added artifact "${a.title}"`,
      }),
    );
    setEditingArtifactId(a.id);
  }

  function saveArtifact(updated: Artifact) {
    updateSelected((p) =>
      logActivity(
        {
          ...p,
          artifacts: p.artifacts.map((a) =>
            a.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : a,
          ),
        },
        { bot: updated.bot, action: `updated artifact "${updated.title}"` },
      ),
    );
    setEditingArtifactId(null);
  }

  function removeArtifact(id: string) {
    updateSelected((p) => {
      const a = p.artifacts.find((x) => x.id === id);
      return logActivity(
        { ...p, artifacts: p.artifacts.filter((x) => x.id !== id) },
        { bot: a?.bot, action: `removed artifact "${a?.title ?? "untitled"}"` },
      );
    });
  }

  const editingProject = useMemo(
    () => projects.find((p) => p.id === editingProjectId) ?? null,
    [projects, editingProjectId],
  );
  const editingArtifact = useMemo(
    () => selected?.artifacts.find((a) => a.id === editingArtifactId) ?? null,
    [selected, editingArtifactId],
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* warm ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-[10%] top-[5%] h-72 w-72 rounded-full opacity-20 animate-flicker"
          style={{ background: `radial-gradient(circle, ${AMBER}, transparent 70%)` }}
        />
        <div
          className="absolute right-[5%] bottom-[10%] h-80 w-80 rounded-full opacity-15 animate-flicker"
          style={{
            background: `radial-gradient(circle, ${AMBER}, transparent 70%)`,
            animationDelay: "1.4s",
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[oklch(0.12_0.02_60)] to-transparent" />

      <div className="relative mx-auto max-w-[1400px] px-3 py-5 md:px-6 md:py-7">
        {/* header */}
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 text-xs text-muted-foreground/80 transition hover:text-foreground"
            >
              <span className="transition group-hover:-translate-x-0.5">←</span>
              <span className="font-hand text-sm">back to the lobby</span>
            </Link>
            <h1
              className="mt-1 font-display text-2xl md:text-3xl font-semibold leading-tight"
              style={{ color: AMBER }}
            >
              DaBotTree Project Board
            </h1>
            <div className="mt-0.5 font-hand text-sm" style={{ color: AMBER }}>
              the operations room — one source of truth per project
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={exportJSON}
              className="rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
              style={{ borderColor: AMBER_SOFT }}
              title="Export all projects as JSON"
            >
              ↓ export
            </button>
            <label
              className="cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
              style={{ borderColor: AMBER_SOFT }}
              title="Import projects from JSON"
            >
              ↑ import
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJSON(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </header>

        {importError && (
          <div
            className="mb-4 rounded-md border px-3 py-1.5 text-xs"
            style={{
              borderColor: "oklch(0.65 0.22 25 / 0.5)",
              background: "oklch(0.65 0.22 25 / 0.1)",
              color: "oklch(0.85 0.12 25)",
            }}
          >
            import failed: {importError}
          </div>
        )}

        {/* 3-column layout */}
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          {/* LEFT — project list */}
          <aside
            className="rounded-2xl border bark-texture p-3 lg:sticky lg:top-3 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
            style={{ borderColor: AMBER_SOFT }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                Projects · {filteredProjects.length}/{projects.length}
              </div>
              <button
                onClick={quickCreateProject}
                className="rounded-md border px-2 py-1 text-xs font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                style={{ borderColor: AMBER_LINE, color: AMBER }}
                title="Create a new draft project at Mode 0 / Raw Idea"
              >
                + new
              </button>
            </div>
            <div className="relative mb-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search name, status, bot, mode…"
                className="w-full rounded-md border bg-[oklch(0.15_0.02_60_/_0.4)] px-2.5 py-1.5 text-xs outline-none focus:border-[oklch(0.78_0.18_50)]"
                style={{ borderColor: AMBER_SOFT }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1.5 text-xs text-muted-foreground/70 hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
            {filteredProjects.length === 0 && (
              <div className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground"
                style={{ borderColor: AMBER_LINE }}>
                no projects match
              </div>
            )}
            <ul className="space-y-1.5">
              {filteredProjects.map((p) => {
                const active = selected?.id === p.id;
                const workflow = currentStageEntry(p)?.handoff;
                const displayMode = workflow?.mode || p.currentMode;
                const displayBot = workflow?.bot || p.currentBot;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className="w-full rounded-xl border px-3 py-2 text-left transition hover:bg-[oklch(0.3_0.03_60_/_0.3)]"
                      style={{
                        borderColor: active ? AMBER : AMBER_SOFT,
                        background: active ? `${AMBER_SOFT}` : "transparent",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-display text-sm font-semibold">
                          {p.name}
                        </div>
                        <StatusPill status={p.status} />
                      </div>
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">
                        {p.projectType === "Other / Custom"
                          ? p.projectTypeCustom || "Other / Custom"
                          : p.projectType || "Unclassified"} · {displayMode} · {displayBot}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground/70">
                        updated {fmtTime(p.updatedAt)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* CENTER — selected project */}
          {selected ? (
            <ProjectMain
              project={selected}
              onChange={updateSelected}
              onPreviewArtifact={setPreviewArtifact}
              onAddHandoff={openNewHandoff}
              onEditHandoff={(h) => setEditingHandoff({ handoff: h, isNew: false })}
              onOpenSettings={() => setEditingProjectId(selected.id)}
              onMoveHandoff={moveHandoff}
              onRemoveHandoff={removeHandoff}
              onChangeHandoffStatus={changeHandoffStatus}
              onAddArtifact={addArtifact}
              onEditArtifact={(id) => setEditingArtifactId(id)}
              onRemoveArtifact={removeArtifact}
              selectedHandoffId={selectedHandoffId}
              onSelectHandoff={setSelectedHandoffId}
              onOpenCommandReceipt={() => setCommandReceiptOpen(true)}
            />
          ) : (
            <div
              className="rounded-2xl border bark-texture p-8 text-center"
              style={{ borderColor: AMBER_SOFT }}
            >
              <div className="font-display text-lg" style={{ color: AMBER }}>
                No projects yet
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Open your first project in the operations room.
              </p>
              <button
                onClick={() => setShowNewProject(true)}
                className="mt-4 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                style={{ borderColor: AMBER_LINE, color: AMBER }}
              >
                + new project
              </button>
            </div>
          )}

          {/* RIGHT — workflow rail */}
          {selected && (
            <WorkflowRail
              project={selected}
              selectedHandoffId={selectedHandoffId}
              onSelectHandoff={setSelectedHandoffId}
              onOpenCommandReceipt={() => setCommandReceiptOpen(true)}
              onAddHandoff={openNewHandoff}
            />
          )}
        </div>
      </div>

      {previewArtifact && (
        <ArtifactPreview artifact={previewArtifact} onClose={() => setPreviewArtifact(null)} />
      )}

      {selected && commandReceiptOpen && (
        <CommandReceiptModal
          project={selected}
          onChange={updateSelected}
          onClose={() => setCommandReceiptOpen(false)}
        />
      )}

      {showNewProject && (
        <ProjectSettingsModal
          mode="create"
          onClose={() => setShowNewProject(false)}
          onSave={(input, fromPipeline) => createProject(input, fromPipeline)}
        />
      )}

      {editingProject && (
        <ProjectSettingsModal
          mode="edit"
          initial={editingProject}
          onClose={() => setEditingProjectId(null)}
          onSave={(input) => saveProjectSettings(input)}
        />
      )}

      {editingHandoff && (
        <HandoffEditorModal
          initial={editingHandoff.handoff}
          isNew={editingHandoff.isNew}
          onClose={() => setEditingHandoff(null)}
          onSave={(h) => saveHandoff(h, editingHandoff.isNew)}
        />
      )}

      {editingArtifact && (
        <ArtifactEditorModal
          initial={editingArtifact}
          onClose={() => setEditingArtifactId(null)}
          onSave={saveArtifact}
        />
      )}
    </div>
  );
}

// ---------- Status / right panel ----------
function StatusPanel({
  project,
  onChange,
}: {
  project: Project;
  onChange: (mut: (p: Project) => Project) => void;
}) {
  const latestReceipt = [...project.handoffs]
    .filter((h) => h.status === "Complete")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];
  const latestActivity = [...project.activity].sort((a, b) =>
    b.at.localeCompare(a.at),
  )[0];
  const activeEntry = currentStageEntry(project);
  const active = activeEntry?.handoff ?? null;
  const hasBlocker = !!project.blocker;

  return (
    <aside
      className="rounded-2xl border bark-texture p-4 lg:sticky lg:top-3 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
      style={{ borderColor: AMBER_SOFT }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: AMBER }}>
          Command receipt
        </div>
        <StatusPill status={project.status} />
      </div>

      {/* Stage callout */}
      <div
        className="rounded-xl border p-3"
        style={{
          borderColor: hasBlocker ? "oklch(0.65 0.22 25 / 0.5)" : AMBER_LINE,
          background: hasBlocker
            ? "oklch(0.65 0.22 25 / 0.08)"
            : "oklch(0.78 0.18 50 / 0.06)",
        }}
      >
        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
          Current stage
        </div>
        <div className="mt-0.5 font-display text-base font-semibold" style={{ color: AMBER }}>
          {active
            ? `${project.handoffs.indexOf(active) + 1}. ${splitStepTitle(active.mode).title || "untitled"}`
            : project.currentMode || "—"}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          owner <span className="text-foreground">{active?.bot || project.currentBot || "—"}</span>
          {active && splitStepTitle(active.mode).phase && (
            <> · phase <span className="text-foreground">{splitStepTitle(active.mode).phase}</span></>
          )}
          {active && <> · <StatusPill status={active.status} /></>}
        </div>
      </div>

      {/* Next action */}
      <div className="mt-3">
        <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Next required action
        </div>
        <textarea
          value={project.nextAction}
          onChange={(e) => onChange((p) => ({ ...p, nextAction: e.target.value }))}
          rows={2}
          placeholder="What is the very next thing?"
          className="w-full rounded-md border bg-[oklch(0.15_0.02_60_/_0.4)] px-2 py-1.5 text-sm leading-relaxed outline-none focus:border-[oklch(0.78_0.18_50)]"
          style={{ borderColor: AMBER_LINE }}
        />
      </div>

      {/* Blocker */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
          <span className="text-muted-foreground/70">Blocker</span>
          {hasBlocker && <span style={{ color: "oklch(0.85 0.12 25)" }}>⚠ active</span>}
        </div>
        <textarea
          value={project.blocker ?? ""}
          placeholder="None"
          onChange={(e) =>
            onChange((p) => ({ ...p, blocker: e.target.value || undefined }))
          }
          rows={2}
          className="w-full rounded-md border bg-[oklch(0.15_0.02_60_/_0.4)] px-2 py-1.5 text-sm outline-none focus:border-[oklch(0.78_0.18_50)]"
          style={{
            borderColor: hasBlocker ? "oklch(0.65 0.22 25 / 0.6)" : AMBER_SOFT,
          }}
        />
      </div>

      {/* Editable fields collapsed */}
      <div className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: AMBER_SOFT }}>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Quick edit
        </div>
        <Field label="Status">
          <select
            value={project.status}
            onChange={(e) =>
              onChange((p) => ({ ...p, status: e.target.value as ProjectStatus }))
            }
            className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: AMBER_SOFT }}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-[oklch(0.18_0.02_60)]">
                {s}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Owner">
            <input
              value={project.currentBot}
              onChange={(e) => onChange((p) => ({ ...p, currentBot: e.target.value }))}
              className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm"
              style={{ borderColor: AMBER_SOFT }}
            />
          </Field>
          <Field label="Mode">
            <input
              value={project.currentMode}
              onChange={(e) => onChange((p) => ({ ...p, currentMode: e.target.value }))}
              className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm"
              style={{ borderColor: AMBER_SOFT }}
            />
          </Field>
        </div>
      </div>

      {/* Latest activity */}
      <div className="mt-4 border-t pt-3" style={{ borderColor: AMBER_SOFT }}>
        <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Latest activity
        </div>
        {latestActivity ? (
          <div className="rounded-md border px-2 py-2 text-xs" style={{ borderColor: AMBER_SOFT }}>
            <div className="text-foreground/90">
              <strong>{latestActivity.bot}</strong> {latestActivity.action}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/70">
              {fmtTime(latestActivity.at)}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Nothing logged yet.</div>
        )}
      </div>

      {/* Latest receipt */}
      <div className="mt-3">
        <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Latest receipt
        </div>
        {latestReceipt ? (
          <div className="rounded-md border px-2 py-2 text-xs" style={{ borderColor: AMBER_SOFT }}>
            <div className="font-medium">{latestReceipt.mode}</div>
            <div className="text-muted-foreground">
              by {latestReceipt.bot}
              {latestReceipt.completedAt && <> · {fmtTime(latestReceipt.completedAt)}</>}
            </div>
            {latestReceipt.artifactTitle && (
              <div className="mt-1 truncate text-[11px]" style={{ color: AMBER }}>
                📎 {latestReceipt.artifactTitle}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No receipts yet.</div>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </div>
      {children}
    </div>
  );
}

// ---------- Workflow rail (right panel) ----------
function WorkflowRail({
  project,
  selectedHandoffId,
  onSelectHandoff,
  onOpenCommandReceipt,
  onAddHandoff,
}: {
  project: Project;
  selectedHandoffId: string | null;
  onSelectHandoff: (id: string) => void;
  onOpenCommandReceipt: () => void;
  onAddHandoff: () => void;
}) {
  const activeEntry = currentStageEntry(project);
  const activeId = activeEntry?.handoff.id ?? null;

  return (
    <aside
      className="rounded-2xl border bark-texture p-3 lg:sticky lg:top-3 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
      style={{ borderColor: AMBER_SOFT }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: AMBER }}>
          Workflow
        </div>
        <button
          type="button"
          onClick={onOpenCommandReceipt}
          className="rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition hover:text-foreground"
          style={{ borderColor: AMBER_SOFT }}
          title="Open command receipt"
        >
          🧾 receipt
        </button>
      </div>
      <div className="mb-2 text-[10px] text-muted-foreground/70">
        {project.handoffs.length} step{project.handoffs.length === 1 ? "" : "s"} · click to view
      </div>
      {project.handoffs.length === 0 ? (
        <div
          className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground"
          style={{ borderColor: AMBER_LINE }}
        >
          No handoffs yet.
        </div>
      ) : (
        <ol className="relative space-y-0.5">
          {project.handoffs.map((h, idx) => {
            const isActive = h.id === activeId;
            const isSelected = h.id === selectedHandoffId;
            const stageColor =
              h.status === "Complete"
                ? EMERALD
                : h.status === "Blocked"
                  ? "oklch(0.65 0.22 25)"
                  : h.status === "Parked"
                    ? "oklch(0.6 0.03 80)"
                    : isActive
                      ? AMBER
                      : "oklch(0.6 0.03 80)";
            const dotChar =
              h.status === "Complete"
                ? "✓"
                : h.status === "Blocked"
                  ? "!"
                  : h.status === "Parked"
                    ? "·"
                    : isActive
                      ? "●"
                      : String(idx + 1);
            const { title, phase } = splitStepTitle(h.mode);
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => onSelectHandoff(h.id)}
                  className="flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left transition hover:bg-[oklch(0.3_0.03_60_/_0.35)]"
                  style={{
                    borderColor: isSelected ? AMBER : AMBER_SOFT,
                    background: isSelected
                      ? "oklch(0.78 0.18 50 / 0.1)"
                      : isActive
                        ? "oklch(0.78 0.18 50 / 0.04)"
                        : "transparent",
                  }}
                  title={`${idx + 1}. ${h.mode} · ${h.status}`}
                >
                  <span
                    className="shrink-0 text-[10px] font-mono tabular-nums text-muted-foreground/70"
                    style={{ minWidth: "1.25rem", textAlign: "right" }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold"
                    style={{ borderColor: stageColor, color: stageColor }}
                  >
                    {dotChar}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[12px] leading-tight"
                      style={{ fontWeight: isActive || isSelected ? 600 : 400 }}
                    >
                      {title || <span className="italic opacity-60">untitled</span>}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] leading-tight text-muted-foreground">
                      <span className="truncate">
                        {h.bot || "—"}
                        {phase && <span className="opacity-60"> · {phase}</span>}
                      </span>
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-[10px]"
                    style={{ color: stageColor }}
                    title={h.status}
                  >
                    {h.status === "Complete"
                      ? "✓"
                      : h.status === "Blocked"
                        ? "!"
                        : h.status === "Working"
                          ? "●"
                          : h.status === "Sent" || h.status === "Needs Review"
                            ? "○"
                            : h.status === "Parked"
                              ? "·"
                              : ""}
                  </span>
                  {isActive && (
                    <span
                      className="shrink-0 rounded border px-1 text-[9px] uppercase tracking-[0.14em]"
                      style={{ borderColor: AMBER, color: AMBER }}
                    >
                      now
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <button
        type="button"
        onClick={onAddHandoff}
        className="mt-2 w-full rounded-md border border-dashed px-2 py-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
        style={{ borderColor: AMBER_SOFT }}
      >
        + add step
      </button>
      <div
        className="mt-3 rounded-md border px-2 py-1.5 text-[10px] text-muted-foreground/80"
        style={{ borderColor: AMBER_SOFT }}
      >
        Legend: <span style={{ color: AMBER }}>●</span> working · <span style={{ color: EMERALD }}>✓</span> complete · <span style={{ color: "oklch(0.65 0.22 25)" }}>!</span> blocked
      </div>
    </aside>
  );
}

// ---------- Command receipt modal ----------
function CommandReceiptModal({
  project,
  onChange,
  onClose,
}: {
  project: Project;
  onChange: (mut: (p: Project) => Project) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        aria-label="close"
        className="absolute inset-0 bg-[oklch(0.08_0.02_60_/_0.75)] backdrop-blur-sm animate-fade-in"
      />
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border bark-texture p-4 animate-fade-up"
        style={{ borderColor: AMBER, animationDuration: "0.2s" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-base font-semibold" style={{ color: AMBER }}>
            Command Receipt
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground transition hover:text-foreground"
            style={{ borderColor: AMBER_SOFT }}
          >
            ✕
          </button>
        </div>
        <StatusPanel project={project} onChange={onChange} />
      </div>
    </div>
  );
}

// ---------- Creator guidance strip ----------
const CREATOR_MODES = [
  {
    key: "Good" as const,
    label: "Good",
    blurb: "Hands-off. Bots complete the process unless blocked.",
  },
  {
    key: "Better" as const,
    label: "Better",
    blurb: "Guided. Bots pause at key checkpoints for creator review.",
  },
  {
    key: "Best" as const,
    label: "Best",
    blurb: "Hands-on. Creator walks every major stage with the bots.",
  },
];

function CreatorGuidance({
  project,
  onChange,
}: {
  project: Project;
  onChange: (mut: (p: Project) => Project) => void;
}) {
  const mode = project.creatorMode ?? "Better";
  const guidance = project.creatorGuidance ?? "";
  const activeBlurb = CREATOR_MODES.find((m) => m.key === mode)?.blurb ?? "";

  return (
    <section
      className="rounded-xl border bark-texture px-3 py-3 md:px-4 md:py-3.5"
      style={{ borderColor: AMBER_SOFT }}
    >
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <BotAvatar name="Boss" size={44} ring={AMBER} />
          <span
            className="rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em]"
            style={{ borderColor: AMBER_LINE, color: AMBER }}
          >
            Creator
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em]"
              style={{ borderColor: AMBER_LINE, color: AMBER }}
            >
              Creator Control
            </span>
        <div
          className="inline-flex overflow-hidden rounded-md border text-[11px]"
          style={{ borderColor: AMBER_SOFT }}
          role="radiogroup"
          aria-label="Creator involvement"
        >
          {CREATOR_MODES.map((m) => {
            const sel = m.key === mode;
            return (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() =>
                  onChange((p) => ({ ...p, creatorMode: m.key }))
                }
                title={m.blurb}
                className="px-2.5 py-1 transition"
                style={{
                  background: sel ? "oklch(0.78 0.18 50 / 0.18)" : "transparent",
                  color: sel ? AMBER : "inherit",
                  fontWeight: sel ? 600 : 400,
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
            <span className="text-[11px] text-muted-foreground">{activeBlurb}</span>
          </div>
          <input
        value={guidance}
        onChange={(e) =>
          onChange((p) => ({ ...p, creatorGuidance: e.target.value || undefined }))
        }
            placeholder="Creator notes, warnings, or snags…"
            className="w-full rounded-md border bg-transparent px-2 py-1.5 text-[12px] outline-none focus:border-[oklch(0.78_0.18_50)]"
        style={{ borderColor: AMBER_SOFT }}
          />
        </div>
      </div>
    </section>
  );
}

// ---------- Selected step detail panel ----------
function SelectedStepDetail({
  project,
  onChange,
  handoff,
  globalIndex,
  total,
  onEdit,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChangeStatus,
  onPreview,
  onAddArtifact,
  onEditArtifact,
  onRemoveArtifact,
}: {
  project: Project;
  onChange: (mut: (p: Project) => Project) => void;
  handoff: Handoff;
  globalIndex: number;
  total: number;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChangeStatus: (s: HandoffStatus) => void;
  onPreview: (a: Artifact) => void;
  onAddArtifact: () => void;
  onEditArtifact: (id: string) => void;
  onRemoveArtifact: (id: string) => void;
}) {
  const [tab, setTab] = useState<"output" | "details" | "artifacts" | "activity">(
    "output",
  );
  const title = stepTitleOnly(handoff.mode, handoff.bot) || "Untitled step";
  const stageColor =
    handoff.status === "Complete"
      ? EMERALD
      : handoff.status === "Blocked"
        ? "oklch(0.65 0.22 25)"
        : AMBER;
  return (
    <section
      className="rounded-2xl border bark-texture p-3 md:p-4"
      style={{ borderColor: AMBER_SOFT }}
    >
      {/* Summary header */}
      <div className="mb-3 flex items-start gap-3">
        <BotAvatar name={handoff.bot} size={44} ring={stageColor} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            <span>Selected step</span>
            <span className="opacity-40">·</span>
            <span>{globalIndex + 1} of {total}</span>
          </div>
          <h3 className="font-display text-xl font-semibold leading-tight" style={{ color: AMBER }}>
            {title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span><span className="opacity-60">Owner:</span> {handoff.bot || "—"}</span>
            <StatusPill status={handoff.status} />
            <span>
              {handoff.completedAt
                ? `completed ${fmtTime(handoff.completedAt)}`
                : "in flight"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <select
            value={handoff.status}
            onChange={(e) => onChangeStatus(e.target.value as HandoffStatus)}
            className="rounded-md border bg-[oklch(0.15_0.02_60_/_0.5)] px-1.5 py-0.5 text-[11px]"
            style={{ borderColor: AMBER_SOFT }}
            aria-label="change status"
          >
            {HANDOFF_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-[oklch(0.18_0.02_60)]">
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={onMoveUp}
            disabled={globalIndex <= 0}
            title="Move up"
            className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-30"
            style={{ borderColor: AMBER_SOFT }}
          >▲</button>
          <button
            onClick={onMoveDown}
            disabled={globalIndex === -1 || globalIndex >= total - 1}
            title="Move down"
            className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-30"
            style={{ borderColor: AMBER_SOFT }}
          >▼</button>
        </div>
      </div>

      {/* Tab strip */}
      <div
        className="mb-3 flex flex-wrap gap-1 border-b pb-2"
        style={{ borderColor: AMBER_SOFT }}
      >
        {(
          [
            { k: "output", label: "Step Result" },
            { k: "details", label: "Summary" },
            { k: "artifacts", label: "Artifacts" },
            { k: "activity", label: "Activity" },
          ] as const
        ).map((t) => {
          const sel = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className="rounded-md border px-2.5 py-1 text-[11px] transition"
              style={{
                borderColor: sel ? AMBER : AMBER_SOFT,
                background: sel ? "oklch(0.78 0.18 50 / 0.14)" : "transparent",
                color: sel ? AMBER : "inherit",
                fontWeight: sel ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto flex gap-1">
          <button
            onClick={onEdit}
            className="rounded-md border px-2 py-0.5 text-[11px]"
            style={{ borderColor: AMBER_LINE, color: AMBER }}
          >
            ✎ edit step
          </button>
          <button
            onClick={onRemove}
            className="rounded-md border px-2 py-0.5 text-[11px] text-muted-foreground/70 hover:text-foreground"
            style={{ borderColor: AMBER_SOFT }}
            title="Remove step"
          >
            ✕
          </button>
        </div>
      </div>

      {tab === "output" && (
        <StepResultPanel project={project} handoff={handoff} onChange={onChange} onPreview={onPreview} />
      )}
      {tab === "details" && (
        <StepSummaryPanel handoff={handoff} />
      )}
      {tab === "artifacts" && (
        <ArtifactGrid
          project={project}
          onPreview={onPreview}
          onAdd={onAddArtifact}
          onEdit={onEditArtifact}
          onRemove={onRemoveArtifact}
        />
      )}
      {tab === "activity" && <ActivityLog project={project} />}
    </section>
  );
}

function StepSummaryPanel({ handoff }: { handoff: Handoff }) {
  return (
    <div className="space-y-3 text-sm">
      {handoff.assignment ? (
        <LabelledBlock label="Assignment">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
            {handoff.assignment}
          </p>
        </LabelledBlock>
      ) : (
        <div className="text-xs italic text-muted-foreground">No assignment text.</div>
      )}
      {handoff.authorityNotes && (
        <LabelledBlock label="Authority boundary">
          <p className="whitespace-pre-wrap text-[11px] italic leading-relaxed text-muted-foreground">
            {handoff.authorityNotes}
          </p>
        </LabelledBlock>
      )}
      {(handoff.nextBot || handoff.nextStep) && (
        <LabelledBlock label="Next step">
          <div
            className="rounded-md border px-2 py-1 text-xs"
            style={{
              borderColor: AMBER_SOFT,
              background: "oklch(0.78 0.18 50 / 0.04)",
            }}
          >
            → <strong>{handoff.nextStep || "—"}</strong>
            {handoff.nextBot && <> by <strong>{handoff.nextBot}</strong></>}
          </div>
        </LabelledBlock>
      )}
    </div>
  );
}

function StepResultPanel({
  project,
  handoff,
  onChange,
  onPreview,
}: {
  project: Project;
  handoff: Handoff;
  onChange: (mut: (p: Project) => Project) => void;
  onPreview: (a: Artifact) => void;
}) {
  const modeKey = (handoff.mode ?? "").trim().toLowerCase();
  const isMode0 = modeKey.startsWith("mode 0");
  const isMode1 = modeKey.startsWith("mode 1");
  const isMode2 = modeKey.startsWith("mode 2");
  const hasArtifactPreview = !!(handoff.artifactBody || handoff.artifactLink);

  if (isMode0) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
          Raw idea / intake — collected by Boss
        </div>
        <textarea
          value={project.clarity}
          onChange={(e) => onChange((p) => ({ ...p, clarity: e.target.value }))}
          rows={8}
          placeholder="What are we building? Who is it for? What does done look like?"
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm leading-relaxed"
          style={{ borderColor: AMBER_SOFT }}
        />
      </div>
    );
  }

  if (isMode1) {
    return (
      <div className="space-y-3">
        <Field label="Structured shape notes">
          <textarea
            value={project.shapeNotes}
            onChange={(e) => onChange((p) => ({ ...p, shapeNotes: e.target.value }))}
            rows={4}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm leading-relaxed"
            style={{ borderColor: AMBER_SOFT }}
          />
        </Field>
        <Field label="Bot output">
          <textarea
            value={project.shapeBotOutput}
            onChange={(e) => onChange((p) => ({ ...p, shapeBotOutput: e.target.value }))}
            rows={3}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm leading-relaxed"
            style={{ borderColor: AMBER_SOFT }}
          />
        </Field>
        <Field label="Artifact link">
          <input
            value={project.shapeArtifact ?? ""}
            placeholder="https://…"
            onChange={(e) =>
              onChange((p) => ({ ...p, shapeArtifact: e.target.value || undefined }))
            }
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: AMBER_SOFT }}
          />
        </Field>
      </div>
    );
  }

  if (isMode2) {
    return (
      <div className="space-y-3">
        <Field label="Planning notes">
          <textarea
            value={project.planNotes}
            onChange={(e) => onChange((p) => ({ ...p, planNotes: e.target.value }))}
            rows={4}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm leading-relaxed"
            style={{ borderColor: AMBER_SOFT }}
          />
        </Field>
        <Field label="Bot output">
          <textarea
            value={project.planBotOutput}
            onChange={(e) => onChange((p) => ({ ...p, planBotOutput: e.target.value }))}
            rows={3}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm leading-relaxed"
            style={{ borderColor: AMBER_SOFT }}
          />
        </Field>
        <Field label="Artifact link">
          <input
            value={project.planArtifact ?? ""}
            placeholder="https://…"
            onChange={(e) =>
              onChange((p) => ({ ...p, planArtifact: e.target.value || undefined }))
            }
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: AMBER_SOFT }}
          />
        </Field>
      </div>
    );
  }

  // Generic step output: artifact body / link / title
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
        What this step produced
      </div>
      {handoff.artifactTitle && (
        <div className="font-display text-sm font-semibold">{handoff.artifactTitle}</div>
      )}
      {handoff.artifactBody ? (
        <div
          className="whitespace-pre-wrap rounded-md border bg-transparent px-3 py-2 text-sm leading-relaxed"
          style={{ borderColor: AMBER_SOFT }}
        >
          {handoff.artifactBody}
        </div>
      ) : (
        <div
          className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground"
          style={{ borderColor: AMBER_LINE }}
        >
          No result captured yet. Use <strong>✎ edit step</strong> to add the output this step delivered.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {handoff.receiptLink && (
          <a href={handoff.receiptLink} target="_blank" rel="noreferrer"
            className="rounded-md border px-2 py-0.5"
            style={{ borderColor: AMBER_LINE, color: AMBER }}>
            🧾 receipt
          </a>
        )}
        {handoff.artifactLink && (
          <a href={handoff.artifactLink} target="_blank" rel="noreferrer"
            className="rounded-md border px-2 py-0.5"
            style={{ borderColor: AMBER_LINE, color: AMBER }}>
            🔗 link
          </a>
        )}
        {hasArtifactPreview && (
          <button
            onClick={() =>
              onPreview({
                id: handoff.id,
                title: handoff.artifactTitle || `${handoff.mode} artifact`,
                kind: handoff.mode,
                type: "other",
                source: "Handoff",
                body: handoff.artifactBody,
                link: handoff.artifactLink,
                bot: handoff.bot,
                createdAt: handoff.completedAt ?? new Date().toISOString(),
              })
            }
            className="rounded-md border px-2 py-0.5"
            style={{ borderColor: AMBER_LINE, color: AMBER }}
          >
            preview
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Main center column ----------
function ProjectMain({
  project,
  onChange,
  onPreviewArtifact,
  onAddHandoff,
  onEditHandoff,
  onOpenSettings,
  onMoveHandoff,
  onRemoveHandoff,
  onChangeHandoffStatus,
  onAddArtifact,
  onEditArtifact,
  onRemoveArtifact,
  selectedHandoffId,
  onSelectHandoff,
  onOpenCommandReceipt,
}: {
  project: Project;
  onChange: (mut: (p: Project) => Project) => void;
  onPreviewArtifact: (a: Artifact) => void;
  onAddHandoff: () => void;
  onEditHandoff: (h: Handoff) => void;
  onOpenSettings: () => void;
  onMoveHandoff: (id: string, dir: -1 | 1) => void;
  onRemoveHandoff: (id: string) => void;
  onChangeHandoffStatus: (id: string, status: HandoffStatus) => void;
  onAddArtifact: () => void;
  onEditArtifact: (id: string) => void;
  onRemoveArtifact: (id: string) => void;
  selectedHandoffId: string | null;
  onSelectHandoff: (id: string | null) => void;
  onOpenCommandReceipt: () => void;
}) {
  const activeEntry = currentStageEntry(project);
  const active = activeEntry?.handoff ?? null;
  const displayBot = active?.bot || project.currentBot;

  const selectedHandoff =
    project.handoffs.find((h) => h.id === selectedHandoffId) ?? active ?? null;
  const selectedGlobalIndex = selectedHandoff
    ? project.handoffs.findIndex((h) => h.id === selectedHandoff.id)
    : -1;

  return (
    <div className="space-y-4 min-w-0">
      {/* header */}
      <div
        className="rounded-2xl border bark-texture p-4 md:p-5"
        style={{ borderColor: AMBER_SOFT }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              <span>Project</span>
              <span className="opacity-40">·</span>
              <StatusPill status={project.status} />
            </div>
            <h2
              className="font-display text-2xl font-semibold leading-tight md:text-3xl"
              style={{ color: AMBER }}
            >
              {project.name}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {project.summary || <span className="italic opacity-60">no summary yet</span>}
            </p>
          </div>
          <button
            onClick={onOpenSettings}
            className="shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
            style={{ borderColor: AMBER_LINE, color: AMBER }}
            title="Edit project settings"
          >
            ⚙ settings
          </button>
        </div>
        <CurrentStageIndicator project={project} onClick={onOpenCommandReceipt} />
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-3 text-[11px]" style={{ borderColor: AMBER_SOFT }}>
          <MetaItem
            label="Type"
            value={
              project.projectType === "Other / Custom"
                ? project.projectTypeCustom || "Other / Custom"
                : project.projectType || "—"
            }
          />
          <MetaItem label="Mode" value={project.currentMode} />
          <MetaItem label="Owner" value={displayBot} />
          <MetaItem label="Updated" value={fmtTime(project.updatedAt)} muted />
        </div>
      </div>

      <CreatorGuidance project={project} onChange={onChange} />

      {selectedHandoff ? (
        <SelectedStepDetail
          project={project}
          onChange={onChange}
          handoff={selectedHandoff}
          globalIndex={selectedGlobalIndex}
          total={project.handoffs.length}
          onEdit={() => onEditHandoff(selectedHandoff)}
          onMoveUp={() => onMoveHandoff(selectedHandoff.id, -1)}
          onMoveDown={() => onMoveHandoff(selectedHandoff.id, 1)}
          onRemove={() => onRemoveHandoff(selectedHandoff.id)}
          onChangeStatus={(s) => onChangeHandoffStatus(selectedHandoff.id, s)}
          onPreview={onPreviewArtifact}
          onAddArtifact={onAddArtifact}
          onEditArtifact={onEditArtifact}
          onRemoveArtifact={onRemoveArtifact}
        />
      ) : (
        <div
          className="rounded-2xl border border-dashed bark-texture p-6 text-center text-sm text-muted-foreground"
          style={{ borderColor: AMBER_SOFT }}
        >
          Select a step in the workflow rail to see its summary, output, artifacts, and activity.
        </div>
      )}
    </div>
  );
}

function MetaItem({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
        {label}
      </span>
      <span
        className={
          "truncate " + (muted ? "text-muted-foreground/80" : "text-foreground/90")
        }
      >
        {value || "—"}
      </span>
    </div>
  );
}

function CurrentStageIndicator({
  project,
  onClick,
}: {
  project: Project;
  onClick?: () => void;
}) {
  const activeEntry = currentStageEntry(project);
  const active = activeEntry?.handoff ?? null;
  const hasBlocker = !!project.blocker || active?.status === "Blocked";
  const accent = hasBlocker ? "oklch(0.65 0.22 25)" : AMBER;
  const nextAction = project.nextAction?.trim();

  if (!active && !nextAction && !hasBlocker) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open command receipt"
      title="Click to open command receipt"
      className="mt-4 block w-full rounded-xl border p-3 text-left transition hover:bg-[oklch(0.3_0.03_60_/_0.3)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[oklch(0.78_0.18_50)]"
      style={{
        borderColor: hasBlocker ? "oklch(0.65 0.22 25 / 0.55)" : AMBER_LINE,
        background: hasBlocker
          ? "oklch(0.65 0.22 25 / 0.08)"
          : "oklch(0.78 0.18 50 / 0.06)",
      }}
    >
      {active && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em]"
            style={{ borderColor: accent, color: accent }}
          >
            Current stage
          </span>
          <span className="font-display text-base font-semibold" style={{ color: accent }}>
            {project.handoffs.indexOf(active) + 1}. {splitStepTitle(active.mode).title || "untitled stage"}
          </span>
          <span className="text-xs text-muted-foreground">
            owner <strong className="text-foreground">{active.bot || "—"}</strong>
            {splitStepTitle(active.mode).phase && (
              <> · phase <strong className="text-foreground">{splitStepTitle(active.mode).phase}</strong></>
            )}
          </span>
          <StatusPill status={active.status} />
          <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            tap for receipt ›
          </span>
        </div>
      )}

      {(nextAction || active?.nextStep) && (
        <div className="mt-2 flex flex-wrap items-baseline gap-2 text-sm">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            Next required action
          </span>
          <span className="text-foreground">
            {nextAction ||
              `${active?.nextStep ?? ""}${active?.nextBot ? ` — by ${active.nextBot}` : ""}`}
          </span>
        </div>
      )}

      {project.blocker && (
        <div
          className="mt-2 flex items-start gap-2 rounded-md border px-2 py-1.5 text-[12px]"
          style={{
            borderColor: "oklch(0.65 0.22 25 / 0.5)",
            background: "oklch(0.65 0.22 25 / 0.12)",
            color: "oklch(0.88 0.10 25)",
          }}
        >
          <span className="mt-0.5">⚠</span>
          <span><strong className="uppercase tracking-[0.14em] text-[10px] mr-1.5">Blocker</strong>{project.blocker}</span>
        </div>
      )}
    </button>
  );
}

function Section({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border bark-texture p-4 md:p-5"
      style={{ borderColor: AMBER_SOFT }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold" style={{ color: AMBER }}>
            {title}
          </h2>
          {subtitle && (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
        {headerRight}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SectionMeta({ updatedAt, who }: { updatedAt: string; who?: string }) {
  return (
    <div className="text-[11px] text-muted-foreground/70">
      last edited {who ? `by ${who} ` : ""}· {fmtTime(updatedAt)}
    </div>
  );
}

// ---------- Handoffs ----------
function HandoffChain({
  project,
  onChange,
  onPreviewArtifact,
  onAddHandoff,
  onEditHandoff,
  onMoveHandoff,
  onRemoveHandoff,
  onChangeHandoffStatus,
}: {
  project: Project;
  onChange: (mut: (p: Project) => Project) => void;
  onPreviewArtifact: (a: Artifact) => void;
  onAddHandoff: () => void;
  onEditHandoff: (h: Handoff) => void;
  onMoveHandoff: (id: string, dir: -1 | 1) => void;
  onRemoveHandoff: (id: string) => void;
  onChangeHandoffStatus: (id: string, status: HandoffStatus) => void;
}) {
  const buckets = useMemo(() => bucketHandoffs(project.handoffs), [project.handoffs]);

  useEffect(() => {
    if (officialRecordHandoffCount(project.handoffs) > 0) return;
    onChange((p) => ensureOfficialRecordHandoff(p).project);
  }, [project.id, project.handoffs, onChange]);

  const initialOpen = useMemo(() => {
    const o: Record<string, boolean> = {};
    for (const b of buckets) {
      o[b.stage.id] =
        b.items.length > 0 &&
        b.items.some(
          (it) => it.handoff.status !== "Complete" && it.handoff.status !== "Parked",
        );
    }
    if (!Object.values(o).some(Boolean)) {
      const firstWithItems = buckets.find((b) => b.items.length > 0);
      if (firstWithItems) o[firstWithItems.stage.id] = true;
    }
    return o;
  }, [buckets]);
  const [openStages, setOpenStages] = useState<Record<string, boolean>>(initialOpen);

  useEffect(() => {
    setOpenStages((prev) => {
      const next = { ...prev };
      for (const b of buckets) {
        if (!(b.stage.id in next)) next[b.stage.id] = initialOpen[b.stage.id] ?? false;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets.length]);

  const total = project.handoffs.length;

  return (
    <section
      className="rounded-2xl border bark-texture p-4 md:p-5"
      style={{ borderColor: AMBER_SOFT }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold" style={{ color: AMBER }}>
            Handoff Chain
          </h2>
          <div className="text-xs text-muted-foreground">
            Grouped by pipeline stage. Click a stage to expand its handoff cards.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() =>
              setOpenStages(Object.fromEntries(buckets.map((b) => [b.stage.id, true])))
            }
            className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground transition hover:text-foreground"
            style={{ borderColor: AMBER_SOFT }}
          >
            expand all
          </button>
          <button
            onClick={() =>
              setOpenStages(Object.fromEntries(buckets.map((b) => [b.stage.id, false])))
            }
            className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground transition hover:text-foreground"
            style={{ borderColor: AMBER_SOFT }}
          >
            collapse all
          </button>
          <button
            onClick={onAddHandoff}
            className="rounded-md border px-2 py-1 text-xs font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
            style={{ borderColor: AMBER_LINE, color: AMBER }}
          >
            + add handoff
          </button>
        </div>
      </div>

      {total === 0 ? (
        <div
          className="rounded-xl border border-dashed p-6 text-center"
          style={{ borderColor: AMBER_LINE }}
        >
          <div className="font-display text-sm" style={{ color: AMBER }}>
            No handoffs yet
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Add the first step — who does what next.
          </p>
          <button
            onClick={onAddHandoff}
            className="mt-3 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
            style={{ borderColor: AMBER_LINE, color: AMBER }}
          >
            + add handoff
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {buckets.map((bucket, stageIdx) => (
            <StageGroup
              key={bucket.stage.id}
              bucket={bucket}
              stageNumber={stageIdx + 1}
              open={!!openStages[bucket.stage.id]}
              onToggle={() =>
                setOpenStages((s) => ({ ...s, [bucket.stage.id]: !s[bucket.stage.id] }))
              }
              totalHandoffs={total}
              onPreviewArtifact={onPreviewArtifact}
              onEditHandoff={onEditHandoff}
              onMoveHandoff={onMoveHandoff}
              onRemoveHandoff={onRemoveHandoff}
              onChangeHandoffStatus={onChangeHandoffStatus}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function StageGroup({
  bucket,
  stageNumber,
  open,
  onToggle,
  totalHandoffs,
  onPreviewArtifact,
  onEditHandoff,
  onMoveHandoff,
  onRemoveHandoff,
  onChangeHandoffStatus,
}: {
  bucket: StageBucket;
  stageNumber: number;
  open: boolean;
  onToggle: () => void;
  totalHandoffs: number;
  onPreviewArtifact: (a: Artifact) => void;
  onEditHandoff: (h: Handoff) => void;
  onMoveHandoff: (id: string, dir: -1 | 1) => void;
  onRemoveHandoff: (id: string) => void;
  onChangeHandoffStatus: (id: string, status: HandoffStatus) => void;
}) {
  const { stage, items } = bucket;
  const count = items.length;
  const completeCount = items.filter((it) => it.handoff.status === "Complete").length;
  const blocked = items.some((it) => it.handoff.status === "Blocked");
  const allComplete = count > 0 && completeCount === count;

  const accent = blocked
    ? "oklch(0.65 0.22 25)"
    : allComplete
      ? EMERALD
      : count === 0
        ? "oklch(0.6 0.03 80)"
        : AMBER;
  const borderColor = blocked
    ? "oklch(0.65 0.22 25 / 0.45)"
    : allComplete
      ? "oklch(0.7 0.14 160 / 0.4)"
      : AMBER_LINE;

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor,
        background: count === 0 ? "oklch(0.18 0.02 60 / 0.25)" : "transparent",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-[oklch(0.3_0.03_60_/_0.25)]"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-display text-sm font-semibold"
          style={{ borderColor: accent, color: accent }}
        >
          {stageNumber}
        </span>
        {stage.bot && <BotAvatar name={stage.bot} size={40} ring={accent} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className="font-display text-base font-semibold leading-tight"
              style={{ color: accent }}
            >
              {stage.label}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {count === 0
                ? "no handoffs yet"
                : `${completeCount}/${count} complete${blocked ? " · blocked" : ""}`}
            </span>
          </div>
          <div className="truncate text-xs text-muted-foreground/85">{stage.blurb}</div>
        </div>
        <span
          aria-hidden
          className="shrink-0 text-base text-muted-foreground transition"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ›
        </span>
      </button>

      {open && (
        <div
          className="border-t p-3 md:p-4"
          style={{ borderColor: AMBER_SOFT, background: "oklch(0.15 0.02 60 / 0.35)" }}
        >
          {count === 0 ? (
            <p className="text-xs italic text-muted-foreground/70">
              No handoff has landed in this stage yet. Add one with “+ add handoff”
              and use a matching name (e.g. “{stage.label}”).
            </p>
          ) : (
            <ol className="space-y-3">
              {items.map(({ handoff: h, globalIndex }, localIdx) => (
                <li key={h.id} className="relative">
                  <HandoffCard
                    handoff={h}
                    displayStep={localIdx + 1}
                    isFirst={globalIndex === 0}
                    isLast={globalIndex === totalHandoffs - 1}
                    onMoveUp={() => onMoveHandoff(h.id, -1)}
                    onMoveDown={() => onMoveHandoff(h.id, 1)}
                    onChangeStatus={(s) => onChangeHandoffStatus(h.id, s)}
                    onRemove={() => onRemoveHandoff(h.id)}
                    onEdit={() => onEditHandoff(h)}
                    onPreview={() => {
                      if (h.artifactBody || h.artifactLink) {
                        onPreviewArtifact({
                          id: h.id,
                          title: h.artifactTitle || `${h.mode} artifact`,
                          kind: h.mode,
                          type: "other",
                          source: "Handoff",
                          body: h.artifactBody,
                          link: h.artifactLink,
                          bot: h.bot,
                          createdAt: h.completedAt ?? new Date().toISOString(),
                        });
                      }
                    }}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function HandoffCard({
  handoff,
  displayStep,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onChangeStatus,
  onRemove,
  onEdit,
  onPreview,
}: {
  handoff: Handoff;
  displayStep?: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeStatus: (s: HandoffStatus) => void;
  onRemove: () => void;
  onEdit: () => void;
  onPreview: () => void;
}) {
  const isComplete = handoff.status === "Complete";
  const isBlocked = handoff.status === "Blocked";
  const isParked = handoff.status === "Parked";

  const borderColor = isBlocked
    ? "oklch(0.65 0.22 25 / 0.55)"
    : isComplete
      ? "oklch(0.7 0.14 160 / 0.45)"
      : isParked
        ? "oklch(0.6 0.03 80 / 0.4)"
        : AMBER_LINE;
  const accentBar = isBlocked
    ? "oklch(0.65 0.22 25)"
    : isComplete
      ? EMERALD
      : isParked
        ? "oklch(0.6 0.03 80)"
        : AMBER;

  const hasArtifactPreview = !!(handoff.artifactBody || handoff.artifactLink);

  return (
    <div
      className="relative ml-0 overflow-hidden rounded-xl border"
      style={{
        borderColor,
        background: isComplete
          ? "oklch(0.7 0.14 160 / 0.05)"
          : isBlocked
            ? "oklch(0.65 0.22 25 / 0.04)"
            : "transparent",
      }}
    >
      {/* left accent bar */}
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accentBar, opacity: 0.85 }}
      />
      <div className="flex items-stretch gap-3 p-3 pl-4">
        {/* step number + reorder */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
            style={{ borderColor: accentBar, color: accentBar }}
          >
            {displayStep ?? handoff.step}
          </div>
          <BotAvatar name={handoff.bot} size={36} ring={accentBar} />
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              aria-label="move up"
              title="Move up"
              className="rounded border px-1 text-[10px] leading-none text-muted-foreground transition hover:text-foreground disabled:opacity-30"
              style={{ borderColor: AMBER_SOFT }}
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              aria-label="move down"
              title="Move down"
              className="rounded border px-1 text-[10px] leading-none text-muted-foreground transition hover:text-foreground disabled:opacity-30"
              style={{ borderColor: AMBER_SOFT }}
            >
              ▼
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {/* title row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="min-w-0 flex-1 truncate font-display text-sm font-semibold">
              {handoff.mode || <span className="italic opacity-60">untitled step</span>}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="opacity-60">owner</span>
              <span className="text-foreground">{handoff.bot || "—"}</span>
            </div>
            <StatusPill status={handoff.status} />
          </div>

          {/* assignment */}
          {handoff.assignment && (
            <LabelledBlock label="Assignment">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                {handoff.assignment}
              </p>
            </LabelledBlock>
          )}

          {/* authority boundary */}
          {handoff.authorityNotes && (
            <LabelledBlock label="Authority boundary">
              <p className="whitespace-pre-wrap text-[11px] italic leading-relaxed text-muted-foreground">
                {handoff.authorityNotes}
              </p>
            </LabelledBlock>
          )}

          {/* artifact / receipt */}
          {(handoff.receiptLink || handoff.artifactLink || handoff.artifactTitle || hasArtifactPreview) && (
            <LabelledBlock label="Artifact / receipt">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {handoff.artifactTitle && (
                  <span className="rounded-md border px-2 py-0.5 text-foreground/80"
                    style={{ borderColor: AMBER_SOFT }}>
                    📎 {handoff.artifactTitle}
                  </span>
                )}
                {handoff.receiptLink && (
                  <a href={handoff.receiptLink} target="_blank" rel="noreferrer"
                    className="rounded-md border px-2 py-0.5 transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                    style={{ borderColor: AMBER_LINE, color: AMBER }}>
                    🧾 receipt
                  </a>
                )}
                {handoff.artifactLink && (
                  <a href={handoff.artifactLink} target="_blank" rel="noreferrer"
                    className="rounded-md border px-2 py-0.5 transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                    style={{ borderColor: AMBER_LINE, color: AMBER }}>
                    🔗 link
                  </a>
                )}
                {hasArtifactPreview && (
                  <button
                    onClick={onPreview}
                    className="rounded-md border px-2 py-0.5 transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                    style={{ borderColor: AMBER_LINE, color: AMBER }}
                  >
                    preview
                  </button>
                )}
              </div>
            </LabelledBlock>
          )}

          {/* next step */}
          {(handoff.nextBot || handoff.nextStep) && (
            <LabelledBlock label="Next step">
              <div
                className="rounded-md border px-2 py-1 text-xs"
                style={{
                  borderColor: isComplete ? EMERALD : AMBER_SOFT,
                  background: isComplete
                    ? "oklch(0.7 0.14 160 / 0.08)"
                    : "oklch(0.78 0.18 50 / 0.04)",
                  color: isComplete ? EMERALD : "inherit",
                }}
              >
                → <strong>{handoff.nextStep || "—"}</strong>
                {handoff.nextBot && <> by <strong>{handoff.nextBot}</strong></>}
              </div>
            </LabelledBlock>
          )}

          {/* footer: status select + meta + actions */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11px] text-muted-foreground/80"
            style={{ borderColor: AMBER_SOFT }}>
            <div className="flex items-center gap-2">
              <select
                value={handoff.status}
                onChange={(e) => onChangeStatus(e.target.value as HandoffStatus)}
                className="rounded-md border bg-[oklch(0.15_0.02_60_/_0.5)] px-1.5 py-0.5 text-[11px]"
                style={{ borderColor: AMBER_SOFT }}
                aria-label="change status"
              >
                {HANDOFF_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-[oklch(0.18_0.02_60)]">
                    {s}
                  </option>
                ))}
              </select>
              <span>
                {handoff.completedAt
                  ? `completed ${fmtTime(handoff.completedAt)}`
                  : "in flight"}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={onEdit}
                className="rounded-md border px-2 py-0.5 text-[11px] transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                style={{ borderColor: AMBER_LINE, color: AMBER }}
                title="Edit handoff"
              >
                ✎ edit
              </button>
              <button
                onClick={onRemove}
                className="rounded-md border px-2 py-0.5 text-[11px] text-muted-foreground/70 transition hover:text-foreground"
                style={{ borderColor: AMBER_SOFT }}
                title="Remove handoff"
                aria-label="remove handoff"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabelledBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5">
      <div className="mb-0.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
        {label}
      </div>
      {children}
    </div>
  );
}

// ---------- Artifact grid ----------
function ArtifactGrid({
  project,
  onPreview,
  onAdd,
  onEdit,
  onRemove,
}: {
  project: Project;
  onPreview: (a: Artifact) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  // Combine standalone artifacts + handoff artifacts
  const handoffArtifacts: Artifact[] = project.handoffs
    .filter((h) => h.artifactBody || h.artifactLink)
    .map((h) => ({
      id: `h-${h.id}`,
      title: h.artifactTitle || `${h.mode} artifact`,
      kind: h.mode,
      type: "other",
      source: "Handoff",
      body: h.artifactBody,
      link: h.artifactLink,
      bot: h.bot,
      createdAt: h.completedAt ?? new Date().toISOString(),
    }));

  const all = [...project.artifacts, ...handoffArtifacts];

  return (
    <section
      className="rounded-2xl border bark-texture p-4 md:p-5"
      style={{ borderColor: AMBER_SOFT }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold" style={{ color: AMBER }}>
            Bot Work · Artifacts
          </h2>
          <div className="text-xs text-muted-foreground">
            Every completed bot output. Click to preview, ✎ to edit metadata.
          </div>
        </div>
        <button
          onClick={onAdd}
          className="rounded-md border px-2 py-1 text-xs font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
          style={{ borderColor: AMBER_LINE, color: AMBER }}
        >
          + add artifact
        </button>
      </div>
      {all.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-6 text-center"
          style={{ borderColor: AMBER_LINE }}
        >
          <div className="font-display text-sm" style={{ color: AMBER }}>
            No artifacts yet
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Artifacts appear here when bots return work. Add one manually with the button above.
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((a) => {
            const isHandoff = a.id.startsWith("h-");
            return (
              <div
                key={a.id}
                className="group relative rounded-xl border bg-transparent px-3 py-2 text-left transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                style={{ borderColor: AMBER_SOFT }}
              >
                <button onClick={() => onPreview(a)} className="block w-full text-left">
                  <div className="truncate pr-12 font-display text-sm font-semibold">
                    {a.title}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px]">
                    <span className="rounded border px-1.5 py-0.5" style={{ borderColor: AMBER_LINE, color: AMBER }}>
                      {a.type ?? "other"}
                    </span>
                    <span className="rounded border px-1.5 py-0.5 text-muted-foreground" style={{ borderColor: AMBER_SOFT }}>
                      {a.source ?? (isHandoff ? "Handoff" : "Manual")}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {a.body || a.link || "—"}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground/70">
                    {a.bot} · {fmtTime(a.updatedAt ?? a.createdAt)}
                  </div>
                </button>
                {!isHandoff && (
                  <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => onEdit(a.id)}
                      className="rounded border px-1.5 py-0.5 text-[10px]"
                      style={{ borderColor: AMBER_LINE, color: AMBER }}
                      aria-label="edit artifact"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => onRemove(a.id)}
                      className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                      style={{ borderColor: AMBER_SOFT }}
                      aria-label="remove artifact"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------- Activity ----------
function ActivityLog({ project }: { project: Project }) {
  const sorted = [...project.activity].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <section
      className="rounded-2xl border bark-texture p-4 md:p-5"
      style={{ borderColor: AMBER_SOFT }}
    >
      <h2 className="mb-3 font-display text-lg font-semibold" style={{ color: AMBER }}>
        Activity · Receipts
      </h2>
      {sorted.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nothing yet.</div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-md border px-3 py-2 text-xs"
              style={{ borderColor: AMBER_SOFT }}
            >
              <div className="w-28 shrink-0 text-muted-foreground/80">{fmtTime(e.at)}</div>
              <div className="min-w-0 flex-1">
                <div>
                  <strong>{e.bot}</strong> {e.action}
                </div>
                {e.blocker && (
                  <div className="mt-0.5" style={{ color: "oklch(0.78 0.18 25)" }}>
                    ⚠ {e.blocker}
                  </div>
                )}
                {e.receipt && (
                  <div className="mt-0.5 truncate" style={{ color: AMBER }}>
                    receipt: {e.receipt}
                  </div>
                )}
              </div>
              {e.status && <StatusPill status={e.status} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- Artifact preview drawer ----------
function ArtifactPreview({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        onClick={onClose}
        aria-label="close"
        className="absolute inset-0 bg-[oklch(0.08_0.02_60_/_0.75)] backdrop-blur-sm animate-fade-in"
      />
      <div
        className="relative ml-auto h-full w-full max-w-lg overflow-y-auto border-l bark-texture p-5 animate-fade-up"
        style={{ borderColor: AMBER, animationDuration: "0.2s" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded border px-1.5 py-0.5 text-[10px]" style={{ borderColor: AMBER_LINE, color: AMBER }}>
                {artifact.type ?? "other"}
              </span>
              <span className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground" style={{ borderColor: AMBER_SOFT }}>
                source: {artifact.source ?? "Manual"}
              </span>
              {artifact.kind && (
                <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: AMBER }}>
                  · {artifact.kind}
                </span>
              )}
            </div>
            <h3 className="font-display text-xl font-semibold">{artifact.title}</h3>
            <div className="text-xs text-muted-foreground">
              by {artifact.bot} · created {fmtTime(artifact.createdAt)}
              {artifact.updatedAt && artifact.updatedAt !== artifact.createdAt && (
                <> · updated {fmtTime(artifact.updatedAt)}</>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition hover:text-foreground"
            style={{ borderColor: AMBER_SOFT }}
          >
            ✕
          </button>
        </div>

        {artifact.link && (
          <a
            href={artifact.link}
            target="_blank"
            rel="noreferrer"
            className="mb-3 block truncate rounded-md border px-3 py-2 text-sm transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
            style={{ borderColor: AMBER_LINE, color: AMBER }}
          >
            🔗 {artifact.link}
          </a>
        )}
        {artifact.body && (
          <pre
            className="whitespace-pre-wrap rounded-md border p-3 text-sm leading-relaxed"
            style={{ borderColor: AMBER_SOFT, fontFamily: "inherit" }}
          >
            {artifact.body}
          </pre>
        )}
        {!artifact.body && !artifact.link && (
          <div className="text-sm text-muted-foreground">No content yet.</div>
        )}
      </div>
    </div>
  );
}

// ---------- Modal shell ----------
function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = "md",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  width?: "md" | "lg";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 md:items-center md:p-6">
      <button
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.08_0.02_60_/_0.75)] backdrop-blur-sm animate-fade-in"
      />
      <div
        className={
          "relative my-auto w-full rounded-2xl border bark-texture p-5 md:p-6 shadow-xl animate-fade-up " +
          (width === "lg" ? "max-w-2xl" : "max-w-xl")
        }
        style={{ borderColor: AMBER, animationDuration: "0.2s" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold" style={{ color: AMBER }}>
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition hover:text-foreground"
            style={{ borderColor: AMBER_SOFT }}
            aria-label="close"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t pt-4" style={{ borderColor: AMBER_SOFT }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

function ModalInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, style, ...rest } = props;
  return (
    <input
      {...rest}
      className={
        "w-full rounded-md border bg-[oklch(0.15_0.02_60_/_0.4)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.78_0.18_50)] " +
        (className ?? "")
      }
      style={{ borderColor: AMBER_SOFT, ...style }}
    />
  );
}

function ModalTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, style, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={
        "w-full rounded-md border bg-[oklch(0.15_0.02_60_/_0.4)] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[oklch(0.78_0.18_50)] " +
        (className ?? "")
      }
      style={{ borderColor: AMBER_SOFT, ...style }}
    />
  );
}

function ModalSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, style, children, ...rest } = props;
  return (
    <select
      {...rest}
      className={
        "w-full rounded-md border bg-[oklch(0.15_0.02_60_/_0.6)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.78_0.18_50)] " +
        (className ?? "")
      }
      style={{ borderColor: AMBER_SOFT, ...style }}
    >
      {children}
    </select>
  );
}

function ModalLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
      {children}
    </div>
  );
}

function ModalButton({
  variant = "primary",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      {...props}
      className={
        "rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)] disabled:opacity-50"
      }
      style={{
        borderColor: isPrimary ? AMBER : AMBER_SOFT,
        color: isPrimary ? AMBER : "inherit",
        background: isPrimary ? "oklch(0.78 0.18 50 / 0.12)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

// ---------- Project settings modal (create + edit) ----------
function ProjectSettingsModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initial?: Project;
  onClose: () => void;
  onSave: (input: ProjectSettingsInput, fromPipeline?: boolean) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? "Draft");
  // Allow "Unclassified" (stored as undefined). Treat empty-string as the
  // Unclassified sentinel inside the modal state.
  const [projectType, setProjectType] = useState<ProjectType | "">(
    initial?.projectType ?? "",
  );
  const [projectTypeCustom, setProjectTypeCustom] = useState(
    initial?.projectTypeCustom ?? "",
  );
  const [currentMode, setCurrentMode] = useState(initial?.currentMode ?? "Mode 0 / Raw Idea");
  const [currentBot, setCurrentBot] = useState(initial?.currentBot ?? "Boss");
  const [nextAction, setNextAction] = useState(
    initial?.nextAction ?? "Fill Mode 0 / Raw Idea",
  );
  const [blocker, setBlocker] = useState(initial?.blocker ?? "");

  const canSave = name.trim().length > 0;

  return (
    <ModalShell
      title={mode === "create" ? "New project" : "Project settings"}
      subtitle={
        mode === "create"
          ? "Start blank, or use the DaBotTree Project Pipeline to seed the full Boss → Echo stage chain."
          : "Edit project name, summary, status, mode, owner, next action, and blocker."
      }
      onClose={onClose}
      footer={
        <>
          <ModalButton variant="ghost" onClick={onClose}>
            cancel
          </ModalButton>
          {mode === "create" && (
            <ModalButton
              disabled={!canSave}
              onClick={() =>
                onSave(
                  {
                    name,
                    summary,
                    status,
                    projectType: (projectType || "App / Software") as ProjectType,
                    projectTypeCustom,
                    currentMode,
                    currentBot,
                    nextAction,
                    blocker,
                  },
                  true,
                )
              }
            >
              create from DaBotTree Pipeline
            </ModalButton>
          )}
          <ModalButton
            disabled={!canSave}
            onClick={() =>
              onSave({
                name,
                summary,
                status,
                projectType: projectType || undefined,
                projectTypeCustom,
                currentMode,
                currentBot,
                nextAction,
                blocker,
              })
            }
          >
            {mode === "create" ? "create blank" : "save changes"}
          </ModalButton>
        </>
      }
    >
      <div>
        <ModalLabel>Project name</ModalLabel>
        <ModalInput
          value={name}
          autoFocus
          placeholder="Bot Card Studio"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <ModalLabel>Short summary</ModalLabel>
        <ModalTextarea
          value={summary}
          rows={2}
          placeholder="One sentence — what is this and who is it for?"
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <ModalLabel>Project type</ModalLabel>
          <ModalSelect
            value={projectType}
            onChange={(e) => setProjectType(e.target.value as ProjectType | "")}
          >
            <option value="" className="bg-[oklch(0.18_0.02_60)]">
              Unclassified
            </option>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t} className="bg-[oklch(0.18_0.02_60)]">
                {t}
              </option>
            ))}
          </ModalSelect>
        </div>
        {projectType === "Other / Custom" && (
          <div>
            <ModalLabel>Custom project type</ModalLabel>
            <ModalInput
              value={projectTypeCustom}
              placeholder="e.g. Live event, Workshop, Course…"
              onChange={(e) => setProjectTypeCustom(e.target.value)}
            />
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <ModalLabel>Status</ModalLabel>
          <ModalSelect value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-[oklch(0.18_0.02_60)]">
                {s}
              </option>
            ))}
          </ModalSelect>
        </div>
        <div>
          <ModalLabel>Current mode</ModalLabel>
          <ModalInput value={currentMode} onChange={(e) => setCurrentMode(e.target.value)} />
        </div>
        <div>
          <ModalLabel>Current owner / bot</ModalLabel>
          <ModalInput value={currentBot} onChange={(e) => setCurrentBot(e.target.value)} />
        </div>
        <div>
          <ModalLabel>Next action</ModalLabel>
          <ModalInput value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
        </div>
      </div>
      <div>
        <ModalLabel>Blocker (optional)</ModalLabel>
        <ModalTextarea
          value={blocker}
          rows={2}
          placeholder="What's in the way? Leave blank if nothing."
          onChange={(e) => setBlocker(e.target.value)}
        />
      </div>
    </ModalShell>
  );
}

// ---------- Handoff editor modal ----------
function HandoffEditorModal({
  initial,
  isNew,
  onClose,
  onSave,
}: {
  initial: Handoff;
  isNew: boolean;
  onClose: () => void;
  onSave: (h: Handoff) => void;
}) {
  const [mode, setMode] = useState(initial.mode);
  const [bot, setBot] = useState(initial.bot);
  const [assignment, setAssignment] = useState(initial.assignment);
  const [status, setStatus] = useState<HandoffStatus>(initial.status);
  const [receiptLink, setReceiptLink] = useState(initial.receiptLink ?? "");
  const [artifactLink, setArtifactLink] = useState(initial.artifactLink ?? "");
  const [artifactTitle, setArtifactTitle] = useState(initial.artifactTitle ?? "");
  const [artifactBody, setArtifactBody] = useState(initial.artifactBody ?? "");
  const [nextBot, setNextBot] = useState(initial.nextBot ?? "");
  const [nextStep, setNextStep] = useState(initial.nextStep ?? "");
  const [authorityNotes, setAuthorityNotes] = useState(initial.authorityNotes ?? "");

  function save() {
    const completedAt =
      status === "Complete"
        ? initial.completedAt ?? new Date().toISOString()
        : undefined;
    onSave({
      ...initial,
      mode: mode.trim(),
      bot: bot.trim(),
      assignment,
      status,
      receiptLink: receiptLink.trim() || undefined,
      artifactLink: artifactLink.trim() || undefined,
      artifactTitle: artifactTitle.trim() || undefined,
      artifactBody: artifactBody.trim() || undefined,
      nextBot: nextBot.trim() || undefined,
      nextStep: nextStep.trim() || undefined,
      authorityNotes: authorityNotes.trim() || undefined,
      completedAt,
    });
  }

  return (
    <ModalShell
      title={isNew ? "New handoff" : `Edit step ${initial.step}`}
      subtitle="Who's doing what, and what they're handing back."
      onClose={onClose}
      width="lg"
      footer={
        <>
          <ModalButton variant="ghost" onClick={onClose}>
            cancel
          </ModalButton>
          <ModalButton onClick={save}>{isNew ? "add handoff" : "save changes"}</ModalButton>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ModalLabel>Step name / mode</ModalLabel>
          <ModalInput
            value={mode}
            autoFocus
            placeholder="e.g. Memory alignment"
            onChange={(e) => setMode(e.target.value)}
          />
        </div>
        <div>
          <ModalLabel>Assigned bot</ModalLabel>
          <ModalInput value={bot} placeholder="Echo" onChange={(e) => setBot(e.target.value)} />
        </div>
        <div>
          <ModalLabel>Status</ModalLabel>
          <ModalSelect value={status} onChange={(e) => setStatus(e.target.value as HandoffStatus)}>
            {HANDOFF_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-[oklch(0.18_0.02_60)]">
                {s}
              </option>
            ))}
          </ModalSelect>
        </div>
      </div>
      <div>
        <ModalLabel>Assignment</ModalLabel>
        <ModalTextarea
          value={assignment}
          rows={3}
          placeholder="What is this bot expected to do?"
          onChange={(e) => setAssignment(e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <ModalLabel>Receipt / report link</ModalLabel>
          <ModalInput
            value={receiptLink}
            placeholder="https://…"
            onChange={(e) => setReceiptLink(e.target.value)}
          />
        </div>
        <div>
          <ModalLabel>Artifact link</ModalLabel>
          <ModalInput
            value={artifactLink}
            placeholder="https://…"
            onChange={(e) => setArtifactLink(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <ModalLabel>Artifact title</ModalLabel>
          <ModalInput
            value={artifactTitle}
            placeholder="e.g. Master prompt v1"
            onChange={(e) => setArtifactTitle(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <ModalLabel>Artifact text</ModalLabel>
          <ModalTextarea
            value={artifactBody}
            rows={5}
            placeholder="Paste the bot's output here…"
            onChange={(e) => setArtifactBody(e.target.value)}
          />
        </div>
        <div>
          <ModalLabel>Next bot</ModalLabel>
          <ModalInput
            value={nextBot}
            placeholder="Tinker"
            onChange={(e) => setNextBot(e.target.value)}
          />
        </div>
        <div>
          <ModalLabel>Next step</ModalLabel>
          <ModalInput
            value={nextStep}
            placeholder="Prototype"
            onChange={(e) => setNextStep(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <ModalLabel>Authority boundary notes</ModalLabel>
          <ModalTextarea
            value={authorityNotes}
            rows={2}
            placeholder="What can this bot decide / not decide at this stage?"
            onChange={(e) => setAuthorityNotes(e.target.value)}
          />
        </div>
      </div>
    </ModalShell>
  );
}

// ---------- Artifact editor modal ----------
function ArtifactEditorModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Artifact;
  onClose: () => void;
  onSave: (a: Artifact) => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [type, setType] = useState<ArtifactType>(initial.type ?? "other");
  const [source, setSource] = useState<ArtifactSource>(initial.source ?? "Manual");
  const [bot, setBot] = useState(initial.bot);
  const [link, setLink] = useState(initial.link ?? "");
  const [body, setBody] = useState(initial.body ?? "");
  const [kind, setKind] = useState(initial.kind ?? "");

  return (
    <ModalShell
      title="Edit artifact"
      subtitle="Strengthen the metadata so it's findable later."
      onClose={onClose}
      width="lg"
      footer={
        <>
          <ModalButton variant="ghost" onClick={onClose}>cancel</ModalButton>
          <ModalButton
            onClick={() =>
              onSave({
                ...initial,
                title: title.trim() || "Untitled artifact",
                type,
                source,
                bot: bot.trim() || "—",
                link: link.trim() || undefined,
                body: body.trim() || undefined,
                kind: kind.trim() || type,
              })
            }
          >
            save changes
          </ModalButton>
        </>
      }
    >
      <div>
        <ModalLabel>Title</ModalLabel>
        <ModalInput value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <ModalLabel>Type</ModalLabel>
          <ModalSelect value={type} onChange={(e) => setType(e.target.value as ArtifactType)}>
            {ARTIFACT_TYPES.map((t) => (
              <option key={t} value={t} className="bg-[oklch(0.18_0.02_60)]">{t}</option>
            ))}
          </ModalSelect>
        </div>
        <div>
          <ModalLabel>Source</ModalLabel>
          <ModalSelect value={source} onChange={(e) => setSource(e.target.value as ArtifactSource)}>
            {ARTIFACT_SOURCES.map((s) => (
              <option key={s} value={s} className="bg-[oklch(0.18_0.02_60)]">{s}</option>
            ))}
          </ModalSelect>
        </div>
        <div>
          <ModalLabel>Owner / bot</ModalLabel>
          <ModalInput value={bot} onChange={(e) => setBot(e.target.value)} />
        </div>
        <div>
          <ModalLabel>Label (free text)</ModalLabel>
          <ModalInput value={kind} placeholder="e.g. master prompt" onChange={(e) => setKind(e.target.value)} />
        </div>
      </div>
      <div>
        <ModalLabel>Link</ModalLabel>
        <ModalInput value={link} placeholder="https://…" onChange={(e) => setLink(e.target.value)} />
      </div>
      <div>
        <ModalLabel>Body / pasted text</ModalLabel>
        <ModalTextarea value={body} rows={6} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="text-[11px] text-muted-foreground/70">
        created {fmtTime(initial.createdAt)}
        {initial.updatedAt && initial.updatedAt !== initial.createdAt && (
          <> · last updated {fmtTime(initial.updatedAt)}</>
        )}
      </div>
    </ModalShell>
  );
}