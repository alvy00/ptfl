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

import {
  BRANCH_DEFS,
  BUGFIX_COLOR,
  BUGFIX_DEFS,
  LAYOUTS,
  PALETTE,
  TOTAL_ROWS,
  branchByProject,
} from "@/lib/portfolio/gitGraphData";
import { buildGeometry, branchGlowWindow, drawRange, glowStops } from "@/lib/portfolio/gitGraphGeometry";
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
  const [hoveredBranchGroup, setHoveredBranchGroup] = useState<string | null>(null);
  const branchHoverTimeout = useRef<number | undefined>(undefined);

  const focusBranch = (group: string) => {
    window.clearTimeout(branchHoverTimeout.current);
    setHoveredBranchGroup(group);
  };
  const unfocusBranch = (group: string) => {
    window.clearTimeout(branchHoverTimeout.current);
    branchHoverTimeout.current = window.setTimeout(() => {
      setHoveredBranchGroup((g) => (g === group ? null : g));
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

  // Each glow window is derived directly from that project's branch
  // sourceRow/mergeRow (see BRANCH_DEFS) — there's nothing to keep in sync
  // by hand anymore, and every feature branch automatically gets a glow.
  const purpleGlow = useTransform(
    smoothProgress,
    branchGlowWindow(branchByProject("assetverse").sourceRow, branchByProject("assetverse").mergeRow),
    glowStops(PALETTE.projects.assetverse.accent),
  );

  const amberGlow = useTransform(
    smoothProgress,
    branchGlowWindow(branchByProject("auctasync").sourceRow, branchByProject("auctasync").mergeRow),
    glowStops(PALETTE.projects.auctasync.accent),
  );

  const cyanGlow = useTransform(
    smoothProgress,
    branchGlowWindow(branchByProject("asynclangai").sourceRow, branchByProject("asynclangai").mergeRow),
    glowStops(PALETTE.projects.asynclangai.accent),
  );

  const greenGlow = useTransform(
    smoothProgress,
    branchGlowWindow(branchByProject("careerpilot").sourceRow, branchByProject("careerpilot").mergeRow),
    glowStops(PALETTE.projects.careerpilot.accent),
  );

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

  const dimTransition = reduceMotion ? { duration: 0.01 } : { duration: 0.25, ease: "easeOut" as const };

  // Hovering (or keyboard-focusing) any commit dims every branch except the
  // one it belongs to (main always stays visible, since it's the trunk
  // everything reads against) — a lightweight "depth of field" focus effect
  // done with opacity rather than backdrop-filter, since blurring thin SVG
  // strokes just looks muddy rather than giving real depth. An explicit
  // hover always wins over the automatic scroll-focus above, so a person
  // who's deliberately inspecting one branch never gets overridden by
  // scroll position.
  const focusedBranch = hoveredBranchGroup ?? scrolledBranch ?? undefined;
  const isDimmed = (group: string) =>
    Boolean(focusedBranch) && group !== "main" && group !== focusedBranch;

  return (
    <>
      <GitGraphScrollProgress progress={spineProgress} />

      <GitGraphAmbientGlow
        purple={purpleGlow}
        amber={amberGlow}
        cyan={cyanGlow}
        green={greenGlow}
        reduceMotion={reduceMotion}
      />

      <GitGraphLegend />

      {/* Fully fluid width — no forced horizontal scroll. The graph and its
          text column both shrink together via the tier-based layout, so
          this fits from small phones up through desktop without clipping. */}
      <div
        ref={containerRef}
        className="relative w-full max-w-full px-1.5 sm:px-4"
        style={{ height }}
      >
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

          {/* bugfix branches — same scroll-scrubbed treatment */}
          {bugfixBranches.map((b) => (
            <motion.path
              key={b.name}
              d={bugfixPath(b)}
              fill="none"
              stroke={BUGFIX_COLOR}
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
            />
          ))}
        </svg>

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
              onOpen={openCommit}
              onEnter={() => {
                setHovered(n.hash);
                focusBranch(n.branchGroup);
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
