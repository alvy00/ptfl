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

// rowH = spacing between row centers (not a box height). mainX shifts the
// spine left on xs/sm to open a text gutter (paired with textColumnGapPx
// in gitGraphGeometry.ts).
export const LAYOUTS: Record<Tier, Layout> = {
  xs: { rowH: 108, topPad: 69, mainX: 5, laneW: 15, nodeScale: 0.72 },
  sm: { rowH: 98, topPad: 63, mainX: 8, laneW: 20, nodeScale: 0.82 },
  md: { rowH: 86, topPad: 54, mainX: 20, laneW: 30, nodeScale: 0.96 },
  lg: { rowH: 90, topPad: 58, mainX: 24, laneW: 34, nodeScale: 1 },
};

// Feature/bugfix branch box offsets from their source/merge row, as a
// ratio of rowH. Bugfix boxes only hold 2 commits, so they need a tighter
// ratio than feature boxes (which hold 5-7) to avoid excess empty space.
export const FEATURE_OFFSET_RATIO = 27 / 68;
export const BUGFIX_OFFSET_RATIO = 52 / 68;

// Extra trunk spacing at each project handoff, as a ratio of rowH.
export const TRANSITION_GAP_RATIO = 0.3;

// Bugfix branches always use this color regardless of project.
export const BUGFIX_COLOR = "#fb7185";

export const PALETTE = {
  bg: "#0e0f13",
  mainLine: "#ffffff",
  mainText: "#e2e4e9",
  head: "#2dd4bf",
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

// Tints bugfix rose toward its parent project's accent (32%) so it reads
// as "a fix" but doesn't clash with the project's palette.
function bugfixTint(projectAccent: string): string {
  return mixHex(BUGFIX_COLOR, projectAccent, 0.32);
}

export const TOTAL_LANES = 7;

export const CONTACT_EMAIL = "alvyahmed03@gmail.com";
export const TOTAL_ROWS = 25;

// Row plan (0-24):
// 0 enroll | 1 learn | 2-5 AssetVerse | 6 achieve | 7 learn
// 8-12 AuctaSync (+ bugfix at 10-11) | 13 learn
// 14-17 AsyncLangAI | 18 learn
// 19-23 CareerPilot (+ bugfix at 21-22) | 24 HEAD
const MAIN_ROWS = [0, 1, 6, 7, 13, 18, 24];
const ASSETVERSE_ROWS = [2, 3, 4, 5];
const AUCTASYNC_ROWS = [8, 9, 12];
const AUCTASYNC_BUGFIX_ROWS = [10, 11];
const ASYNCLANGAI_ROWS = [14, 15, 16, 17];
const CAREERPILOT_ROWS = [19, 20, 23];
const CAREERPILOT_BUGFIX_ROWS = [21, 22];

const withRows = (content: Commit[], rows: number[]): (Commit & { row: number })[] =>
  content.map((c, i) => ({ ...c, row: rows[i] }));

export const mainCommits: MainCommit[] = withRows(mainCommitContent, MAIN_ROWS);

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
    mergeRow: 13,
    delay: 1.5,
    commits: withRows(auctasyncCommitContent, AUCTASYNC_ROWS),
  },
  {
    name: "feat/asynclangai",
    projectKey: "asynclangai",
    color: PALETTE.projects.asynclangai.accent,
    lane: 4,
    sourceRow: 13,
    mergeRow: 18,
    delay: 1.75,
    commits: withRows(asynclangaiCommitContent, ASYNCLANGAI_ROWS),
  },
  {
    name: "feat/careerpilot",
    projectKey: "careerpilot",
    color: PALETTE.projects.careerpilot.accent,
    lane: 5,
    sourceRow: 18,
    mergeRow: 24,
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
    sourceRow: 20,
    mergeRow: 23,
    delay: 2.2,
    commits: withRows(careerpilotBugfixCommitContent, CAREERPILOT_BUGFIX_ROWS),
  },
];

export const TOTAL_COMMIT_COUNT =
  mainCommits.length +
  BRANCH_DEFS.reduce((sum, b) => sum + b.commits.length, 0) +
  BUGFIX_DEFS.reduce((sum, b) => sum + b.commits.length, 0);

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
