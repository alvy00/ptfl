import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { IGNITION_TIMING } from "@/lib/portfolio/gitGraphGeometry";

/**
 * "Active project" border for the git graph, chained to the particle
 * connector's impact.
 *
 * v5 — adds the two beats the v4 handoff was missing, plus an `instant`
 * escape hatch for replays:
 * - **Impact flash**: the instant `active` flips true (which, for feature
 *   branches, is the same frame GitGraphParticleField's particle lands —
 *   see GitGraph.tsx's `impactedBranch` gating), a small radial flash
 *   fires at this box's own impact point (0, h/2). Bugfix boxes have no
 *   canvas particle targeting them, so for them this is the *entire*
 *   ignition beat — `active` flips straight from focus, so they get an
 *   instant flash + seal instead of connector + flash + seal. That's a
 *   deliberate, now-shared asymmetry (feature = travel then hit, bugfix =
 *   just a hit) rather than two different border implementations.
 * - **Seam settle**: a brief pulse where the two drawn halves meet (the
 *   opposite point, (w, h/2)), timed to land right as the pathLength
 *   animation finishes, so "sealed" reads as a beat instead of the two
 *   lines just quietly stopping when they touch.
 * - **`instant`**: GitGraphParticleField only ever plays its full
 *   connect->travel sequence the first time a given branch ignites per
 *   mount; every re-focus after that reports impact with `instant=true`.
 *   When true, this component skips the pathLength draw-in (goes straight
 *   to sealed) AND skips the flash/seam-settle one-shots — those beats
 *   are a first-impression thing, replaying them (or even just the
 *   border's own draw-in) on every quick re-hover is noise, not delight.
 * Both flash/seam are one-shot per ignition (tracked via an ignite-tick
 * counter, not by `active` alone), so a fresh (non-instant) ignition of
 * the same branch — e.g. after remounting — always replays both in full.
 *
 * v4 — replaces the v3 static-outline + looping CSS comet rays with a real
 * SVG path pair. The particle connector in GitGraphParticleField always
 * lands on this box's left edge, at vertical center (see
 * gitGraphGeometry.ts's `activeBoxLeftX`/`activeBoxVerticalRange`, the
 * shared source of truth both components now read from). So the border
 * doesn't need an arbitrary impact coordinate passed in — the impact point
 * IS `(0, height/2)` in this component's own local box space, always.
 *
 * From that point, two path halves draw outward in opposite directions —
 * one up-and-over the top, one down-and-under the bottom — converging at
 * the point directly opposite the impact: the right edge, vertical center.
 * `active=true` animates both from pathLength 0 -> 1 (a "crack sealing
 * outward from where the particle hit"); `active=false` reverses the same
 * two paths back to 0 (Framer Motion just animates toward whatever target
 * changed to — no separate "undraw" logic needed).
 *
 * Box width/height aren't passed in as props — they come from a
 * ResizeObserver on this component's own wrapper, since the wrapper's
 * actual pixel size depends on the fluid text-column width at runtime,
 * which isn't known from layout constants alone.
 */
export function GitGraphActiveBorder({
  active,
  color,
  radius = 8,
  inset = 4,
  extraBottom = 0,
  reduceMotion = false,
  instant = false,
}: {
  /** True = draw the border in (from the impact point, outward). False =
   *  reverse the same draw back down to nothing. */
  active: boolean;
  color: string;
  radius?: number;
  /** Px gap kept between the box edge and the drawn line on all sides, so
   *  it never sits flush against adjacent text. */
  inset?: number;
  /** Extra px on top of `inset` for the bottom edge only. */
  extraBottom?: number;
  reduceMotion?: boolean;
  /** True on every re-ignition after the first (see GitGraphParticleField's
   *  replay-once behavior): the border pops straight to sealed with no
   *  pathLength draw-in, and skips the one-shot impact flash / seam-settle
   *  beats — those are a first-impression thing, not something to replay
   *  on every quick re-hover. Independent of `reduceMotion`: a reduced-
   *  motion user gets no animation at all regardless of `instant`, but a
   *  full-motion user still gets the full sequence the *first* time. */
  instant?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Fires exactly once per false->true transition of `active` — the
  // "ignition" moment, regardless of whether it was reached via a particle
  // impact (feature branches) or straight from focus (bugfix branches).
  // Used to key the one-shot flash/seam-settle elements below so they
  // replay in full on every re-focus rather than only rendering once ever.
  const prevActiveRef = useRef(active);
  const [igniteTick, setIgniteTick] = useState(0);
  useEffect(() => {
    if (active && !prevActiveRef.current) {
      setIgniteTick((t) => t + 1);
    }
    prevActiveRef.current = active;
  }, [active]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  // Corner radius can't exceed half the box's own shorter side, or the two
  // quadratic corners on the same edge would overlap.
  const r = Math.max(0, Math.min(radius, h / 2, w / 2));
  const ready = w > 0 && h > 0;

  // Both halves start at the impact point (0, h/2) and end at the opposite
  // point (w, h/2) — a rounded-rect perimeter split exactly down its own
  // horizontal centerline.
  const topHalf = ready
    ? `M 0 ${h / 2} L 0 ${r} Q 0 0 ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h / 2}`
    : "";
  const bottomHalf = ready
    ? `M 0 ${h / 2} L 0 ${h - r} Q 0 ${h} ${r} ${h} L ${w - r} ${h} Q ${w} ${h} ${w} ${h - r} L ${w} ${h / 2}`
    : "";

  const drawTarget = active ? 1 : 0;
  const peakOpacity = instant ? IGNITION_TIMING.instantPeakOpacity : 0.85;
  const opacityTarget = active ? peakOpacity : 0;

  // Shape (pathLength) and opacity intentionally get DIFFERENT transitions
  // on a replay ignition: the draw-in has no particle to sync to on a
  // replay, so the shape itself may as well snap straight to its target
  // (no seal-drawing animation to replay). But snapping OPACITY at the
  // same instant is what actually read as "comes and goes" / hard on the
  // eyes — so opacity always gets a real crossfade, just a shorter, purely
  // instant-tuned one when instant, instead of collapsing to near-zero
  // duration alongside the shape.
  const pathLengthTransition =
    reduceMotion || instant
      ? { duration: 0.01 }
      : { duration: IGNITION_TIMING.sealDuration, ease: "easeOut" as const };
  const opacityTransition = reduceMotion
    ? { duration: 0.01 }
    : instant
      ? { duration: IGNITION_TIMING.instantFadeDuration, ease: "easeInOut" as const }
      : { duration: IGNITION_TIMING.sealDuration, ease: "easeOut" as const };

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="graph-active-border pointer-events-none absolute"
      data-active={active ? "true" : "false"}
      data-instant={instant ? "true" : "false"}
      style={{
        top: inset,
        right: inset,
        bottom: inset + extraBottom,
        left: inset,
        ["--agb-color" as string]: color,
        ["--agb-radius" as string]: `${radius}px`,
      }}
    >
      {/* Resting whisper outline — reads as "this section is active" even
          between draw-in and draw-out, same low-opacity language as v3. */}
      <span className="agb-outline" />

      {ready && (
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="absolute inset-0"
          style={{ overflow: "visible" }}
        >
          <motion.path
            d={topHalf}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: drawTarget, opacity: opacityTarget }}
            transition={{ pathLength: pathLengthTransition, opacity: opacityTransition }}
            style={{ filter: `drop-shadow(0 0 ${instant ? 2 : 4}px ${color})` }}
          />
          <motion.path
            d={bottomHalf}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: drawTarget, opacity: opacityTarget }}
            transition={{ pathLength: pathLengthTransition, opacity: opacityTransition }}
            style={{ filter: `drop-shadow(0 0 ${instant ? 2 : 4}px ${color})` }}
          />

          {/* Impact flash — a small radial pop exactly at the impact point
              (0, h/2), timed to the same frame the seal starts drawing.
              Keyed by igniteTick so it replays on every re-focus instead
              of only playing the very first time this box ever ignites. */}
          {igniteTick > 0 && !instant && (
            <motion.circle
              key={`flash-${igniteTick}`}
              cx={0}
              cy={h / 2}
              fill={color}
              initial={{ r: 2, opacity: 0.95 }}
              animate={{ r: reduceMotion ? 2 : 16, opacity: 0 }}
              transition={{
                duration: reduceMotion ? 0.01 : IGNITION_TIMING.flashDuration,
                ease: "easeOut",
              }}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          )}

          {/* Seam settle — the two halves meet at the point opposite
              impact, (w, h/2). A flat linear stop there reads as
              anticlimactic, so a brief brighten + scale-bounce lands right
              as pathLength finishes (delay = sealDuration), selling
              "sealed" as a beat rather than the lines just quietly
              touching. */}
          {igniteTick > 0 && !instant && (
            <motion.circle
              key={`seam-${igniteTick}`}
              cx={w}
              cy={h / 2}
              r={2.5}
              fill={color}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={
                reduceMotion ? { opacity: 0 } : { opacity: [0, 0.9, 0], scale: [0.6, 1.7, 1] }
              }
              transition={{
                duration: IGNITION_TIMING.seamSettleDuration,
                ease: "easeOut",
                delay: reduceMotion ? 0 : IGNITION_TIMING.sealDuration,
              }}
              style={{ filter: `drop-shadow(0 0 6px ${color})`, transformOrigin: "center" }}
            />
          )}
        </svg>
      )}

      <style>{`
        .graph-active-border {
          border-radius: var(--agb-radius);
          box-sizing: border-box;
        }
        .agb-outline {
          position: absolute;
          inset: 0;
          border: 1px solid var(--agb-color);
          border-radius: var(--agb-radius);
          box-sizing: border-box;
          opacity: 0;
          transition: opacity 320ms ease-out;
        }
        .graph-active-border[data-active="true"] .agb-outline {
          opacity: 0.14;
          box-shadow: 0 0 14px 1px color-mix(in srgb, var(--agb-color) 18%, transparent);
        }
        /* Dimmer resting glow on a replay ignition — same 320ms CSS
           transition as above (this only overrides the target values, not
           the transition itself), so it fades in/out just as smoothly,
           just to a softer level. Keeps repeated re-hovers easier on the
           eyes than the one true "impact" moment. */
        .graph-active-border[data-active="true"][data-instant="true"] .agb-outline {
          opacity: 0.08;
          box-shadow: 0 0 8px 1px color-mix(in srgb, var(--agb-color) 10%, transparent);
        }

        @media (prefers-reduced-motion: reduce) {
          .graph-active-border[data-active="true"] .agb-outline {
            opacity: 0.22;
          }
        }
      `}</style>
    </div>
  );
}
