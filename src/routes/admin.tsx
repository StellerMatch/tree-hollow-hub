import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "DaBotTree Admin — Command Room" },
      {
        name: "description",
        content:
          "Boss's private command room. Master Library bookshelf, Family Tree, System Map, Project Records, and Admin Controls.",
      },
    ],
  }),
  component: AdminPage,
});

// ---------- data ----------

type Status = "Idea" | "In Progress" | "Complete" | "Needs Review";

type Book = {
  id: string;
  name: string;
  category: string;
  stage: string;
  status: Status;
  owner: string;
  updated: string;
  spine: string;
  summary: string;
  chapters: { title: string; note: string }[];
  answers: string[];
  decisions: string[];
  packets: string[];
  outputs: string[];
  handoffs: string[];
  finalNotes: string;
  adminNotes: string;
};

const BOOKS: Book[] = [
  {
    id: "b1",
    name: "Lantern Notes",
    category: "App",
    stage: "Chapter 4 · Polish",
    status: "In Progress",
    owner: "core",
    updated: "2d ago",
    spine: "oklch(0.7 0.18 200)",
    summary:
      "A glowing journal app where each note becomes a little lantern in a forest of thoughts.",
    chapters: [
      { title: "Seed", note: "Cozy journaling for night owls." },
      { title: "Shape", note: "Lantern grid, tags as fireflies." },
      { title: "Build", note: "Editor, sync, lantern animation." },
      { title: "Polish", note: "Sound design + ember palette." },
    ],
    answers: ["Audience: writers", "Tone: warm", "Platform: web first"],
    decisions: ["Local-first storage", "No social feed", "Dark mode default"],
    packets: ["Brand pack v2", "Lantern SVG set"],
    outputs: ["MVP build", "Landing page draft"],
    handoffs: ["→ OG DaBotTree shelf"],
    finalNotes: "Ready for first user circle once polish ships.",
    adminNotes: "Owner: core team. Watch sync load after launch.",
  },
  {
    id: "b2",
    name: "Kettle Whistle Show",
    category: "Show",
    stage: "Chapter 2 · Shape",
    status: "Idea",
    owner: "studio",
    updated: "5d ago",
    spine: "oklch(0.78 0.18 50)",
    summary:
      "Weekly cozy livestream where guests build tiny projects inside DaBotTree House.",
    chapters: [
      { title: "Seed", note: "Show idea pulled from Future garden." },
      { title: "Shape", note: "Format: 30 min, 1 guest, 1 build." },
    ],
    answers: ["Cadence: weekly", "Length: 30m"],
    decisions: ["Pre-record season 1"],
    packets: ["Show bible draft"],
    outputs: [],
    handoffs: [],
    finalNotes: "Needs host voice test before greenlight.",
    adminNotes: "Hold until Future garden signs off on format.",
  },
  {
    id: "b3",
    name: "Branch Sync",
    category: "Automation",
    stage: "Chapter 5 · Ship",
    status: "Complete",
    owner: "platform",
    updated: "1w ago",
    spine: "oklch(0.6 0.22 145)",
    summary:
      "Backend automation that keeps Family Tree, House, and Individual shelves in sync.",
    chapters: [
      { title: "Seed", note: "Internal pain point." },
      { title: "Shape", note: "Event bus + nightly job." },
      { title: "Build", note: "Workers + queues." },
      { title: "Polish", note: "Retry + alerting." },
      { title: "Ship", note: "Rolled to all rooms." },
    ],
    answers: ["Trigger: on save", "SLA: 60s"],
    decisions: ["Use queue, not webhooks"],
    packets: ["Runbook"],
    outputs: ["Prod deploy", "Dashboards"],
    handoffs: ["→ OG DaBotTree"],
    finalNotes: "Stable. Owner: platform team.",
    adminNotes: "Quarterly review on retry policy.",
  },
  {
    id: "b4",
    name: "Cozy Commerce",
    category: "Business",
    stage: "Chapter 3 · Build",
    status: "Needs Review",
    owner: "growth",
    updated: "today",
    spine: "oklch(0.72 0.16 280)",
    summary:
      "A storefront template for small makers, themed around the DaBotTree forest.",
    chapters: [
      { title: "Seed", note: "Maker feedback from Collective." },
      { title: "Shape", note: "Three-section landing + cart." },
      { title: "Build", note: "Stripe + Lovable Cloud wiring." },
    ],
    answers: ["Audience: solo makers", "MRR target: small"],
    decisions: ["Stripe over Paddle"],
    packets: ["Theme tokens"],
    outputs: ["Beta storefront"],
    handoffs: ["needs admin review"],
    finalNotes: "Pricing copy still rough. Review before publish.",
    adminNotes: "Legal review pending for storefront terms.",
  },
  {
    id: "b5",
    name: "Acorn Tasks",
    category: "Task",
    stage: "Chapter 1 · Seed",
    status: "Idea",
    owner: "unclaimed",
    updated: "3w ago",
    spine: "oklch(0.8 0.16 85)",
    summary:
      "Tiny task tracker where each todo is an acorn that grows when checked off.",
    chapters: [{ title: "Seed", note: "Pulled from Future garden." }],
    answers: ["Audience: hobbyists"],
    decisions: [],
    packets: [],
    outputs: [],
    handoffs: [],
    finalNotes: "Waiting on a shaper.",
    adminNotes: "Low priority. Park in Future until claimed.",
  },
  {
    id: "b6",
    name: "Hollow Site",
    category: "Website",
    stage: "Chapter 4 · Polish",
    status: "In Progress",
    owner: "brand",
    updated: "yesterday",
    spine: "oklch(0.65 0.2 0)",
    summary:
      "Public-facing marketing site for the DaBotTree ecosystem with a hidden door to the Future garden.",
    chapters: [
      { title: "Seed", note: "Need a real front door." },
      { title: "Shape", note: "Six entries mirror the Canopy." },
      { title: "Build", note: "Routes + SEO." },
      { title: "Polish", note: "Motion + sound." },
    ],
    answers: ["Primary CTA: enter the tree"],
    decisions: ["No analytics until launch"],
    packets: ["Type pack", "Sound pack"],
    outputs: ["Staging site"],
    handoffs: [],
    finalNotes: "Hero animation pending.",
    adminNotes: "Coordinate launch with OG shelf refresh.",
  },
];

const STATUS_TONE: Record<Status, string> = {
  Idea: "oklch(0.78 0.14 85)",
  "In Progress": "oklch(0.7 0.18 200)",
  Complete: "oklch(0.7 0.18 145)",
  "Needs Review": "oklch(0.7 0.2 25)",
};

type SystemNode = {
  id: string;
  label: string;
  role: string;
  hue: string;
};

const NODES: SystemNode[] = [
  { id: "canopy", label: "Canopy", role: "front door", hue: "oklch(0.85 0.12 80)" },
  { id: "house", label: "House", role: "creation", hue: "oklch(0.7 0.18 200)" },
  { id: "og", label: "OG", role: "flagship", hue: "oklch(0.78 0.18 50)" },
  { id: "collective", label: "Collective", role: "community", hue: "oklch(0.6 0.22 145)" },
  { id: "individual", label: "Individual", role: "personal", hue: "oklch(0.72 0.16 280)" },
  { id: "future", label: "Future", role: "ideas", hue: "oklch(0.8 0.16 85)" },
  { id: "admin", label: "Admin", role: "command", hue: "oklch(0.7 0.2 25)" },
  { id: "library", label: "Library", role: "archive", hue: "oklch(0.7 0.18 200)" },
];

// ---------- page ----------

function AdminPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "All">("All");
  const [open, setOpen] = useState<Book | null>(null);

  const filtered = useMemo(
    () =>
      BOOKS.filter(
        (b) =>
          (status === "All" || b.status === status) &&
          (query === "" ||
            b.name.toLowerCase().includes(query.toLowerCase()) ||
            b.category.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, status],
  );

  const stats = [
    { label: "Books", value: BOOKS.length, hue: "oklch(0.7 0.18 200)" },
    { label: "Active", value: BOOKS.filter((b) => b.status === "In Progress").length, hue: "oklch(0.78 0.18 50)" },
    { label: "Review", value: BOOKS.filter((b) => b.status === "Needs Review").length, hue: "oklch(0.7 0.2 25)" },
    { label: "Shipped", value: BOOKS.filter((b) => b.status === "Complete").length, hue: "oklch(0.7 0.18 145)" },
  ];

  return (
    <div className="relative min-h-screen">
      {/* ambient room glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-[var(--ember)]/10 blur-3xl" />
        <div className="absolute top-40 right-0 h-64 w-64 rounded-full bg-[oklch(0.7_0.18_200)]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 md:py-8">
        {/* compact header strip */}
        <header className="animate-fade-up">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Canopy</Link>
            <span>/</span>
            <span className="text-[var(--ember)]">admin</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight">
                Boss's Command Room
              </h1>
              <p className="font-hand text-base text-muted-foreground mt-0.5">
                every wire, every shelf, every saved book — in one private library.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ember)]/50 bg-[var(--ember)]/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--ember)] animate-pulse" />
                admin · private
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-[oklch(0.18_0.02_60/0.6)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-[oklch(0.7_0.18_145)]" />
                systems nominal
              </span>
              {stats.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-[oklch(0.16_0.02_60/0.6)] px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  <span className="font-display text-sm" style={{ color: s.hue }}>{s.value}</span>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* HERO: bookshelf */}
        <section
          className="relative mt-6 rounded-3xl border-2 border-border/70 bg-[oklch(0.14_0.02_60/0.7)] shadow-[var(--shadow-deep)] animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          {/* shelf header */}
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-border/60 px-5 py-4 md:px-7">
            <div>
              <div className="font-hand text-xs uppercase tracking-[0.22em] text-[var(--ember)]">
                master library
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold leading-tight">
                The Project Bookshelf
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                every project that walks through DaBotTree House becomes a book on this shelf.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search the shelf…"
                className="rounded-xl border border-border/60 bg-[oklch(0.12_0.02_60/0.6)] px-3 py-2 text-sm focus:border-[var(--ember)] focus:outline-none min-w-[180px]"
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
              <Link
                to="/master-library"
                className="rounded-xl border border-[var(--ember)]/60 bg-[var(--ember)]/15 px-3 py-2 text-xs uppercase tracking-[0.18em] hover:bg-[var(--ember)]/25"
              >
                Full library →
              </Link>
            </div>
          </div>

          {/* shelf body — two rows of books on wood-tone planks */}
          <div className="space-y-5 px-5 py-6 md:px-7">
            {chunk(filtered, 3).map((row, ri) => (
              <div key={ri} className="relative">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {row.map((b, i) => (
                    <BookCard key={b.id} book={b} index={ri * 3 + i} onOpen={() => setOpen(b)} />
                  ))}
                </div>
                {/* wooden shelf plank */}
                <div className="mt-3 h-2 rounded-full bg-gradient-to-b from-[oklch(0.28_0.04_60)] to-[oklch(0.18_0.03_60)] shadow-[0_4px_12px_oklch(0_0_0/0.5)]" />
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground">
                No books match these filters.
              </div>
            )}
          </div>
        </section>

        {/* COMMAND PANELS */}
        <section className="mt-8 grid gap-5 lg:grid-cols-3 animate-fade-up" style={{ animationDelay: "140ms" }}>
          {/* Family Tree */}
          <CommandCard eyebrow="map" title="Family Tree" hue="oklch(0.78 0.18 50)">
            <div className="space-y-3">
              <div className="flex flex-wrap justify-center gap-1.5">
                {NODES.slice(0, 1).map((n) => (
                  <NodeChip key={n.id} node={n} big />
                ))}
              </div>
              <div className="mx-auto h-3 w-px bg-border/60" />
              <div className="flex flex-wrap justify-center gap-1.5">
                {NODES.slice(1, 6).map((n) => (
                  <NodeChip key={n.id} node={n} />
                ))}
              </div>
              <div className="mx-auto h-3 w-px bg-border/60" />
              <div className="flex flex-wrap justify-center gap-1.5">
                {NODES.slice(6).map((n) => (
                  <NodeChip key={n.id} node={n} />
                ))}
              </div>
            </div>
            <Link
              to="/openclaw"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-[oklch(0.18_0.02_60/0.6)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] hover:border-[var(--ember)]"
            >
              Open full tree →
            </Link>
          </CommandCard>

          {/* System Map */}
          <CommandCard eyebrow="wiring" title="System Map" hue="oklch(0.7 0.2 145)">
            <pre className="overflow-x-auto rounded-xl border border-border/60 bg-[oklch(0.1_0.02_60/0.7)] p-3 text-[10px] leading-snug text-muted-foreground font-mono">
{`Canopy ──┬─▶ House ─▶ Library ─▶ OG
         ├─▶ Future ─▶ House
         ├─▶ Individual ─▶ Library
         ├─▶ Collective
         └─▶ Admin ─▶ Library + Controls`}
            </pre>
            <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground">
              <div><span className="font-display text-foreground">Idea flow:</span> Future → House → Library.</div>
              <div><span className="font-display text-foreground">Admin flow:</span> Canopy → Admin → Library.</div>
            </div>
          </CommandCard>

          {/* Admin Controls (compact, placeholder) */}
          <CommandCard eyebrow="settings" title="Admin Controls" hue="oklch(0.8 0.16 85)">
            <ul className="space-y-2 text-sm">
              {[
                { label: "Site visibility", hint: "Public · members · private" },
                { label: "Roles & access", hint: "Admin · editor · viewer" },
                { label: "Lovable Cloud", hint: "Database, auth, storage" },
                { label: "Webhooks & cron", hint: "External callers" },
              ].map((it) => (
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
          </CommandCard>
        </section>

        {/* PROJECT RECORDS — ledger */}
        <section className="mt-8 rounded-2xl border-2 border-border/60 bg-[oklch(0.14_0.02_60/0.6)] animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div>
              <div className="font-hand text-xs uppercase tracking-[0.22em] text-[var(--ember)]">ledger</div>
              <h2 className="font-display text-xl md:text-2xl font-semibold">Project Records</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                flat ledger of every book on the shelf. click a row to open the record.
              </p>
            </div>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {filtered.length} of {BOOKS.length} shown
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[oklch(0.18_0.02_60/0.7)] text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Project</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Stage</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Owner</th>
                  <th className="px-4 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setOpen(r)}
                    className="cursor-pointer border-t border-border/60 hover:bg-[oklch(0.18_0.02_60/0.6)]"
                  >
                    <td className="px-4 py-2 font-display">
                      <span className="inline-block h-2 w-2 rounded-full mr-2 align-middle" style={{ background: r.spine }} />
                      {r.name}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.category}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.stage}</td>
                    <td className="px-4 py-2"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-2 text-muted-foreground">{r.owner}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.updated}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No records match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {open && <BookDrawer book={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ---------- pieces ----------

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function BookCard({ book, index, onOpen }: { book: Book; index: number; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative text-left rounded-xl border-2 border-border/60 bg-[oklch(0.18_0.02_60/0.85)] p-4 pl-5 transition hover:-translate-y-1 hover:border-[color:var(--spine)] hover:shadow-[var(--shadow-deep)] animate-fade-up overflow-hidden"
      style={
        {
          animationDelay: `${index * 50}ms`,
          ["--spine" as string]: book.spine,
        } as React.CSSProperties
      }
    >
      {/* spine */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2"
        style={{ background: `linear-gradient(180deg, ${book.spine}, ${book.spine}80)` }}
      />
      {/* gilded top edge */}
      <div className="absolute left-2 right-0 top-0 h-px bg-[oklch(0.85_0.08_85)]/20" />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className="font-hand text-[11px] uppercase tracking-[0.18em]"
            style={{ color: book.spine }}
          >
            {book.category}
          </div>
          <h3 className="font-display text-lg font-semibold mt-0.5 leading-tight truncate">
            {book.name}
          </h3>
        </div>
        <StatusPill status={book.status} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{book.summary}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground/80">
        <span className="font-hand text-xs">{book.stage}</span>
        <span>upd {book.updated}</span>
      </div>
    </button>
  );
}

function CommandCard({
  eyebrow,
  title,
  hue,
  children,
}: {
  eyebrow: string;
  title: string;
  hue: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border-2 border-border/60 bg-[oklch(0.16_0.02_60/0.7)] p-5"
      style={{ borderColor: `${hue}40` }}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: hue }} />
        <span className="font-hand text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </span>
      </div>
      <h3 className="font-display text-lg font-semibold mt-1" style={{ color: hue }}>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function NodeChip({ node, big }: { node: SystemNode; big?: boolean }) {
  return (
    <div
      className={`rounded-lg border bg-[oklch(0.18_0.02_60/0.7)] ${big ? "px-3 py-1.5" : "px-2 py-1"}`}
      style={{ borderColor: `${node.hue}66` }}
    >
      <div className={`font-display ${big ? "text-sm" : "text-[11px]"}`} style={{ color: node.hue }}>
        {node.label}
      </div>
      <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{node.role}</div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] whitespace-nowrap"
      style={{
        background: `${tone}26`,
        color: tone,
        border: `1px solid ${tone}55`,
      }}
    >
      {status}
    </span>
  );
}

function BookDrawer({ book, onClose }: { book: Book; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-[oklch(0.1_0.02_60/0.7)] backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl overflow-y-auto border-l-2 bg-[oklch(0.13_0.02_60)] p-6 md:p-8 animate-fade-up"
        style={{ borderColor: book.spine, animationDuration: "0.25s" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-hand text-xs uppercase tracking-[0.2em]" style={{ color: book.spine }}>
              {book.category} · {book.stage}
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mt-1">{book.name}</h2>
            <div className="mt-2 flex items-center gap-2">
              <StatusPill status={book.status} />
              <span className="text-xs text-muted-foreground">owner {book.owner} · updated {book.updated}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground" aria-label="close">✕</button>
        </div>

        <p className="mt-5 text-muted-foreground leading-relaxed">{book.summary}</p>

        <Section title="Chapters">
          <ol className="space-y-2">
            {book.chapters.map((c, i) => (
              <li key={i} className="rounded-lg border border-border/60 bg-[oklch(0.16_0.02_60/0.6)] p-3">
                <div className="font-display text-sm font-semibold">{i + 1}. {c.title}</div>
                <div className="text-sm text-muted-foreground">{c.note}</div>
              </li>
            ))}
          </ol>
        </Section>

        <div className="grid gap-5 md:grid-cols-2">
          <ListSection title="Answers" items={book.answers} />
          <ListSection title="Decisions" items={book.decisions} />
          <ListSection title="Packets" items={book.packets} />
          <ListSection title="Outputs" items={book.outputs} />
          <ListSection title="Handoffs" items={book.handoffs} />
        </div>

        <Section title="Final product notes">
          <p className="rounded-lg border border-border/60 bg-[oklch(0.16_0.02_60/0.6)] p-3 text-sm text-muted-foreground">
            {book.finalNotes}
          </p>
        </Section>

        <Section title="Admin notes">
          <p className="rounded-lg border border-[var(--ember)]/40 bg-[oklch(0.16_0.02_60/0.6)] p-3 text-sm text-muted-foreground">
            {book.adminNotes}
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="font-hand text-xs uppercase tracking-[0.22em] text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground/70">none yet</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="rounded-lg border border-border/60 bg-[oklch(0.16_0.02_60/0.6)] px-3 py-2 text-sm text-muted-foreground">
              {it}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
