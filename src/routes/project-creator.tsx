import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type {
  Project,
  Handoff,
  HandoffStatus,
  ProjectStatus,
  Artifact,
} from "@/components/project-board/types";
import { SEED_PROJECTS } from "@/components/project-board/seed";

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
    Complete: "oklch(0.7 0.14 160)",
    "Not Started": "oklch(0.65 0.04 80)",
    Sent: "oklch(0.72 0.13 230)",
    Working: AMBER,
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
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [selectedId, setSelectedId] = useState<string>(
    () => loadProjects()[0]?.id ?? "",
  );
  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingHandoff, setEditingHandoff] = useState<{
    handoff: Handoff;
    isNew: boolean;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? projects[0] ?? null,
    [projects, selectedId],
  );

  function updateSelected(mut: (p: Project) => Project) {
    if (!selected) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === selected.id ? { ...mut(p), updatedAt: new Date().toISOString() } : p)),
    );
  }

  function createProject(input: {
    name: string;
    summary: string;
    status: ProjectStatus;
    currentMode: string;
    currentBot: string;
    nextAction: string;
    blocker: string;
  }) {
    const id = uid();
    const now = new Date().toISOString();
    const fresh: Project = {
      id,
      name: input.name.trim() || "Untitled Project",
      summary: input.summary,
      status: input.status,
      currentMode: input.currentMode || "Mode 0 / Clarity",
      currentBot: input.currentBot || "Boss",
      nextAction: input.nextAction,
      blocker: input.blocker.trim() || undefined,
      updatedAt: now,
      clarity: "",
      shapeNotes: "",
      shapeBotOutput: "",
      planNotes: "",
      planBotOutput: "",
      handoffs: [],
      artifacts: [],
      activity: [
        { id: uid(), at: now, bot: input.currentBot || "Boss", action: "opened project", status: input.status },
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
        // Basic shape check
        for (const p of parsed) {
          if (typeof p?.id !== "string" || typeof p?.name !== "string") {
            throw new Error("Project entries missing id/name");
          }
        }
        setProjects(parsed as Project[]);
        setSelectedId((parsed[0] as Project)?.id ?? "");
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
    updateSelected((p) => ({
      ...p,
      handoffs: isNew
        ? [...p.handoffs, h]
        : p.handoffs.map((x) => (x.id === h.id ? h : x)),
    }));
    setEditingHandoff(null);
  }

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
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <span className="transition group-hover:-translate-x-0.5">←</span>
              <span className="font-hand text-base">back to the lobby</span>
            </Link>
            <span className="opacity-30">·</span>
            <div className="font-hand text-sm" style={{ color: AMBER }}>
              the operations room
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportJSON}
              className="rounded-md border px-2 py-1 text-xs font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
              style={{ borderColor: AMBER_LINE, color: AMBER }}
              title="Export all projects as JSON"
            >
              ↓ export
            </button>
            <label
              className="cursor-pointer rounded-md border px-2 py-1 text-xs font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
              style={{ borderColor: AMBER_LINE, color: AMBER }}
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
            <h1
              className="ml-2 font-display text-xl md:text-2xl font-semibold"
              style={{ color: AMBER }}
            >
              DaBotTree Project Board
            </h1>
          </div>
        </header>

        <div className="mb-5 flex max-w-3xl items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Create and track projects from first idea through bot handoffs and finished artifacts.
          </p>
          {importError && (
            <div
              className="rounded-md border px-2 py-1 text-xs"
              style={{
                borderColor: "oklch(0.65 0.22 25 / 0.5)",
                background: "oklch(0.65 0.22 25 / 0.1)",
                color: "oklch(0.85 0.12 25)",
              }}
            >
              import failed: {importError}
            </div>
          )}
        </div>

        {/* 3-column layout */}
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          {/* LEFT — project list */}
          <aside
            className="rounded-2xl border bark-texture p-3 lg:sticky lg:top-3 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
            style={{ borderColor: AMBER_SOFT }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                Projects
              </div>
              <button
                onClick={() => setShowNewProject(true)}
                className="rounded-md border px-2 py-1 text-xs font-medium transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                style={{ borderColor: AMBER_LINE, color: AMBER }}
              >
                + new
              </button>
            </div>
            <ul className="space-y-1.5">
              {projects.map((p) => {
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
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={createProject}
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

  return (
    <aside
      className="rounded-2xl border bark-texture p-4 lg:sticky lg:top-3 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
      style={{ borderColor: AMBER_SOFT }}
    >
      <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
        Live status
      </div>

      <div className="space-y-3">
        <Field label="Status">
          <select
            value={project.status}
            onChange={(e) =>
              onChange((p) => ({ ...p, status: e.target.value as ProjectStatus }))
            }
            className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: AMBER_SOFT }}
          >
            {(["Draft", "Active", "Waiting", "Blocked", "Complete"] as ProjectStatus[]).map(
              (s) => (
                <option key={s} value={s} className="bg-[oklch(0.18_0.02_60)]">
                  {s}
                </option>
              ),
            )}
          </select>
        </Field>

        <Field label="Current owner / bot">
          <input
            value={project.currentBot}
            onChange={(e) => onChange((p) => ({ ...p, currentBot: e.target.value }))}
            className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: AMBER_SOFT }}
          />
        </Field>

        <Field label="Current mode / step">
          <input
            value={project.currentMode}
            onChange={(e) => onChange((p) => ({ ...p, currentMode: e.target.value }))}
            className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: AMBER_SOFT }}
          />
        </Field>

        <Field label="Next action">
          <textarea
            value={project.nextAction}
            onChange={(e) => onChange((p) => ({ ...p, nextAction: e.target.value }))}
            rows={2}
            className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: AMBER_SOFT }}
          />
        </Field>

        <Field label="Blocker">
          <textarea
            value={project.blocker ?? ""}
            placeholder="None"
            onChange={(e) =>
              onChange((p) => ({ ...p, blocker: e.target.value || undefined }))
            }
            rows={2}
            className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm"
            style={{
              borderColor: project.blocker ? "oklch(0.65 0.22 25)" : AMBER_SOFT,
            }}
          />
          {project.blocker && (
            <div
              className="mt-1 rounded-md border px-2 py-1 text-[11px]"
              style={{
                borderColor: "oklch(0.65 0.22 25 / 0.5)",
                background: "oklch(0.65 0.22 25 / 0.1)",
                color: "oklch(0.85 0.12 25)",
              }}
            >
              ⚠ {project.blocker}
            </div>
          )}
        </Field>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
            Latest receipt
          </div>
          {latestReceipt ? (
            <div
              className="rounded-md border px-2 py-2 text-xs"
              style={{ borderColor: AMBER_SOFT }}
            >
              <div className="font-medium">{latestReceipt.mode}</div>
              <div className="text-muted-foreground">
                by {latestReceipt.bot} · {latestReceipt.completedAt && fmtTime(latestReceipt.completedAt)}
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
}: {
  project: Project;
  onChange: (mut: (p: Project) => Project) => void;
  onPreviewArtifact: (a: Artifact) => void;
  onAddHandoff: () => void;
  onEditHandoff: (h: Handoff) => void;
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
            <input
              value={project.name}
              onChange={(e) => onChange((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-transparent font-display text-2xl font-semibold leading-tight outline-none md:text-3xl"
              style={{ color: AMBER }}
            />
            <textarea
              value={project.summary}
              placeholder="Short summary…"
              onChange={(e) => onChange((p) => ({ ...p, summary: e.target.value }))}
              rows={1}
              className="mt-1 w-full resize-none bg-transparent text-sm text-muted-foreground outline-none"
            />
          </div>
          <StatusPill status={project.status} />
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <Tag label="Mode" value={project.currentMode} />
          <Tag label="Owner" value={project.currentBot} />
          <Tag label="Next" value={project.nextAction} />
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
      />

      {/* Artifacts */}
      <ArtifactGrid project={project} onChange={onChange} onPreview={onPreviewArtifact} />

      {/* Activity */}
      <ActivityLog project={project} />
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-md border px-2 py-1.5"
      style={{ borderColor: AMBER_SOFT }}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </div>
      <div className="truncate text-sm">{value || "—"}</div>
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
  onChange,
  onPreviewArtifact,
  onAddHandoff,
  onEditHandoff,
}: {
  project: Project;
  onChange: (mut: (p: Project) => Project) => void;
  onPreviewArtifact: (a: Artifact) => void;
  onAddHandoff: () => void;
  onEditHandoff: (h: Handoff) => void;
}) {
  function updateHandoff(id: string, mut: (h: Handoff) => Handoff) {
    onChange((p) => ({
      ...p,
      handoffs: p.handoffs.map((h) => (h.id === id ? mut(h) : h)),
    }));
  }

  function removeHandoff(id: string) {
    onChange((p) => ({ ...p, handoffs: p.handoffs.filter((h) => h.id !== id) }));
  }

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
            One card per step. Update status as bots work.
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
              onUpdate={(mut) => updateHandoff(h.id, mut)}
              onRemove={() => removeHandoff(h.id)}
              onEdit={() => onEditHandoff(h)}
              onPreview={() => {
                if (h.artifactBody || h.artifactLink) {
                  onPreviewArtifact({
                    id: h.id,
                    title: h.artifactTitle || `${h.mode} artifact`,
                    kind: h.mode,
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
  onUpdate,
  onRemove,
  onEdit,
  onPreview,
}: {
  handoff: Handoff;
  onUpdate: (mut: (h: Handoff) => Handoff) => void;
  onRemove: () => void;
  onEdit: () => void;
  onPreview: () => void;
}) {
  const isComplete = handoff.status === "Complete";
  const isBlocked = handoff.status === "Blocked";

  return (
    <div
      className="ml-0 rounded-xl border p-3"
      style={{
        borderColor: isBlocked
          ? "oklch(0.65 0.22 25 / 0.5)"
          : isComplete
            ? "oklch(0.7 0.14 160 / 0.4)"
            : AMBER_SOFT,
        background: isComplete ? "oklch(0.7 0.14 160 / 0.06)" : "transparent",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
          style={{ borderColor: AMBER_LINE, color: AMBER }}
        >
          {handoff.step}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={handoff.mode}
              placeholder="Mode / step name"
              onChange={(e) => onUpdate((h) => ({ ...h, mode: e.target.value }))}
              className="min-w-0 flex-1 bg-transparent font-display text-sm font-semibold outline-none"
            />
            <input
              value={handoff.bot}
              placeholder="bot"
              onChange={(e) => onUpdate((h) => ({ ...h, bot: e.target.value }))}
              className="w-28 rounded-md border bg-transparent px-2 py-0.5 text-xs"
              style={{ borderColor: AMBER_SOFT }}
            />
            <select
              value={handoff.status}
              onChange={(e) => {
                const newStatus = e.target.value as HandoffStatus;
                onUpdate((h) => ({
                  ...h,
                  status: newStatus,
                  completedAt:
                    newStatus === "Complete"
                      ? h.completedAt ?? new Date().toISOString()
                      : h.completedAt,
                }));
              }}
              className="rounded-md border bg-transparent px-1.5 py-0.5 text-xs"
              style={{ borderColor: AMBER_SOFT }}
            >
              {(
                ["Not Started", "Sent", "Working", "Complete", "Blocked"] as HandoffStatus[]
              ).map((s) => (
                <option key={s} value={s} className="bg-[oklch(0.18_0.02_60)]">
                  {s}
                </option>
              ))}
            </select>
            <StatusPill status={handoff.status} />
          </div>

          <textarea
            value={handoff.assignment}
            onChange={(e) => onUpdate((h) => ({ ...h, assignment: e.target.value }))}
            rows={2}
            placeholder="Assignment text…"
            className="mt-2 w-full rounded-md border bg-transparent px-2 py-1.5 text-xs leading-relaxed"
            style={{ borderColor: AMBER_SOFT }}
          />

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={handoff.receiptLink ?? ""}
              placeholder="Receipt / report link"
              onChange={(e) =>
                onUpdate((h) => ({ ...h, receiptLink: e.target.value || undefined }))
              }
              className="rounded-md border bg-transparent px-2 py-1 text-xs"
              style={{ borderColor: AMBER_SOFT }}
            />
            <input
              value={handoff.artifactLink ?? ""}
              placeholder="Artifact link"
              onChange={(e) =>
                onUpdate((h) => ({ ...h, artifactLink: e.target.value || undefined }))
              }
              className="rounded-md border bg-transparent px-2 py-1 text-xs"
              style={{ borderColor: AMBER_SOFT }}
            />
            <input
              value={handoff.artifactTitle ?? ""}
              placeholder="Artifact title"
              onChange={(e) =>
                onUpdate((h) => ({ ...h, artifactTitle: e.target.value || undefined }))
              }
              className="rounded-md border bg-transparent px-2 py-1 text-xs"
              style={{ borderColor: AMBER_SOFT }}
            />
            <textarea
              value={handoff.artifactBody ?? ""}
              rows={1}
              placeholder="Artifact text (paste output)"
              onChange={(e) =>
                onUpdate((h) => ({ ...h, artifactBody: e.target.value || undefined }))
              }
              className="rounded-md border bg-transparent px-2 py-1 text-xs"
              style={{ borderColor: AMBER_SOFT }}
            />
          </div>

          {isComplete && (handoff.nextBot || handoff.nextStep) && (
            <div
              className="mt-2 rounded-md border px-2 py-1.5 text-xs"
              style={{
                borderColor: EMERALD,
                background: "oklch(0.7 0.14 160 / 0.08)",
                color: EMERALD,
              }}
            >
              → next: <strong>{handoff.nextStep || "—"}</strong>
              {handoff.nextBot && (
                <> by <strong>{handoff.nextBot}</strong></>
              )}
            </div>
          )}

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={handoff.nextBot ?? ""}
              placeholder="Next bot"
              onChange={(e) =>
                onUpdate((h) => ({ ...h, nextBot: e.target.value || undefined }))
              }
              className="rounded-md border bg-transparent px-2 py-1 text-xs"
              style={{ borderColor: AMBER_SOFT }}
            />
            <input
              value={handoff.nextStep ?? ""}
              placeholder="Next step"
              onChange={(e) =>
                onUpdate((h) => ({ ...h, nextStep: e.target.value || undefined }))
              }
              className="rounded-md border bg-transparent px-2 py-1 text-xs"
              style={{ borderColor: AMBER_SOFT }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground/80">
            <div>
              {handoff.completedAt
                ? `completed ${fmtTime(handoff.completedAt)}`
                : "in flight"}
            </div>
            <div className="flex gap-2">
              {(handoff.artifactBody || handoff.artifactLink) && (
                <button
                  onClick={onPreview}
                  className="rounded-md border px-2 py-0.5 text-[11px] transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                  style={{ borderColor: AMBER_LINE, color: AMBER }}
                >
                  preview artifact
                </button>
              )}
              <button
                onClick={onEdit}
                className="rounded-md border px-2 py-0.5 text-[11px] transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
                style={{ borderColor: AMBER_LINE, color: AMBER }}
              >
                edit
              </button>
              <button
                onClick={onRemove}
                className="rounded-md px-2 py-0.5 text-[11px] text-muted-foreground/70 transition hover:text-foreground"
              >
                remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Artifact grid ----------
function ArtifactGrid({
  project,
  onChange,
  onPreview,
}: {
  project: Project;
  onChange: (mut: (p: Project) => Project) => void;
  onPreview: (a: Artifact) => void;
}) {
  function addArtifact() {
    onChange((p) => ({
      ...p,
      artifacts: [
        ...p.artifacts,
        {
          id: uid(),
          title: "Untitled artifact",
          kind: "note",
          body: "",
          bot: "Boss",
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  // Combine standalone artifacts + handoff artifacts
  const handoffArtifacts: Artifact[] = project.handoffs
    .filter((h) => h.artifactBody || h.artifactLink)
    .map((h) => ({
      id: `h-${h.id}`,
      title: h.artifactTitle || `${h.mode} artifact`,
      kind: h.mode,
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
            Every completed bot output. Click to preview.
          </div>
        </div>
        <button
          onClick={addArtifact}
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
          {all.map((a) => (
            <button
              key={a.id}
              onClick={() => onPreview(a)}
              className="rounded-xl border bg-transparent px-3 py-2 text-left transition hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
              style={{ borderColor: AMBER_SOFT }}
            >
              <div className="truncate font-display text-sm font-semibold">
                {a.title}
              </div>
              <div className="truncate text-[11px]" style={{ color: AMBER }}>
                {a.kind}
              </div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {a.body || a.link || "—"}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground/70">
                {a.bot} · {fmtTime(a.createdAt)}
              </div>
            </button>
          ))}
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
            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: AMBER }}>
              {artifact.kind}
            </div>
            <h3 className="font-display text-xl font-semibold">{artifact.title}</h3>
            <div className="text-xs text-muted-foreground">
              by {artifact.bot} · {fmtTime(artifact.createdAt)}
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