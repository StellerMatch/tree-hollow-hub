export type Character = {
  id: string;
  name: string;
  role: string;
  description: string;
  emoji: string;
  photo?: string; // future hero photo URL
};

export type TreeLevel = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  characters: Character[];
};

export const LEVELS: TreeLevel[] = [
  {
    id: "canopy",
    name: "The Canopy",
    subtitle: "high above — the dreamers and lookouts",
    icon: "🌤️",
    characters: [
      {
        id: "lumen",
        name: "Lumen",
        role: "Lookout & lantern-keeper",
        description:
          "Watches the horizon for incoming ideas. Lights the lanterns so no thought arrives in the dark.",
        emoji: "🦉",
      },
      {
        id: "vesper",
        name: "Vesper",
        role: "Dream cartographer",
        description:
          "Sketches maps of half-remembered visions. Half of them turn out to be useful. The other half are weirder.",
        emoji: "🦋",
      },
    ],
  },
  {
    id: "branches",
    name: "The Branches",
    subtitle: "where the work gets built and tested",
    icon: "🌿",
    characters: [
      {
        id: "claw",
        name: "Claw",
        role: "Open-handed builder",
        description:
          "Reaches, grabs, assembles. The original OpenClaw — every bot in the tree owes it a few bolts.",
        emoji: "🦾",
      },
      {
        id: "ember",
        name: "Ember",
        role: "Forge & finisher",
        description:
          "Keeps the workshop warm. Welds rough prototypes into something that almost works on the first try.",
        emoji: "🔥",
      },
    ],
  },
  {
    id: "trunk",
    name: "The Trunk",
    subtitle: "the lobby — where everything passes through",
    icon: "🪵",
    characters: [
      {
        id: "barkeep",
        name: "Barkeep",
        role: "Lobby host",
        description:
          "Greets every visitor at the door. Remembers what each project needs and points you to the right stall.",
        emoji: "🍵",
      },
      {
        id: "knot",
        name: "Knot",
        role: "Keeper of loose ends",
        description:
          "Ties up the dangling threads nobody else wants to deal with. Surprisingly cheerful about it.",
        emoji: "🪢",
      },
    ],
  },
  {
    id: "roots",
    name: "The Roots",
    subtitle: "down deep — the quiet engines",
    icon: "🌱",
    characters: [
      {
        id: "mycel",
        name: "Mycel",
        role: "Data forager",
        description:
          "Threads through the soil collecting everything the tree needs to remember. Never loses a file.",
        emoji: "🍄",
      },
      {
        id: "drum",
        name: "Drum",
        role: "Heartbeat & uptime",
        description:
          "Keeps the slow rhythm that lets every level above run on time. You only hear them when something breaks.",
        emoji: "🥁",
      },
    ],
  },
];