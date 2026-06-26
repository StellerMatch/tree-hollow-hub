import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { PROJECTS, type Project } from "./projects";
import { Entrance } from "./Entrance";
import { ProjectModal } from "./ProjectModal";

export type Role = "admin" | "user";

function getInitialRole(): Role {
  if (typeof window === "undefined") return "admin";
  return (window.localStorage.getItem("dbt:role") as Role) || "admin";
}

export function Lobby() {
  const [selected, setSelected] = useState<Project | null>(null);
  const [role, setRole] = useState<Role>(getInitialRole);

  function toggleRole() {
    const next: Role = role === "admin" ? "user" : "admin";
    setRole(next);
    if (typeof window !== "undefined")
      window.localStorage.setItem("dbt:role", next);
  }

  // role-aware project list: first doorway swaps between Admin and Dashboard
  const projects: Project[] = useMemo(() => {
    const rest = PROJECTS.slice(1);
    const first: Project =
      role === "admin"
        ? {
            id: "admin",
            name: "DaBotTree Admin",
            tagline: "the command room",
            description:
              "Private admin hub. Family Tree, Master Library, System Map, Project Records, and admin controls all live behind this door.",
            href: "/admin",
            icon: "🛠️",
            kind: "door",
            hue: "oklch(0.78 0.18 50)",
          }
        : {
            id: "dashboard",
            name: "Your Dashboard",
            tagline: "your stats & shelf",
            description:
              "Your simple dashboard. See what you've built, what you've saved, what's still moving through the House, and your activity stats.",
            href: "/dashboard",
            icon: "📊",
            kind: "door",
            hue: "oklch(0.78 0.18 50)",
          };
    return [first, ...rest];
  }, [role]);

  // new top row of doorways (visual only for now)
  const topProjects: Project[] = useMemo(
    () => [
      {
        id: "top-admin",
        name: "DaBotTree Admin",
        tagline: "command room",
        description:
          "Private admin hub. Family Tree, Master Library, System Map, Project Records, and admin controls all live behind this door.",
        href: "/admin",
        icon: "🛠️",
        kind: "door",
        hue: "oklch(0.78 0.18 50)",
      },
      {
        id: "top-family",
        name: "DaBotTree Family",
        tagline: "the family tree",
        description:
          "A map of every bot, room, and level in the DaBotTree system. See who is connected to who and how all the branches fit together.",
        href: "/openclaw",
        icon: "🌲",
        kind: "stall",
        hue: "oklch(0.72 0.16 280)",
      },
      {
        id: "top-house",
        name: "DaBotTree House",
        tagline: "the creation engine",
        description:
          "The main creation engine. Bring an idea and walk it through guided levels and chapters until it becomes a finished project.",
        href: "#",
        icon: "🏠",
        kind: "tunnel",
        hue: "oklch(0.6 0.22 145)",
      },
      {
        id: "top-pond",
        name: "DaBotTree Pond",
        tagline: "still waters",
        description: "Coming soon — the DaBotTree Pond.",
        href: "#",
        icon: "🪷",
        kind: "window",
        hue: "oklch(0.7 0.18 200)",
      },
      {
        id: "top-farms",
        name: "DaBotTree Farms",
        tagline: "growing grounds",
        description: "Coming soon — the DaBotTree Farms.",
        href: "#",
        icon: "🌾",
        kind: "sign",
        hue: "oklch(0.8 0.16 85)",
      },
      {
        id: "top-caves",
        name: "DaBotTree Caves",
        tagline: "deep tunnels",
        description: "Coming soon — the DaBotTree Caves.",
        href: "#",
        icon: "🕳️",
        kind: "mystery",
        hue: "oklch(0.65 0.2 0)",
      },
      {
        id: "top-debauchery-library",
        name: "Debauchery Library",
        tagline: "the after-hours stacks",
        description:
          "Coming soon — the Debauchery Library. A private wing for unfiltered notes, late-night drafts, and ideas that don't fit the polite shelves.",
        href: "#",
        icon: "📚",
        kind: "window",
        hue: "oklch(0.55 0.18 330)",
      },
      {
        id: "top-debauchery-space",
        name: "Debauchery Space",
        tagline: "the back room",
        description:
          "Coming soon — the Debauchery Space. An open back room for loose experiments, rough play, and anything still finding its shape.",
        href: "#",
        icon: "🍷",
        kind: "mystery",
        hue: "oklch(0.5 0.2 340)",
      },
    ],
    [],
  );

  // floating leaves
  const leaves = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 18,
        duration: 14 + Math.random() * 10,
        size: 10 + Math.random() * 14,
        emoji: ["🍃", "🍂", "✨"][i % 3],
      })),
    [],
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient lights */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[5%] top-[8%] h-72 w-72 rounded-full bg-[var(--gradient-lantern)] opacity-30 animate-flicker" />
        <div className="absolute right-[8%] top-[20%] h-64 w-64 rounded-full bg-[var(--gradient-lantern)] opacity-25 animate-flicker" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-[5%] left-[30%] h-80 w-80 rounded-full bg-[var(--gradient-lantern)] opacity-20 animate-flicker" style={{ animationDelay: "0.7s" }} />
      </div>

      {/* drifting leaves */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {leaves.map((l) => (
          <span
            key={l.id}
            className="absolute animate-drift"
            style={{
              left: `${l.left}%`,
              fontSize: `${l.size}px`,
              animationDelay: `${l.delay}s`,
              animationDuration: `${l.duration}s`,
            }}
          >
            {l.emoji}
          </span>
        ))}
      </div>

      {/* canopy bark frame */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[oklch(0.12_0.02_60)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[oklch(0.12_0.02_60)] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-16">
        {/* tiny header */}
        <header className="mb-12 flex items-center justify-between animate-fade-up">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-sway inline-block">🌳</span>
            <div>
              <div className="font-display text-2xl font-semibold leading-none">DaBotTree</div>
              <div className="font-hand text-sm text-muted-foreground leading-tight">
                you're inside the trunk
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleRole}
              className="group flex items-center gap-2 rounded-full border border-border/60 bg-[oklch(0.18_0.02_60/0.6)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:border-[var(--ember)] hover:text-foreground"
              title="Toggle viewer role (visual mock)"
            >
              <span>{role === "admin" ? "🛠️" : "👤"}</span>
              <span className="hidden sm:inline">
                {role === "admin" ? "Admin view" : "User view"}
              </span>
              <span className="rounded-full bg-[var(--ember)]/20 px-1.5 py-0.5 text-[9px] tracking-wider text-[var(--ember)]">
                switch
              </span>
            </button>
            {role === "admin" && (
              <Link
                to="/master-library"
                className="hidden md:flex items-center gap-2 rounded-full border border-border/60 bg-[oklch(0.18_0.02_60/0.6)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:border-[var(--ember)] hover:text-foreground"
              >
                <span>📚</span>
                <span>Master Library</span>
              </Link>
            )}
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground/80 uppercase tracking-[0.2em]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--ember)] animate-pulse" />
              lobby open
            </div>
          </div>
        </header>

        {/* whisper */}
        <div className="mb-14 md:mb-20 text-center animate-fade-up" style={{ animationDelay: "200ms" }}>
          <p className="font-hand text-xl md:text-2xl text-muted-foreground">
            {role === "admin"
              ? "six little doorways. command room is first."
              : "six little doorways. your shelf is first."}
          </p>
        </div>

        {/* top row — new doorways */}
        <div className="mb-16 grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 md:grid-cols-6 md:gap-x-6 md:gap-y-12">
          {topProjects.map((p, i) => (
            <Entrance
              key={p.id}
              project={p}
              index={i}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>

        {/* divider between top row and original six */}
        <div className="mb-14 h-2 rounded-full bg-gradient-to-r from-transparent via-[oklch(0.35_0.04_70)] to-transparent" />

        {/* the floor of entrances */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 md:gap-x-8 md:gap-y-16">
          {projects.map((p, i) => (
            <Entrance
              key={p.id}
              project={p}
              index={i}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>

        {/* floor planks */}
        <div className="mt-20 h-2 rounded-full bg-gradient-to-r from-transparent via-[oklch(0.35_0.04_70)] to-transparent" />
        <p className="mt-6 text-center font-hand text-sm text-muted-foreground/70">
          the tree creaks. somewhere a kettle whistles.
        </p>
      </div>

      <ProjectModal project={selected} onClose={() => setSelected(null)} />
    </div>
  );
}