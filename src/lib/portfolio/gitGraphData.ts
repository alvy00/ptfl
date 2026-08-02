import type { ProjectKey } from "@/data/portfolio/projects";
import {
  mainCommitContent,
  auctasyncCommitContent,
  assetverseCommitContent,
  asynclangaiCommitContent,
  careerpilotCommitContent,
  auctasyncBugfixCommitContent,
  careerpilotBugfixCommitContent,
  careerpilotDuplicateSubmitBugfixCommitContent,
} from "@/data/portfolio/commits";

import type { BranchDef, BugfixDef, Commit, Layout, MainCommit, Tier } from "./gitGraphTypes";

export const LAYOUTS: Record<Tier, Layout> = {
  // rowH is the spacing between row centers, not a box height — each
  // row's <li> is sized to its own content, so it was already free to
  // grow taller than a "slot." The risk is two adjacent rows both
  // growing tall enough to visually bleed into each other, since their
  // center-points stay exactly rowH apart no matter how tall either one
  // renders. xs/sm bumped up (topPad keeping the same ~0.64 ratio to
  // rowH the other tiers use) — commit messages wrap freely (no
  // line-clamp) at the tighter xs/sm column widths, so wrapped 3-4 line
  // messages need real headroom there. md/lg untouched — text there
  // wraps in a wider column and wasn't the reported problem.
  //
  // mainX shifted left on xs/sm — moves the spine/branches/nodes toward
  // the screen edge, opening a gap before the text column starts (paired
  // with textColumnGapPx in gitGraphGeometry.ts, which pulls the text
  // column's start position left too, so both halves move left together
  // rather than the gap just eating into text's own width).
  xs: { rowH: 108, topPad: 69, mainX: 5, laneW: 15, nodeScale: 0.72 }, // <400px
  sm: { rowH: 98, topPad: 63, mainX: 8, laneW: 20, nodeScale: 0.82 }, // 400-639px
  md: { rowH: 86, topPad: 54, mainX: 20, laneW: 30, nodeScale: 0.96 }, // 640-1023px
  lg: { rowH: 90, topPad: 58, mainX: 24, laneW: 34, nodeScale: 1 }, // 1024px+
};

// Fixed offsets (in the old code: +27 / -27 and +24 / -24) expressed as a
// ratio of row height instead, so they scale with the layout tier too.
export const FEATURE_OFFSET_RATIO = 27 / 68;
// Was 24/68 (~0.35 of a row) — sourceRow/mergeRow for a bugfix sit exactly
// one row away from its actual first/last commit (e.g. duplicate-submit:
// sourceRow 22, first commit at row 23), same structural gap
// FEATURE_OFFSET_RATIO also has to close. But a feature box holds 5-7
// commits, so that gap is a small fraction of its total height; a bugfix
// box only ever holds 2 commits, so the same absolute gap ends up bigger
// than the actual content — the empty space the border showed. 52/68
// (~0.76 of a row) pulls the boundary in close to the commit itself,
// leaving a small, intentional breath of clearance rather than a near-
// full empty row above/below.
export const BUGFIX_OFFSET_RATIO = 52 / 68;

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
  // Was #34d399 — the EXACT same hex as careerpilot's accent below. HEAD
  // and CareerPilot sit right next to each other at the bottom of the
  // graph (CareerPilot is the last project before HEAD), so "this is
  // CareerPilot" and "this is where you are right now" were two different
  // concepts glowing in literally the same color with zero hue difference
  // to tell them apart. Shifted a few degrees toward cyan (teal, hue ~172)
  // vs. CareerPilot's more mint/emerald lean (hue ~152) — close enough to
  // still read as "part of the same green family" but distinct enough to
  // disambiguate at a glance.
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

export const TOTAL_LANES = 8;
export const TOTAL_ROWS = 32;

// Row plan (32 rows total, 0-31), verified for full coverage with no
// gaps/collisions before this was written:
// 0 enroll | 1 learn(react/html/css/tailwind/node/framer/express)
// 2-5 AssetVerse (4 commits) | 6 achieve(bootcamp) | 7 learn(nextjs/gsap)
// 8-14 AuctaSync (7 rows: 5 commits + its 2-commit bugfix at 10-11,
//   between commit2 and commit3) | 15 learn(ai/llm/rag)
// 16-19 AsyncLangAI (4 commits) | 20 learn(vector db)
// 21-30 CareerPilot (10 rows: 6 commits + duplicate-submit bugfix at
//   23-24 + session-state bugfix at 26-27) | 31 HEAD
//
// Bugfix branches are back to 2 commits (reproduce + resolve) — the
// modal no longer opens per-row-click; the whole bugfix box (see
// GitGraphBugfixBox) is now the single click target spanning both
// commits, mirroring how GitGraphFeatureCard already does this for
// feature branches. That's what makes 2 commits safe again: they're
// display-only now, not a redundant pair of identical click targets.
const MAIN_ROWS = [0, 1, 6, 7, 15, 20, 31];
const ASSETVERSE_ROWS = [2, 3, 4, 5];
const AUCTASYNC_ROWS = [8, 9, 12, 13, 14];
const AUCTASYNC_BUGFIX_ROWS = [10, 11];
const ASYNCLANGAI_ROWS = [16, 17, 18, 19];
const CAREERPILOT_ROWS = [21, 22, 25, 28, 29, 30];
const CAREERPILOT_BUGFIX_ROWS = [26, 27]; // session-state — after voice interviews (row 25)
const CAREERPILOT_DUPLICATE_SUBMIT_BUGFIX_ROWS = [23, 24]; // duplicate-submit — after roadmap gen (row 22)

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
    mergeRow: 15,
    delay: 1.5,
    commits: withRows(auctasyncCommitContent, AUCTASYNC_ROWS),
  },
  {
    name: "feat/asynclangai",
    projectKey: "asynclangai",
    color: PALETTE.projects.asynclangai.accent,
    lane: 4,
    sourceRow: 15,
    mergeRow: 20,
    delay: 1.75,
    commits: withRows(asynclangaiCommitContent, ASYNCLANGAI_ROWS),
  },
  {
    name: "feat/careerpilot",
    projectKey: "careerpilot",
    color: PALETTE.projects.careerpilot.accent,
    lane: 5,
    sourceRow: 20,
    mergeRow: 31,
    delay: 2.0,
    commits: withRows(careerpilotCommitContent, CAREERPILOT_ROWS),
  },
];

// Order here also drives BRANCH_STAGGER's per-branch reveal delay in
// buildGeometry (via each entry's array index) — duplicate-submit stays
// listed before session-state, matching the row-plan order above.
export const BUGFIX_DEFS: BugfixDef[] = [
  {
    name: "bugfix/auctasync-race-condition",
    bugfixKey: "auctasync-race-condition",
    parentLane: 2,
    lane: 3,
    // Brackets commit2 (WebSocket bid broadcasting, row 9) and commit3
    // (listing-management, row 12).
    sourceRow: 9,
    mergeRow: 12,
    delay: 1.4,
    commits: withRows(auctasyncBugfixCommitContent, AUCTASYNC_BUGFIX_ROWS),
  },
  {
    name: "bugfix/careerpilot-duplicate-submit",
    bugfixKey: "careerpilot-duplicate-submit",
    parentLane: 5,
    lane: 7,
    // Brackets roadmap-gen (row 22) and voice-interviews (row 25).
    sourceRow: 22,
    mergeRow: 25,
    delay: 2.2,
    commits: withRows(
      careerpilotDuplicateSubmitBugfixCommitContent,
      CAREERPILOT_DUPLICATE_SUBMIT_BUGFIX_ROWS,
    ),
  },
  {
    name: "bugfix/careerpilot-session-state",
    bugfixKey: "careerpilot-session-state",
    parentLane: 5,
    lane: 6,
    // Brackets voice-interviews (row 25) and question-bank (row 28).
    sourceRow: 25,
    mergeRow: 28,
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
