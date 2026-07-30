import { useTransform, type MotionValue } from "framer-motion";

import { BUGFIX_DEFS, branchByProject } from "@/lib/portfolio/gitGraphData";
import { drawRange } from "@/lib/portfolio/gitGraphGeometry";

/**
 * Per-branch pathLength progress for the SVG graph — each feature/bugfix
 * branch's connecting line draws in (and un-draws on scroll-up) scrubbed
 * directly to scroll position, rather than a one-shot whileInView
 * animation. Declared as individual hook calls (not built via a loop or
 * .map) so this stays valid per rules-of-hooks — useTransform can't be
 * called a variable number of times.
 *
 * Returns lookup records keyed by branch/bugfix name, since the SVG layer
 * renders these by iterating `branches`/`bugfixBranches` and needs the
 * matching MotionValue for whichever one it's currently drawing.
 */
export function useGitGraphDrawProgress(smoothProgress: MotionValue<number>) {
  const assetverseDraw = useTransform(
    smoothProgress,
    drawRange(branchByProject("assetverse").sourceRow, branchByProject("assetverse").mergeRow),
    [0, 1],
  );
  const auctasyncDraw = useTransform(
    smoothProgress,
    drawRange(branchByProject("auctasync").sourceRow, branchByProject("auctasync").mergeRow),
    [0, 1],
  );
  const asynclangaiDraw = useTransform(
    smoothProgress,
    drawRange(branchByProject("asynclangai").sourceRow, branchByProject("asynclangai").mergeRow),
    [0, 1],
  );
  const careerpilotDraw = useTransform(
    smoothProgress,
    drawRange(branchByProject("careerpilot").sourceRow, branchByProject("careerpilot").mergeRow),
    [0, 1],
  );
  const auctasyncBugfixDraw = useTransform(
    smoothProgress,
    drawRange(BUGFIX_DEFS[0].sourceRow, BUGFIX_DEFS[0].mergeRow),
    [0, 1],
  );
  const careerpilotBugfixDraw = useTransform(
    smoothProgress,
    drawRange(BUGFIX_DEFS[1].sourceRow, BUGFIX_DEFS[1].mergeRow),
    [0, 1],
  );

  const featureDrawByName: Record<string, typeof assetverseDraw> = {
    "feat/assetverse": assetverseDraw,
    "feat/auctasync": auctasyncDraw,
    "feat/asynclangai": asynclangaiDraw,
    "feat/careerpilot": careerpilotDraw,
  };
  const bugfixDrawByName: Record<string, typeof auctasyncBugfixDraw> = {
    "bugfix/auctasync-race-condition": auctasyncBugfixDraw,
    "bugfix/careerpilot-session-state": careerpilotBugfixDraw,
  };

  return { featureDrawByName, bugfixDrawByName };
}
