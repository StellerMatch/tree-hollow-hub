export type Project = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  icon: string;
  kind: "door" | "stall" | "window" | "tunnel" | "sign" | "mystery";
  hue: string; // accent color
};

export const PROJECTS: Project[] = [
  {
    id: "openclaw",
    name: "DaBotTree Family",
    tagline: "the workshop in the canopy",
    description:
      "An open workbench for bots, agents, and small claws that fetch things. Tools clatter behind the door.",
    href: "/openclaw",
    icon: "🦾",
    kind: "door",
    hue: "oklch(0.78 0.18 50)",
  },
  {
    id: "zombie-football",
    name: "DaBotTree House",
    tagline: "stadium under the roots",
    description:
      "Eleven on eleven, but most of them are decomposing. A weird sports thing in progress.",
    href: "#",
    icon: "🏈",
    kind: "tunnel",
    hue: "oklch(0.6 0.22 145)",
  },
  {
    id: "video-tools",
    name: "OG DaBotTree",
    tagline: "the cutting room window",
    description:
      "Little utilities for trimming, ripping, and reassembling moving pictures. Light leaks out the glass.",
    href: "#",
    icon: "🎞️",
    kind: "window",
    hue: "oklch(0.7 0.18 200)",
  },
  {
    id: "experiments",
    name: "DaBotTree Collective",
    tagline: "the operations room",
    description:
      "One source of truth for a project — clarity, handoffs, receipts, and artifacts behind a single warm door.",
    href: "/project-creator",
    icon: "🗂️",
    kind: "door",
    hue: "oklch(0.72 0.16 280)",
  },
  {
    id: "notes",
    name: "DaBotTree Individual",
    tagline: "the chalkboard alcove",
    description:
      "Half-thoughts pinned to bark. Some of these will become projects. Most won't.",
    href: "#",
    icon: "📓",
    kind: "sign",
    hue: "oklch(0.8 0.16 85)",
  },
  {
    id: "mystery",
    name: "DaBotTree Future",
    tagline: "?",
    description:
      "It hums when you stand near it. The handle is warm. Probably fine to open.",
    href: "#",
    icon: "🚪",
    kind: "mystery",
    hue: "oklch(0.65 0.2 0)",
  },
];