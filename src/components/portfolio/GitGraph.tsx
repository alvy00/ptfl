/* eslint-disable prettier/prettier */
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState, useMemo, type MouseEvent } from "react";

import { CommitModal, type CommitSelection } from "./CommitModal";
import { GitGraphScrollProgress } from "./GitGraphScrollProgress";
import { GitGraphAmbientGlow } from "./GitGraphAmbientGlow";
import { GitGraphLegend } from "./GitGraphLegend";
import { GitGraphNode } from "./GitGraphNode";
import { GitGraphCommitRow } from "./GitGraphCommitRow";
import { GitGraphActiveBorder } from "./GitGraphActiveBorder";
import { GitGraphParticleField } from "./GitGraphParticleField";

import {
  BRANCH_DEFS,
  BUGFIX_DEFS,
  LAYOUTS,
  PALETTE,
  TOTAL_ROWS,
  branchByProject,
} from "@/lib/portfolio/gitGraphData";
import {
  buildGeometry,
  drawRange,
  activeBoxVerticalRange,
  ACTIVE_BOX,
} from "@/lib/portfolio/gitGraphGeometry";
import { useLayoutTier, usePointerCoarse } from "@/lib/portfolio/useGitGraphResponsive";
import type { NodeMeta } from "@/lib/portfolio/gitGraphTypes";

export function GitGraph() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selection, setSelection] = useState<CommitSelection | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tracked separately from `hovered` (which is the exact commit, used for
  // that commit's own scale/glow/background feedback). This is "which
  // branch is currently focused for dimming purposes" — moving the cursor
  // between two commits *of the same branch* should never register as
  // leaving it, even for the brief real gap between one row's mouseleave
  // and the next row's mouseenter. unfocusBranch() delays the clear by a
  // grace period and cancels it if focusBranch() fires again first, so
  // that gap never gets committed to state and never triggers the (250ms,
  // animated) dim/undim transition. Without this, every hop between
  // adjacent commits of the same branch flashed the whole graph undimmed
  // for a frame.
  // `group` is unchanged from before — it's what drives dimming, and for a
  // bugfix commit it's intentionally the *parent* feature branch's name
  // (hovering a fix should keep its parent branch lit too). `bugfixKey` is
  // new: it's only set when the hovered commit is itself a bugfix commit,
  // and it's what lets the border logic below tell "hovering the feature
  // branch itself" apart from "hovering its nested bugfix" even though
  // both share the same `group`. Without this the feature border and the
  // bugfix border lit up together any time either was hovered.
  const [hoveredFocus, setHoveredFocus] = useState<{ group: string; bugfixKey?: string } | null>(
    null,
  );
  const branchHoverTimeout = useRef<number | undefined>(undefined);

  // Which feature branch the particle connector's traveling light has
  // actually landed on — set by GitGraphParticleField's onImpact callback,
  // the moment (not before) the particle reaches the border's impact
  // point. This is what gates the border's draw-in: while a branch is
  // focused but the particle is still traveling, the border stays
  // undrawn; only onImpact flips it. Cleared as soon as focus moves off
  // the impacted branch (see the effect below focusedBranch's own
  // declaration), which is what drives the border's reverse/undraw
  // animation — GitGraphActiveBorder's `active` prop just reverses the
  // same pathLength animation when it flips back to false, no separate
  // "undrawing" state needed.
  const [impactedBranch, setImpactedBranch] = useState<string | null>(null);
  // True when the most recent onImpact for `impactedBranch` was a replay
  // (GitGraphParticleField's instant=true) rather than a real particle
  // landing — forwarded to GitGraphActiveBorder so it can pop straight to
  // sealed instead of replaying its own draw-in animation too.
  const [instantBorderKey, setInstantBorderKey] = useState<string | null>(null);

  const focusBranch = (group: string, bugfixKey?: string) => {
    window.clearTimeout(branchHoverTimeout.current);
    setHoveredFocus({ group, bugfixKey });
  };
  const unfocusBranch = (group: string) => {
    window.clearTimeout(branchHoverTimeout.current);
    branchHoverTimeout.current = window.setTimeout(() => {
      setHoveredFocus((f) => (f?.group === group ? null : f));
    }, 150);
  };

  useEffect(() => () => window.clearTimeout(branchHoverTimeout.current), []);

  const tier = useLayoutTier();
  const isCoarsePointer = usePointerCoarse();
  const reduceMotion = useReducedMotion() ?? false;
  const layout = LAYOUTS[tier];

  const geometry = useMemo(() => buildGeometry(layout), [layout]);
  const { yOf, graphW, height, branches, bugfixBranches, branchPath, bugfixPath, allNodes } =
    geometry;

  const nodeScale = layout.nodeScale;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end end"],
  });
  const spineProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const spineY2 = useTransform(spineProgress, [0, 1], [yOf(0), yOf(TOTAL_ROWS - 1)]);

  const scrollSpringConfig = isCoarsePointer
    ? { stiffness: 140, damping: 24, mass: 0.35 } // snappier — touch scroll has its own OS momentum already
    : { stiffness: 90, damping: 26, mass: 0.5 };

  const smoothProgress = useSpring(spineProgress, scrollSpringConfig);

  // A SEPARATE scroll measurement, specifically for "which row is at the
  // vertical center of the viewport right now" (used for auto-focus below).
  // This can't reuse `spineProgress` above — that one is calibrated with
  // offset ["start center", "end end"] because it's driving the spine-draw
  // animation, where progress=1 should mean "scrolled to the very bottom
  // of the container." That's a different reference point than "container
  // bottom has reached viewport center," so reusing it here under-counts
  // how far through the graph the centered row actually is, and the
  // auto-focus branch lags behind what's visually centered on screen —
  // e.g. AuctaSync would still read as "focused" while AsyncLangAI's
  // commits are what's actually centered in view.
  //
  // With offset ["start center", "end center"], the viewport-height term
  // cancels out algebraically (both reference points relate to the same
  // "center" point), so progress * height is exactly the pixel distance
  // from the container's top to whatever's centered in the viewport —
  // independent of how tall the viewport itself is.
  const { scrollYProgress: centerYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });
  const smoothCenterProgress = useSpring(centerYProgress, scrollSpringConfig);

  // Which feature branch the user is currently scrolled past, for
  // auto-focus dimming. Uses a half-open row interval [sourceRow, mergeRow)
  // — branches in this graph are contiguous on the trunk (e.g. AuctaSync's
  // mergeRow is AsyncLangAI's sourceRow), so an inclusive-both-ends check
  // would match two branches at once right at the handoff row. And this
  // only calls setState when the active branch actually changes (tracked
  // via a ref) rather than on every scroll tick, for the same reason
  // ScrollProgress's counter was moved off useState earlier.
  const scrolledBranchRef = useRef<string | null>(null);
  const [scrolledBranch, setScrolledBranch] = useState<string | null>(null);

  useMotionValueEvent(smoothCenterProgress, "change", (v) => {
    // Inverts yOf(row) = topPad + row * rowH to solve for the row whose
    // pixel position is at (v * height) from the container top.
    const currentRow = (v * height - layout.topPad) / layout.rowH;
    const active = BRANCH_DEFS.find((b) => currentRow >= b.sourceRow && currentRow < b.mergeRow);
    const name = active?.name ?? null;
    if (scrolledBranchRef.current !== name) {
      scrolledBranchRef.current = name;
      setScrolledBranch(name);
    }
  });

  // Branch lines draw in — and un-draw on scroll-up — scrubbed directly to
  // scroll position, rather than a one-shot whileInView animation. Declared
  // explicitly (not via .map) so this stays valid per rules-of-hooks.
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

  useEffect(() => {
    let timeoutId: number;

    function onHighlight(e: Event) {
      const hash = (e as CustomEvent<string>).detail;
      if (!hash) return;
      const el = document.getElementById(`commit-${hash}`);
      if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      setHighlighted(hash);

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setHighlighted((h) => (h === hash ? null : h));
      }, 1800);
    }

    window.addEventListener("highlight-commit", onHighlight as EventListener);
    return () => {
      window.removeEventListener("highlight-commit", onHighlight as EventListener);
      window.clearTimeout(timeoutId);
    };
  }, [reduceMotion]);

  const openCommit = (n: NodeMeta, evt?: MouseEvent) => {
    if (n.isBugfix && n.bugfixKey !== undefined) {
      if (n.bugfixCommitIndex === 1) {
        setSelection({
          kind: "bugfix",
          hash: n.hash,
          message: n.message,
          bugfixKey: n.bugfixKey,
        });
      } else {
        const rect = (evt?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect();
        setSelection({
          kind: "bugfix-first",
          hash: n.hash,
          message: n.message,
          color: n.color,
          anchorX: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
          anchorY: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
        });
      }
      return;
    }
    if (n.isMain) {
      const rect = (evt?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect();
      setSelection({
        kind: "main",
        hash: n.hash,
        message: n.message,
        anchorX: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        anchorY: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
      });
    } else if (n.projectKey) {
      setSelection({
        kind: "feature",
        hash: n.hash,
        message: n.message,
        projectKey: n.projectKey,
        commitIndex: n.commitIndex ?? 0,
        commitTotal: n.commitTotal ?? 1,
      });
    }
  };

  const dimTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.25, ease: "easeOut" as const };

  // Hovering (or keyboard-focusing) any commit dims every branch except the
  // one it belongs to (main always stays visible, since it's the trunk
  // everything reads against) — a lightweight "depth of field" focus effect
  // done with opacity rather than backdrop-filter, since blurring thin SVG
  // strokes just looks muddy rather than giving real depth. An explicit
  // hover always wins over the automatic scroll-focus above, so a person
  // who's deliberately inspecting one branch never gets overridden by
  // scroll position.
  const focusedBranch = hoveredFocus?.group ?? scrolledBranch ?? undefined;
  const isDimmed = (group: string) =>
    Boolean(focusedBranch) && group !== "main" && group !== focusedBranch;

  // Focus moved off the branch that had impacted (hover-out, scrolled
  // past, or a different branch took focus) — clear it so the border for
  // the branch that lost focus reverses/undraws.
  useEffect(() => {
    setImpactedBranch((current) => (current && current !== focusedBranch ? null : current));
  }, [focusedBranch]);

  // GitGraphParticleField mounts nothing at all when reduceMotion or
  // isCoarsePointer is true (no canvas, no rAF loop) — which means its
  // onImpact callback, the only thing that ever sets impactedBranch, never
  // fires. Without this, the border silently never lit up for any touch
  // user or anyone with prefers-reduced-motion set: hover/focus registered
  // with zero visual acknowledgment, which reads as "my input didn't
  // register" — worse than the old always-on fade it replaced. When the
  // particle field is inactive, treat a branch as impacted the instant
  // it's focused, bypassing the connect->impact chain entirely rather than
  // waiting on a signal that will never come.
  useEffect(() => {
    if (!(reduceMotion || isCoarsePointer)) return;
    setImpactedBranch(focusedBranch ?? null);
  }, [reduceMotion, isCoarsePointer, focusedBranch]);

  // Border-only distinction: scroll-driven auto-focus never targets a
  // bugfix specifically, so it's always the feature border's turn there.
  // Only an explicit hover on a bugfix commit sets this.
  const focusedBugfixKey = hoveredFocus?.bugfixKey;

  // The ambient glow's one saturated note. Reuses focusedBranch as-is — no
  // separate "which color should glow" tracking — so hovering a commit and
  // scrolling past a branch both drive the same color the border/dimming
  // already react to, instead of a second, slightly-out-of-sync source of
  // truth. Bugfix commits keep their parent feature branch as focusedBranch
  // (see the `group` comment above `hoveredFocus`), so this naturally
  // resolves to that project's accent for those too, not a special case.
  const focusedColor = focusedBranch
    ? (BRANCH_DEFS.find((b) => b.name === focusedBranch)?.color ?? null)
    : null;

  return (
    <>
      <GitGraphScrollProgress progress={spineProgress} />

      <GitGraphAmbientGlow
        activeColor={focusedColor}
        reduceMotion={reduceMotion}
        isCoarsePointer={isCoarsePointer}
      />

      <GitGraphLegend />

      {/* Fully fluid width — no forced horizontal scroll. The graph and its
          text column both shrink together via the tier-based layout, so
          this fits from small phones up through desktop without clipping. */}
      <div
        ref={containerRef}
        className="relative w-full max-w-full overflow-x-clip px-1.5 sm:px-4"
        style={{ height }}
      >
        {/* Ambient particle field — first child so it's behind the SVG/
            border/text layers by DOM order alone, no z-index needed. Reads
            the same containerRef, branches, layout, and focusedBranch this
            component already computes; doesn't introduce a second source
            of truth for any of them. */}
        <GitGraphParticleField
          containerRef={containerRef}
          branches={branches}
          layout={layout}
          graphW={graphW}
          focusedBranch={focusedBranch}
          nodeScale={nodeScale}
          reduceMotion={reduceMotion}
          isCoarsePointer={isCoarsePointer}
          onImpact={(name, instant) => {
            setImpactedBranch(name);
            setInstantBorderKey(instant ? name : null);
          }}
        />

        {/* SVG graph */}
        <svg
          className="pointer-events-none absolute inset-y-0 left-1.5 sm:left-4"
          width={graphW}
          height={height}
          viewBox={`0 0 ${graphW} ${height}`}
          style={{ overflow: "visible" }}
          aria-hidden="true"
        >
          <defs>
            <filter id="head-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* main spine */}
          <motion.line
            x1={layout.mainX}
            y1={yOf(0)}
            x2={layout.mainX}
            y2={spineY2}
            stroke={PALETTE.mainLine}
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* feature branches — pathLength is scrubbed directly to scroll
              position (draws in going down, un-draws going back up),
              instead of a one-shot whileInView reveal. */}
          {branches.map((b) => (
            <motion.path
              key={b.name}
              d={branchPath(b)}
              fill="none"
              stroke={b.color}
              strokeWidth={2.25}
              strokeLinecap="round"
              animate={{ opacity: isDimmed(b.name) ? 0.15 : 0.9 }}
              transition={dimTransition}
              style={{
                pathLength: reduceMotion ? 1 : featureDrawByName[b.name],
                willChange: "stroke-dashoffset, opacity",
              }}
            />
          ))}

          {/* bugfix branches — same scroll-scrubbed treatment. Each now
              carries its own parent-tinted color (b.color) instead of the
              flat BUGFIX_COLOR, so a fix still reads as rose but leans
              toward its own project's hue. */}
          {bugfixBranches.map((b) => (
            <motion.path
              key={b.name}
              d={bugfixPath(b)}
              fill="none"
              stroke={b.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="5 4"
              animate={{ opacity: isDimmed(b.branchGroup) ? 0.12 : 0.85 }}
              transition={dimTransition}
              style={{
                pathLength: reduceMotion ? 1 : bugfixDrawByName[b.name],
                willChange: "stroke-dashoffset, opacity",
              }}
            />
          ))}

          {/* nodes */}
          {allNodes.map((n) => (
            <GitGraphNode
              key={n.hash}
              n={n}
              isHovered={hovered === n.hash}
              isHighlighted={highlighted === n.hash}
              dimmed={isDimmed(n.branchGroup)}
              nodeScale={nodeScale}
              reduceMotion={reduceMotion}
              progress={smoothProgress}
            />
          ))}
        </svg>

        {/* Active-branch border + continuous light-ray overlay. Sized to
            each branch's own row span (yOf(sourceRow) .. yOf(mergeRow)) so
            it never depends on a "card" that doesn't exist in this layout,
            and it re-derives automatically whenever the tier (and
            therefore yOf) changes — nothing to keep in sync by hand.
            `active` reuses the exact same focusedBranch state that
            already drives dimming, so hover and scroll-focus both light
            the border in sync with the existing dim/undim behavior. The
            ray animation itself runs continuously inside
            GitGraphActiveBorder regardless of `active` — only opacity is
            gated — so switching the active branch while scrolling is a
            plain crossfade, never a restart. */}
        <div
          className="absolute inset-y-0 right-1.5 sm:right-4 pointer-events-none"
          style={{ left: `calc(${graphW}px + 1.5rem)` }}
          aria-hidden="true"
        >
          {/* Rebalanced per latest markup: vertical stays tight against
              the commit range (just a small fixed clearance, not a
              rowH-scaled stretch — that was overshooting), while
              horizontal expands well past the text column on both sides
              for a wider, flatter frame. HORIZONTAL_EXPAND/BOTTOM_CLEARANCE
              are fixed px (not tier-scaled) since the ask here is a
              specific flat aspect ratio, not proportional breathing room. */}
          {branches.map((b) => {
            // Reads from the same activeBoxVerticalRange() helper the
            // particle field's impact-point targeting uses — this box and
            // the particle's landing spot can no longer drift apart.
            const { top, bottom } = activeBoxVerticalRange(b.sourceY, b.mergeY, "feature");
            const isFocused = focusedBranch === b.name && !focusedBugfixKey;
            return (
              <div
                key={`border-${b.name}`}
                className="absolute"
                style={{
                  left: -ACTIVE_BOX.horizontalExpand,
                  right: -ACTIVE_BOX.horizontalExpand,
                  top,
                  height: bottom - top,
                }}
              >
                {/* Gated on impactedBranch, not just isFocused: the border
                    only starts its draw-in once the particle's traveling
                    light has actually reached this box (GitGraphParticleField's
                    onImpact -> setImpactedBranch), not the instant the
                    branch becomes focused. That's the chain reaction —
                    focus launches the particle, impact ignites the border. */}
                <GitGraphActiveBorder
                  active={isFocused && impactedBranch === b.name}
                  color={b.color}
                  reduceMotion={reduceMotion}
                  instant={instantBorderKey === b.name}
                />
              </div>
            );
          })}
          {bugfixBranches.map((b) => {
            const { top, bottom } = activeBoxVerticalRange(b.sourceY, b.mergeY, "bugfix");
            return (
              <div
                key={`border-${b.name}`}
                className="absolute"
                style={{
                  left: -ACTIVE_BOX.horizontalExpand,
                  right: -ACTIVE_BOX.horizontalExpand,
                  top,
                  height: bottom - top,
                }}
              >
                {/* No particle targets bugfix boxes (GitGraphParticleField
                    only tracks `branches`, i.e. feature branches) — so
                    these keep the simple focus-gated draw-in/out, no
                    impact gate. */}
                <GitGraphActiveBorder
                  active={focusedBranch === b.branchGroup && focusedBugfixKey === b.bugfixKey}
                  color={b.color}
                  reduceMotion={reduceMotion}
                />
              </div>
            );
          })}
        </div>

        {/* Text column — its left offset tracks the (responsive) graph
            width directly, so the two always line up at every tier. */}
        <ul
          className="absolute inset-y-0 right-1.5 sm:right-4 pointer-events-none list-none m-0 p-0"
          style={{ left: `calc(${graphW}px + 1.5rem)` }}
        >
          {allNodes.map((n) => (
            <GitGraphCommitRow
              key={n.hash}
              n={n}
              isHovered={hovered === n.hash}
              isHighlighted={highlighted === n.hash}
              dimmed={isDimmed(n.branchGroup)}
              reduceMotion={reduceMotion}
              progress={smoothProgress}
              rowH={layout.rowH}
              onOpen={openCommit}
              onEnter={() => {
                setHovered(n.hash);
                focusBranch(n.branchGroup, n.isBugfix ? n.bugfixKey : undefined);
              }}
              onLeave={() => {
                setHovered((h) => (h === n.hash ? null : h));
                unfocusBranch(n.branchGroup);
              }}
            />
          ))}
        </ul>
      </div>

      <CommitModal selection={selection} onClose={() => setSelection(null)} />
    </>
  );
}
