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
      "Meet the characters. See who does what and how the branches connect. The full lineage lives here.",
    href: "/openclaw",
    icon: "🌲",
    kind: "door",
    hue: "oklch(0.78 0.18 50)",
  },
  {
    id: "zombie-football",
    name: "DaBotTree House",
    tagline: "the creative hub",
    description:
      "Bring an idea and turn it into an app, a story, or anything you dream. This is where making begins.",
    href: "#",
    icon: "🏠",
    kind: "tunnel",
    hue: "oklch(0.6 0.22 145)",
  },
  {
    id: "video-tools",
    name: "OG DaBotTree",
    tagline: "our in-house babies",
    description:
      "Programs we build ourselves, hand-crafted and cared for. These are the original creations that started it all.",
    href: "#",
    icon: "💎",
    kind: "window",
    hue: "oklch(0.7 0.18 200)",
  },
  {
    id: "experiments",
    name: "DaBotTree Collective",
    tagline: "the community catalog",
    description:
      "A shared library of programs made by everyone on the platform. Browse, discover, and see what others have built with our system.",
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
      "Everything you have made and everything you are using. Your projects, your apps, your own little corner of the tree.",
    href: "#",
    icon: "👤",
    kind: "sign",
    hue: "oklch(0.8 0.16 85)",
  },
  {
    id: "mystery",
    name: "DaBotTree Future",
    tagline: "the idea lab",
    description:
      "No idea yet? No problem. Throw things against the wall, play around, and see what sticks. When something clicks, take it to the House.",
    href: "#",
    icon: "💡",
    kind: "mystery",
    hue: "oklch(0.65 0.2 0)",
  },
];