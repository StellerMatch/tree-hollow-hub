import { createFileRoute, Link } from "@tanstack/react-router";

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

type Tile = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  href: string;
  hue: string;
  enabled: boolean;
};

const TILES: Tile[] = [
  {
    id: "family-tree",
    name: "Family Tree",
    tagline: "the system map",
    description:
      "Visual map of every bot, room, level, relationship, and connection across DaBotTree.",
    icon: "🌲",
    href: "/openclaw",
    hue: "oklch(0.78 0.18 50)",
    enabled: true,
  },
  {
    id: "master-library",
    name: "Master Library",
    tagline: "project bookshelf",
    description:
      "Every project that walks through DaBotTree House is saved here as a book.",
    icon: "📚",
    href: "/master-library",
    hue: "oklch(0.7 0.18 200)",
    enabled: true,
  },
  {
    id: "system-map",
    name: "System Map",
    tagline: "how it all connects",
    description:
      "Overview of how Canopy, House, OG, Collective, Individual, and Future fit together.",
    icon: "🗺️",
    href: "#",
    hue: "oklch(0.6 0.22 145)",
    enabled: false,
  },
  {
    id: "project-records",
    name: "Project Records",
    tagline: "packets & decisions",
    description:
      "Internal records: packets, decisions, answers, outputs, handoffs, and project status.",
    icon: "🗂️",
    href: "/master-library",
    hue: "oklch(0.72 0.16 280)",
    enabled: true,
  },
  {
    id: "admin-controls",
    name: "Admin Controls",
    tagline: "settings & tools",
    description:
      "Placeholder for future admin-only controls — settings, roles, integrations, and toggles.",
    icon: "⚙️",
    href: "#",
    hue: "oklch(0.8 0.16 85)",
    enabled: false,
  },
];

function AdminPage() {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[oklch(0.12_0.02_60)] to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
        <header className="mb-10 animate-fade-up">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              ← Canopy
            </Link>
            <span>/</span>
            <span className="text-[var(--ember)]">admin</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-semibold mt-2">
            DaBotTree Admin
          </h1>
          <p className="font-hand text-lg text-muted-foreground mt-1">
            the command room. deeper internal tools live here.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t, i) => {
            const card = (
              <div
                className="group relative h-full rounded-2xl border-2 border-border/60 bg-[oklch(0.18_0.02_60/0.7)] p-5 transition hover:-translate-y-1 hover:border-[color:var(--spine)] hover:shadow-[var(--shadow-deep)]"
                style={{ ["--spine" as string]: t.hue } as React.CSSProperties}
              >
                <div
                  className="absolute left-0 top-4 bottom-4 w-1.5 rounded-r-full"
                  style={{ background: t.hue }}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="text-3xl">{t.icon}</div>
                  {!t.enabled && (
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      soon
                    </span>
                  )}
                </div>
                <div
                  className="font-hand text-xs uppercase tracking-[0.18em] mt-3"
                  style={{ color: t.hue }}
                >
                  {t.tagline}
                </div>
                <h3 className="font-display text-xl font-semibold mt-1 leading-tight">
                  {t.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.description}
                </p>
              </div>
            );
            return (
              <div
                key={t.id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {t.enabled && t.href.startsWith("/") ? (
                  <Link to={t.href} className="block h-full">
                    {card}
                  </Link>
                ) : (
                  <div className="h-full opacity-80">{card}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}