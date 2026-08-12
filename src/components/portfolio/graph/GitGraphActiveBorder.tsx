/* eslint-disable prettier/prettier */
import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";

import { IGNITION_TIMING } from "@/lib/portfolio/gitGraphGeometry";

/**
 * "Active project" border for the git graph, chained to the particle
 * connector's impact. Two SVG path halves draw outward from the impact
 * point (0, h/2) to the opposite seam (w, h/2); `active` toggles them
 * between pathLength 0 and 1. `instant` (every re-ignition after the
 * first) skips the draw-in and one-shot beats and just pops to sealed.
 *
 * v6: staggered top/bottom draw-in, impact "shockwave" (rings + flare)
 * in place of the old single flash, seam sparks, instant micro-flash,
 * phosphor-fringe glow, plus a resize-jitter fix and a shared-filter
 * perf fix (see inline comments below).
 */

// Local to this component — presentational tuning, not shared with
// GitGraphParticleField. Move into IGNITION_TIMING if that changes.
const V6_TIMING = {
  staggerDelay: 0.09,
  ringDuration: 0.55,
  ringStagger: 0.1,
  flareDuration: 0.4,
  sparkDuration: 0.35,
  microFlashDuration: 0.18,
  resizeEpsilon: 0.5,
} as const;

export function GitGraphActiveBorder({
  active,
  color,
  radius = 8,
  inset = 4,
  extraBottom = 0,
  reduceMotion = false,
  instant = false,
}: {
  active: boolean;
  color: string;
  radius?: number;
  inset?: number;
  extraBottom?: number;
  reduceMotion?: boolean;
  instant?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const filterId = useId().replace(/[:]/g, "");

  // Ignition tick: fires once per false->true transition of `active`,
  // keys the one-shot beats below so they replay on every re-focus.
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
      // Ignore sub-pixel deltas — otherwise layout micro-settles during
      // the draw-in re-derive the path strings and jitter the viewBox.
      setSize((prev) => {
        const dw = Math.abs(width - prev.w);
        const dh = Math.abs(height - prev.h);
        if (dw < V6_TIMING.resizeEpsilon && dh < V6_TIMING.resizeEpsilon) {
          return prev;
        }
        return { w: width, h: height };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const r = Math.max(0, Math.min(radius, h / 2, w / 2));
  const ready = w > 0 && h > 0;

  const topHalf = ready
    ? `M 0 ${h / 2} L 0 ${r} Q 0 0 ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h / 2}`
    : "";
  const bottomHalf = ready
    ? `M 0 ${h / 2} L 0 ${h - r} Q 0 ${h} ${r} ${h} L ${w - r} ${h} Q ${w} ${h} ${w} ${h - r} L ${w} ${h / 2}`
    : "";

  const drawTarget = active ? 1 : 0;
  const peakOpacity = instant ? IGNITION_TIMING.instantPeakOpacity : 0.85;
  const opacityTarget = active ? peakOpacity : 0;

  // Shape snaps instantly on replay (no particle to sync the draw-in
  // to); opacity always gets a real crossfade so it doesn't just pop.
  const pathLengthTransition =
    reduceMotion || instant
      ? { duration: 0.01 }
      : { duration: IGNITION_TIMING.sealDuration, ease: "easeOut" as const };
  const opacityTransition = reduceMotion
    ? { duration: 0.01 }
    : instant
      ? { duration: IGNITION_TIMING.instantFadeDuration, ease: "easeInOut" as const }
      : { duration: IGNITION_TIMING.sealDuration, ease: "easeOut" as const };

  // Bottom half trails the top half on draw-in only, so they race
  // toward the seam instead of moving as a mirrored pair.
  const bottomPathLengthTransition =
    active && !instant && !reduceMotion
      ? { ...pathLengthTransition, delay: V6_TIMING.staggerDelay }
      : pathLengthTransition;

  const showOneShots = igniteTick > 0 && !instant && !reduceMotion;
  const showInstantMicroFlash = igniteTick > 0 && instant && !reduceMotion;

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
      {/* Re-keyed on igniteTick when instant, so a replay restarts the
          micro-flash keyframe below rather than only crossfading opacity. */}
      <span
        key={showInstantMicroFlash ? `outline-${igniteTick}` : "outline"}
        className="agb-outline"
        data-micro-flash={showInstantMicroFlash ? "true" : "false"}
      />

      {ready && (
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="absolute inset-0"
          style={{ overflow: "visible" }}
        >
          {/* One shared filter instead of per-element drop-shadows —
              fewer compositing layers under rapid hover/scroll. */}
          <defs>
            <filter id={`agb-glow-${filterId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation={instant ? 1.2 : 2.5} floodColor={color} />
            </filter>
          </defs>

          <g filter={`url(#agb-glow-${filterId})`}>
            <motion.path
              d={topHalf}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: drawTarget, opacity: opacityTarget }}
              transition={{ pathLength: pathLengthTransition, opacity: opacityTransition }}
            />
            <motion.path
              d={bottomHalf}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: drawTarget, opacity: opacityTarget }}
              transition={{
                pathLength: bottomPathLengthTransition,
                opacity: opacityTransition,
              }}
            />
          </g>

          {/* Impact shockwave: two staggered expanding rings + an inward flare. */}
          {showOneShots && (
            <g key={`shockwave-${igniteTick}`} filter={`url(#agb-glow-${filterId})`}>
              <motion.circle
                cx={0}
                cy={h / 2}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                initial={{ r: 2, opacity: 0.9 }}
                animate={{ r: 14, opacity: 0 }}
                transition={{ duration: V6_TIMING.ringDuration, ease: "easeOut" }}
              />
              <motion.circle
                cx={0}
                cy={h / 2}
                fill="none"
                stroke={color}
                strokeWidth={1}
                initial={{ r: 2, opacity: 0.7 }}
                animate={{ r: 22, opacity: 0 }}
                transition={{
                  duration: V6_TIMING.ringDuration,
                  ease: "easeOut",
                  delay: V6_TIMING.ringStagger,
                }}
              />
              <motion.rect
                x={0}
                y={h / 2 - 1}
                height={2}
                fill={color}
                initial={{ width: 0, opacity: 0.9 }}
                animate={{ width: Math.min(28, w * 0.3), opacity: 0 }}
                transition={{ duration: V6_TIMING.flareDuration, ease: "easeOut" }}
                style={{ transformOrigin: "left center" }}
              />
            </g>
          )}

          {/* Seam settle bounce, delayed to land as the draw-in finishes,
              plus two outward glints past the right edge. */}
          {showOneShots && (
            <g key={`seam-${igniteTick}`} filter={`url(#agb-glow-${filterId})`}>
              <motion.circle
                cx={w}
                cy={h / 2}
                r={2.5}
                fill={color}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.7, 1] }}
                transition={{
                  duration: IGNITION_TIMING.seamSettleDuration,
                  ease: "easeOut",
                  delay: IGNITION_TIMING.sealDuration,
                }}
                style={{ transformOrigin: "center" }}
              />
              <motion.line
                x1={w}
                y1={h / 2}
                x2={w + 9}
                y2={h / 2 - 5}
                stroke={color}
                strokeWidth={1.25}
                strokeLinecap="round"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: [0, 0.85, 0], pathLength: 1 }}
                transition={{
                  duration: V6_TIMING.sparkDuration,
                  ease: "easeOut",
                  delay: IGNITION_TIMING.sealDuration,
                }}
              />
              <motion.line
                x1={w}
                y1={h / 2}
                x2={w + 9}
                y2={h / 2 + 5}
                stroke={color}
                strokeWidth={1.25}
                strokeLinecap="round"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: [0, 0.85, 0], pathLength: 1 }}
                transition={{
                  duration: V6_TIMING.sparkDuration,
                  ease: "easeOut",
                  delay: IGNITION_TIMING.sealDuration + 0.03,
                }}
              />
            </g>
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
          /* Red/cyan hairline layers fake a phosphor/chromatic-aberration fringe. */
          box-shadow:
            0 0 14px 1px color-mix(in srgb, var(--agb-color) 18%, transparent),
            -0.5px 0 3px color-mix(in srgb, var(--agb-color) 30%, red 25%),
            0.5px 0 3px color-mix(in srgb, var(--agb-color) 30%, cyan 25%);
        }
        .graph-active-border[data-active="true"][data-instant="true"] .agb-outline {
          opacity: 0.08;
          box-shadow:
            0 0 8px 1px color-mix(in srgb, var(--agb-color) 10%, transparent),
            -0.5px 0 2px color-mix(in srgb, var(--agb-color) 20%, red 20%),
            0.5px 0 2px color-mix(in srgb, var(--agb-color) 20%, cyan 20%);
        }
        /* Brightness pulse for instant re-ignitions, restarted via the key above. */
        .agb-outline[data-micro-flash="true"] {
          animation: agb-micro-flash ${V6_TIMING.microFlashDuration}s ease-out;
        }
        @keyframes agb-micro-flash {
          0% {
            box-shadow: 0 0 8px 1px color-mix(in srgb, var(--agb-color) 10%, transparent);
          }
          35% {
            box-shadow: 0 0 16px 3px color-mix(in srgb, var(--agb-color) 40%, transparent);
          }
          100% {
            box-shadow: 0 0 8px 1px color-mix(in srgb, var(--agb-color) 10%, transparent);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .graph-active-border[data-active="true"] .agb-outline {
            opacity: 0.22;
          }
          .agb-outline[data-micro-flash="true"] {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
