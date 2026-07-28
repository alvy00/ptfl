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
  const FEATURE_X = laneX(2.25);
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
