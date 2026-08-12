/* eslint-disable prettier/prettier */
import type { FocusEvent } from "react";
import { activeBoxVerticalRange, ACTIVE_BOX } from "@/lib/portfolio/gitGraphGeometry";
import type { GeometryBugfixBranch } from "@/lib/portfolio/gitGraphGeometry";

import { GitGraphActiveBorder } from "./GitGraphActiveBorder";
import { GitGraphCornerBrackets } from "./GitGraphCornerBrackets";

/**
 * A single bugfix branch's whole-box click/hover target, plus the
 * active-border and corner-bracket feedback — the bugfix equivalent of
 * GitGraphFeatureCard. Owns its own pointer-events/focus so it shields
 * its vertical slice from the feature card behind it instead of falling
 * through to it between the two bugfix commit rows.
 *
 * v6: now gated on the same particle-impact state as GitGraphFeatureCard
 * (`impactedBranch`/`instantBorderKey`, forwarded from GitGraph.tsx) —
 * GitGraphParticleField targets bugfix branches too now, so a bugfix's
 * border waits for its own particle to land instead of firing straight
 * from focus. `isFocused` replaces the old plain `active` boolean: it's
 * "is this specific bugfix the hovered one," and gets ANDed with the
 * impact match below, mirroring GitGraphFeatureCard's own gate exactly.
 */
export function GitGraphBugfixBox({
  b,
  title,
  isFocused,
  impactedBranch,
  instantBorderKey,
  reduceMotion,
  focusBranch,
  unfocusBranch,
  onOpen,
}: {
  b: GeometryBugfixBranch;
  /** Human-readable title (bugfixes.ts) for the aria-label — b.name is
   *  the git-branch-style slug, not screen-reader-friendly text. */
  title: string;
  isFocused: boolean;
  impactedBranch: string | null;
  instantBorderKey: string | null;
  reduceMotion: boolean;
  focusBranch: (group: string, bugfixKey?: string) => void;
  unfocusBranch: (group: string) => void;
  onOpen: (b: GeometryBugfixBranch) => void;
}) {
  const { top, bottom } = activeBoxVerticalRange(b.sourceY, b.mergeY, "bugfix");
  const ignited = isFocused && impactedBranch === b.name;

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
      <GitGraphActiveBorder
        active={ignited}
        color={b.color}
        reduceMotion={reduceMotion}
        instant={instantBorderKey === b.name}
      />
      <GitGraphCornerBrackets active={ignited} color={b.color} />
    </div>
  );
}
