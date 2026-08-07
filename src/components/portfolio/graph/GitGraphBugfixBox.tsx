import { activeBoxVerticalRange, ACTIVE_BOX } from "@/lib/portfolio/gitGraphGeometry";
import type { BugfixDef } from "@/lib/portfolio/gitGraphTypes";

import { GitGraphActiveBorder } from "./GitGraphActiveBorder";
import { GitGraphCornerBrackets } from "./GitGraphCornerBrackets";

export type GeometryBugfixBranch = BugfixDef & {
  sourceY: number;
  mergeY: number;
  branchGroup: string;
  color: string;
};

/**
 * A single bugfix branch's whole-box click/hover target, plus the
 * active-border and corner-bracket feedback layered on top of it — the
 * bugfix equivalent of GitGraphFeatureCard.
 *
 * Click target: previously each of a bugfix branch's 2 commits (reproduce
 * + resolve) had its own onClick, both opening the identical bugfix
 * detail modal — 2 rows, 1 destination. One handler here (event
 * delegation over the whole box, spanning both rows) replaces that pair
 * of redundant per-row handlers, mirroring exactly how GitGraphFeatureCard
 * already collapsed N per-row feature-commit handlers into one.
 *
 * No particle targets bugfix boxes (GitGraphParticleField only tracks
 * feature branches), so the border keeps the simple focus-gated draw-in/
 * out here, no impact gate the way GitGraphFeatureCard's border has.
 *
 * Owns its own hover (and now focus/click), rather than being purely
 * decorative. Previously only the commit-row buttons called
 * focusBranch(group, bugfixKey) on hover — so the row itself lit up the
 * bugfix border correctly, but the gaps between two bugfix commits had no
 * element claiming the hover, and the event fell through to the parent
 * feature card underneath (which spans this same vertical range and has
 * its own pointer-events-auto + onMouseEnter). That triggered the whole
 * feature card's hover instead of the bugfix one. Giving this box real
 * pointer-events + its own focus/unfocus handlers means it now shields
 * its entire vertical slice from the feature card behind it, not just
 * the pixels directly under a commit line.
 */
export function GitGraphBugfixBox({
  b,
  title,
  active,
  reduceMotion,
  focusBranch,
  unfocusBranch,
  onOpen,
}: {
  b: GeometryBugfixBranch;
  /** Human-readable bugfix title (bugfixes.ts), for the aria-label — b.name
   *  is the git-branch-style slug (e.g. "bugfix/auctasync-race-condition"),
   *  not something a screen reader should read verbatim as the label. */
  title: string;
  active: boolean;
  reduceMotion: boolean;
  focusBranch: (group: string, bugfixKey?: string) => void;
  unfocusBranch: (group: string) => void;
  onOpen: (b: GeometryBugfixBranch) => void;
}) {
  const { top, bottom } = activeBoxVerticalRange(b.sourceY, b.mergeY, "bugfix");

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open bugfix details: ${title}`}
      onClick={() => onOpen(b)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(b);
        }
      }}
      onMouseEnter={() => focusBranch(b.branchGroup, b.bugfixKey)}
      onMouseLeave={() => unfocusBranch(b.branchGroup)}
      onFocus={() => focusBranch(b.branchGroup, b.bugfixKey)}
      onBlur={() => unfocusBranch(b.branchGroup)}
      className="absolute cursor-pointer pointer-events-auto outline-none focus-visible:ring-2 focus-visible:ring-[var(--card-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0f13]"
      style={{
        left: -ACTIVE_BOX.horizontalExpand,
        right: -ACTIVE_BOX.horizontalExpand,
        top,
        height: bottom - top,
        ["--card-ring-color" as string]: b.color,
      }}
    >
      <GitGraphActiveBorder active={active} color={b.color} reduceMotion={reduceMotion} />
      <GitGraphCornerBrackets active={active} color={b.color} />
    </div>
  );
}
