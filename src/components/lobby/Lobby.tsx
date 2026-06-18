import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { PROJECTS, type Project } from "./projects";
import { Entrance } from "./Entrance";
import { ProjectModal } from "./ProjectModal";

export function Lobby() {
  const [selected, setSelected] = useState<Project | null>(null);

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
            <Link
              to="/master-library"
              className="group flex items-center gap-2 rounded-full border border-border/60 bg-[oklch(0.18_0.02_60/0.6)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:border-[var(--ember)] hover:text-foreground"
              title="Admin only"
            >
              <span>📚</span>
              <span className="hidden sm:inline">Master Library</span>
              <span className="rounded-full bg-[var(--ember)]/20 px-1.5 py-0.5 text-[9px] tracking-wider text-[var(--ember)]">
                admin
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground/80 uppercase tracking-[0.2em]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--ember)] animate-pulse" />
              lobby open
            </div>
          </div>
        </header>

        {/* whisper */}
        <div className="mb-14 md:mb-20 text-center animate-fade-up" style={{ animationDelay: "200ms" }}>
          <p className="font-hand text-xl md:text-2xl text-muted-foreground">
            six little doorways. pick one.
          </p>
        </div>

        {/* the floor of entrances */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 md:gap-x-8 md:gap-y-16">
          {PROJECTS.map((p, i) => (
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