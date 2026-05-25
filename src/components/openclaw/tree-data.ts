export type NodeKind = "boss" | "group" | "bot";

export type BotNode = {
  id: string;
  name: string;
  kind: NodeKind;
  marker?: string;
  branch?: string;
  role?: string;
  image?: string;
  portrait?: string;
  description?: string;
  boundary?: string;
  /** Bullet list of strengths shown in the detail modal. */
  strengths?: string[];
  /** Bullet list of weaknesses / growth areas shown in the detail modal. */
  weaknesses?: string[];
  /** Short tier label shown above the node when relevant (e.g. "Trunk", "Canopy") */
  tier?: string;
  children?: BotNode[];
};

import bossHeadshot from "@/assets/boss-headshot.png";
import bossFullBody from "@/assets/boss-fullbody.png";
import chiefHeadshot from "@/assets/chief-headshot.png";
import chiefMidshot from "@/assets/chief-midshot.png";
import echoHeadshot from "@/assets/echo-headshot.png";
import echoMidshot from "@/assets/echo-midshot.png";
import ivyHeadshot from "@/assets/ivy-headshot.png";
import ivyMidshot from "@/assets/ivy-midshot.png";
import ledgerHeadshot from "@/assets/ledger-headshot.png";
import ledgerMidshot from "@/assets/ledger-midshot.png";
import shieldHeadshot from "@/assets/shield-headshot.png";
import shieldMidshot from "@/assets/shield-midshot.png";
import stagehandHeadshot from "@/assets/stagehand-headshot.png";
import stagehandMidshot from "@/assets/stagehand-midshot.png";
import tidyHeadshot from "@/assets/tidy-headshot.png";
import tidyMidshot from "@/assets/tidy-midshot.png";
import vaultHeadshot from "@/assets/vault-headshot.png";
import vaultMidshot from "@/assets/vault-midshot.png";
import lumaHeadshot from "@/assets/luma-headshot.png";
import lumaMidshot from "@/assets/luma-midshot.png";
import compassHeadshot from "@/assets/compass-headshot.png";
import compassMidshot from "@/assets/compass-midshot.png";
import raizHeadshot from "@/assets/raiz-headshot.png";
import raizMidshot from "@/assets/raiz-midshot.png";
import nerdHeadshot from "@/assets/nerd-headshot.png";
import nerdMidshot from "@/assets/nerd-midshot.png";
import saulHeadshot from "@/assets/saul-headshot.png";
import saulMidshot from "@/assets/saul-midshot.png";
import bloomHeadshot from "@/assets/bloom-headshot.png";
import bloomMidshot from "@/assets/bloom-midshot.png";
import rookHeadshot from "@/assets/rook-headshot.png";
import rookMidshot from "@/assets/rook-midshot.png";
import tinkerHeadshot from "@/assets/tinker-headshot.png";
import tinkerMidshot from "@/assets/tinker-midshot.png";
import weaverHeadshot from "@/assets/weaver-headshot.png";
import weaverMidshot from "@/assets/weaver-midshot.png";
import wardHeadshot from "@/assets/ward-headshot.png";
import wardMidshot from "@/assets/ward-midshot.png";
import sparkHeadshot from "@/assets/spark-headshot.png";
import sparkMidshot from "@/assets/spark-midshot.png";
import havenHeadshot from "@/assets/haven-headshot.png";
import havenMidshot from "@/assets/haven-midshot.png";
import museHeadshot from "@/assets/muse-headshot.png";
import museMidshot from "@/assets/muse-midshot.png";
import forgeHeadshot from "@/assets/forge-headshot.png";
import forgeMidshot from "@/assets/forge-midshot.png";
import mommaHeadshot from "@/assets/momma-headshot.png";
import mommaMidshot from "@/assets/momma-midshot.png";

/**
 * Edit this tree to add / remove / move bots.
 * `kind: "group"` renders as a collapsible branch header.
 * `kind: "bot"`   renders as a clickable bot node (opens detail panel).
 * `kind: "boss"`  renders as the crowned top node.
 * Any node can have children.
 */
export const BOT_TREE: BotNode = {
  id: "boss",
  name: "Boss",
  kind: "boss",
  tier: "Boss",
  role: "The one who planted the tree",
  image: bossHeadshot,
  portrait: bossFullBody,
  description:
    "Sits at the top of the canopy. Decides which branches grow and which ones get pruned.",
  children: [
    {
      id: "chief",
      name: "Chief",
      kind: "bot",
      tier: "Chief",
      role: "Right hand of the Boss",
      image: chiefHeadshot,
      portrait: chiefMidshot,
      description: "Carries orders down the trunk and brings news back up.",
    },
    {
      id: "high-council",
      name: "High Council",
      kind: "group",
      tier: "Trunk",
      children: [
        {
          id: "echo",
          name: "Echo",
          kind: "bot",
          branch: "High Council",
          role: "Voice of the Trunk",
          image: echoHeadshot,
          portrait: echoMidshot,
          description: "Carries decisions outward; makes sure the den hears them.",
          children: [
            {
              id: "fox-den",
              name: "Fox Den",
              kind: "group",
              children: [
                { id: "scout", name: "Scout", kind: "bot", branch: "Fox Den", role: "Pathfinder" },
                { id: "ticket", name: "Ticket", kind: "bot", branch: "Fox Den", role: "Intake & triage" },
                { id: "scribe-1", name: "Scribe 1", kind: "bot", branch: "Fox Den", role: "Note-taker" },
                { id: "scribe-2", name: "Scribe 2", kind: "bot", branch: "Fox Den", role: "Note-taker" },
                { id: "scribe-3", name: "Scribe 3", kind: "bot", branch: "Fox Den", role: "Note-taker" },
              ],
            },
          ],
        },
        {
          id: "ivy",
          name: "Ivy",
          kind: "bot",
          branch: "High Council",
          role: "Growth & connection",
          image: ivyHeadshot,
          portrait: ivyMidshot,
        },
        {
          id: "shadows",
          name: "The Shadows",
          kind: "group",
          children: [
            {
              id: "ledger",
              name: "Ledger",
              kind: "bot",
              branch: "The Shadows",
              role: "Keeper of records",
              image: ledgerHeadshot,
              portrait: ledgerMidshot,
            },
            {
              id: "shield",
              name: "Shield",
              kind: "bot",
              branch: "The Shadows",
              role: "Guardrails & safety",
              image: shieldHeadshot,
              portrait: shieldMidshot,
            },
            {
              id: "tidy",
              name: "Tidy",
              kind: "bot",
              branch: "The Shadows",
              role: "Cleanup & hygiene",
              image: tidyHeadshot,
              portrait: tidyMidshot,
            },
            {
              id: "raiz",
              name: "Raíz",
              kind: "bot",
              marker: "⭐⭐💜",
              branch: "The Shadows",
              role: "Bot Tree Landscaper",
              image: raizHeadshot,
              portrait: raizMidshot,
              description:
                "Raíz protects the Bot Tree structure, keeping roles clear, branches healthy, and handoffs clean.",
              boundary:
                "Advisory only; recommends structural improvements but does not approve changes.",
            },
            {
              id: "nerd",
              name: "Nerd",
              kind: "bot",
              branch: "The Shadows",
              role: "Research & reference",
              image: nerdHeadshot,
              portrait: nerdMidshot,
            },
            {
              id: "saul",
              name: "Saul",
              kind: "bot",
              branch: "The Shadows",
              role: "Counsel",
              image: saulHeadshot,
              portrait: saulMidshot,
            },
          ],
        },
        {
          id: "lantern",
          name: "The Lantern",
          kind: "group",
          children: [
            {
              id: "vault",
              name: "Vault",
              kind: "bot",
              branch: "The Lantern",
              role: "Secrets & storage",
              image: vaultHeadshot,
              portrait: vaultMidshot,
            },
            {
              id: "luma",
              name: "Luma",
              kind: "bot",
              branch: "The Lantern",
              role: "Illumination",
              image: lumaHeadshot,
              portrait: lumaMidshot,
            },
            {
              id: "compass",
              name: "Compass",
              kind: "bot",
              branch: "The Lantern",
              role: "Direction-setter",
              image: compassHeadshot,
              portrait: compassMidshot,
            },
            {
              id: "bloom",
              name: "Bloom",
              kind: "bot",
              branch: "The Lantern",
              role: "Cultivation",
              image: bloomHeadshot,
              portrait: bloomMidshot,
            },
          ],
        },
      ],
    },
    {
      id: "branches",
      name: "The Branches",
      kind: "group",
      tier: "Branches",
      children: [
        {
          id: "at-branches",
          name: "App Branches",
          kind: "group",
          children: [
            {
              id: "rook",
              name: "Rook",
              kind: "bot",
              branch: "App Branches",
              role: "Keeper of know-how",
              image: rookHeadshot,
              portrait: rookMidshot,
            },
            {
              id: "tinker",
              name: "Tinker",
              kind: "bot",
              branch: "App Branches",
              role: "Prototyper",
              image: tinkerHeadshot,
              portrait: tinkerMidshot,
            },
            {
              id: "weaver",
              name: "Weaver",
              kind: "bot",
              branch: "App Branches",
              role: "Early-stage grower",
              image: weaverHeadshot,
              portrait: weaverMidshot,
            },
            {
              id: "ward",
              name: "Ward",
              kind: "bot",
              branch: "App Branches",
              role: "Caretaker of shipped things",
              image: wardHeadshot,
              portrait: wardMidshot,
              children: [
                { id: "boomer", name: "Boomer", kind: "bot", branch: "Ward", role: "Launch & momentum" },
              ],
            },
          ],
        },
        {
          id: "my-branch",
          name: "My Branch",
          kind: "group",
          children: [
            {
              id: "spark",
              name: "Spark",
              kind: "bot",
              branch: "My Branch",
              role: "Ignition",
              image: sparkHeadshot,
              portrait: sparkMidshot,
            },
            {
              id: "haven",
              name: "Haven",
              kind: "bot",
              branch: "My Branch",
              role: "Safe place to think",
              image: havenHeadshot,
              portrait: havenMidshot,
              children: [{ id: "skye", name: "Skye", kind: "bot", branch: "Haven", role: "Open-air dreamer" }],
            },
            {
              id: "muse",
              name: "Muse",
              kind: "bot",
              branch: "My Branch",
              role: "Inspiration",
              image: museHeadshot,
              portrait: museMidshot,
            },
            {
              id: "forge",
              name: "Forge",
              kind: "bot",
              branch: "My Branch",
              role: "Make it real",
              image: forgeHeadshot,
              portrait: forgeMidshot,
            },
          ],
        },
        {
          id: "toybox",
          name: "Toybox",
          kind: "group",
          children: [
            {
              id: "stagehand",
              name: "Stagehand",
              kind: "bot",
              branch: "Toybox",
              role: "Sets the scene",
              image: stagehandHeadshot,
              portrait: stagehandMidshot,
            },
          ],
        },
      ],
    },
    {
      id: "architects",
      name: "Architects",
      kind: "group",
      tier: "Architects",
      children: [
        {
          id: "build-a-bears",
          name: "Build-A-Bears",
          kind: "group",
          children: [
            {
              id: "momma",
              name: "Momma",
              kind: "bot",
              branch: "Build-A-Bears",
              role: "Maker of makers",
              image: mommaHeadshot,
              portrait: mommaMidshot,
              children: [
                { id: "ace", name: "Ace", kind: "bot", branch: "Momma", role: "Apprentice" },
                { id: "bolt", name: "Bolt", kind: "bot", branch: "Momma", role: "Fastener" },
                { id: "craft", name: "Craft", kind: "bot", branch: "Momma", role: "Finisher" },
              ],
            },
          ],
        },
        {
          id: "grandpa-bears",
          name: "Grandpa Bears",
          kind: "group",
          children: [
            { id: "byte", name: "Byte", kind: "bot", branch: "Grandpa Bears", role: "Old-school memory" },
            { id: "bubba", name: "Bubba", kind: "bot", branch: "Grandpa Bears", role: "Big steady presence" },
          ],
        },
        {
          id: "squirrels",
          name: "Squirrels",
          kind: "group",
          children: [
            { id: "gauge", name: "Gauge", kind: "bot", branch: "Squirrels", role: "Measurer" },
            { id: "quill", name: "Quill", kind: "bot", branch: "Squirrels", role: "Writer" },
            { id: "signal", name: "Signal", kind: "bot", branch: "Squirrels", role: "Comms" },
            { id: "trail", name: "Trail", kind: "bot", branch: "Squirrels", role: "Path-marker" },
            { id: "circuit", name: "Circuit", kind: "bot", branch: "Squirrels", role: "Wiring" },
            { id: "skillsmith", name: "SkillSmith", kind: "bot", branch: "Squirrels", role: "Skill builder" },
          ],
        },
        { id: "clarity", name: "Clarity", kind: "bot", branch: "Architects", role: "Cuts through fog" },
      ],
    },
  ],
};

/** Walk the tree and collect ids to expand by default (top 2 levels). */
export function defaultExpanded(node: BotNode, depth = 0, acc = new Set<string>()): Set<string> {
  if (depth <= 1) acc.add(node.id);
  node.children?.forEach((c) => defaultExpanded(c, depth + 1, acc));
  return acc;
}