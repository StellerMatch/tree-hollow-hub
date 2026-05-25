import type { Project } from "./projects";

const KIND_SHAPE: Record<Project["kind"], string> = {
  door: "rounded-t-[50%] rounded-b-2xl",
  stall: "rounded-2xl",
  window: "rounded-full",
  tunnel: "rounded-t-[80%] rounded-b-md",
  sign: "rounded-xl -rotate-2",
  mystery: "rounded-t-[40%] rounded-b-3xl",
};

export function Entrance({
  project,
  onClick,
  index,
}: {
  project: Project;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center animate-fade-up"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      {/* hanging sign */}
      <div className="mb-2 origin-top animate-sway" style={{ animationDelay: `${index * 0.3}s` }}>
        <div
          className="font-hand text-base px-3 py-1 rounded-md border border-border/60 backdrop-blur-sm"
          style={{ background: "oklch(0.25 0.03 65 / 0.7)", color: project.hue }}
        >
          {project.tagline}
        </div>
      </div>

      {/* the opening */}
      <div className="relative">
        {/* glow halo */}
        <div
          className="absolute inset-0 -m-6 rounded-full opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-100 animate-pulse-glow"
          style={{ background: `radial-gradient(circle, ${project.hue} 0%, transparent 70%)` }}
        />

        {/* door / window frame */}
        <div
          className={`relative bark-texture flex h-44 w-32 md:h-56 md:w-40 items-center justify-center border-2 transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1 ${KIND_SHAPE[project.kind]}`}
          style={{
            borderColor: project.hue,
            boxShadow: `inset 0 0 30px oklch(0.1 0.02 60 / 0.8), 0 10px 30px oklch(0.1 0.02 60 / 0.6)`,
          }}
        >
          {/* interior glow */}
          <div
            className="absolute inset-2 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: `radial-gradient(ellipse at center 70%, ${project.hue} 0%, transparent 65%)`,
              borderRadius: "inherit",
              filter: "blur(8px)",
            }}
          />
          <span className="relative text-5xl md:text-6xl drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-110">
            {project.icon}
          </span>

          {/* lantern */}
          <div
            className="absolute -top-3 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full animate-flicker"
            style={{
              background: project.hue,
              boxShadow: `0 0 20px ${project.hue}, 0 0 40px ${project.hue}`,
              animationDelay: `${index * 0.4}s`,
            }}
          />
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className="font-display text-lg md:text-xl font-semibold text-foreground transition-colors group-hover:text-glow">
          {project.name}
        </div>
      </div>
    </button>
  );
}