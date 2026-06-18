import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/master-library")({
  head: () => ({
    meta: [
      { title: "Master Library — DaBotTree" },
      {
        name: "description",
        content:
          "Admin bookshelf of every project that passed through DaBotTree House.",
      },
    ],
  }),
  component: MasterLibraryPage,
});

type Category =
  | "App"
  | "Website"
  | "Task"
  | "Show"
  | "Automation"
  | "Business"
  | "Other";

type Status = "Idea" | "In Progress" | "Complete" | "Needs Review";

type Book = {
  id: string;
  name: string;
  category: Category;
  stage: string;
  status: Status;
  updated: string;
  spine: string; // accent color
  summary: string;
  chapters: { title: string; note: string }[];
  answers: string[];
  decisions: string[];
  packets: string[];
  outputs: string[];
  handoffs: string[];
  finalNotes: string;
  adminNotes?: string;
};

const CATEGORIES: Category[] = [
  "App",
  "Website",
  "Task",
  "Show",
  "Automation",
  "Business",
  "Other",
];

const STATUSES: Status[] = ["Idea", "In Progress", "Complete", "Needs Review"];

const BOOKS: Book[] = [
  {
    id: "b1",
    name: "Lantern Notes",
    category: "App",
    stage: "Chapter 4 · Polish",
    status: "In Progress",
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

function MasterLibraryPage() {
  const [category, setCategory] = useState<Category | "All">("All");
  const [status, setStatus] = useState<Status | "All">("All");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Book | null>(null);

  const filtered = useMemo(() => {
    return BOOKS.filter((b) => {
      if (category !== "All" && b.category !== category) return false;
      if (status !== "All" && b.status !== status) return false;
      if (query && !b.name.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [category, status, query]);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[oklch(0.12_0.02_60)] to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-14">
        {/* header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Link to="/" className="hover:text-foreground">
                ← Canopy
              </Link>
              <span>/</span>
              <span className="text-[var(--ember)]">admin</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-semibold mt-2">
              Master Library
            </h1>
            <p className="font-hand text-lg text-muted-foreground mt-1">
              every project that walks through DaBotTree House becomes a book on
              this shelf.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-[oklch(0.18_0.02_60/0.6)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--ember)] animate-pulse" />
            {BOOKS.length} records · admin view
          </div>
        </header>

        {/* filters */}
        <div
          className="mb-8 grid gap-4 rounded-2xl border border-border/60 bg-[oklch(0.16_0.02_60/0.6)] p-4 md:p-5 animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground mr-2">
              Category
            </span>
            <FilterChip
              label="All"
              active={category === "All"}
              onClick={() => setCategory("All")}
            />
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c}
                label={c}
                active={category === c}
                onClick={() => setCategory(c)}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground mr-2">
              Status
            </span>
            <FilterChip
              label="All"
              active={status === "All"}
              onClick={() => setStatus("All")}
            />
            {STATUSES.map((s) => (
              <FilterChip
                key={s}
                label={s}
                active={status === s}
                tone={STATUS_TONE[s]}
                onClick={() => setStatus(s)}
              />
            ))}
          </div>
          <div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search the shelf…"
              className="w-full rounded-xl border border-border/60 bg-[oklch(0.12_0.02_60/0.6)] px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-[var(--ember)] focus:outline-none"
            />
          </div>
        </div>

        {/* bookshelf */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setOpen(b)}
              className="group relative text-left rounded-2xl border-2 border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-5 transition hover:-translate-y-1 hover:border-[color:var(--spine)] hover:shadow-[var(--shadow-deep)] animate-fade-up"
              style={
                {
                  animationDelay: `${i * 60}ms`,
                  ["--spine" as string]: b.spine,
                } as React.CSSProperties
              }
            >
              {/* spine */}
              <div
                className="absolute left-0 top-4 bottom-4 w-1.5 rounded-r-full"
                style={{ background: b.spine }}
              />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div
                    className="font-hand text-xs uppercase tracking-[0.18em]"
                    style={{ color: b.spine }}
                  >
                    {b.category}
                  </div>
                  <h3 className="font-display text-xl font-semibold mt-1 leading-tight">
                    {b.name}
                  </h3>
                </div>
                <StatusPill status={b.status} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                {b.summary}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground/80">
                <span className="font-hand text-sm">{b.stage}</span>
                <span>updated {b.updated}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground">
              No books match these filters.
            </div>
          )}
        </div>
      </div>

      {open && <BookDrawer book={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] transition"
      style={{
        borderColor: active ? tone ?? "var(--ember)" : "oklch(0.3 0.02 60)",
        background: active
          ? `${tone ?? "var(--ember)"}33`
          : "oklch(0.14 0.02 60 / 0.6)",
        color: active ? "oklch(0.96 0.02 80)" : "oklch(0.72 0.02 60)",
      }}
    >
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: Status }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
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
      <div
        className="absolute inset-0 bg-[oklch(0.1_0.02_60/0.7)] backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl overflow-y-auto border-l-2 bg-[oklch(0.13_0.02_60)] p-6 md:p-8 animate-fade-up"
        style={{ borderColor: book.spine, animationDuration: "0.25s" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className="font-hand text-xs uppercase tracking-[0.2em]"
              style={{ color: book.spine }}
            >
              {book.category} · {book.stage}
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mt-1">
              {book.name}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <StatusPill status={book.status} />
              <span className="text-xs text-muted-foreground">
                updated {book.updated}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-muted-foreground hover:text-foreground"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        <p className="mt-5 text-muted-foreground leading-relaxed">
          {book.summary}
        </p>

        <Section title="Chapters">
          <ol className="space-y-2">
            {book.chapters.map((c, i) => (
              <li
                key={i}
                className="rounded-lg border border-border/60 bg-[oklch(0.16_0.02_60/0.6)] p-3"
              >
                <div className="font-display text-sm font-semibold">
                  {i + 1}. {c.title}
                </div>
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
            {book.adminNotes ?? "—"}
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <h3 className="font-hand text-xs uppercase tracking-[0.22em] text-muted-foreground mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-6">
      <h3 className="font-hand text-xs uppercase tracking-[0.22em] text-muted-foreground mb-2">
        {title}
      </h3>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground/70">
          empty
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li
              key={i}
              className="rounded-lg border border-border/60 bg-[oklch(0.16_0.02_60/0.6)] px-3 py-2 text-sm"
            >
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}