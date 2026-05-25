import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BOT_TREE, defaultExpanded, type BotNode } from "@/components/openclaw/tree-data";

export const Route = createFileRoute("/openclaw")({
  component: OpenClawPage,
  head: () => ({
    meta: [
      { title: "OG DaBotTree" },
      {
        name: "description",
        content:
          "The living hierarchy of OG DaBotTree — who sits on which branch of the Bot Tree, and what they quietly do all day.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const AMBER = "oklch(0.78 0.18 50)";
const AMBER_SOFT = "oklch(0.78 0.18 50 / 0.18)";
const AMBER_LINE = "oklch(0.78 0.18 50 / 0.35)";
const AMBER_GLOW = "oklch(0.78 0.18 50 / 0.45)";
const EMERALD = "oklch(0.7 0.14 160)";

function OpenClawPage() {
  const [selected, setSelected] = useState<BotNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => defaultExpanded(BOT_TREE));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const counts = useMemo(() => countNodes(BOT_TREE), []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient warm lanterns */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-[5%] top-[10%] h-80 w-80 rounded-full opacity-30 animate-flicker"
          style={{ background: `radial-gradient(circle, ${AMBER_GLOW}, transparent 70%)` }}
        />
        <div
          className="absolute right-[5%] top-[35%] h-72 w-72 rounded-full opacity-25 animate-flicker"
          style={{
            background: `radial-gradient(circle, ${AMBER_GLOW}, transparent 70%)`,
            animationDelay: "1.2s",
          }}
        />
        <div
          className="absolute bottom-[5%] left-[40%] h-96 w-96 rounded-full opacity-20 animate-flicker"
          style={{
            background: `radial-gradient(circle, ${AMBER_GLOW}, transparent 70%)`,
            animationDelay: "0.5s",
          }}
        />
        {/* drifting sparks */}
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="absolute animate-drift text-[10px]"
            style={{
              left: `${(i * 11) % 100}%`,
              animationDelay: `${i * 1.7}s`,
              animationDuration: `${16 + (i % 5) * 2}s`,
              color: AMBER,
            }}
          >
            ✦
          </span>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[oklch(0.12_0.02_60)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[oklch(0.12_0.02_60)] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* header bar */}
        <header className="mb-8 flex items-center justify-between animate-fade-up">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <span className="transition group-hover:-translate-x-0.5">←</span>
            <span className="font-hand text-base">back to the lobby</span>
          </Link>
          <div className="hidden md:flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
            <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ background: AMBER }} />
            og dabottree
          </div>
        </header>

        {/* title */}
        <div className="mb-10 md:mb-14 text-center animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="font-hand text-lg md:text-xl mb-2" style={{ color: AMBER }}>
            the workshop in the canopy
          </div>
          <h1
            className="font-display text-5xl md:text-7xl font-semibold leading-tight"
            style={{
              background: `linear-gradient(180deg, ${AMBER}, oklch(0.6 0.18 35))`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            OG DaBotTree
          </h1>
          <p className="mt-4 mx-auto max-w-xl font-hand text-lg md:text-xl text-muted-foreground">
            who lives on which level, and what they quietly do all day.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
            <span>{counts.groups} branches</span>
            <span className="opacity-40">·</span>
            <span>{counts.bots} bots</span>
          </div>
        </div>

        {/* main: tree */}
        <div
          className="relative rounded-3xl border-2 bark-texture p-4 md:p-8 animate-fade-up"
          style={{ borderColor: AMBER_SOFT, animationDelay: "200ms" }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl opacity-30"
            style={{ background: `radial-gradient(ellipse at top, ${AMBER_SOFT}, transparent 70%)` }}
          />
          <div className="relative">
            <TreeNode
              node={BOT_TREE}
              depth={0}
              isLast
              expanded={expanded}
              onToggle={toggle}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          </div>
        </div>

        {/* detail modal */}
        <DetailModal node={selected} onClose={() => setSelected(null)} />

        <div
          className="mt-12 h-2 rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${AMBER_SOFT}, transparent)` }}
        />
        <p className="mt-6 text-center font-hand text-sm text-muted-foreground/70">
          the tree creaks. somewhere, a bot is sharpening a tool.
        </p>
      </div>
    </div>
  );
}

// ---------- Tree ----------

function TreeNode({
  node,
  depth,
  isLast,
  expanded,
  onToggle,
  selectedId,
  onSelect,
}: {
  node: BotNode;
  depth: number;
  isLast: boolean;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (n: BotNode) => void;
}) {
  const hasChildren = !!node.children?.length;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div className="relative">
      <NodePill
        node={node}
        depth={depth}
        isOpen={isOpen}
        isSelected={isSelected}
        hasChildren={hasChildren}
        onToggle={() => hasChildren && onToggle(node.id)}
        onSelect={() => onSelect(node)}
      />

      {hasChildren && isOpen && (
        <div
          className="relative mt-2 ml-4 md:ml-6 pl-4 md:pl-6 space-y-2"
          style={{
            borderLeft: `1px dashed ${AMBER_LINE}`,
          }}
        >
          {node.children!.map((c, i) => (
            <div key={c.id} className="relative">
              {/* connector tick */}
              <div
                className="absolute top-[22px] -left-4 md:-left-6 w-4 md:w-6 h-px"
                style={{ background: AMBER_LINE }}
              />
              <TreeNode
                node={c}
                depth={depth + 1}
                isLast={i === node.children!.length - 1}
                expanded={expanded}
                onToggle={onToggle}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NodePill({
  node,
  depth,
  isOpen,
  isSelected,
  hasChildren,
  onToggle,
  onSelect,
}: {
  node: BotNode;
  depth: number;
  isOpen: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const isBoss = node.kind === "boss";
  const isGroup = node.kind === "group";
  const isBot = node.kind === "bot";

  const borderColor = isSelected ? AMBER : isGroup ? AMBER_LINE : AMBER_SOFT;
  const bg = isSelected
    ? `linear-gradient(135deg, ${AMBER_SOFT}, transparent)`
    : "transparent";

  return (
    <div
      className="group flex items-stretch gap-2 rounded-2xl border transition"
      style={{
        borderColor,
        background: bg,
        boxShadow: isSelected ? `0 0 30px ${AMBER_GLOW}` : undefined,
      }}
    >
      {/* expand toggle */}
      {hasChildren ? (
        <button
          onClick={onToggle}
          aria-label={isOpen ? "collapse" : "expand"}
          className="flex items-center justify-center w-9 shrink-0 rounded-l-2xl text-sm text-muted-foreground transition hover:text-foreground hover:bg-[oklch(0.3_0.03_60_/_0.4)]"
        >
          <span
            className="inline-block transition-transform"
            style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▸
          </span>
        </button>
      ) : (
        <div className="w-9 shrink-0 flex items-center justify-center">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: AMBER_LINE }} />
        </div>
      )}

      {/* body */}
      <button
        onClick={() => (isBot || isBoss ? onSelect() : onToggle())}
        className="flex-1 flex items-center gap-3 py-2.5 pr-3 text-left rounded-r-2xl transition hover:bg-[oklch(0.3_0.03_60_/_0.3)]"
      >
        {/* avatar */}
        <Avatar node={node} isBoss={isBoss} isGroup={isGroup} isSelected={isSelected} />

        {/* labels */}
        <div className="min-w-0 flex-1">
          {node.tier && depth <= 1 && (
            <div
              className="font-hand text-[11px] uppercase tracking-[0.2em] leading-none mb-0.5"
              style={{ color: EMERALD }}
            >
              {node.tier}
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={
                isBoss
                  ? "font-display text-xl md:text-2xl font-semibold truncate"
                  : isGroup
                  ? "font-display text-base md:text-lg font-semibold truncate"
                  : "font-display text-base font-medium truncate"
              }
              style={isGroup ? { color: AMBER } : undefined}
            >
              {isBoss ? `👑 ${node.name}` : node.name}
            </span>
            {node.marker && (
              <span className="text-xs leading-none shrink-0" aria-label="marker">
                {node.marker}
              </span>
            )}
            {isGroup && node.children && (
              <span className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                {node.children.length}
              </span>
            )}
          </div>
          {node.role && !isGroup && (
            <div className="font-hand text-xs text-muted-foreground truncate">{node.role}</div>
          )}
        </div>
      </button>
    </div>
  );
}

function Avatar({
  node,
  isBoss,
  isGroup,
  isSelected,
}: {
  node: BotNode;
  isBoss: boolean;
  isGroup: boolean;
  isSelected: boolean;
}) {
  const size = isBoss ? "h-12 w-12 text-2xl" : "h-10 w-10 text-lg";
  const initials = node.name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`relative shrink-0 ${size} rounded-xl overflow-hidden flex items-center justify-center font-display`}
      style={{
        background: isGroup
          ? `linear-gradient(135deg, oklch(0.32 0.04 140 / 0.6), oklch(0.22 0.03 60))`
          : `radial-gradient(circle at 30% 30%, ${AMBER_SOFT}, oklch(0.18 0.02 60))`,
        boxShadow: isSelected
          ? `0 0 0 1px ${AMBER}, inset 0 0 12px oklch(0.1 0.02 60 / 0.8)`
          : `inset 0 0 12px oklch(0.1 0.02 60 / 0.8)`,
      }}
    >
      {node.image ? (
        <img src={node.image} alt={node.name} className="h-full w-full object-cover" />
      ) : isGroup ? (
        <span style={{ color: EMERALD }}>🌿</span>
      ) : (
        <span style={{ color: AMBER }}>{initials || "·"}</span>
      )}
    </div>
  );
}

// ---------- Detail modal ----------

function DetailModal({ node, onClose }: { node: BotNode | null; onClose: () => void }) {
  // close on escape
  useEffect(() => {
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [node, onClose]);

  if (!node) return null;

  const strengths = node.strengths ?? [
    "Add a strength here",
    "Another thing they're great at",
    "Quiet superpower",
  ];
  const weaknesses = node.weaknesses ?? [
    "A growth area",
    "Where they ask for help",
    "Something to watch",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${node.name} details`}
    >
      {/* backdrop */}
      <button
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.08_0.02_60_/_0.78)] backdrop-blur-sm animate-fade-in"
      />

      {/* dialog */}
      <div
        key={node.id}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 bark-texture shadow-[var(--shadow-deep)] animate-fade-up"
        style={{ borderColor: AMBER, animationDuration: "0.25s" }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-25"
          style={{ background: `radial-gradient(ellipse at top, ${AMBER}, transparent 70%)` }}
        />

        <button
          onClick={onClose}
          aria-label="close"
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border text-lg text-muted-foreground transition hover:text-foreground hover:bg-[oklch(0.3_0.03_60_/_0.5)]"
          style={{ borderColor: AMBER_SOFT, background: "oklch(0.15 0.02 60 / 0.6)" }}
        >
          ✕
        </button>

        <div className="relative grid gap-6 p-5 md:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* LEFT — mid shot */}
          <div className="space-y-4">
            {node.branch && (
              <div
                className="font-hand text-[11px] uppercase tracking-[0.2em] leading-none"
                style={{ color: EMERALD }}
              >
                {node.branch}
              </div>
            )}
            <div
              className="relative overflow-hidden rounded-2xl border aspect-[3/4] flex items-center justify-center"
              style={{
                borderColor: AMBER_SOFT,
                background: `radial-gradient(circle at 30% 30%, ${AMBER_SOFT}, oklch(0.14 0.02 60))`,
                boxShadow: `inset 0 0 24px oklch(0.08 0.02 60 / 0.9), 0 0 28px ${AMBER_GLOW}`,
              }}
            >
              {node.portrait ? (
                <img
                  src={node.portrait}
                  alt={`${node.name} — mid shot`}
                  className="h-full w-full object-cover object-[center_top]"
                />
              ) : node.image ? (
                <img
                  src={node.image}
                  alt={node.name}
                  className="h-full w-full object-cover object-[center_top]"
                />
              ) : (
                <span className="font-display text-6xl" style={{ color: AMBER }}>
                  {node.name
                    .replace(/[^a-zA-Z0-9 ]/g, "")
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "·"}
                </span>
              )}
            </div>
          </div>

          {/* RIGHT — info */}
          <div className="min-w-0">
            <h3 className="font-display text-3xl md:text-4xl font-semibold leading-tight">
              {node.name}
              {node.marker && (
                <span className="ml-2 text-base align-middle">{node.marker}</span>
              )}
            </h3>
            {node.role && (
              <div className="mt-1 font-hand text-base" style={{ color: AMBER }}>
                {node.role}
              </div>
            )}

            {node.description && (
              <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                {node.description}
              </p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatList
                title="strengths"
                items={strengths}
                color={EMERALD}
                isTemplate={!node.strengths}
              />
              <StatList
                title="weaknesses"
                items={weaknesses}
                color={AMBER}
                isTemplate={!node.weaknesses}
              />
            </div>

            {node.boundary && (
              <div
                className="mt-4 rounded-xl border p-3 text-xs leading-relaxed"
                style={{
                  borderColor: AMBER_SOFT,
                  background: "oklch(0.2 0.02 60 / 0.5)",
                  color: "oklch(0.85 0.04 80)",
                }}
              >
                <span
                  className="font-hand text-[11px] uppercase tracking-[0.18em]"
                  style={{ color: AMBER }}
                >
                  boundary
                </span>
                <div className="mt-1">{node.boundary}</div>
              </div>
            )}

            {node.children && node.children.length > 0 && (
              <div className="mt-5">
                <div className="font-hand text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-2">
                  under their wing
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {node.children.map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full border px-2.5 py-1 text-xs"
                      style={{ borderColor: AMBER_SOFT, color: "oklch(0.9 0.03 85)" }}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatList({
  title,
  items,
  color,
  isTemplate,
}: {
  title: string;
  items: string[];
  color: string;
  isTemplate: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-3"
      style={{ borderColor: AMBER_SOFT, background: "oklch(0.16 0.02 60 / 0.55)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-hand text-[11px] uppercase tracking-[0.2em]"
          style={{ color }}
        >
          {title}
        </span>
        {isTemplate && (
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
            template
          </span>
        )}
      </div>
      <ul className="space-y-1.5 text-xs md:text-sm text-muted-foreground">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span style={{ color }}>•</span>
            <span className={isTemplate ? "italic opacity-70" : ""}>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- helpers ----------

function countNodes(node: BotNode): { groups: number; bots: number } {
  let groups = 0;
  let bots = 0;
  const walk = (n: BotNode) => {
    if (n.kind === "group") groups++;
    if (n.kind === "bot") bots++;
    n.children?.forEach(walk);
  };
  walk(node);
  return { groups, bots };
}