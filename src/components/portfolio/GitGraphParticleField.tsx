import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { Layout } from "@/lib/portfolio/gitGraphTypes";

// Deliberately NOT importing BranchDef from gitGraphTypes.ts — that type
// only carries sourceRow/mergeRow (row indices). What this component reads
// is geometry.branches (buildGeometry(layout).branches in GitGraph.tsx),
// which resolves those into pixel sourceY/mergeY. If gitGraphGeometry.ts
// exports a named type for that shape, swap this for an import of it —
// this local type only exists because that export wasn't available to
// reference directly.
type GeometryBranch = {
  name: string;
  projectKey: string;
  color: string;
  lane: number;
  sourceY: number;
  mergeY: number;
};

/**
 * Ambient background canvas: a handful of slow-drifting particles filling
 * the dead space beside the graph, plus — only when a branch is focused
 * (hover or scroll-auto-focus, same `focusedBranch` that already drives
 * dimming and GitGraphActiveBorder) — a single soft connector line from the
 * trunk out to that branch's active-border box, with a small light
 * traveling along it.
 *
 * Deliberately NOT a general-purpose "connect every branch" web: only the
 * currently-focused branch gets a line, matching the same
 * focused/dimmed language the rest of the graph already uses. The
 * connector's curve is fixed (a static bow, no cursor reactivity) — it
 * sits in the same screen region as the cursor while someone reads and
 * clicks through commits, so making it chase the cursor there competed
 * with that interaction rather than staying ambient. Only the background
 * particles respond to cursor proximity, and only within a limited
 * radius — never a global field shift.
 *
 * Does not mount its render loop at all — not even a static frame — when
 * reduceMotion or isCoarsePointer is true. No cursor to react to on touch,
 * and reduced-motion means no drift either; better to cost nothing than to
 * ship an inert canvas.
 */
export function GitGraphParticleField({
  containerRef,
  branches,
  layout,
  graphW,
  focusedBranch,
  reduceMotion,
  isCoarsePointer,
}: {
  containerRef: RefObject<HTMLDivElement>;
  branches: GeometryBranch[];
  layout: Layout;
  graphW: number;
  focusedBranch: string | undefined;
  reduceMotion: boolean;
  isCoarsePointer: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mutable "latest props" refs — the rAF loop reads these every frame
  // without needing to be torn down and restarted on every focus change or
  // scroll-driven re-render. Only the mount/unmount effect below (gated by
  // reduceMotion/isCoarsePointer) actually starts or stops the loop.
  const branchesRef = useRef<GeometryBranch[]>(branches);
  const layoutRef = useRef(layout);
  const graphWRef = useRef(graphW);
  const focusedRef = useRef(focusedBranch);
  branchesRef.current = branches;
  layoutRef.current = layout;
  graphWRef.current = graphW;
  focusedRef.current = focusedBranch;

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

    // Mirrors GitGraph.tsx's own active-border box math (HORIZONTAL_EXPAND /
    // TOP_CLEARANCE / BOTTOM_CLEARANCE) so the connector line's target point
    // lands on the same box GitGraphActiveBorder is drawing around. If that
    // logic ever gets extracted into a shared branchBoxRect() helper, this
    // should switch to calling it directly instead of keeping its own copy
    // in sync by hand.
    //
    // Horizontal target: the text column (where the active-border box
    // actually lives) starts at `graphW + 1.5rem` in GitGraph.tsx
    // (`left: calc(${graphW}px + 1.5rem)`), then the box itself extends
    // HORIZONTAL_EXPAND further left from there. +40 lands a bit further
    // into the column, roughly toward the box's visual center rather than
    // its exact left edge — good enough for a soft glow target, not meant
    // to be pixel-exact against the box's true right edge (which depends
    // on the container's own width, not tracked here).
    const focusedBoxCenter = (
      b: GeometryBranch,
      ly: Layout,
      gW: number,
    ): { x: number; y: number } => {
      const HORIZONTAL_EXPAND = 20;
      const TOP_CLEARANCE = b.projectKey === "careerpilot" ? ly.rowH + 5 : 4;
      const BOTTOM_CLEARANCE = 12;
      const top = b.sourceY - TOP_CLEARANCE;
      const bottom = b.mergeY + BOTTOM_CLEARANCE;
      const TEXT_COLUMN_GAP = 24; // 1.5rem, matches GitGraph.tsx's own calc()
      return { x: gW + TEXT_COLUMN_GAP - HORIZONTAL_EXPAND + 40, y: (top + bottom) / 2 };
    };

    let raf = 0;
    let running = false;
    let last = performance.now();
    let travelT = 0; // 0..1 progress of the traveling light along the connector curve

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

      // --- connector line to the focused branch only ---
      const branch = branchesRef.current.find((b) => b.name === focusedRef.current);
      if (branch) {
        const ly = layoutRef.current;
        // Origin was `{ x: ly.mainX, ... }` — the main trunk spine — which
        // drew a line cutting diagonally across the dead-space gap from the
        // white trunk straight into the project card, ignoring the branch's
        // own colored track entirely. It should start from where the
        // branch actually lives: laneX(lane) is the same constant x the
        // branch's own vertical line segment runs along in branchPath()
        // (gitGraphGeometry.ts), computed the same way here since layout
        // already carries mainX/laneW. Color was already correct — this
        // was purely a position bug.
        const branchTrackX = ly.mainX + branch.lane * ly.laneW;
        const anchor = { x: branchTrackX, y: (branch.sourceY + branch.mergeY) / 2 };
        const target = focusedBoxCenter(branch, ly, graphWRef.current);

        // Control point at the curve's midpoint, with a fixed gentle bow —
        // no cursor influence here anymore. This used to nudge toward the
        // cursor within CURSOR_RADIUS, but that radius overlaps almost
        // exactly with where someone's cursor naturally sits while reading
        // down the commit list and hovering rows to click into them — so
        // the connector was liable to be warping continuously under the
        // cursor during the one interaction (reading + clicking) that
        // matters most here. A static, predictable curve reads as "ambient
        // decoration" the way it was meant to; a curve that flinches away
        // from the reader's own cursor reads as competing with them.
        const midX = (anchor.x + target.x) / 2;
        const midY = (anchor.y + target.y) / 2;
        const ctrlX = midX;
        const ctrlY = midY - 10; // slight natural upward bow

        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, target.x, target.y);
        ctx.strokeStyle = `${branch.color}33`; // low-opacity, matches "whisper of color" tone elsewhere in this graph
        ctx.lineWidth = 1.25;
        ctx.stroke();

        // Small traveling highlight along the curve — same "comet" idea as
        // GitGraphActiveBorder's edge rays, so the two read as the same
        // visual language rather than two unrelated effects.
        travelT = (travelT + dt * 0.35) % 1;
        const t = travelT;
        const oneMinusT = 1 - t;
        const tx = oneMinusT * oneMinusT * anchor.x + 2 * oneMinusT * t * ctrlX + t * t * target.x;
        const ty = oneMinusT * oneMinusT * anchor.y + 2 * oneMinusT * t * ctrlY + t * t * target.y;
        const glowAlpha = Math.sin(t * Math.PI); // fades in/out over the traversal, not a hard pop at the ends

        ctx.beginPath();
        ctx.arc(tx, ty, 2, 0, Math.PI * 2);
        ctx.fillStyle = branch.color;
        ctx.globalAlpha = 0.5 * glowAlpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        travelT = 0;
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
    // Deliberately NOT depending on branches/layout/focusedBranch — those
    // flow through the refs above so a focus change never tears down and
    // restarts the canvas/loop/listeners, only the mount-gating props do.
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
