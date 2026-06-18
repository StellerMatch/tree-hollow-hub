import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — DaBotTree" },
      {
        name: "description",
        content:
          "Your DaBotTree dashboard: created programs, saved apps, active ideas, completed projects, and stats.",
      },
    ],
  }),
  component: DashboardPage,
});

const STATS = [
  { label: "Created", value: 3, hue: "oklch(0.7 0.18 200)" },
  { label: "Saved", value: 7, hue: "oklch(0.78 0.18 50)" },
  { label: "Active ideas", value: 2, hue: "oklch(0.6 0.22 145)" },
  { label: "Completed", value: 4, hue: "oklch(0.72 0.16 280)" },
];

const CREATED = [
  { name: "Lantern Notes", stage: "Polishing", updated: "2d ago" },
  { name: "Acorn Tasks", stage: "Seed", updated: "3w ago" },
  { name: "Hollow Site", stage: "Polishing", updated: "yesterday" },
];

const SAVED = [
  { name: "Branch Sync", from: "OG DaBotTree" },
  { name: "Cozy Commerce", from: "Collective" },
  { name: "Kettle Whistle Show", from: "Collective" },
];

const ACTIVE = [
  { name: "Lantern Notes", chapter: "Chapter 4 · Polish" },
  { name: "Hollow Site", chapter: "Chapter 4 · Polish" },
];

const COMPLETED = [
  { name: "Branch Sync", launched: "1w ago" },
  { name: "Forest Timer", launched: "2mo ago" },
];

function DashboardPage() {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[oklch(0.12_0.02_60)] to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
        <header className="mb-8 animate-fade-up">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              ← Canopy
            </Link>
            <span>/</span>
            <span>you</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-semibold mt-2">
            Your Dashboard
          </h1>
          <p className="font-hand text-lg text-muted-foreground mt-1">
            what you've built, saved, launched, and still have in progress.
          </p>
        </header>

        {/* stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="rounded-2xl border-2 border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-4 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className="font-hand text-xs uppercase tracking-[0.18em]"
                style={{ color: s.hue }}
              >
                {s.label}
              </div>
              <div className="font-display text-3xl font-semibold mt-1">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Panel title="Created programs" emoji="🛠️">
            <ul className="space-y-2">
              {CREATED.map((p) => (
                <Row key={p.name} left={p.name} right={p.updated} sub={p.stage} />
              ))}
            </ul>
          </Panel>

          <Panel title="Saved from the shelves" emoji="📥">
            <ul className="space-y-2">
              {SAVED.map((p) => (
                <Row key={p.name} left={p.name} right={p.from} />
              ))}
            </ul>
          </Panel>

          <Panel title="Active ideas in the House" emoji="🏠">
            <ul className="space-y-2">
              {ACTIVE.map((p) => (
                <Row key={p.name} left={p.name} sub={p.chapter} />
              ))}
            </ul>
          </Panel>

          <Panel title="Completed & launched" emoji="🎉">
            <ul className="space-y-2">
              {COMPLETED.map((p) => (
                <Row key={p.name} left={p.name} right={p.launched} />
              ))}
            </ul>
          </Panel>
        </div>

        <div className="mt-8 rounded-2xl border border-border/60 bg-[oklch(0.16_0.02_60/0.6)] p-5 animate-fade-up">
          <div className="font-hand text-xs uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Settings · Profile
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SettingChip label="Display name" value="you" />
            <SettingChip label="Notifications" value="On" />
            <SettingChip label="Theme" value="Forest dark" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-5 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Row({
  left,
  right,
  sub,
}: {
  left: string;
  right?: string;
  sub?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-[oklch(0.14_0.02_60/0.6)] p-3">
      <div>
        <div className="font-display text-sm font-semibold">{left}</div>
        {sub && (
          <div className="font-hand text-xs text-muted-foreground">{sub}</div>
        )}
      </div>
      {right && (
        <span className="text-xs text-muted-foreground">{right}</span>
      )}
    </li>
  );
}

function SettingChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-[oklch(0.14_0.02_60/0.6)] p-3">
      <div className="font-hand text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  );
}