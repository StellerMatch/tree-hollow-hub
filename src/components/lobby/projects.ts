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
    tagline: "the family tree",
    description:
      "A map of every bot, room, and level in the DaBotTree system. See who is connected to who and how all the branches fit together.",
    href: "/openclaw",
    icon: "🌲",
    kind: "door",
    hue: "oklch(0.78 0.18 50)",
  },
  {
    id: "zombie-football",
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
    id: "video-tools",
    name: "OG DaBotTree",
    tagline: "house creations",
    description:
      "Final programs and products built by the original admin team. The flagship shelf of in-house DaBotTree creations.",
    href: "#",
    icon: "💎",
    kind: "window",
    hue: "oklch(0.7 0.18 200)",
  },
  {
    id: "experiments",
    name: "DaBotTree Collective",
    tagline: "community creations",
    description:
      "Final programs and products made by other users through DaBotTree House. A shared catalog of everything the community has shipped.",
    href: "/project-creator",
    icon: "🤝",
    kind: "door",
    hue: "oklch(0.72 0.16 280)",
  },
  {
    id: "notes",
    name: "DaBotTree Individual",
    tagline: "your personal collection",
    description:
      "Your personal shelf. Holds the programs you have built plus anything you saved from OG DaBotTree or the Collective.",
    href: "#",
    icon: "👤",
    kind: "sign",
    hue: "oklch(0.8 0.16 85)",
  },
  {
    id: "mystery",
    name: "DaBotTree Future",
    tagline: "the idea garden",
    description:
      "A think-tank and idea garden. Explore, submit, and shape new ideas here. When one is ready, send it over to DaBotTree House.",
    href: "#",
    icon: "💡",
    kind: "mystery",
    hue: "oklch(0.65 0.2 0)",
  },
];