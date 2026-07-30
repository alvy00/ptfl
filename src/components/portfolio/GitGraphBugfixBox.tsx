import { activeBoxVerticalRange, ACTIVE_BOX } from "@/lib/portfolio/gitGraphGeometry";
import type { BugfixDef } from "@/lib/portfolio/gitGraphTypes";

import { GitGraphActiveBorder } from "./GitGraphActiveBorder";
import { GitGraphCornerBrackets } from "./GitGraphCornerBrackets";

type GeometryBugfixBranch = BugfixDef & {
  sourceY: number;
  mergeY: number;
  branchGroup: string;
  color: string;
};

/**
 * A single bugfix branch's border + corner-bracket overlay. No particle
 * targets bugfix boxes (GitGraphParticleField only tracks feature
 * branches), so these keep the simple focus-gated draw-in/out, no impact
 * gate the way GitGraphFeatureCard's border has.
 *
 * Owns its own hover, rather than being purely decorative. Previously
 * only the commit-row buttons called focusBranch(group, bugfixKey) on
 * hover — so the row itself lit up the bugfix border correctly, but the
 * gaps between two bugfix commits had no element claiming the hover, and
 * the event fell through to the parent feature card underneath (which
 * spans this same vertical range and has its own pointer-events-auto +
 * onMouseEnter). That triggered the whole feature card's hover instead
 * of the bugfix one. Giving this box real pointer-events + its own
 * focus/unfocus handlers means it now shields its entire vertical slice
 * from the feature card behind it, not just the pixels directly under a
 * commit line.
 */
export function GitGraphBugfixBox({
  b,
  active,
  reduceMotion,
  focusBranch,
  unfocusBranch,
}: {
  b: GeometryBugfixBranch;
  active: boolean;
  reduceMotion: boolean;
  focusBranch: (group: string, bugfixKey?: string) => void;
  unfocusBranch: (group: string) => void;
}) {
  const { top, bottom } = activeBoxVerticalRange(b.sourceY, b.mergeY, "bugfix");

  return (
    <div
      className="absolute pointer-events-auto"
      aria-hidden="true"
      onMouseEnter={() => focusBranch(b.branchGroup, b.bugfixKey)}
      onMouseLeave={() => unfocusBranch(b.branchGroup)}
      style={{
        left: -ACTIVE_BOX.horizontalExpand,
        right: -ACTIVE_BOX.horizontalExpand,
        top,
        height: bottom - top,
      }}
    >
      <GitGraphActiveBorder active={active} color={b.color} reduceMotion={reduceMotion} />
      <GitGraphCornerBrackets active={active} color={b.color} />
    </div>
  );
}
