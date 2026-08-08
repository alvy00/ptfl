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

import { CommitModal, type CommitSelection } from "../CommitModal";
import type { ProjectKey } from "@/data/portfolio/projects";
import { projects } from "@/data/portfolio/projects";
import { bugfixes } from "@/data/portfolio/bugfixes";
import { GitGraphScrollProgress } from "./GitGraphScrollProgress";
import { GitGraphAmbientGlow } from "./GitGraphAmbientGlow";
import { GitGraphLegend } from "./GitGraphLegend";
import { GitGraphNode } from "./GitGraphNode";
import { GitGraphFeatureCard } from "./GitGraphFeatureCard";
import { GitGraphBugfixBox } from "./GitGraphBugfixBox";
import { GitGraphCommitTextColumn } from "./GitGraphCommitTextColumn";
import { GitGraphParticleField } from "./GitGraphParticleField";

import { BRANCH_DEFS, LAYOUTS, PALETTE, TOTAL_ROWS } from "@/lib/portfolio/gitGraphData";
import { buildGeometry } from "@/lib/portfolio/gitGraphGeometry";
import { useGitGraphDrawProgress } from "@/lib/portfolio/useGitGraphDrawProgress";
import { useLayoutTier, usePointerCoarse } from "@/lib/portfolio/useGitGraphResponsive";
import type { NodeMeta } from "@/lib/portfolio/gitGraphTypes";

export function GitGraph({
  onModalOpen,
  onModalClose,
}: {
  // CommitModal locks body scroll while open, so index.tsx's own scroll
  // listener (the only other thing driving the sticky search bar's hide/
  // show) never fires during that time. Called on open/close so the bar
  // explicitly gets out of the way while the modal eats vertical space,
  // then comes back once it's gone.
  onModalOpen?: () => void;
  onModalClose?: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selection, setSelection] = useState<CommitSelection | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Separate from `hovered`: this is "which branch is focused for dimming,"
  // and moving between two commits of the same branch should never
  // register as leaving it. unfocusBranch delays the clear by a grace
  // period, cancelled if focusBranch fires again first.
  // `group` drives dimming (for a bugfix commit it's the parent feature
  // branch, so hovering a fix keeps its parent lit too); `bugfixKey` is
  // only set when the hovered commit is itself a bugfix, letting the
  // border logic tell "hovering the feature branch" apart from "hovering
  // its nested bugfix" despite sharing the same group.
  const [hoveredFocus, setHoveredFocus] = useState<{ group: string; bugfixKey?: string } | null>(
    null,
  );
  const branchHoverTimeout = useRef<number | undefined>(undefined);

  // Which feature branch the particle connector's light has actually
  // landed on (set by GitGraphParticleField's onImpact) — gates the
  // border's draw-in so it doesn't fire before the particle arrives.
  const [impactedBranch, setImpactedBranch] = useState<string | null>(null);
  // Whether the most recent impact for `impactedBranch` was a replay
  // (instant=true) rather than a real landing, forwarded to
  // GitGraphActiveBorder so it pops straight to sealed instead of
  // replaying the draw-in.
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
  const {
    yOf,
    graphW,
    textColumnGapPx,
    height,
    branches,
    bugfixBranches,
    branchPath,
    bugfixPath,
    allNodes,
  } = geometry;

  const nodeScale = layout.nodeScale;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    // Starts advancing once the graph is barely on-screen rather than
    // waiting for its top edge to reach viewport center — reveals begin
    // noticeably earlier without retriggering the whole calibration.
    offset: ["start 65%", "end end"],
  });
  const spineProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const spineY2 = useTransform(spineProgress, [0, 1], [yOf(0), yOf(TOTAL_ROWS - 1)]);

  const scrollSpringConfig = isCoarsePointer
    ? { stiffness: 160, damping: 22, mass: 0.35 } // touch scroll has its own OS momentum already
    : { stiffness: 110, damping: 24, mass: 0.5 };

  const smoothProgress = useSpring(spineProgress, scrollSpringConfig);

  // Separate scroll measurement for "which row is centered in the
  // viewport" (auto-focus below). Can't reuse spineProgress — that one is
  // calibrated for the spine-draw animation ("end" = bottom of container),
  // a different reference point than "container bottom reaches viewport
  // center." With ["start center", "end center"] the viewport-height term
  // cancels out algebraically, so progress * height is exactly the pixel
  // distance to whatever's centered, independent of viewport height.
  const { scrollYProgress: centerYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });
  const smoothCenterProgress = useSpring(centerYProgress, scrollSpringConfig);

  // Half-open interval [sourceRow, mergeRow) — branches are contiguous on
  // the trunk, so inclusive-both-ends would match two branches at once at
  // a handoff row. Only calls setState when the active branch changes.
  const scrolledBranchRef = useRef<string | null>(null);
  const [scrolledBranch, setScrolledBranch] = useState<string | null>(null);

  useMotionValueEvent(smoothCenterProgress, "change", (v) => {
    // Inverts yOf(row) = topPad + row * rowH to solve for the row at
    // pixel position (v * height) from the container top.
    const currentRow = (v * height - layout.topPad) / layout.rowH;
    const active = BRANCH_DEFS.find((b) => currentRow >= b.sourceRow && currentRow < b.mergeRow);
    const name = active?.name ?? null;
    if (scrolledBranchRef.current !== name) {
      scrolledBranchRef.current = name;
      setScrolledBranch(name);
    }
  });

  const { featureDrawByName, bugfixDrawByName } = useGitGraphDrawProgress(smoothProgress);

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
    if (n.isMain) {
      const rect = (evt?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect();
      setSelection({
        kind: "main",
        hash: n.hash,
        message: n.message,
        anchorX: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        anchorY: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
      });
      onModalOpen?.();
    }
    // Feature/bugfix commit rows are passive and never call this —
    // opening those goes through openProjectCard/openBugfix instead.
  };

  const openProjectCard = (projectKey: ProjectKey) => {
    setSelection({ kind: "feature", projectKey });
    onModalOpen?.();
  };

  // Resolve commit (always last) is used as the modal's canonical
  // hash/message — it's the commit that represents "this is fixed."
  const openBugfix = (b: (typeof bugfixBranches)[number]) => {
    const resolveCommit = b.commits[b.commits.length - 1];
    setSelection({
      kind: "bugfix",
      hash: resolveCommit.hash,
      message: resolveCommit.message,
      bugfixKey: b.bugfixKey,
    });
    onModalOpen?.();
  };

  const dimTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.25, ease: "easeOut" as const };

  // Explicit hover always wins over scroll-focus, so deliberately
  // inspecting a branch never gets overridden by scroll position.
  const focusedBranch = hoveredFocus?.group ?? scrolledBranch ?? undefined;
  const isDimmed = (group: string) =>
    Boolean(focusedBranch) && group !== "main" && group !== focusedBranch;

  useEffect(() => {
    setImpactedBranch((current) => (current && current !== focusedBranch ? null : current));
  }, [focusedBranch]);

  // GitGraphParticleField mounts nothing when reduceMotion/isCoarsePointer
  // is true, so its onImpact callback never fires. Treat a branch as
  // impacted the instant it's focused instead, bypassing the connect ->
  // impact chain — otherwise hover/focus gets zero visual acknowledgment.
  useEffect(() => {
    if (!(reduceMotion || isCoarsePointer)) return;
    setImpactedBranch(focusedBranch ?? null);
  }, [reduceMotion, isCoarsePointer, focusedBranch]);

  // Scroll-driven auto-focus never targets a bugfix specifically; only an
  // explicit hover on a bugfix commit sets this.
  const focusedBugfixKey = hoveredFocus?.bugfixKey;

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

      <div
        ref={containerRef}
        className="relative w-full max-w-full overflow-x-clip px-1.5 sm:px-4"
        style={{ height }}
      >
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

          <motion.line
            x1={layout.mainX}
            y1={yOf(0)}
            x2={layout.mainX}
            y2={spineY2}
            stroke={PALETTE.mainLine}
            strokeWidth={4}
            strokeLinecap="round"
          />

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

        {/* Sized to each branch's own row span so it re-derives
            automatically when the tier changes. `active` reuses the same
            focusedBranch state that drives dimming. */}
        <div
          className="absolute inset-y-0 right-4 sm:right-10 pointer-events-none"
          style={{ left: `calc(${graphW}px + ${textColumnGapPx}px)` }}
        >
          {branches.map((b) => {
            const isFocused = focusedBranch === b.name && !focusedBugfixKey;
            const projectName = projects[b.projectKey].name.split(" — ")[0];
            return (
              <GitGraphFeatureCard
                key={`border-${b.name}`}
                b={b}
                projectName={projectName}
                isFocused={isFocused}
                impactedBranch={impactedBranch}
                instantBorderKey={instantBorderKey}
                reduceMotion={reduceMotion}
                onOpenProject={openProjectCard}
                focusBranch={focusBranch}
                unfocusBranch={unfocusBranch}
              />
            );
          })}
          {bugfixBranches.map((b) => (
            <GitGraphBugfixBox
              key={`border-${b.name}`}
              b={b}
              title={bugfixes[b.bugfixKey].title}
              active={focusedBranch === b.branchGroup && focusedBugfixKey === b.bugfixKey}
              reduceMotion={reduceMotion}
              focusBranch={focusBranch}
              unfocusBranch={unfocusBranch}
              onOpen={openBugfix}
            />
          ))}
        </div>

        <GitGraphCommitTextColumn
          allNodes={allNodes}
          graphW={graphW}
          textColumnGapPx={textColumnGapPx}
          hovered={hovered}
          highlighted={highlighted}
          focusedBranch={focusedBranch}
          isDimmed={isDimmed}
          reduceMotion={reduceMotion}
          progress={smoothProgress}
          rowH={layout.rowH}
          onOpen={openCommit}
          onEnter={(n) => {
            setHovered(n.hash);
            focusBranch(n.branchGroup, n.isBugfix ? n.bugfixKey : undefined);
          }}
          onLeave={(n) => {
            setHovered((h) => (h === n.hash ? null : h));
            unfocusBranch(n.branchGroup);
          }}
        />
      </div>

      <CommitModal
        selection={selection}
        onClose={() => {
          setSelection(null);
          onModalClose?.();
        }}
      />
    </>
  );
}
