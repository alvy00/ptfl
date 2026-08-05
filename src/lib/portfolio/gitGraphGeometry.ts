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

// The lane fraction BUGFIX_X draws at — the single rightmost point
// anything in the graph ever renders to. Named and shared so graphW
// (which needs to reserve exactly this much width, plus a little
// clearance) and BUGFIX_X itself can't silently drift apart the way two
// separately-hand-typed "3.25"s eventually would.
const BUGFIX_LANE = 3.25;

/** All pixel geometry derived from a Layout — rebuilt only when the tier changes. */
export function buildGeometry(layout: Layout) {
  const { rowH, topPad, mainX, laneW } = layout;
  // Extra breathing room injected at each project handoff on the trunk
  // (AssetVerse -> AuctaSync, AuctaSync -> AsyncLangAI, AsyncLangAI ->
  // CareerPilot) — the density complaint was specifically about these
  // jumps feeling cramped, not the graph as a whole, so this is a fixed
  // px gap added right before each project's sourceRow rather than a
  // global rowH increase (which would just re-cram everything at a
  // bigger uniform scale instead of targeting the actual problem rows).
  // Kept as extra PIXELS layered on top of yOf's normal row*rowH math,
  // not extra ROWS — every existing row index (MAIN_ROWS, AUCTASYNC_ROWS,
  // etc. in gitGraphData.ts) stays exactly as-is; nothing to renumber.
  // Ratio itself lives in gitGraphData.ts (TRANSITION_GAP_RATIO), next to
  // FEATURE_OFFSET_RATIO/BUGFIX_OFFSET_RATIO, since it's a tunable design
  // value, not something derived here.
  const TRANSITION_GAP = rowH * TRANSITION_GAP_RATIO;
  // The first branch (AssetVerse, sourceRow 1) forks right off the very
  // top of the trunk — there's no "previous project" crowding that jump,
  // so it's deliberately excluded; only handoffs BETWEEN two projects
  // get the extra gap.
  const transitionRows = BRANCH_DEFS.slice(1).map((b) => b.sourceRow);
  const extraGapBefore = (row: number) =>
    transitionRows.filter((r) => r <= row).length * TRANSITION_GAP;
  const yOf = (row: number) => topPad + row * rowH + extraGapBefore(row);
  const laneX = (lane: number) => mainX + lane * laneW;
  // Branched by tier via referential comparison against LAYOUTS' own
  // stable object literals (GitGraph.tsx always passes `LAYOUTS[tier]`
  // straight through, so this is a reliable identity check, not a
  // heuristic) — desktop (md/lg) keeps the exact original formula
  // unchanged, reserving width for all TOTAL_LANES regardless of whether
  // anything draws there. That reservation was never the actual problem;
  // desktop has room to spare either way. xs/sm get the tightened
  // formula instead, tracking the real rightmost drawn point (BUGFIX_X)
  // plus a small clearance — on a <400px viewport, the unused reserved
  // width was coming directly out of the commit text column's budget,
  // pushing message text past the right edge.
  const isDesktopTier = layout === LAYOUTS.md || layout === LAYOUTS.lg;
  // Clearance past BUGFIX_X bumped 0.75 -> 1.25 lane-widths — the graph's
  // drawn content (spine/branches/nodes) was reading as too close to the
  // text column. Paired with mainX shifting left on xs/sm (gitGraphData.ts)
  // so the drawn content moves toward the screen edge rather than the
  // extra clearance simply eating further into text's own width.
  const graphW = isDesktopTier ? mainX + laneW * TOTAL_LANES : mainX + laneW * (BUGFIX_LANE + 1.25);
  // Was a flat "1.5rem" (24px) hardcoded identically wherever the graph's
  // left offset is needed (GitGraph.tsx's border-layer wrapper,
  // GitGraphCommitTextColumn's `left` offset) — kept in sync only by a
  // comment asking future edits to remember to update both. Computed here
  // once instead, next to graphW, so those can't drift apart, and so
  // mobile can use a smaller gap (pulling the text column left, buying it
  // back some width — paired with mainX shifting left too in
  // gitGraphData.ts, so both halves of the graph move left together)
  // while desktop keeps the original 24px unchanged.
  const textColumnGapPx = isDesktopTier ? 24 : 14;
  const height = topPad + yOf(TOTAL_ROWS - 1);
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
  const BUGFIX_X = laneX(BUGFIX_LANE);

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

  // Curve length has three competing constraints:
  //
  // 1. It must be long enough (vertically) to cover however far the curve
  //    also has to travel HORIZONTALLY (dx = the trunk-to-lane distance).
  //    ENTRY_LEN alone is a fixed vertical reach with no relationship to
  //    dx — when dx is bigger than that reach, the Bezier has to cover
  //    more sideways distance than it has vertical room for, so instead
  //    of a smooth diagonal hook it reads as a sharp elbow/box.
  // 2. It must never exceed half the branch's actual vertical span
  //    (sourceY..mergeY), or the entry curve's end and the exit curve's
  //    start cross each other into a self-intersecting spike.
  // 3. It must never extend PAST the branch's actual first/last commit
  //    row (firstY/lastY) — the curve's endpoint and the commit node's
  //    position are two completely independent calculations (this
  //    formula vs. yOf(commit.row)), so nothing before this guaranteed
  //    they'd coincide. When constraint #1 pushed the curve longer than
  //    the gap to the first commit, the curve overshot past where the
  //    node actually sits — the node ended up floating beside the path
  //    instead of sitting on it. Since the straight "L" run afterward is
  //    at a constant x the whole way, clamping the curve to stop AT OR
  //    BEFORE firstY/lastY is sufficient to guarantee every node
  //    (including the first and last) lands exactly on the path — no
  //    separate alignment logic needed, just not overshooting past them.
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

  // COMMIT_STAGGER was 0.06 — too small to read as a deliberate cascade,
  // especially once several rows cross the viewport threshold in the same
  // scroll tick (see GitGraphCommitRow's lowered `amount` for the other
  // half of this fix). 0.09 was the smallest step that still read as
  // "terminal log lines landing one after another" without feeling
  // sluggish — trimmed slightly further to 0.07/0.12 as part of a modest
  // "a little faster" pass across the whole reveal (paired with
  // nodeRevealWindow's wider pad above, and GitGraph.tsx's earlier scroll
  // trigger + snappier progress spring).
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
export function nodeRevealWindow(row: number, pad = 0.5): [number, number] {
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
  // bottomClearance was 12 — a leftover from before BUGFIX_OFFSET_RATIO
  // (gitGraphData.ts) was tightened to close most of the gap at its
  // source; keeping this at feature's level now that the bigger offset
  // fix is in place, rather than stacking two separate paddings on top
  // of each other.
  bugfix: { topClearance: 4, bottomClearance: 4 },
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
