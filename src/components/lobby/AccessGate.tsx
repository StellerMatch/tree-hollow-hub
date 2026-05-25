import { useState, useEffect } from "react";

const STORAGE_KEY = "dabottree.access";
const CODE = "1621";

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
      setUnlocked(true);
    }
    setReady(true);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim() === CODE) {
      localStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* ambient lanterns */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[12%] top-[18%] h-40 w-40 rounded-full bg-[var(--gradient-lantern)] opacity-60 animate-flicker" />
        <div className="absolute right-[14%] top-[30%] h-32 w-32 rounded-full bg-[var(--gradient-lantern)] opacity-50 animate-flicker" style={{ animationDelay: "1.2s" }} />
        <div className="absolute bottom-[10%] left-[40%] h-48 w-48 rounded-full bg-[var(--gradient-lantern)] opacity-40 animate-flicker" style={{ animationDelay: "0.6s" }} />
      </div>

      <div className={`relative w-full max-w-md animate-fade-up ${shaking ? "animate-pulse" : ""}`}>
        <div className="mb-8 text-center">
          <div className="mb-3 inline-block animate-sway text-5xl">🌳</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-glow">
            DaBotTree
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-hand text-base">
            whisper the word to enter the tree
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bark-texture rounded-3xl border border-border/60 p-6 shadow-[var(--shadow-deep)]"
        >
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
            access code
          </label>
          <input
            autoFocus
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            placeholder="••••••"
            className="w-full rounded-xl border border-border/60 bg-input/60 px-4 py-3 font-display text-2xl tracking-widest text-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/30"
          />
          {error && (
            <p className="mt-3 text-sm text-[oklch(0.75_0.22_25)] font-hand">
              the tree doesn't know that word…
            </p>
          )}
          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-display text-lg font-semibold text-primary-foreground transition hover:scale-[1.02] hover:lantern-glow"
          >
            knock
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          private project · no public entry
        </p>
      </div>
    </div>
  );
}