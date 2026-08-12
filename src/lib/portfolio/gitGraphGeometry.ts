import {
  BRANCH_DEFS,
  BUGFIX_DEFS,
  BUGFIX_OFFSET_RATIO,
  bugfixColorForParentLane,
  FEATURE_OFFSET_RATIO,
  hexToRgbTriplet,
  LAYOUTS,
  mainCommits,
  PALETTE,
  TOTAL_LANES,
  TOTAL_ROWS,
  TRANSITION_GAP_RATIO,
} from "./gitGraphData";
import type { Layout, NodeMeta } from "./gitGraphTypes";

// Exported so GitGraphParticleField can target the exact x feature nodes
// render at, without re-deriving it from `branch.lane` (which is only a
// slot index for color/identity lookups, not a physical offset).
export function featureTrackX(layout: Layout): number {
  return layout.mainX + 2.25 * layout.laneW;
}

// Rightmost lane fraction anything in the graph draws to. Shared so graphW
// can reserve exactly this much width instead of hand-typing "3.25" twice.
const BUGFIX_LANE = 3.25;

// Bugfix equivalent of featureTrackX — GitGraphParticleField needs this to
// target bugfix branches too, not just feature ones.
export function bugfixTrackX(layout: Layout): number {
  return layout.mainX + BUGFIX_LANE * layout.laneW;
}

/** All pixel geometry derived from a Layout — rebuilt only when the tier changes. */
export function buildGeometry(layout: Layout) {
  const { rowH, topPad, mainX, laneW } = layout;

  // Extra px added on the trunk at each project handoff, layered on top of
  // yOf's normal row*rowH math (not extra rows — row indices stay as-is).
  const TRANSITION_GAP = rowH * TRANSITION_GAP_RATIO;
  // AssetVerse (sourceRow 1) forks off the very top of the trunk, so there's
  // no prior project crowding that jump — only later handoffs get the gap.
  const transitionRows = BRANCH_DEFS.slice(1).map((b) => b.sourceRow);
  const extraGapBefore = (row: number) =>
    transitionRows.filter((r) => r <= row).length * TRANSITION_GAP;
  const yOf = (row: number) => topPad + row * rowH + extraGapBefore(row);
  const laneX = (lane: number) => mainX + lane * laneW;

  // md/lg reserve width for all TOTAL_LANES regardless of use (desktop has
  // room to spare). xs/sm track the real rightmost drawn point (BUGFIX_X)
  // plus clearance instead, since the unused reservation was eating into
  // the text column's width on narrow viewports.
  const isDesktopTier = layout === LAYOUTS.md || layout === LAYOUTS.lg;
  const graphW = isDesktopTier ? mainX + laneW * TOTAL_LANES : mainX + laneW * (BUGFIX_LANE + 1.25);
  const textColumnGapPx = isDesktopTier ? 24 : 14;
  const height = topPad + yOf(TOTAL_ROWS - 1);
  const featureOffset = rowH * FEATURE_OFFSET_RATIO;
  const bugfixOffset = rowH * BUGFIX_OFFSET_RATIO;

  // Fixed rail distances — every feature branch sits at FEATURE_X and every
  // bugfix at BUGFIX_X, regardless of `lane` (which is only a slot index).
  const FEATURE_X = featureTrackX(layout);
  const BUGFIX_X = laneX(BUGFIX_LANE);

  const branches = BRANCH_DEFS.map((b) => ({
    ...b,
    sourceY: yOf(b.sourceRow) + featureOffset,
    mergeY: yOf(b.mergeRow) - featureOffset,
  }));

  const laneToBranchName = new Map(branches.map((b) => [b.lane, b.name]));

  const bugfixBranches = BUGFIX_DEFS.map((b) => ({
    ...b,
    sourceY: yOf(b.sourceRow) + bugfixOffset,
    mergeY: yOf(b.mergeRow) - bugfixOffset,
    branchGroup: laneToBranchName.get(b.parentLane) ?? b.name,
    color: bugfixColorForParentLane(b.parentLane),
  }));

  // Flat-rail geometry: short fixed-length entry/exit curves (tied to rowH,
  // not to where the branch's first/last commit falls) with a dead-straight
  // vertical run between them.
  const ENTRY_LEN = rowH * 0.35;

  // curveLenFor balances three constraints: long enough to cover the
  // horizontal reach (dx) without reading as a sharp elbow; short enough to
  // not exceed half the branch's vertical span (or entry/exit curves cross);
  // and never past the branch's actual first/last commit row, so nodes
  // always land exactly on the path.
  const curveLenFor = (
    sourceY: number,
    mergeY: number,
    dx: number,
    firstY: number,
    lastY: number,
  ) => {
    const desired = Math.max(ENTRY_LEN, Math.abs(dx) * 0.6);
    return Math.min(desired, (mergeY - sourceY) / 2, firstY - sourceY, mergeY - lastY);
  };

  const branchPath = (b: (typeof branches)[number]): string => {
    const bx = FEATURE_X;
    const firstY = yOf(b.commits[0].row);
    const lastY = yOf(b.commits[b.commits.length - 1].row);
    const len = curveLenFor(b.sourceY, b.mergeY, bx - mainX, firstY, lastY);
    const entryEndY = b.sourceY + len;
    const exitStartY = b.mergeY - len;
    return [
      `M ${mainX} ${b.sourceY}`,
      `C ${mainX} ${b.sourceY + len * 0.5}, ${bx} ${b.sourceY + len * 0.5}, ${bx} ${entryEndY}`,
      `L ${bx} ${exitStartY}`,
      `C ${bx} ${b.mergeY - len * 0.5}, ${mainX} ${b.mergeY - len * 0.5}, ${mainX} ${b.mergeY}`,
    ].join(" ");
  };

  const bugfixPath = (b: (typeof bugfixBranches)[number]): string => {
    const px = FEATURE_X;
    const bx = BUGFIX_X;
    const firstY = yOf(b.commits[0].row);
    const lastY = yOf(b.commits[b.commits.length - 1].row);
    const len = curveLenFor(b.sourceY, b.mergeY, bx - px, firstY, lastY);
    const entryEndY = b.sourceY + len;
    const exitStartY = b.mergeY - len;
    return [
      `M ${px} ${b.sourceY}`,
      `C ${px} ${b.sourceY + len * 0.5}, ${bx} ${b.sourceY + len * 0.5}, ${bx} ${entryEndY}`,
      `L ${bx} ${exitStartY}`,
      `C ${bx} ${b.mergeY - len * 0.5}, ${px} ${b.mergeY - len * 0.5}, ${px} ${b.mergeY}`,
    ].join(" ");
  };

  const COMMIT_STAGGER = 0.07;
  const BRANCH_STAGGER = 0.12;

  const allNodes: NodeMeta[] = [
    ...mainCommits.map((c, i) => ({
      x: mainX,
      y: yOf(c.row),
      hash: c.hash,
      message: c.message,
      color: PALETTE.mainLine,
      textColor: c.hash === "HEAD" ? PALETTE.head : PALETTE.mainText,
      isHead: c.hash === "HEAD",
      isMain: true,
      revealDelay: i * COMMIT_STAGGER,
      revealWindow: nodeRevealWindow(c.row),
      branchGroup: "main",
    })),
    ...branches.flatMap((b, bi) =>
      b.commits.map((c, i) => ({
        x: FEATURE_X,
        y: yOf(c.row),
        hash: c.hash,
        message: c.message,
        color: b.color,
        textColor: PALETTE.projects[b.projectKey].text,
        revealDelay: bi * BRANCH_STAGGER + i * COMMIT_STAGGER,
        revealWindow: nodeRevealWindow(c.row),
        projectKey: b.projectKey,
        commitIndex: i,
        commitTotal: b.commits.length,
        branchName: i === 0 ? b.name : undefined,
        branchGroup: b.name,
        badges: c.badges,
      })),
    ),
    ...bugfixBranches.flatMap((b, bi) =>
      b.commits.map((c, i) => ({
        x: BUGFIX_X,
        y: yOf(c.row),
        hash: c.hash,
        message: c.message,
        color: b.color,
        textColor: b.color,
        isBugfix: true,
        revealDelay: bi * BRANCH_STAGGER + i * COMMIT_STAGGER,
        revealWindow: nodeRevealWindow(c.row),
        bugfixKey: b.bugfixKey,
        bugfixCommitIndex: i,
        branchName: i === 0 ? b.name : undefined,
        branchGroup: laneToBranchName.get(b.parentLane) ?? b.name,
      })),
    ),
  ];

  return {
    yOf,
    laneX,
    graphW,
    textColumnGapPx,
    height,
    branches,
    bugfixBranches,
    branchPath,
    bugfixPath,
    allNodes,
  };
}

/** Scroll-progress window derived from a branch's source/merge rows, so it
 *  can never drift out of sync with the row plan. */
export function branchGlowWindow(sourceRow: number, mergeRow: number, pad = 0.03): number[] {
  const start = sourceRow / (TOTAL_ROWS - 1);
  const end = mergeRow / (TOTAL_ROWS - 1);
  return [Math.max(0, start - pad), start, end, Math.min(1, end + pad)];
}

export function glowStops(hex: string): string[] {
  const rgb = hexToRgbTriplet(hex);
  return [`rgba(${rgb},0.02)`, `rgba(${rgb},0.09)`, `rgba(${rgb},0.09)`, `rgba(${rgb},0.02)`];
}

/** Scroll-scrubbed reveal domain for a single node — a node reverses back to
 *  hidden on scroll-up in step with its branch's path retracting, instead of
 *  staying stuck fully opaque with no line connecting it. */
export function nodeRevealWindow(row: number, pad = 0.5): [number, number] {
  const start = (row - pad) / (TOTAL_ROWS - 1);
  const end = row / (TOTAL_ROWS - 1);
  return [Math.max(0, start), Math.min(1, end)];
}

/** Two-point domain for scroll-scrubbed path drawing: undrawn before
 *  sourceRow, fully drawn by mergeRow. */
export function drawRange(sourceRow: number, mergeRow: number, pad = 0.02): [number, number] {
  const start = sourceRow / (TOTAL_ROWS - 1);
  const end = mergeRow / (TOTAL_ROWS - 1);
  return [Math.max(0, start - pad), end];
}

// Single source of truth for the active-project box: GitGraphActiveBorder
// draws it, GitGraphParticleField's connector targets it. Both must read
// from here so they can't silently drift apart.
export const ACTIVE_BOX = {
  horizontalExpand: 20,
  textColumnGap: 24,
  feature: { topClearance: 4, bottomClearance: 0 },
  bugfix: { topClearance: 4, bottomClearance: 4 },
} as const;

/** Box's left edge, in the same container-relative px space
 *  GitGraphParticleField's canvas already draws in. */
export function activeBoxLeftX(graphW: number): number {
  return graphW + ACTIVE_BOX.textColumnGap - ACTIVE_BOX.horizontalExpand;
}

export function activeBoxVerticalRange(
  sourceY: number,
  mergeY: number,
  kind: "feature" | "bugfix",
): { top: number; bottom: number } {
  const { topClearance, bottomClearance } = ACTIVE_BOX[kind];
  return { top: sourceY - topClearance, bottom: mergeY + bottomClearance };
}

/** Real shape of a resolved feature branch, i.e. an element of
 *  `buildGeometry(layout).branches` — exported so consumers like
 *  GitGraphParticleField can import the type instead of duplicating it. */
export type GeometryBranch = ReturnType<typeof buildGeometry>["branches"][number];

/** Bugfix equivalent of GeometryBranch — an element of
 *  `buildGeometry(layout).bugfixBranches`. Exported for the same reason:
 *  GitGraphParticleField and GitGraphBugfixBox both need the real shape
 *  instead of each re-declaring their own (previously GitGraphBugfixBox
 *  hand-rolled this as `BugfixDef & {...}`, which could silently drift
 *  from what buildGeometry actually returns). */
export type GeometryBugfixBranch = ReturnType<typeof buildGeometry>["bugfixBranches"][number];

// Every constant governing the particle-connect -> impact -> border-seal
// chain, in one place, so tuning "how snappy does it feel" doesn't mean
// hunting through multiple component files.
export const IGNITION_TIMING = {
  /** Progress-per-second added to the particle's travel each frame. */
  travelSpeed: 2.6,
  /** Seconds for the connector line to fade out after landing. */
  connectorFadeDuration: 0.5,
  /** Seconds for the border's own pathLength draw-in/out. */
  sealDuration: 0.55,
  /** Seconds a focused branch must stay focused before its particle
   *  launches — absorbs fast scroll-throughs. */
  focusDebounce: 0.12,
  /** Seconds for the impact flash and the border-seam settle pulse. */
  flashDuration: 0.22,
  seamSettleDuration: 0.3,
  /** Opacity crossfade duration on replay ignitions (shape still snaps
   *  instantly, but a hard opacity pop on re-hover reads as flicker). */
  instantFadeDuration: 0.32,
  /** Peak opacity on a replay ignition, dimmer than the first true impact. */
  instantPeakOpacity: 0.3,
} as const;
