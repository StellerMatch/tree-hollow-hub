import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "DaBotTree Admin — Command Room" },
      {
        name: "description",
        content:
          "Admin command room for DaBotTree: Family Tree, Master Library, System Map, Project Records, and controls.",
      },
    ],
  }),
  component: AdminPage,
});

type SectionId =
  | "overview"
  | "family-tree"
  | "master-library"
  | "system-map"
  | "project-records"
  | "controls";

const NAV: { id: SectionId; label: string; icon: string; hue: string }[] = [
  { id: "overview", label: "Overview", icon: "◉", hue: "oklch(0.85 0.12 80)" },
  { id: "family-tree", label: "Family Tree", icon: "🌲", hue: "oklch(0.78 0.18 50)" },
  { id: "master-library", label: "Master Library", icon: "📚", hue: "oklch(0.7 0.18 200)" },
  { id: "system-map", label: "System Map", icon: "🗺️", hue: "oklch(0.7 0.2 145)" },
  { id: "project-records", label: "Project Records", icon: "🗂️", hue: "oklch(0.72 0.16 280)" },
  { id: "controls", label: "Admin Controls", icon: "⚙️", hue: "oklch(0.8 0.16 85)" },
];

type SystemNode = {
  id: string;
  label: string;
  role: string;
  hue: string;
  connects: string[];
};

const NODES: SystemNode[] = [
  { id: "canopy", label: "Canopy", role: "front door", hue: "oklch(0.85 0.12 80)", connects: ["house", "og", "collective", "individual", "future", "admin"] },
  { id: "house", label: "DaBotTree House", role: "creation engine", hue: "oklch(0.7 0.18 200)", connects: ["library", "individual", "og"] },
  { id: "og", label: "OG DaBotTree", role: "flagship shelf", hue: "oklch(0.78 0.18 50)", connects: ["library"] },
  { id: "collective", label: "Collective", role: "community catalog", hue: "oklch(0.6 0.22 145)", connects: ["individual"] },
  { id: "individual", label: "Individual", role: "personal shelf", hue: "oklch(0.72 0.16 280)", connects: ["library"] },
  { id: "future", label: "Future", role: "idea garden", hue: "oklch(0.8 0.16 85)", connects: ["house"] },
  { id: "admin", label: "Admin", role: "command room", hue: "oklch(0.7 0.2 25)", connects: ["library"] },
  { id: "library", label: "Master Library", role: "project archive", hue: "oklch(0.7 0.18 200)", connects: [] },
];

type RecordRow = {
  id: string;
  name: string;
  category: string;
  stage: string;
  status: "Idea" | "In Progress" | "Complete" | "Needs Review";
  owner: string;
  updated: string;
};

const RECORDS: RecordRow[] = [
  { id: "b1", name: "Lantern Notes", category: "App", stage: "Polish", status: "In Progress", owner: "core", updated: "2d ago" },
  { id: "b2", name: "Kettle Whistle Show", category: "Show", stage: "Shape", status: "Idea", owner: "studio", updated: "5d ago" },
  { id: "b3", name: "Branch Sync", category: "Automation", stage: "Ship", status: "Complete", owner: "platform", updated: "1w ago" },
  { id: "b4", name: "Cozy Commerce", category: "Business", stage: "Build", status: "Needs Review", owner: "growth", updated: "today" },
  { id: "b5", name: "Acorn Tasks", category: "Task", stage: "Seed", status: "Idea", owner: "unclaimed", updated: "3w ago" },
  { id: "b6", name: "Hollow Site", category: "Website", stage: "Polish", status: "In Progress", owner: "brand", updated: "yesterday" },
];

const STATUS_TONE: Record<RecordRow["status"], string> = {
  Idea: "oklch(0.78 0.14 85)",
  "In Progress": "oklch(0.7 0.18 200)",
  Complete: "oklch(0.7 0.18 145)",
  "Needs Review": "oklch(0.7 0.2 25)",
};

function AdminPage() {
  const [section, setSection] = useState<SectionId>("overview");

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[oklch(0.12_0.02_60)] to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-14">
        <header className="mb-10 animate-fade-up">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              ← Canopy
            </Link>
            <span>/</span>
            <span className="text-[var(--ember)]">admin</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl md:text-5xl font-semibold">
                DaBotTree Admin
              </h1>
              <p className="font-hand text-lg text-muted-foreground mt-1">
                the command room. every wire, shelf, and saved book lives here.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-[oklch(0.18_0.02_60/0.6)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--ember)] animate-pulse" />
              admin · private
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
          {/* side nav */}
          <aside className="lg:sticky lg:top-6 self-start animate-fade-up">
            <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-[oklch(0.16_0.02_60/0.6)] p-2">
              {NAV.map((n) => {
                const active = section === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setSection(n.id)}
                    className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition"
                    style={{
                      background: active ? `${n.hue}1f` : "transparent",
                      color: active ? "oklch(0.96 0.02 80)" : "oklch(0.78 0.02 60)",
                      borderLeft: `3px solid ${active ? n.hue : "transparent"}`,
                    }}
                  >
                    <span style={{ color: n.hue }}>{n.icon}</span>
                    <span className="font-display">{n.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* main */}
          <section className="min-w-0 animate-fade-up" style={{ animationDelay: "80ms" }}>
            {section === "overview" && <OverviewPanel onJump={setSection} />}
            {section === "family-tree" && <FamilyTreePanel />}
            {section === "master-library" && <LibraryPanel />}
            {section === "system-map" && <SystemMapPanel />}
            {section === "project-records" && <RecordsPanel />}
            {section === "controls" && <ControlsPanel />}
          </section>
        </div>
      </div>
    </div>
  );
}

function PanelShell({
  eyebrow,
  title,
  blurb,
  children,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-border/60 bg-[oklch(0.16_0.02_60/0.55)] p-5 md:p-7">
      <div className="font-hand text-xs uppercase tracking-[0.22em] text-[var(--ember)]">
        {eyebrow}
      </div>
      <h2 className="font-display text-2xl md:text-3xl font-semibold mt-1">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{blurb}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function OverviewPanel({ onJump }: { onJump: (s: SectionId) => void }) {
  const stats = [
    { label: "Saved books", value: RECORDS.length, hue: "oklch(0.7 0.18 200)" },
    { label: "In progress", value: RECORDS.filter((r) => r.status === "In Progress").length, hue: "oklch(0.78 0.18 50)" },
    { label: "Needs review", value: RECORDS.filter((r) => r.status === "Needs Review").length, hue: "oklch(0.7 0.2 25)" },
    { label: "System nodes", value: NODES.length, hue: "oklch(0.7 0.2 145)" },
  ];
  return (
    <PanelShell
      eyebrow="command room"
      title="Overview"
      blurb="Snapshot of the system. Jump to a section from the left rail or the cards below."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-4"
          >
            <div className="font-hand text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1 font-display text-3xl font-semibold" style={{ color: s.hue }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {NAV.filter((n) => n.id !== "overview").map((n) => (
          <button
            key={n.id}
            onClick={() => onJump(n.id)}
            className="text-left rounded-xl border border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--spine)]"
            style={{ ["--spine" as string]: n.hue } as React.CSSProperties}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl" style={{ color: n.hue }}>{n.icon}</span>
              <span className="font-display text-lg">{n.label}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Open section →</div>
          </button>
        ))}
      </div>
    </PanelShell>
  );
}

function FamilyTreePanel() {
  const tiers: { tier: string; ids: string[] }[] = [
    { tier: "root", ids: ["canopy"] },
    { tier: "worlds", ids: ["house", "og", "collective", "individual", "future"] },
    { tier: "command", ids: ["admin", "library"] },
  ];
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  return (
    <PanelShell
      eyebrow="map"
      title="Family Tree"
      blurb="Major parts of DaBotTree and how they connect. Canopy is the front door; everything else branches from it."
    >
      <div className="space-y-6">
        {tiers.map((t) => (
          <div key={t.tier}>
            <div className="font-hand text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              {t.tier}
            </div>
            <div className="flex flex-wrap gap-3">
              {t.ids.map((id) => {
                const n = byId[id];
                return (
                  <div
                    key={id}
                    className="rounded-xl border-2 border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-3 min-w-[160px]"
                    style={{ borderColor: `${n.hue}66` }}
                  >
                    <div className="font-display text-sm font-semibold" style={{ color: n.hue }}>
                      {n.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{n.role}</div>
                    {n.connects.length > 0 && (
                      <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
                        → {n.connects.map((c) => byId[c]?.label).join(" · ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Link
          to="/openclaw"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-[oklch(0.18_0.02_60/0.7)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-foreground hover:border-[var(--ember)]"
        >
          Open full visual tree →
        </Link>
      </div>
    </PanelShell>
  );
}

function LibraryPanel() {
  return (
    <PanelShell
      eyebrow="bookshelf"
      title="Master Library"
      blurb="Every project that walks through DaBotTree House becomes a book. Open the full shelf to filter and read records."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RECORDS.slice(0, 6).map((r) => (
          <div
            key={r.id}
            className="relative rounded-xl border-2 border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-4"
          >
            <div
              className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full"
              style={{ background: STATUS_TONE[r.status] }}
            />
            <div className="font-hand text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {r.category}
            </div>
            <div className="font-display text-base font-semibold mt-0.5">{r.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {r.stage} · updated {r.updated}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Link
          to="/master-library"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--ember)]/60 bg-[var(--ember)]/15 px-4 py-2 text-xs uppercase tracking-[0.18em] text-foreground hover:bg-[var(--ember)]/25"
        >
          Open Master Library →
        </Link>
      </div>
    </PanelShell>
  );
}

function SystemMapPanel() {
  return (
    <PanelShell
      eyebrow="wiring"
      title="System Map"
      blurb="How Canopy, House, Library, the user dashboard, and final product collections connect."
    >
      <pre className="overflow-x-auto rounded-xl border border-border/60 bg-[oklch(0.12_0.02_60/0.7)] p-4 text-xs leading-relaxed text-muted-foreground font-mono">
{`               ┌──────────────┐
               │    Canopy    │  front door
               └──────┬───────┘
      ┌───────────────┼──────────────────┐
      ▼               ▼                  ▼
  ┌────────┐    ┌────────────┐     ┌──────────┐
  │  User  │    │   House    │ ──▶ │  Library │  saved books
  │Dashbrd │    │ (creation) │     └────┬─────┘
  └────────┘    └─────┬──────┘          │
                      ▼                 ▼
              ┌────────────┐      ┌────────────┐
              │ Individual │      │   Admin    │
              │  shelf     │      │  controls  │
              └─────┬──────┘      └────────────┘
                    ▼
              ┌────────────┐   ┌────────────┐   ┌────────┐
              │     OG     │   │ Collective │   │ Future │
              └────────────┘   └────────────┘   └────────┘
                       final product collections`}
      </pre>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-4 text-sm text-muted-foreground">
          <span className="font-display text-foreground">Idea flow:</span> Future → House → Library → (OG / Collective / Individual).
        </div>
        <div className="rounded-xl border border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-4 text-sm text-muted-foreground">
          <span className="font-display text-foreground">Admin flow:</span> Canopy (admin role) → Admin → Library & Controls.
        </div>
      </div>
    </PanelShell>
  );
}

function RecordsPanel() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"All" | RecordRow["status"]>("All");
  const rows = useMemo(
    () =>
      RECORDS.filter(
        (r) =>
          (status === "All" || r.status === status) &&
          (q === "" || r.name.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, status],
  );
  return (
    <PanelShell
      eyebrow="ledger"
      title="Project Records"
      blurb="A flat list of every saved record. Search and filter here; open the Master Library for the full book view."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search records…"
          className="flex-1 min-w-[200px] rounded-xl border border-border/60 bg-[oklch(0.12_0.02_60/0.6)] px-3 py-2 text-sm focus:border-[var(--ember)] focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-xl border border-border/60 bg-[oklch(0.12_0.02_60/0.6)] px-3 py-2 text-sm"
        >
          <option>All</option>
          <option>Idea</option>
          <option>In Progress</option>
          <option>Complete</option>
          <option>Needs Review</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="min-w-full text-sm">
          <thead className="bg-[oklch(0.18_0.02_60/0.7)] text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Project</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Stage</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/60 hover:bg-[oklch(0.18_0.02_60/0.5)]">
                <td className="px-3 py-2 font-display">{r.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.category}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.stage}</td>
                <td className="px-3 py-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
                    style={{
                      background: `${STATUS_TONE[r.status]}26`,
                      color: STATUS_TONE[r.status],
                      border: `1px solid ${STATUS_TONE[r.status]}55`,
                    }}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.owner}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.updated}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No records match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

function ControlsPanel() {
  const groups: { title: string; items: { label: string; hint: string }[] }[] = [
    {
      title: "System",
      items: [
        { label: "Site visibility", hint: "Public · members · private" },
        { label: "Maintenance mode", hint: "Pause user access" },
      ],
    },
    {
      title: "Permissions",
      items: [
        { label: "Roles & access", hint: "Admin · editor · viewer" },
        { label: "Invite collaborators", hint: "Send workspace invites" },
      ],
    },
    {
      title: "Integrations",
      items: [
        { label: "Lovable Cloud", hint: "Database, auth, storage" },
        { label: "Webhooks & cron", hint: "External callers" },
      ],
    },
  ];
  return (
    <PanelShell
      eyebrow="settings"
      title="Admin Controls"
      blurb="Placeholders for future admin-only controls. Wire these up when the backend is ready."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {groups.map((g) => (
          <div key={g.title} className="rounded-xl border border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-4">
            <div className="font-hand text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {g.title}
            </div>
            <ul className="mt-3 space-y-2">
              {g.items.map((it) => (
                <li
                  key={it.label}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-[oklch(0.14_0.02_60/0.6)] px-3 py-2"
                >
                  <div>
                    <div className="font-display text-sm">{it.label}</div>
                    <div className="text-[11px] text-muted-foreground">{it.hint}</div>
                  </div>
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    soon
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}