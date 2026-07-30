import type { ProjectKey } from "@/data/portfolio/projects";
import { activeBoxVerticalRange, ACTIVE_BOX } from "@/lib/portfolio/gitGraphGeometry";
import type { GeometryBranch } from "@/lib/portfolio/gitGraphGeometry";

import { GitGraphActiveBorder } from "./GitGraphActiveBorder";
import { GitGraphCornerBrackets } from "./GitGraphCornerBrackets";

/**
 * A single feature branch's whole-card click/hover target — the box a
 * person actually interacts with to open that project's modal, plus the
 * active-border and corner-bracket feedback layered on top of it.
 *
 * Whole-card click target — the actual pivot. Previously every commit row
 * in this branch had its own onClick, all leading to the exact same
 * project modal regardless of which row was clicked. One handler on this
 * one wrapper (event delegation) replaces N per-row handlers with N
 * identical destinations.
 *
 * Hover lives on the card itself, not on individual commit rows —
 * GitGraphCommitRow's feature-commit rows never call focusBranch at all
 * (see isFeaturePassive there), and are explicitly set to
 * pointer-events:none so hover/click here isn't blocked by the now-inert
 * text sitting visually on top of this box.
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
  // Reads from the same activeBoxVerticalRange() helper the particle
  // field's impact-point targeting uses — this box and the particle's
  // landing spot can no longer drift apart.
  const { top, bottom } = activeBoxVerticalRange(b.sourceY, b.mergeY, "feature");

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
      onFocus={() => focusBranch(b.name)}
      onBlur={() => unfocusBranch(b.name)}
      // Elevation replacement: a very subtle scale (1.5%, from center —
      // doesn't shift position or consume extra layout space the way
      // translateY did), the existing shadow, and camera-focus-style
      // corner brackets that snap into place using the branch's own
      // color — a "locked on" cue instead of a background tint.
      className="group absolute cursor-pointer pointer-events-auto rounded-lg outline-none transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.015] focus-visible:scale-[1.015] hover:shadow-2xl hover:shadow-black/40 focus-visible:shadow-2xl focus-visible:shadow-black/40 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100 focus-visible:ring-2 focus-visible:ring-[var(--card-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0f13]"
      style={{
        left: -ACTIVE_BOX.horizontalExpand,
        right: -ACTIVE_BOX.horizontalExpand,
        top,
        height: bottom - top,
        ["--card-ring-color" as string]: b.color,
      }}
    >
      {/* Gated on impactedBranch, not just isFocused: the border only
          starts its draw-in once the particle's traveling light has
          actually reached this box (GitGraphParticleField's onImpact ->
          setImpactedBranch), not the instant the branch becomes focused.
          That's the chain reaction — focus launches the particle, impact
          ignites the border. */}
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
