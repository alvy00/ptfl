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
    // "start center" -> "start 80%": progress used to sit at 0 until the
    // graph's top edge reached the vertical CENTER of the viewport, so
    // nothing revealed until the graph was already half-scrolled-past.
    // "80%" is a point near the bottom of the viewport instead — progress
    // starts advancing as soon as the graph is barely on-screen, so nodes/
    // commits start their reveal noticeably earlier in the scroll. Kept
    // modest (not "start end", the earliest possible trigger) — this is a
    // nudge, not a full retrigger of the whole reveal calibration.
    offset: ["start 65%", "end end"],
  });
  const spineProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const spineY2 = useTransform(spineProgress, [0, 1], [yOf(0), yOf(TOTAL_ROWS - 1)]);

  // Stiffness bumped, damping trimmed slightly on both configs — a small,
  // deliberate nudge (not a full retune): smoothProgress now tracks the
  // raw scroll position a bit more tightly, so node/commit reveals read
  // as keeping up with the scroll rather than trailing behind it. Still a
  // genuine spring (not instant/1:1), just a snappier one.
  const scrollSpringConfig = isCoarsePointer
    ? { stiffness: 160, damping: 22, mass: 0.35 } // snappier — touch scroll has its own OS momentum already
    : { stiffness: 110, damping: 24, mass: 0.5 };

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

  // Per-branch pathLength progress — see the hook for why this can't just
  // be built via .map() (rules-of-hooks).
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
    }
    // No feature-commit or bugfix-commit branch here anymore: those rows
    // are passive (see GitGraphCommitRow's isPassiveRow) and never call
    // onOpen. Opening a project is openProjectCard below, wired to the
    // whole feature card; opening a bugfix is openBugfix, wired to the
    // whole bugfix box — neither is ever triggered from an individual
    // commit row anymore.
  };

  // Single entry point for opening a project's deep-dive — whatever UI
  // triggers it (the whole-card click/Enter, previously it would have
  // been per-commit) always resolves to the exact same modal state shape:
  // just which project, nothing commit-specific. This replaced a
  // per-commit selectedCommit-shaped payload that varied by which row was
  // clicked despite always opening the same project modal underneath.
  const openProjectCard = (projectKey: ProjectKey) => {
    setSelection({ kind: "feature", projectKey });
  };

  // Bugfix equivalent of openProjectCard — one entry point for the whole
  // box (see GitGraphBugfixBox), replacing what used to be 2 identical
  // per-commit handlers (reproduce + resolve, both opening the same
  // modal). The resolve commit (always last) is used as the canonical
  // hash/message for the modal header, since it's the commit that
  // actually represents "this is fixed," not the reproduce step.
  const openBugfix = (b: (typeof bugfixBranches)[number]) => {
    const resolveCommit = b.commits[b.commits.length - 1];
    setSelection({
      kind: "bugfix",
      hash: resolveCommit.hash,
      message: resolveCommit.message,
      bugfixKey: b.bugfixKey,
    });
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
          // Right offset bumped up from right-1.5/right-4 — the active
          // border box expands past this wrapper's own edges by
          // ACTIVE_BOX.horizontalExpand on hover/focus, and with the old,
          // tighter margin that expansion ran past the viewport's right
          // edge and got cut off (see the circled screenshot). Same value
          // is mirrored on the text column's wrapper below so the two stay
          // aligned — this only shifts the shared right margin, not their
          // relative position to each other.
          className="absolute inset-y-0 right-4 sm:right-10 pointer-events-none"
          style={{ left: `calc(${graphW}px + ${textColumnGapPx}px)` }}
        >
          {/* Rebalanced per latest markup: vertical stays tight against
              the commit range (just a small fixed clearance, not a
              rowH-scaled stretch — that was overshooting), while
              horizontal expands well past the text column on both sides
              for a wider, flatter frame. HORIZONTAL_EXPAND/BOTTOM_CLEARANCE
              are fixed px (not tier-scaled) since the ask here is a
              specific flat aspect ratio, not proportional breathing room. */}
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

      <CommitModal selection={selection} onClose={() => setSelection(null)} />
    </>
  );
}
