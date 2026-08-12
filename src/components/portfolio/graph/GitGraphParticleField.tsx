import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import {
  activeBoxLeftX,
  activeBoxVerticalRange,
  bugfixTrackX,
  featureTrackX,
  IGNITION_TIMING,
  type GeometryBranch,
  type GeometryBugfixBranch,
} from "@/lib/portfolio/gitGraphGeometry";
import type { Layout } from "@/lib/portfolio/gitGraphTypes";

type IgnitionKind = "feature" | "bugfix";

/**
 * Ambient background canvas: a handful of slow-drifting particles filling
 * the dead space beside the graph, plus — only when a branch OR a bugfix
 * is focused (hover or scroll-auto-focus for branches; hover-only for
 * bugfixes, same state that already drives dimming and
 * GitGraphActiveBorder) — a soft connector line out to that target's
 * active-border box, with a light that travels along it once per focus-in
 * and fires `onImpact` the moment it lands.
 *
 * v6 — bugfix parity: this used to only ever receive `branches` (feature),
 * so a focused bugfix never got a connector/particle at all — its border
 * had no impact to gate on and fired straight from focus instead (see
 * GitGraphActiveBorder's `instant`-less-but-immediate bugfix path). Now
 * takes `bugfixBranches` too; whichever array a focused name is found in
 * decides the track x (featureTrackX vs bugfixTrackX) and the active-box
 * kind ("feature" vs "bugfix") used for targeting. GitGraph.tsx is
 * responsible for resolving *which* name to focus — a bugfix's own name
 * when a bugfix commit is specifically hovered, not its parent branch's —
 * this component just draws whichever target it's handed.
 *
 * v5 — three refinements from review:
 * - **Debounced launch**: a newly-focused branch no longer restarts travel
 *   the instant focus lands on it. It has to hold focus for
 *   IGNITION_TIMING.focusDebounce first. During a fast scroll-through,
 *   `focusedBranch` can flip several times a tick; without this the
 *   particle restarted from zero on every flip and never once completed.
 * - **Replay-once**: a branch that has already completed its full travel
 *   once this mount (tracked in `impactedOnce`) gets NO particle/connector
 *   at all on later re-focuses — it reports impact immediately with
 *   `instant=true`, which GitGraph.tsx forwards to GitGraphActiveBorder so
 *   the border pops straight to sealed with no draw-in animation either.
 *   The full connect->travel->seal sequence is a first-impression beat;
 *   replaying any part of it on every quick re-hover is motion competing
 *   with someone actually reading the commits.
 * - **Comet trail + scale**: the traveling light now leaves a short
 *   fading trail (reads as "energy," not "ball"), and both its radius and
 *   the trail's are scaled by `nodeScale` — every other sized element in
 *   this graph already respects the tier scale; this was the one that didn't.
 *
 * v4 — the traveling light used to loop forever (`travelT = (travelT +
 * dt*0.35) % 1`), which reads fine as ambient motion but can't drive a
 * "particle hits border, border ignites" chain reaction: a light that
 * never stops never has a single moment of impact to key off of. It's now
 * a one-shot per focus session — restarts from 0 whenever the focused
 * target changes, runs to completion once, and calls `onImpact` exactly
 * once when it does. The static connector curve itself is unchanged and
 * still just sits there ambiently regardless.
 *
 * The impact point (both the light's destination and what GitGraph.tsx
 * passes as `active` to GitGraphActiveBorder) reads from
 * gitGraphGeometry.ts's `activeBoxLeftX`/`activeBoxVerticalRange` — the
 * same helpers the actual border box's real geometry is built from — so
 * the light always lands exactly on the border's left edge, not on an
 * independently-approximated point.
 */
export function GitGraphParticleField({
  containerRef,
  branches,
  bugfixBranches,
  layout,
  graphW,
  focusedBranch,
  nodeScale,
  reduceMotion,
  isCoarsePointer,
  onImpact,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  branches: GeometryBranch[];
  bugfixBranches: GeometryBugfixBranch[];
  layout: Layout;
  graphW: number;
  /** Name of whichever branch OR bugfix is currently focused — GitGraph.tsx
   *  resolves this to the bugfix's own name when a bugfix is specifically
   *  hovered, not its parent branch's, so this always identifies a single
   *  real target to ignite rather than being ambiguous between the two. */
  focusedBranch: string | undefined;
  /** Same tier-derived scale every node/radius in the graph already uses
   *  (layout.nodeScale in GitGraph.tsx) — keeps the traveling light and its
   *  trail proportionally sized at every breakpoint instead of a fixed px
   *  radius that reads bigger on xs than on lg. */
  nodeScale: number;
  reduceMotion: boolean;
  isCoarsePointer: boolean;
  /** Fired once per (re-)focus, the moment this target's border should
   *  ignite. `instant=false` the first time this target ever ignites this
   *  mount (a real particle just landed); `instant=true` on every later
   *  re-focus, where there's no connector/travel at all and the border
   *  should pop straight to sealed with no draw-in animation either — see
   *  GitGraphActiveBorder's `instant` prop. */
  onImpact?: (name: string, instant: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mutable "latest props" refs — the rAF loop reads these every frame
  // without needing to be torn down and restarted on every focus change or
  // scroll-driven re-render. Only the mount/unmount effect below (gated by
  // reduceMotion/isCoarsePointer) actually starts or stops the loop.
  const branchesRef = useRef<GeometryBranch[]>(branches);
  const bugfixBranchesRef = useRef<GeometryBugfixBranch[]>(bugfixBranches);
  const layoutRef = useRef(layout);
  const graphWRef = useRef(graphW);
  const focusedRef = useRef(focusedBranch);
  const nodeScaleRef = useRef(nodeScale);
  const onImpactRef = useRef(onImpact);
  branchesRef.current = branches;
  bugfixBranchesRef.current = bugfixBranches;
  layoutRef.current = layout;
  graphWRef.current = graphW;
  focusedRef.current = focusedBranch;
  nodeScaleRef.current = nodeScale;
  onImpactRef.current = onImpact;

  useEffect(() => {
    if (reduceMotion || isCoarsePointer) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CURSOR_RADIUS = 140; // px — only particles within this react to the cursor
    const MAX_PULL = 18; // px — max displacement at the very center of the radius
    // Was 24 — dropped hard per review: this many faint dots reads as
    // generic "AI landing page" ambient chrome, not something specific to
    // a git graph, and it's the one part of this effect with no diegetic
    // tie to the metaphor the rest of the component maintains (decrypt
    // scramble, comet rays, terminal prompts — all git/terminal-flavored).
    // Keeping a handful rather than cutting to zero: a few points of quiet
    // life in the graph's own empty margins still does something; two
    // dozen didn't do more of that thing, just more of it.
    const PARTICLE_COUNT = 7;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    // The SVG graph is positioned with an explicit `left-1.5 sm:left-4`
    // offset (matching the container's own `px-1.5 sm:px-4` padding), so
    // its local coordinate 0 actually renders `graphLeftInset` px to the
    // right of the container's true left edge. This canvas is `absolute
    // inset-0` — flush to that true edge, no such shift. Any x borrowed
    // from SVG-local geometry (featureTrackX, node positions) needs this
    // added back in to land in the same screen position the branch line
    // itself renders at; without it, the particle's launch point drew
    // consistently left of the real track. Read directly off the
    // container's computed padding-left rather than hardcoding the
    // Tailwind breakpoint values, so it stays correct if those classes
    // ever change independently on either element.
    let graphLeftInset = 0;

    const mouse = { x: -9999, y: -9999, active: false };

    type Particle = {
      baseX: number;
      baseY: number;
      driftPhase: number;
      driftSpeed: number;
      driftRadius: number;
      r: number;
      alpha: number;
    };

    let particles: Particle[] = [];

    const seedParticles = () => {
      // Spawn region is deliberately capped to graphWRef.current, not the
      // full container width — the container spans graph + text column
      // together, and the previous version seeded across all of it,
      // meaning particles could drift directly behind commit messages
      // someone is actively reading. graphW is the graph's own SVG width;
      // everything past it (+ the 1.5rem gap) is the text column and is
      // now off-limits for spawn points. A small margin is kept off the
      // graph's own right edge too, so nothing spawns hugging the seam.
      const spawnW = Math.max(0, graphWRef.current - 12);
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        baseX: Math.random() * spawnW,
        baseY: Math.random() * height,
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.15 + Math.random() * 0.2, // radians/sec-ish, scaled by dt below
        driftRadius: 8 + Math.random() * 14,
        r: 0.6 + Math.random() * 1.1,
        alpha: 0.08 + Math.random() * 0.1, // low-opacity by design — fills dead space, doesn't compete with content
      }));
    };

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      graphLeftInset = parseFloat(getComputedStyle(container).paddingLeft) || 0;
      seedParticles();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const onMouseMove = (e: globalThis.MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onMouseLeave = () => {
      mouse.active = false;
    };
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);

    // (dx, dy) pull toward the cursor for a point at (x, y), zero outside
    // CURSOR_RADIUS, falling off toward the edge of the radius rather than
    // snapping — a hard cutoff at the radius boundary would look like a
    // visible edge in what's supposed to read as a soft field.
    const cursorPull = (x: number, y: number): [number, number] => {
      if (!mouse.active) return [0, 0];
      const dx = mouse.x - x;
      const dy = mouse.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist >= CURSOR_RADIUS || dist < 0.001) return [0, 0];
      const falloff = 1 - dist / CURSOR_RADIUS;
      const pull = falloff * falloff * MAX_PULL; // eased, not linear — softer near the edge
      return [(dx / dist) * pull, (dy / dist) * pull];
    };

    // Finds the focused name in either array — whichever one it's in
    // decides the track x and active-box kind used below. Feature checked
    // first; names are expected unique across both (same assumption the
    // rest of the graph already makes — allNodes/branchGroup keys off
    // names from both arrays into one flat namespace too).
    const findTarget = (
      name: string | undefined,
    ): { data: GeometryBranch | GeometryBugfixBranch; kind: IgnitionKind } | undefined => {
      if (!name) return undefined;
      const feature = branchesRef.current.find((b) => b.name === name);
      if (feature) return { data: feature, kind: "feature" };
      const bugfix = bugfixBranchesRef.current.find((b) => b.name === name);
      if (bugfix) return { data: bugfix, kind: "bugfix" };
      return undefined;
    };

    // Reads from gitGraphGeometry.ts's shared active-box helpers — the same
    // ones the real border box in GitGraph.tsx is built from — so this
    // lands exactly on the border's left edge, at its vertical center,
    // instead of an independently-approximated point. `kind` picks feature
    // vs bugfix box clearances (ACTIVE_BOX.feature/.bugfix differ).
    const impactPoint = (
      sourceY: number,
      mergeY: number,
      kind: IgnitionKind,
      gW: number,
    ): { x: number; y: number } => {
      const { top, bottom } = activeBoxVerticalRange(sourceY, mergeY, kind);
      return { x: activeBoxLeftX(gW), y: (top + bottom) / 2 };
    };

    let raf = 0;
    let running = false;
    let last = performance.now();
    let travelT = 0; // 0..1 progress of the traveling light along the connector curve, one-shot per focus-in
    let travelDone = false;
    let travelBranch: string | null = null; // which target the current travelT belongs to
    let pathFade = 1; // 1 = connector path fully visible, ramps to 0 after impact

    // Debounce: a candidate target has to hold focus for
    // IGNITION_TIMING.focusDebounce before it's actually committed as
    // travelBranch and gets a launch. Without this, a fast scroll-through
    // (focusedBranch flipping every tick) restarted the particle from zero
    // over and over and it never once completed.
    let candidateBranch: string | null = null;
    let candidateSince = 0;

    // Replay-once: targets that have already completed a full travel this
    // mount skip straight to "landed" on every later re-focus, so quickly
    // hovering in and out of the same branch/bugfix doesn't replay the
    // full flight every single time.
    const impactedOnce = new Set<string>();

    // Short fading trail behind the traveling light — reads as "energy,"
    // not "a ball bouncing along a wire." Cleared whenever travelBranch
    // resets so a new launch doesn't drag in the previous target's tail.
    const TRAIL_LENGTH = 5;
    let trail: { x: number; y: number }[] = [];

    const stop = () => {
      if (running) cancelAnimationFrame(raf);
      running = false;
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, width, height);

      // --- ambient particles ---
      for (const p of particles) {
        p.driftPhase += p.driftSpeed * dt;
        const driftX = p.baseX + Math.cos(p.driftPhase) * p.driftRadius;
        const driftY = p.baseY + Math.sin(p.driftPhase * 0.8) * p.driftRadius;
        const [pullX, pullY] = cursorPull(driftX, driftY);
        const x = driftX + pullX;
        const y = driftY + pullY;

        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,190,210,${p.alpha})`;
        ctx.fill();
      }

      // --- connector line to the focused branch or bugfix only ---
      const target = findTarget(focusedRef.current);
      if (target) {
        const { data: branch, kind } = target;

        // Debounce: only actually commit to launching a new target once
        // it's held focus for focusDebounce. A fast scroll-through can
        // flip focusedBranch every tick; without this the candidate below
        // would just keep getting reset before ever finishing.
        if (branch.name !== candidateBranch) {
          candidateBranch = branch.name;
          candidateSince = now;
        }
        const stableLongEnough = (now - candidateSince) / 1000 >= IGNITION_TIMING.focusDebounce;

        if (branch.name !== travelBranch && stableLongEnough) {
          travelBranch = branch.name;
          trail = [];
          if (impactedOnce.has(branch.name)) {
            // Seen this target complete a full travel already this mount —
            // this re-focus gets NO particle/connector at all (not even a
            // fading one; pathFade starts at 0, not 1) and reports impact
            // immediately with instant=true, which GitGraph.tsx forwards
            // to GitGraphActiveBorder so the border pops straight to
            // sealed with no draw-in animation either. The full
            // connect->travel->seal sequence is a first-impression thing;
            // replaying even just the border's own draw-in on every
            // re-hover is still motion competing with reading.
            travelT = 1;
            travelDone = true;
            pathFade = 0;
            onImpactRef.current?.(branch.name, true);
          } else {
            travelT = 0;
            travelDone = false;
            pathFade = 1;
          }
        }

        // Nothing to draw yet if we're still inside the debounce window
        // for a brand-new candidate (travelBranch hasn't caught up to
        // `branch` yet) — better to render nothing for one tick than draw
        // the new target's geometry against stale travel state.
        if (travelBranch !== branch.name) {
          // fall through to particles-only frame below
        } else {
          const ly = layoutRef.current;
          // Launch point: the actual commit node nearest the target's
          // vertical center, not the empty midpoint between sourceY/mergeY.
          // trackX picks feature vs bugfix rail — a bugfix target must
          // launch from its own (further-right) rail, not the feature
          // track, or the connector would visibly start from the wrong
          // line. featureTrackX/bugfixTrackX both match the branch's real
          // rendered x exactly, same reasoning as the feature-only version
          // of this comment: `branch.lane` is only a slot index, not a
          // physical offset, for either kind.
          const trackX =
            (kind === "feature" ? featureTrackX(ly) : bugfixTrackX(ly)) + graphLeftInset;
          const branchMidY = (branch.sourceY + branch.mergeY) / 2;
          const commitYs = branch.commits.map((c) => ly.topPad + c.row * ly.rowH);
          const anchorY = commitYs.reduce(
            (best, y) => (Math.abs(y - branchMidY) < Math.abs(best - branchMidY) ? y : best),
            commitYs[0] ?? branchMidY,
          );
          const anchor = { x: trackX, y: anchorY };
          const targetPoint = impactPoint(branch.sourceY, branch.mergeY, kind, graphWRef.current);

          // Control point at the curve's midpoint, with a fixed gentle bow —
          // no cursor influence here. A static, predictable curve reads as
          // "ambient decoration"; one that reacts to the reader's own cursor
          // while they're hovering/clicking rows would compete with them.
          const midX = (anchor.x + targetPoint.x) / 2;
          const midY = (anchor.y + targetPoint.y) / 2;
          const ctrlX = midX;
          const ctrlY = midY - 10; // slight natural upward bow

          // Once the light has landed, the connector path fades out over
          // connectorFadeDuration rather than sitting there permanently —
          // the border has taken over by then, so the path's job (leading
          // the eye to the impact point) is done.
          if (travelDone) {
            pathFade = Math.max(0, pathFade - dt / IGNITION_TIMING.connectorFadeDuration);
          }

          if (pathFade > 0) {
            ctx.beginPath();
            ctx.moveTo(anchor.x, anchor.y);
            ctx.quadraticCurveTo(ctrlX, ctrlY, targetPoint.x, targetPoint.y);
            ctx.strokeStyle = branch.color;
            ctx.globalAlpha = 0.2 * pathFade; // 0.2 matches the old flat `${color}33` opacity
            ctx.lineWidth = 1.25;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }

          // Traveling light — one-shot: advances until it reaches the
          // impact point once, fires onImpact exactly there, then holds
          // (stops drawing itself; the curve above fades out on its own).
          // Scaled by nodeScale so it's proportionally the same size at
          // every tier, same as every other radius in this graph.
          const scale = nodeScaleRef.current;
          if (!travelDone) {
            travelT = Math.min(1, travelT + dt * IGNITION_TIMING.travelSpeed);
            if (travelT >= 1) {
              travelDone = true;
              impactedOnce.add(branch.name);
              onImpactRef.current?.(branch.name, false);
            }

            const t = travelT;
            const oneMinusT = 1 - t;
            const tx =
              oneMinusT * oneMinusT * anchor.x +
              2 * oneMinusT * t * ctrlX +
              t * t * targetPoint.x;
            const ty =
              oneMinusT * oneMinusT * anchor.y +
              2 * oneMinusT * t * ctrlY +
              t * t * targetPoint.y;
            const glowAlpha = Math.sin(t * Math.PI); // fades in/out over the traversal, not a hard pop at the ends

            // Trail: remember the last few head positions and draw each at
            // decreasing size/alpha behind the current head — reads as a
            // traveling spark rather than a bouncing dot.
            trail.unshift({ x: tx, y: ty });
            if (trail.length > TRAIL_LENGTH) trail.length = TRAIL_LENGTH;

            for (let i = trail.length - 1; i >= 0; i--) {
              const p = trail[i];
              const fade = 1 - i / TRAIL_LENGTH;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 2 * scale * fade, 0, Math.PI * 2);
              ctx.fillStyle = branch.color;
              ctx.globalAlpha = 0.5 * glowAlpha * fade;
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          } else {
            trail = [];
          }
        }
      } else {
        travelT = 0;
        travelDone = false;
        travelBranch = null;
        candidateBranch = null;
        trail = [];
        pathFade = 1;
      }

      raf = requestAnimationFrame(tick);
    };

    // Was an unconditional `raf = requestAnimationFrame(tick)` here — the
    // loop ran the entire time this component was mounted, including while
    // the graph was scrolled well out of view. IntersectionObserver below
    // is what actually decides when to start; this effect just wires it
    // up, it doesn't kick the loop off itself.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !document.hidden) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(container);

    // Tab-visibility pause, layered on top of the viewport check above —
    // either condition alone should be enough to stop the loop, and both
    // need to hold for it to run.
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        // Re-check intersection rather than assuming "tab became visible"
        // means "graph is on screen" — the user could've backgrounded the
        // tab while scrolled somewhere else entirely on this page.
        const rect = container.getBoundingClientRect();
        const inViewport = rect.bottom > 0 && rect.top < window.innerHeight;
        if (inViewport) start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // Deliberately NOT depending on branches/bugfixBranches/layout/
    // focusedBranch/onImpact — those flow through the refs above so a
    // focus change never tears down and restarts the canvas/loop/
    // listeners, only the mount-gating props do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, isCoarsePointer, containerRef]);

  if (reduceMotion || isCoarsePointer) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ willChange: "transform" }}
    />
  );
}
