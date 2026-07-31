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
  // row's <li> is absolutely positioned and sized to its own content, so
  // it was already free to grow taller than a "slot." The actual risk
  // is two adjacent rows both growing tall enough to visually bleed into
  // each other, since their center-points stay exactly rowH apart no
  // matter how tall either one renders. xs/sm bumped up (topPad keeping
  // the same ~0.64 ratio to rowH the other tiers already use) — now that
  // line-clamp-2 no longer caps message length there, wrapped 3-4 line
  // messages at the tighter xs/sm column widths need real headroom, not
  // the same spacing that was originally sized around a 2-line cap.
  // md/lg untouched — text there was already unclamped and wrapping
  // freely before this pass, so this isn't a new risk at those tiers.
  xs: { rowH: 108, topPad: 69, mainX: 8, laneW: 15, nodeScale: 0.72 }, // <400px
  sm: { rowH: 98, topPad: 63, mainX: 12, laneW: 20, nodeScale: 0.82 }, // 400-639px
  md: { rowH: 86, topPad: 54, mainX: 20, laneW: 30, nodeScale: 0.96 }, // 640-1023px
  lg: { rowH: 90, topPad: 58, mainX: 24, laneW: 34, nodeScale: 1 }, // 1024px+
};

// Fixed offsets (in the old code: +27 / -27 and +24 / -24) expressed as a
// ratio of row height instead, so they scale with the layout tier too.
export const FEATURE_OFFSET_RATIO = 27 / 68;
// Was 24/68 (~0.35 of a row) — sourceRow/mergeRow for a bugfix sit exactly
// one row away from its actual first/last commit (e.g. duplicate-submit:
// sourceRow 26, first commit at row 27), same structural gap
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
export const TOTAL_ROWS = 37;

// Row plan (37 rows total, 0-36), verified for full coverage with no
// gaps/collisions before this was written:
// 0 enroll | 1 learn(react/html/css/tailwind/node/framer/express)
// 2-6 AssetVerse (5 commits) | 7 achieve(bootcamp) | 8 learn(nextjs/gsap)
// 9-17 AuctaSync (9 rows: 7 commits + its 2-commit bugfix at 11-12,
//   between commit2 and commit3 — unchanged relative position from
//   before, just renumbered) | 18 learn(ai/llm/rag)
// 19-23 AsyncLangAI (5 commits) | 24 learn(vector db)
// 25-35 CareerPilot (11 rows: 7 commits + duplicate-submit bugfix at
//   27-28 + session-state bugfix at 30-31, same relative shape as the
//   previous timeline-order fix, shifted +5) | 36 HEAD
//
// This revision adds 3 more AuctaSync commits (drag-and-drop listing
// management + bid history, UI polish, decoupled-architecture hardening),
// 1 more AssetVerse commit (TanStack Query adoption), and 1 more
// AsyncLangAI commit (Firebase Auth + Zod/react-hook-form) — all pulled
// from README/feature-list items that weren't represented in the graph
// yet. Every row from AssetVerse onward shifts +1 through +5 as a result;
// this is a full renumbering, not a patch on top of the old one.
const MAIN_ROWS = [0, 1, 7, 8, 18, 24, 36];
const ASSETVERSE_ROWS = [2, 3, 4, 5, 6];
const AUCTASYNC_ROWS = [9, 10, 13, 14, 15, 16, 17];
const AUCTASYNC_BUGFIX_ROWS = [11, 12];
const ASYNCLANGAI_ROWS = [19, 20, 21, 22, 23];
const CAREERPILOT_ROWS = [25, 26, 29, 32, 33, 34, 35];
const CAREERPILOT_BUGFIX_ROWS = [30, 31]; // session-state — after voice interviews (row 29)
const CAREERPILOT_DUPLICATE_SUBMIT_BUGFIX_ROWS = [27, 28]; // duplicate-submit — after roadmap gen (row 26)

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
    mergeRow: 7,
    delay: 1.0,
    commits: withRows(assetverseCommitContent, ASSETVERSE_ROWS),
  },
  {
    name: "feat/auctasync",
    projectKey: "auctasync",
    color: PALETTE.projects.auctasync.accent,
    lane: 2,
    sourceRow: 8,
    mergeRow: 18,
    delay: 1.5,
    commits: withRows(auctasyncCommitContent, AUCTASYNC_ROWS),
  },
  {
    name: "feat/asynclangai",
    projectKey: "asynclangai",
    color: PALETTE.projects.asynclangai.accent,
    lane: 4,
    sourceRow: 18,
    mergeRow: 24,
    delay: 1.75,
    commits: withRows(asynclangaiCommitContent, ASYNCLANGAI_ROWS),
  },
  {
    name: "feat/careerpilot",
    projectKey: "careerpilot",
    color: PALETTE.projects.careerpilot.accent,
    lane: 5,
    sourceRow: 24,
    mergeRow: 36,
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
    // Brackets commit2 (WebSocket bid broadcasting, row 10) and commit3
    // (the new listing-management commit, row 13) — same relative
    // position as before, just renumbered.
    sourceRow: 10,
    mergeRow: 13,
    delay: 1.4,
    commits: withRows(auctasyncBugfixCommitContent, AUCTASYNC_BUGFIX_ROWS),
  },
  {
    name: "bugfix/careerpilot-duplicate-submit",
    bugfixKey: "careerpilot-duplicate-submit",
    parentLane: 5,
    lane: 7,
    // Brackets roadmap-gen (row 26) and voice-interviews (row 29).
    sourceRow: 26,
    mergeRow: 29,
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
    // Brackets voice-interviews (row 29) and quiz-engine (row 32).
    sourceRow: 29,
    mergeRow: 32,
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
