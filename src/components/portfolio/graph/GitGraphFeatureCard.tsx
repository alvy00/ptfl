/* eslint-disable prettier/prettier */
import type { ProjectKey } from "@/data/portfolio/projects";
import type { FocusEvent } from "react";
import { activeBoxVerticalRange, ACTIVE_BOX } from "@/lib/portfolio/gitGraphGeometry";
import type { GeometryBranch } from "@/lib/portfolio/gitGraphGeometry";

import { GitGraphActiveBorder } from "./GitGraphActiveBorder";
import { GitGraphCornerBrackets } from "./GitGraphCornerBrackets";

/**
 * A single feature branch's whole-card click/hover target, plus the
 * active-border and corner-bracket feedback layered on top of it. One
 * delegated handler here replaces N identical per-row handlers that used
 * to live on every commit row in this branch.
 */
export function GitGraphFeatureCard({
  b,
  projectName,
  isFocused,
  impactedBranch,
  instantBorderKey,
  reduceMotion,
  onOpenProject,
  focusBranch,
  unfocusBranch,
}: {
  b: GeometryBranch;
  projectName: string;
  isFocused: boolean;
  impactedBranch: string | null;
  instantBorderKey: string | null;
  reduceMotion: boolean;
  onOpenProject: (projectKey: ProjectKey) => void;
  focusBranch: (group: string) => void;
  unfocusBranch: (group: string) => void;
}) {
  const { top, bottom } = activeBoxVerticalRange(b.sourceY, b.mergeY, "feature");

  // Skips focusBranch when the focus came from useFocusTrap's silent
  // modal-close restoration (data-suppress-focus-highlight) — otherwise
  // closing this card's own modal would permanently pin its border on,
  // since nothing else fires the matching blur to release it.
  const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.dataset.suppressFocusHighlight) return;
    focusBranch(b.name);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${projectName} project details`}
      onClick={() => onOpenProject(b.projectKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenProject(b.projectKey);
        }
      }}
      onMouseEnter={() => focusBranch(b.name)}
      onMouseLeave={() => unfocusBranch(b.name)}
      onFocus={handleFocus}
      onBlur={() => unfocusBranch(b.name)}
      className="group absolute cursor-pointer pointer-events-auto rounded-lg outline-none transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.015] focus-visible:scale-[1.015] hover:shadow-2xl hover:shadow-black/40 focus-visible:shadow-2xl focus-visible:shadow-black/40 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100 focus-visible:ring-2 focus-visible:ring-[var(--card-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0f13]"
      style={{
        left: -ACTIVE_BOX.horizontalExpand,
        right: -ACTIVE_BOX.horizontalExpand,
        top,
        height: bottom - top,
        ["--card-ring-color" as string]: b.color,
      }}
    >
      <GitGraphActiveBorder
        active={isFocused && impactedBranch === b.name}
        color={b.color}
        reduceMotion={reduceMotion}
        instant={instantBorderKey === b.name}
      />
      <GitGraphCornerBrackets active="group" color={b.color} />
    </div>
  );
}
