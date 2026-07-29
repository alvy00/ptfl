import {
  BRANCH_DEFS,
  BUGFIX_DEFS,
  BUGFIX_OFFSET_RATIO,
  bugfixColorForParentLane,
  FEATURE_OFFSET_RATIO,
  hexToRgbTriplet,
  mainCommits,
  PALETTE,
  TOTAL_LANES,
  TOTAL_ROWS,
} from "./gitGraphData";
import type { Layout, NodeMeta } from "./gitGraphTypes";

// FEATURE_X as its own named export, so components outside buildGeometry()
// (namely GitGraphParticleField, for the particle's launch x) can match the
// exact x every feature-branch commit node actually renders at, instead of
// re-deriving it from `branch.lane` — which is only a slot index for
// color/identity lookups (see the comment above FEATURE_X's definition
// inside buildGeometry), not a physical offset. Kept as a function of
// Layout rather than a precomputed constant since it still depends on the
// active tier's mainX/laneW.
export function featureTrackX(layout: Layout): number {
  return layout.mainX + 2.25 * layout.laneW;
}

/** All pixel geometry derived from a Layout — rebuilt only when the tier changes. */
export function buildGeometry(layout: Layout) {
  const { rowH, topPad, mainX, laneW } = layout;
  const yOf = (row: number) => topPad + row * rowH;
  const laneX = (lane: number) => mainX + lane * laneW;
  const graphW = mainX + laneW * TOTAL_LANES;
  const height = topPad * 2 + (TOTAL_ROWS - 1) * rowH;
  const featureOffset = rowH * FEATURE_OFFSET_RATIO;
  const bugfixOffset = rowH * BUGFIX_OFFSET_RATIO;

  // Every feature branch sits at the SAME fixed distance from the main
  // spine, and every bugfix branch sits at the same (larger) fixed
  // distance — regardless of each branch's own `lane` number. `lane` was
  // only ever a slot index (used for color/identity lookups like
  // laneToBranchName and bugfixColorForParentLane below), but it was also
  // being fed straight into laneX() as if it meant physical offset — so
  // AssetVerse (lane 1) sat close to the spine while AuctaSync (lane 2)
  // and CareerPilot (lane 5) sat progressively farther out. Decoupling
  // "which lane" from "how far" fixes that: FEATURE_X/BUGFIX_X below are
  // the only two rail distances that ever get drawn.
  const FEATURE_X = featureTrackX(layout);
  const BUGFIX_X = laneX(3.25);

  const branches = BRANCH_DEFS.map((b) => ({
    ...b,
    sourceY: yOf(b.sourceRow) + featureOffset,
    mergeY: yOf(b.mergeRow) - featureOffset,
  }));

  // Lane -> branch name, so a bugfix branch can look up which feature
  // branch it forked from. Used both for node branchGroup (below) and for
  // the bugfix *path* itself, so the connecting line dims/lights up in
  // sync with its parent feature branch instead of tracking its own name
  // (which nothing else ever focuses on).
  const laneToBranchName = new Map(branches.map((b) => [b.lane, b.name]));

  const bugfixBranches = BUGFIX_DEFS.map((b) => ({
    ...b,
    sourceY: yOf(b.sourceRow) + bugfixOffset,
    mergeY: yOf(b.mergeRow) - bugfixOffset,
    branchGroup: laneToBranchName.get(b.parentLane) ?? b.name,
    color: bugfixColorForParentLane(b.parentLane),
  }));

  // Flat-rail geometry: entry/exit are short, FIXED-length curves (tied to
  // rowH, not to where the branch's first/last commit happens to fall), and
  // everything between them is a dead-straight vertical line at the lane's
  // x. Previously the curve's reach was derived from `firstY`/`lastY` (the
  // first/last commit rows), so a branch's own commit spacing decided how
  // wide/lazy its fork-off arc looked — inconsistent across branches and,
  // combined with the full lane-width horizontal sweep, read as a wide bow
  // down the whole branch rather than a quick peel-off the trunk. Decoupling
  // the curve length from commit content fixes both: every branch gets an
  // identical, short hook, and the straight run (now the dominant visual)
  // is a true flat column parallel to the main spine.
  const ENTRY_LEN = rowH * 0.35;

  const branchPath = (b: (typeof branches)[number]): string => {
    const bx = FEATURE_X;
    const entryEndY = b.sourceY + ENTRY_LEN;
    const exitStartY = b.mergeY - ENTRY_LEN;
    return [
      `M ${mainX} ${b.sourceY}`,
      `C ${mainX} ${b.sourceY + ENTRY_LEN * 0.5}, ${bx} ${b.sourceY + ENTRY_LEN * 0.5}, ${bx} ${entryEndY}`,
      `L ${bx} ${exitStartY}`,
      `C ${bx} ${b.mergeY - ENTRY_LEN * 0.5}, ${mainX} ${b.mergeY - ENTRY_LEN * 0.5}, ${mainX} ${b.mergeY}`,
    ].join(" ");
  };

  const bugfixPath = (b: (typeof bugfixBranches)[number]): string => {
    const px = FEATURE_X;
    const bx = BUGFIX_X;
    const entryEndY = b.sourceY + ENTRY_LEN;
    const exitStartY = b.mergeY - ENTRY_LEN;
    return [
      `M ${px} ${b.sourceY}`,
      `C ${px} ${b.sourceY + ENTRY_LEN * 0.5}, ${bx} ${b.sourceY + ENTRY_LEN * 0.5}, ${bx} ${entryEndY}`,
      `L ${bx} ${exitStartY}`,
      `C ${bx} ${b.mergeY - ENTRY_LEN * 0.5}, ${px} ${b.mergeY - ENTRY_LEN * 0.5}, ${px} ${b.mergeY}`,
    ].join(" ");
  };

  // COMMIT_STAGGER was 0.06 — too small to read as a deliberate cascade,
  // especially once several rows cross the viewport threshold in the same
  // scroll tick (see GitGraphCommitRow's lowered `amount` for the other
  // half of this fix). 0.09 is the smallest step that still reads as
  // "terminal log lines landing one after another" without feeling
  // sluggish to wait through.
  const COMMIT_STAGGER = 0.09;
  const BRANCH_STAGGER = 0.15;

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

  return { yOf, laneX, graphW, height, branches, bugfixBranches, branchPath, bugfixPath, allNodes };
}

/** Scroll-progress window [rampInStart, rampInEnd, rampOutStart, rampOutEnd]
 *  derived from a branch's actual source/merge rows, instead of hand-tuned
 *  fractions — so it can never drift out of sync with the row plan. */
export function branchGlowWindow(sourceRow: number, mergeRow: number, pad = 0.03): number[] {
  const start = sourceRow / (TOTAL_ROWS - 1);
  const end = mergeRow / (TOTAL_ROWS - 1);
  return [Math.max(0, start - pad), start, end, Math.min(1, end + pad)];
}

export function glowStops(hex: string): string[] {
  const rgb = hexToRgbTriplet(hex);
  return [`rgba(${rgb},0.02)`, `rgba(${rgb},0.09)`, `rgba(${rgb},0.09)`, `rgba(${rgb},0.02)`];
}

/** Scroll-scrubbed reveal domain for a single node/row — mirrors drawRange's
 *  shape ([start, end] in the same 0..1 scroll-progress space as
 *  smoothProgress) but for a point in the row plan rather than a
 *  sourceRow..mergeRow span. `pad` (in row units) is how much scroll lead-in
 *  the reveal gets before snapping fully visible at the node's own row —
 *  small on purpose, since this replaces what used to be a near-instant
 *  whileInView pop, not a slow ramp. Being a plain function of scroll
 *  position (not a one-shot whileInView/once:true trigger) means a node
 *  reverses back to hidden on scroll-up exactly in step with its branch's
 *  pathLength retracting, instead of staying stuck fully opaque with no
 *  line connecting it (the bug this replaces). */
export function nodeRevealWindow(row: number, pad = 0.4): [number, number] {
  const start = (row - pad) / (TOTAL_ROWS - 1);
  const end = row / (TOTAL_ROWS - 1);
  return [Math.max(0, start), Math.min(1, end)];
}

/** Two-point domain for scroll-scrubbed path drawing: the branch is fully
 *  undrawn before `sourceRow` (minus a small lead-in) and fully drawn by
 *  `mergeRow`. useTransform clamps outside this range by default, so no
 *  extra endpoints are needed the way the glow windows use. Because this
 *  is a plain function of scroll position (not a one-shot whileInView),
 *  scrolling back up smoothly erases the branch again. */
export function drawRange(sourceRow: number, mergeRow: number, pad = 0.02): [number, number] {
  const start = sourceRow / (TOTAL_ROWS - 1);
  const end = mergeRow / (TOTAL_ROWS - 1);
  return [Math.max(0, start - pad), end];
}

// ---------------------------------------------------------------------------
// Active-project box geometry: SINGLE SOURCE OF TRUTH for the box that
// GitGraphActiveBorder draws around and that GitGraphParticleField's
// connector line/particle targets. Previously these were computed
// independently in GitGraph.tsx (the actual border box) and
// GitGraphParticleField.tsx's `focusedBoxCenter()` (an approximation, off
// by a fudge factor and using a stale conditional clearance for
// CareerPilot that the real border box never applied) — meaning the
// particle's "impact point" and the border's actual left edge could
// silently drift apart. Both now read from here.
// ---------------------------------------------------------------------------

export const ACTIVE_BOX = {
  /** How far the box extends past the text column on each side. */
  horizontalExpand: 20,
  /** Gap between the graph SVG and the text column — mirrors the
   *  `calc(${graphW}px + 1.5rem)` left-offset GitGraph.tsx applies to both
   *  the border layer and the text column. */
  textColumnGap: 24,
  feature: { topClearance: 4, bottomClearance: 0 },
  bugfix: { topClearance: 4, bottomClearance: 12 },
} as const;

/** The box's left edge, in the same coordinate space GitGraphParticleField's
 *  canvas already draws in (container-relative px). This is also exactly
 *  where GitGraphActiveBorder's wrapper div's left edge lands, since both
 *  derive from the same two constants — so a particle aimed here always
 *  lands exactly on the border's real left edge, at any tier/viewport. */
export function activeBoxLeftX(graphW: number): number {
  return graphW + ACTIVE_BOX.textColumnGap - ACTIVE_BOX.horizontalExpand;
}

/** Top/bottom of the box for a given branch's sourceY/mergeY — matches the
 *  clearances GitGraph.tsx applies when sizing the actual border wrapper. */
export function activeBoxVerticalRange(
  sourceY: number,
  mergeY: number,
  kind: "feature" | "bugfix",
): { top: number; bottom: number } {
  const { topClearance, bottomClearance } = ACTIVE_BOX[kind];
  return { top: sourceY - topClearance, bottom: mergeY + bottomClearance };
}

/** The real shape of a resolved feature branch (BranchDef + pixel
 *  sourceY/mergeY), i.e. an element of `buildGeometry(layout).branches`.
 *  Promoted here so GitGraphParticleField (and anything else that reads
 *  geometry.branches) can import a real type instead of maintaining its
 *  own structural copy by hand — that copy previously admitted in a
 *  comment that it only existed because this export didn't. */
export type GeometryBranch = ReturnType<typeof buildGeometry>["branches"][number];

// ---------------------------------------------------------------------------
// Ignition timing: every constant that governs the particle-connect ->
// impact -> border-seal chain reaction, in one place. Previously these
// lived as unlabeled literals scattered across GitGraphParticleField.tsx
// (dt * 2.6, the 0.5s connector fade) and GitGraphActiveBorder.tsx (the
// 0.55s pathLength transition) despite being one conceptual animation —
// tuning "how snappy does the whole chain feel" meant hunting through two
// files. Both now import from here.
// ---------------------------------------------------------------------------

export const IGNITION_TIMING = {
  /** Progress-per-second added to the particle's one-shot travel each
   *  frame (dt * travelSpeed). ~1/travelSpeed seconds to cross. */
  travelSpeed: 2.6,
  /** Seconds for the connector line to fade out after the particle lands
   *  (the border has taken over by then). */
  connectorFadeDuration: 0.5,
  /** Seconds for the border's own pathLength draw-in/out. */
  sealDuration: 0.55,
  /** Seconds a newly-focused branch must stay focused before its particle
   *  actually launches — absorbs fast scroll-throughs so the travel isn't
   *  restarted a dozen times a second without ever completing. */
  focusDebounce: 0.12,
  /** Seconds for the one-shot impact flash at the particle's landing
   *  point, and the "seam settle" pulse where the two border halves meet. */
  flashDuration: 0.22,
  seamSettleDuration: 0.3,
  /** Seconds for the border's opacity crossfade specifically on replay
   *  (`instant=true`) ignitions — the shape still snaps instantly (no
   *  pathLength draw), but a hard opacity pop on every re-hover reads as
   *  flicker, so opacity gets this separate, smoother fade instead. */
  instantFadeDuration: 0.32,
  /** Peak stroke/glow opacity on a replay ignition, vs. 0.85 the first
   *  time — dimmer so repeated re-hovers aren't as hard on the eyes as
   *  the one true "impact" moment. */
  instantPeakOpacity: 0.3,
} as const;
