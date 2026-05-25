import type { Project } from "./projects";
import { useEffect } from "react";

export function ProjectModal({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-up"
      style={{ animationDuration: "0.3s" }}
    >
      <div
        className="absolute inset-0 bg-[oklch(0.1_0.02_60/0.85)] backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md bark-texture rounded-3xl border-2 p-6 md:p-8 shadow-[var(--shadow-deep)]"
        style={{ borderColor: project.hue }}
      >
        <div
          className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${project.hue} 0%, transparent 70%)` }}
        />
        <div className="relative">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="text-5xl md:text-6xl drop-shadow-lg">{project.icon}</div>
            <button
              onClick={onClose}
              className="text-2xl text-muted-foreground transition hover:text-foreground"
              aria-label="close"
            >
              ✕
            </button>
          </div>
          <div className="font-hand text-base" style={{ color: project.hue }}>
            {project.tagline}
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold leading-tight mt-1">
            {project.name}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">{project.description}</p>

          <div className="mt-6 flex gap-3">
            <a
              href={project.href}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl px-4 py-3 text-center font-display text-lg font-semibold transition hover:scale-[1.02]"
              style={{
                background: project.hue,
                color: "oklch(0.15 0.03 60)",
                boxShadow: `0 0 30px ${project.hue}80`,
              }}
            >
              Open project →
            </a>
            <button
              onClick={onClose}
              className="rounded-xl border border-border/60 px-4 py-3 text-sm text-muted-foreground transition hover:text-foreground"
            >
              back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}