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
  xs: { rowH: 56, topPad: 40, mainX: 12, laneW: 17, nodeScale: 0.8 }, // <400px
  sm: { rowH: 60, topPad: 44, mainX: 16, laneW: 23, nodeScale: 0.88 }, // 400-639px
  md: { rowH: 66, topPad: 48, mainX: 20, laneW: 30, nodeScale: 0.96 }, // 640-1023px
  lg: { rowH: 68, topPad: 52, mainX: 24, laneW: 34, nodeScale: 1 }, // 1024px+
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

export const TOTAL_LANES = 7;
export const TOTAL_ROWS = 26;

// Row plan (26 rows total, 0-25), verified for full coverage with no
// gaps/collisions before this was written:
// 0 enroll | 1 learn(react/html/css/tailwind/node/framer/express)
// 2-5 AssetVerse | 6 achieve(bootcamp) | 7 learn(nextjs/gsap)
// 8-13 AuctaSync (10-11 = its bugfix) | 14 learn(ai/llm/rag)
// 15-18 AsyncLangAI | 19-24 CareerPilot (22-23 = its bugfix) | 25 HEAD
const MAIN_ROWS = [0, 1, 6, 7, 14, 25];
const ASSETVERSE_ROWS = [2, 3, 4, 5];
const AUCTASYNC_ROWS = [8, 9, 12, 13];
const AUCTASYNC_BUGFIX_ROWS = [10, 11];
const ASYNCLANGAI_ROWS = [15, 16, 17, 18];
const CAREERPILOT_ROWS = [19, 20, 21, 24];
const CAREERPILOT_BUGFIX_ROWS = [22, 23];

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
    mergeRow: 25,
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
    sourceRow: 21,
    mergeRow: 24,
    delay: 2.4,
    commits: withRows(careerpilotBugfixCommitContent, CAREERPILOT_BUGFIX_ROWS),
  },
];

export const TOTAL_COMMIT_COUNT =
  mainCommits.length +
  BRANCH_DEFS.reduce((sum, b) => sum + b.commits.length, 0) +
  BUGFIX_DEFS.reduce((sum, b) => sum + b.commits.length, 0);

export function branchByProject(key: ProjectKey): BranchDef {
  const b = BRANCH_DEFS.find((d) => d.projectKey === key);
  if (!b) throw new Error(`No branch defined for project "${key}"`);
  return b;
}
