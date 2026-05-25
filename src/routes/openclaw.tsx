import { createFileRoute, Link } from "@tanstack/react-router";
import { LEVELS, type Character } from "@/components/openclaw/roster";
import { useState } from "react";

export const Route = createFileRoute("/openclaw")({
  component: OpenClawPage,
  head: () => ({
    meta: [
      { title: "OpenClaw — the roster of the tree" },
      {
        name: "description",
        content:
          "The cast of characters that live in DaBotTree, level by level.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const ORANGE = "oklch(0.78 0.18 50)";
const ORANGE_SOFT = "oklch(0.78 0.18 50 / 0.18)";
const ORANGE_GLOW = "oklch(0.78 0.18 50 / 0.45)";

function OpenClawPage() {
  const [open, setOpen] = useState<Character | null>(null);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient warm lights */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-[5%] top-[10%] h-80 w-80 rounded-full opacity-30 animate-flicker"
          style={{ background: `radial-gradient(circle, ${ORANGE_GLOW}, transparent 70%)` }}
        />
        <div
          className="absolute right-[5%] top-[30%] h-72 w-72 rounded-full opacity-25 animate-flicker"
          style={{
            background: `radial-gradient(circle, ${ORANGE_GLOW}, transparent 70%)`,
            animationDelay: "1.2s",
          }}
        />
        <div
          className="absolute bottom-[5%] left-[40%] h-96 w-96 rounded-full opacity-20 animate-flicker"
          style={{
            background: `radial-gradient(circle, ${ORANGE_GLOW}, transparent 70%)`,
            animationDelay: "0.5s",
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[oklch(0.12_0.02_60)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[oklch(0.12_0.02_60)] to-transparent" />

      <div className="relative mx-auto max-w-5xl px-4 py-10 md:py-16">
        {/* header */}
        <header className="mb-10 flex items-center justify-between animate-fade-up">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <span className="transition group-hover:-translate-x-0.5">←</span>
            <span className="font-hand text-base">back to the lobby</span>
          </Link>
          <div className="hidden md:flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
            <span
              className="inline-block h-2 w-2 rounded-full animate-pulse"
              style={{ background: ORANGE }}
            />
            openclaw
          </div>
        </header>

        {/* title */}
        <div
          className="mb-12 md:mb-16 text-center animate-fade-up"
          style={{ animationDelay: "150ms" }}
        >
          <div
            className="font-hand text-lg md:text-xl mb-2"
            style={{ color: ORANGE }}
          >
            the workshop in the canopy
          </div>
          <h1
            className="font-display text-5xl md:text-7xl font-semibold leading-tight"
            style={{
              background: `linear-gradient(180deg, ${ORANGE}, oklch(0.6 0.18 35))`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            OpenClaw
          </h1>
          <p className="mt-4 mx-auto max-w-xl font-hand text-lg md:text-xl text-muted-foreground">
            the roster of the tree — who lives on which level, and what they
            quietly do all day.
          </p>
        </div>

        {/* levels */}
        <div className="relative">
          {/* trunk line */}
          <div
            className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block"
            style={{
              background: `linear-gradient(180deg, transparent, ${ORANGE_SOFT}, transparent)`,
            }}
          />

          <div className="space-y-16 md:space-y-24">
            {LEVELS.map((level, lIdx) => (
              <section
                key={level.id}
                className="relative animate-fade-up"
                style={{ animationDelay: `${250 + lIdx * 120}ms` }}
              >
                {/* level header */}
                <div className="mb-6 md:mb-8 text-center">
                  <div className="text-3xl md:text-4xl animate-sway inline-block">
                    {level.icon}
                  </div>
                  <h2
                    className="mt-2 font-display text-2xl md:text-3xl font-semibold"
                    style={{ color: ORANGE }}
                  >
                    {level.name}
                  </h2>
                  <div className="font-hand text-sm md:text-base text-muted-foreground">
                    {level.subtitle}
                  </div>
                </div>

                {/* characters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {level.characters.map((c) => (
                    <CharacterCard
                      key={c.id}
                      character={c}
                      onClick={() => setOpen(c)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div
          className="mt-20 h-2 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${ORANGE_SOFT}, transparent)`,
          }}
        />
        <p className="mt-6 text-center font-hand text-sm text-muted-foreground/70">
          more characters move in as the tree grows.
        </p>
      </div>

      {open && <CharacterModal character={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CharacterCard({
  character,
  onClick,
}: {
  character: Character;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-2xl border-2 bark-texture p-5 md:p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_oklch(0.78_0.18_50_/_0.5)]"
      style={{ borderColor: ORANGE_SOFT }}
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, ${ORANGE_SOFT}, transparent 70%)`,
        }}
      />
      <div className="relative flex items-start gap-4">
        {/* hero photo slot */}
        <div
          className="relative shrink-0 h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden flex items-center justify-center text-4xl md:text-5xl"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${ORANGE_SOFT}, oklch(0.18 0.02 60))`,
            boxShadow: `inset 0 0 20px oklch(0.1 0.02 60 / 0.8)`,
          }}
        >
          {character.photo ? (
            <img
              src={character.photo}
              alt={character.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="drop-shadow-lg">{character.emoji}</span>
          )}
          <div
            className="absolute inset-0 ring-1 ring-inset rounded-2xl"
            style={{ boxShadow: `inset 0 0 0 1px ${ORANGE_SOFT}` }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="font-hand text-sm"
            style={{ color: ORANGE }}
          >
            {character.role}
          </div>
          <h3 className="font-display text-xl md:text-2xl font-semibold leading-tight">
            {character.name}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {character.description}
          </p>
        </div>
      </div>
    </button>
  );
}

function CharacterModal({
  character,
  onClose,
}: {
  character: Character;
  onClose: () => void;
}) {
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
        style={{ borderColor: ORANGE }}
      >
        <div
          className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at top, ${ORANGE}, transparent 70%)`,
          }}
        />
        <div className="relative">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div
              className="h-24 w-24 md:h-28 md:w-28 rounded-2xl overflow-hidden flex items-center justify-center text-5xl md:text-6xl"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${ORANGE_SOFT}, oklch(0.18 0.02 60))`,
                boxShadow: `inset 0 0 24px oklch(0.1 0.02 60 / 0.8)`,
              }}
            >
              {character.photo ? (
                <img
                  src={character.photo}
                  alt={character.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="drop-shadow-lg">{character.emoji}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-2xl text-muted-foreground transition hover:text-foreground"
              aria-label="close"
            >
              ✕
            </button>
          </div>
          <div className="font-hand text-base" style={{ color: ORANGE }}>
            {character.role}
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold leading-tight mt-1">
            {character.name}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {character.description}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl px-4 py-3 text-center font-display text-lg font-semibold transition hover:scale-[1.02]"
              style={{
                background: ORANGE,
                color: "oklch(0.15 0.03 60)",
                boxShadow: `0 0 30px ${ORANGE_GLOW}`,
              }}
            >
              close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}