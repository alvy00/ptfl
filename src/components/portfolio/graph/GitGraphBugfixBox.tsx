/* eslint-disable prettier/prettier */
import type { FocusEvent } from "react";
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
 * active-border and corner-bracket feedback — the bugfix equivalent of
 * GitGraphFeatureCard. Owns its own pointer-events/focus so it shields
 * its vertical slice from the feature card behind it instead of falling
 * through to it between the two bugfix commit rows.
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
  /** Human-readable title (bugfixes.ts) for the aria-label — b.name is
   *  the git-branch-style slug, not screen-reader-friendly text. */
  title: string;
  active: boolean;
  reduceMotion: boolean;
  focusBranch: (group: string, bugfixKey?: string) => void;
  unfocusBranch: (group: string) => void;
  onOpen: (b: GeometryBugfixBranch) => void;
}) {
  const { top, bottom } = activeBoxVerticalRange(b.sourceY, b.mergeY, "bugfix");

  // See GitGraphFeatureCard's handleFocus — same silent-restoration guard.
  const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.dataset.suppressFocusHighlight) return;
    focusBranch(b.branchGroup, b.bugfixKey);
  };

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
      onFocus={handleFocus}
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
