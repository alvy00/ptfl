import type { ProjectKey } from "@/data/portfolio/projects";
import {
  mainCommitContent,
  auctasyncCommitContent,
  assetverseCommitContent,
  asynclangaiCommitContent,
  careerpilotCommitContent,
  auctasyncBugfixCommitContent,
  careerpilotBugfixCommitContent,
} from "@/data/portfolio/commits";

import type { BranchDef, BugfixDef, Commit, Layout, MainCommit, Tier } from "./gitGraphTypes";

export const LAYOUTS: Record<Tier, Layout> = {
  // rowH bumped +6px per tier (topPad +2-4px to match) for more breathing
  // room between commit lines/blocks. TOTAL_ROWS and all row-plan math are
  // untouched — yOf() is a pure function of rowH, so this scales the whole
  // graph's vertical rhythm without touching topology.
  xs: { rowH: 72, topPad: 46, mainX: 12, laneW: 17, nodeScale: 0.8 }, // <400px
  sm: { rowH: 78, topPad: 50, mainX: 16, laneW: 23, nodeScale: 0.88 }, // 400-639px
  md: { rowH: 86, topPad: 54, mainX: 20, laneW: 30, nodeScale: 0.96 }, // 640-1023px
  lg: { rowH: 90, topPad: 58, mainX: 24, laneW: 34, nodeScale: 1 }, // 1024px+
};

// Fixed offsets (in the old code: +27 / -27 and +24 / -24) expressed as a
// ratio of row height instead, so they scale with the layout tier too.
export const FEATURE_OFFSET_RATIO = 27 / 68;
export const BUGFIX_OFFSET_RATIO = 24 / 68;

// Bugfix branches always use this color, regardless of which project they
// belong to — color now encodes "what kind of branch is this" (project vs.
// fix), not project identity, so a fix is recognizable at a glance no
// matter which project it's on.
export const BUGFIX_COLOR = "#fb7185";

// Single source of truth for every color used across the git graph —
// branch accents, their lighter in-graph text variants, and the fixed
// head/bugfix colors. Everything (BRANCH_DEFS, node text color, ambient
// glow, legend, scroll-progress gradient) reads from here instead of
// repeating hex literals.
export const PALETTE = {
  bg: "#0e0f13",
  mainLine: "#ffffff",
  mainText: "#e2e4e9",
  head: "#34d399",
  bugfix: BUGFIX_COLOR,
  projects: {
    assetverse: { accent: "#a78bfa", text: "#a28ded" },
    auctasync: { accent: "#f59e0b", text: "#de9722" },
    asynclangai: { accent: "#38bdf8", text: "#7dd3fc" },
    careerpilot: { accent: "#34d399", text: "#3cdbb1" },
  },
} as const satisfies {
  bg: string;
  mainLine: string;
  mainText: string;
  head: string;
  bugfix: string;
  projects: Record<ProjectKey, { accent: string; text: string }>;
};

export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

// Blends two hex colors: t=0 -> pure a, t=1 -> pure b.
function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ar = parseInt(pa.slice(0, 2), 16),
    ag = parseInt(pa.slice(2, 4), 16),
    ab = parseInt(pa.slice(4, 6), 16);
  const br = parseInt(pb.slice(0, 2), 16),
    bg = parseInt(pb.slice(2, 4), 16),
    bb = parseInt(pb.slice(4, 6), 16);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(ar, br))}${toHex(mix(ag, bg))}${toHex(mix(ab, bb))}`;
}

// Bugfix branches keep rose as the dominant hue (so "this is a fix" still
// reads at a glance) but pull 32% toward their parent project's accent, so
// the fix curve doesn't clash as hard against its own project's palette.
// Base BUGFIX_COLOR is untouched/still exported for anything generic (e.g.
// the legend, which explains the shape/concept without tying to one project).
function bugfixTint(projectAccent: string): string {
  return mixHex(BUGFIX_COLOR, projectAccent, 0.32);
}

export const TOTAL_LANES = 7;
export const TOTAL_ROWS = 27;

// Row plan (27 rows total, 0-26), verified for full coverage with no
// gaps/collisions before this was written:
// 0 enroll | 1 learn(react/html/css/tailwind/node/framer/express)
// 2-5 AssetVerse | 6 achieve(bootcamp) | 7 learn(nextjs/gsap)
// 8-13 AuctaSync (10-11 = its bugfix) | 14 learn(ai/llm/rag)
// 15-18 AsyncLangAI | 19 learn(vector db) | 20-25 CareerPilot
// (23-24 = its bugfix) | 26 HEAD
const MAIN_ROWS = [0, 1, 6, 7, 14, 19, 26];
const ASSETVERSE_ROWS = [2, 3, 4, 5];
const AUCTASYNC_ROWS = [8, 9, 12, 13];
const AUCTASYNC_BUGFIX_ROWS = [10, 11];
const ASYNCLANGAI_ROWS = [15, 16, 17, 18];
const CAREERPILOT_ROWS = [20, 21, 22, 25];
const CAREERPILOT_BUGFIX_ROWS = [23, 24];

const withRows = (content: Commit[], rows: number[]): (Commit & { row: number })[] =>
  content.map((c, i) => ({ ...c, row: rows[i] }));

export const mainCommits: MainCommit[] = withRows(mainCommitContent, MAIN_ROWS);

// Topology only (no pixel values) — stays constant across tiers.
export const BRANCH_DEFS: BranchDef[] = [
  {
    name: "feat/assetverse",
    projectKey: "assetverse",
    color: PALETTE.projects.assetverse.accent,
    lane: 1,
    sourceRow: 1,
    mergeRow: 6,
    delay: 1.0,
    commits: withRows(assetverseCommitContent, ASSETVERSE_ROWS),
  },
  {
    name: "feat/auctasync",
    projectKey: "auctasync",
    color: PALETTE.projects.auctasync.accent,
    lane: 2,
    sourceRow: 7,
    mergeRow: 14,
    delay: 1.5,
    commits: withRows(auctasyncCommitContent, AUCTASYNC_ROWS),
  },
  {
    name: "feat/asynclangai",
    projectKey: "asynclangai",
    color: PALETTE.projects.asynclangai.accent,
    lane: 4,
    sourceRow: 14,
    mergeRow: 19,
    delay: 1.75,
    commits: withRows(asynclangaiCommitContent, ASYNCLANGAI_ROWS),
  },
  {
    name: "feat/careerpilot",
    projectKey: "careerpilot",
    color: PALETTE.projects.careerpilot.accent,
    lane: 5,
    sourceRow: 19,
    mergeRow: 26,
    delay: 2.0,
    commits: withRows(careerpilotCommitContent, CAREERPILOT_ROWS),
  },
];

export const BUGFIX_DEFS: BugfixDef[] = [
  {
    name: "bugfix/auctasync-race-condition",
    bugfixKey: "auctasync-race-condition",
    parentLane: 2,
    lane: 3,
    sourceRow: 9,
    mergeRow: 12,
    delay: 1.4,
    commits: withRows(auctasyncBugfixCommitContent, AUCTASYNC_BUGFIX_ROWS),
  },
  {
    name: "bugfix/careerpilot-session-state",
    bugfixKey: "careerpilot-session-state",
    parentLane: 5,
    lane: 6,
    sourceRow: 22,
    mergeRow: 25,
    delay: 2.4,
    commits: withRows(careerpilotBugfixCommitContent, CAREERPILOT_BUGFIX_ROWS),
  },
];

export const TOTAL_COMMIT_COUNT =
  mainCommits.length +
  BRANCH_DEFS.reduce((sum, b) => sum + b.commits.length, 0) +
  BUGFIX_DEFS.reduce((sum, b) => sum + b.commits.length, 0);

// Resolves a bugfix's own display color from its parent branch's project
// accent, computed once here (not per-render) since BRANCH_DEFS/PALETTE
// are both static. Falls back to plain BUGFIX_COLOR if a parent lane ever
// doesn't resolve, rather than throwing — this is decorative, not critical.
export function bugfixColorForParentLane(parentLane: number): string {
  const parent = BRANCH_DEFS.find((b) => b.lane === parentLane);
  if (!parent) return BUGFIX_COLOR;
  return bugfixTint(PALETTE.projects[parent.projectKey].accent);
}

export function branchByProject(key: ProjectKey): BranchDef {
  const b = BRANCH_DEFS.find((d) => d.projectKey === key);
  if (!b) throw new Error(`No branch defined for project "${key}"`);
  return b;
}
