import {
  BRANCH_DEFS,
  BUGFIX_COLOR,
  BUGFIX_DEFS,
  BUGFIX_OFFSET_RATIO,
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
  }));

  const branchPath = (b: (typeof branches)[number]): string => {
    const bx = laneX(b.lane);
    const firstY = yOf(b.commits[0].row);
    const lastY = yOf(b.commits[b.commits.length - 1].row);
    const c1 = (firstY - b.sourceY) / 2;
    const c2 = (b.mergeY - lastY) / 2;
    return [
      `M ${mainX} ${b.sourceY}`,
      `C ${mainX} ${b.sourceY + c1}, ${bx} ${firstY - c1}, ${bx} ${firstY}`,
      `L ${bx} ${lastY}`,
      `C ${bx} ${lastY + c2}, ${mainX} ${b.mergeY - c2}, ${mainX} ${b.mergeY}`,
    ].join(" ");
  };

  const bugfixPath = (b: (typeof bugfixBranches)[number]): string => {
    const px = laneX(b.parentLane);
    const bx = laneX(b.lane);
    const firstY = yOf(b.commits[0].row);
    const lastY = yOf(b.commits[b.commits.length - 1].row);
    const c1 = (firstY - b.sourceY) / 2;
    const c2 = (b.mergeY - lastY) / 2;
    return [
      `M ${px} ${b.sourceY}`,
      `C ${px} ${b.sourceY + c1}, ${bx} ${firstY - c1}, ${bx} ${firstY}`,
      `L ${bx} ${lastY}`,
      `C ${bx} ${lastY + c2}, ${px} ${b.mergeY - c2}, ${px} ${b.mergeY}`,
    ].join(" ");
  };

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
      revealDelay: i * 0.06,
      branchGroup: "main",
    })),
    ...branches.flatMap((b, bi) =>
      b.commits.map((c, i) => ({
        x: laneX(b.lane),
        y: yOf(c.row),
        hash: c.hash,
        message: c.message,
        color: b.color,
        textColor: PALETTE.projects[b.projectKey].text,
        revealDelay: bi * 0.1 + i * 0.06,
        projectKey: b.projectKey,
        commitIndex: i,
        commitTotal: b.commits.length,
        branchName: i === 0 ? b.name : undefined,
        branchGroup: b.name,
      })),
    ),
    ...bugfixBranches.flatMap((b, bi) =>
      b.commits.map((c, i) => ({
        x: laneX(b.lane),
        y: yOf(c.row),
        hash: c.hash,
        message: c.message,
        color: BUGFIX_COLOR,
        textColor: BUGFIX_COLOR,
        isBugfix: true,
        revealDelay: bi * 0.1 + i * 0.06,
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
