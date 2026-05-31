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
} from "@/components/project-board/types";
import {
  ARTIFACT_TYPES,
  ARTIFACT_SOURCES,
  PROJECT_STATUSES,
  HANDOFF_STATUSES,
} from "@/components/project-board/types";
import { SEED_PROJECTS } from "@/components/project-board/seed";
import {
  DABOTTREE_PIPELINE,
  DABOTTREE_PIPELINE_NAME,
  createPipelineHandoffs,
  activeHandoff,
} from "@/components/project-board/pipeline";
import { botImageFor, botInitials } from "@/components/project-board/bot-avatars";

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
const SCHEMA_VERSION = 2; // bump when adding new seeded projects / migrations
const DABOTTREE_BOARD_ID = "dabottree-project-board";

type ProjectSettingsInput = {
  name: string;
  summary: string;
  status: ProjectStatus;
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

  try {
    localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
  } catch {
    /* ignore */
  }
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

  // Load from localStorage after mount.
  useEffect(() => {
    const stored = loadProjects();
    const { projects: migrated } = migrateProjects(stored);
    setProjects(migrated);
    setSelectedId(migrated[0]?.id ?? "");
    setHydrated(true);
  }, []);

  // Persist only after hydration so we never overwrite stored data with seed.
  useEffect(() => {
    if (hydrated) saveProjects(projects);
  }, [projects, hydrated]);

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? projects[0] ?? null,
    [projects, selectedId],
  );

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.status, p.currentBot, p.currentMode, p.summary]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
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
        if (input.currentMode !== p.currentMode) changed.push("mode");
        if (input.currentBot !== p.currentBot) changed.push("owner");
        if (input.nextAction !== p.nextAction) changed.push("next action");
        if ((input.blocker.trim() || undefined) !== p.blocker) changed.push("blocker");
        const next: Project = {
          ...p,
          name: input.name.trim() || p.name,
          summary: input.summary,
          status: input.status,
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
    const pipelineHandoffs = fromPipeline ? createPipelineHandoffs(uid) : [];
    const fresh: Project = {
      id,
      name: input.name.trim() || "Untitled Project",
      summary: input.summary,
      status: input.status,
      currentMode: fromPipeline
        ? DABOTTREE_PIPELINE[0].stage
        : input.currentMode || "Mode 0 / Clarity",
      currentBot: fromPipeline
        ? DABOTTREE_PIPELINE[0].bot
        : input.currentBot || "Boss",
      nextAction: input.nextAction,
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
      if (isNew) {
        return logActivity(next, {
          bot: h.bot || p.currentBot,
          action: `added handoff "${h.mode || "untitled"}"`,
          status: h.status,
        });
      }
      const events: string[] = [];
      if (prev && prev.status !== h.status) events.push(`status → ${h.status}`);
      events.push("edited");
      return logActivity(next, {
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
        completedAt:
          status === "Complete" ? h.completedAt ?? new Date().toISOString() : h.completedAt,
      };
      const next = { ...p, handoffs: p.handoffs.map((x) => (x.id === id ? updated : x)) };
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
                onClick={() => setShowNewProject(true)}
                className="rounded-md border px-2 py-1 text-xs font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                style={{ borderColor: AMBER_LINE, color: AMBER }}
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
                        {p.currentMode} · {p.currentBot}
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

          {/* RIGHT — status strip */}
          {selected && <StatusPanel project={selected} onChange={updateSelected} />}
        </div>
      </div>

      {previewArtifact && (
        <ArtifactPreview artifact={previewArtifact} onClose={() => setPreviewArtifact(null)} />
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
  const active = activeHandoff(project.handoffs);
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
          {active ? `${active.step}. ${active.mode || "untitled"}` : project.currentMode || "—"}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          owner <span className="text-foreground">{active?.bot || project.currentBot || "—"}</span>
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
}) {
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
        <CurrentStageIndicator project={project} />
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-3 text-[11px]" style={{ borderColor: AMBER_SOFT }}>
          <MetaItem label="Mode" value={project.currentMode} />
          <MetaItem label="Owner" value={project.currentBot} />
          <MetaItem label="Updated" value={fmtTime(project.updatedAt)} muted />
        </div>
      </div>

      {/* Mode 0 */}
      <Section title="Mode 0 · Clarity" subtitle="Boss writes what they want in plain language.">
        <textarea
          value={project.clarity}
          onChange={(e) => onChange((p) => ({ ...p, clarity: e.target.value }))}
          rows={6}
          placeholder="What are we building? Who is it for? What does done look like?"
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm leading-relaxed"
          style={{ borderColor: AMBER_SOFT }}
        />
        <SectionMeta updatedAt={project.updatedAt} who="Boss" />
      </Section>

      {/* Mode 1 */}
      <Section title="Mode 1 · Shape" subtitle="First refinement step.">
        <Field label="Structured notes">
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
        <SectionMeta updatedAt={project.updatedAt} />
      </Section>

      {/* Mode 2 */}
      <Section title="Mode 2 · Plan" subtitle="Deeper project planning.">
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
      </Section>

      {/* Handoffs */}
      <HandoffChain
        project={project}
        onChange={onChange}
        onPreviewArtifact={onPreviewArtifact}
        onAddHandoff={onAddHandoff}
        onEditHandoff={onEditHandoff}
        onMoveHandoff={onMoveHandoff}
        onRemoveHandoff={onRemoveHandoff}
        onChangeHandoffStatus={onChangeHandoffStatus}
      />

      {/* Artifacts */}
      <ArtifactGrid
        project={project}
        onPreview={onPreviewArtifact}
        onAdd={onAddArtifact}
        onEdit={onEditArtifact}
        onRemove={onRemoveArtifact}
      />

      {/* Activity */}
      <ActivityLog project={project} />
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

function CurrentStageIndicator({ project }: { project: Project }) {
  const active = activeHandoff(project.handoffs);
  const hasBlocker = !!project.blocker || active?.status === "Blocked";
  const accent = hasBlocker ? "oklch(0.65 0.22 25)" : AMBER;
  const nextAction = project.nextAction?.trim();

  if (!active && !nextAction && !hasBlocker) return null;

  return (
    <div
      className="mt-4 rounded-xl border p-3"
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
            {active.step}. {active.mode || "untitled stage"}
          </span>
          <span className="text-xs text-muted-foreground">
            owner <strong className="text-foreground">{active.bot || "—"}</strong>
          </span>
          <StatusPill status={active.status} />
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
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border bark-texture p-4 md:p-5"
      style={{ borderColor: AMBER_SOFT }}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold" style={{ color: AMBER }}>
            {title}
          </h2>
          {subtitle && (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
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
  return (
    <section
      className="rounded-2xl border bark-texture p-4 md:p-5"
      style={{ borderColor: AMBER_SOFT }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold" style={{ color: AMBER }}>
            Handoff Chain
          </h2>
          <div className="text-xs text-muted-foreground">
            One card per step. Reorder with ↑↓, edit details with edit.
          </div>
        </div>
        <button
          onClick={onAddHandoff}
          className="rounded-md border px-2 py-1 text-xs font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
          style={{ borderColor: AMBER_LINE, color: AMBER }}
        >
          + add handoff
        </button>
      </div>

      {project.handoffs.length === 0 ? (
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
      <ol className="space-y-3">
        {project.handoffs.map((h, idx) => (
          <li key={h.id} className="relative">
            {idx < project.handoffs.length - 1 && (
              <div
                className="absolute left-4 top-12 h-[calc(100%-1rem)] w-px"
                style={{ background: AMBER_LINE }}
              />
            )}
            <HandoffCard
              handoff={h}
              isFirst={idx === 0}
              isLast={idx === project.handoffs.length - 1}
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
    </section>
  );
}

function HandoffCard({
  handoff,
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
            {handoff.step}
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
  const [currentMode, setCurrentMode] = useState(initial?.currentMode ?? "Mode 0 / Clarity");
  const [currentBot, setCurrentBot] = useState(initial?.currentBot ?? "Boss");
  const [nextAction, setNextAction] = useState(
    initial?.nextAction ?? "Boss writes the clarity brief",
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
                  { name, summary, status, currentMode, currentBot, nextAction, blocker },
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
              onSave({ name, summary, status, currentMode, currentBot, nextAction, blocker })
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
        : initial.completedAt;
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