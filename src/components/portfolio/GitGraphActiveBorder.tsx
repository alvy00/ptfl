/**
 * Decorative "active project" border for the git graph — a subtle boundary
 * hint, not a neon box. Two soft light streaks glide along the right and
 * bottom edges, continuously, at low opacity.
 *
 * v3 fixes (from testing feedback):
 * - Opacity/glow dropped hard: outline ~12%, streak core ~35-45%, blur
 *   radius cut way down. It should read as "this section is active," not
 *   draw the eye on its own.
 * - Caller must now pass `top`/`height` using the branch's *offset*
 *   sourceY/mergeY (see GitGraph.tsx — `branches[i].sourceY/mergeY`, which
 *   already bake in FEATURE_OFFSET_RATIO / BUGFIX_OFFSET_RATIO), not the
 *   raw yOf(sourceRow)/yOf(mergeRow). Those raw rows are real commit text
 *   rows (the fork/merge points on main) — using them for the box edges is
 *   exactly what drew the border straight across text. Offset Y values are
 *   the same ones already used to keep the branch *curve* off the text, so
 *   reusing them keeps the border in sync automatically.
 * - A small internal inset (`padding`) keeps the streak lines off the
 *   text's own line-box even inside that already-offset range.
 */
export function GitGraphActiveBorder({
  active,
  color,
  radius = 8,
  inset = 4,
  extraBottom = 0,
}: {
  active: boolean;
  color: string;
  radius?: number;
  /** Px gap kept between the box edge and the light streak on all sides,
   *  so the streak never sits flush against adjacent text. */
  inset?: number;
  /** Extra px on top of `inset` for the bottom edge only. Zero by default
   *  now — the caller's wrapper (GitGraph.tsx) already carries an exact
   *  BOTTOM_CLEARANCE value for this, so adding more here would just
   *  fight the tight-vertical goal from the latest round. */
  extraBottom?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="graph-active-border pointer-events-none absolute"
      data-active={active ? "true" : "false"}
      style={{
        top: inset,
        right: inset,
        bottom: inset + extraBottom,
        left: inset,
        ["--agb-color" as string]: color,
        ["--agb-radius" as string]: `${radius}px`,
      }}
    >
      <span className="agb-outline" />
      <span className="agb-ray agb-ray-right" />
      <span className="agb-ray agb-ray-bottom" />

      <style>{`
        .graph-active-border {
          border-radius: var(--agb-radius);
          box-sizing: border-box;
        }

        /* Static outline — a whisper of the color, not a solid line. */
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
          opacity: 0.22;
          box-shadow: 0 0 14px 1px color-mix(in srgb, var(--agb-color) 22%, transparent);
        }

        .agb-ray {
          position: absolute;
          opacity: 0;
          transition: opacity 220ms ease-out;
          will-change: background-position, opacity;
        }
        .graph-active-border[data-active="true"] .agb-ray {
          opacity: 0.5;
        }

        /* Right edge: soft comet sweeps top -> bottom.
           background-position 0% 0% pins the START of the gradient (the
           transparent lead-in) to the element's own top edge — that's what
           makes the sweep genuinely originate at the top, in sync with the
           bottom ray originating at the left. Previously this used a
           NEGATIVE starting offset (-180%), which pre-scrolled the
           gradient backwards and made the comet appear to already be
           mid-flight (reading as "coming from the bottom-right") instead
           of starting clean at the corner. */
        .agb-ray-right {
          top: 0;
          right: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            color-mix(in srgb, var(--agb-color) 38%, transparent) 45%,
            color-mix(in srgb, var(--agb-color) 38%, transparent) 55%,
            transparent 100%
          );
          background-size: 100% 300%;
          background-repeat: no-repeat;
          filter: drop-shadow(0 0 1.5px color-mix(in srgb, var(--agb-color) 55%, transparent));
          animation: agb-run-y 3.6s linear infinite;
        }

        /* Bottom edge: same treatment, left -> right, same duration/easing
           as the right ray so both read as leaving the top-left corner
           together on every loop. */
        .agb-ray-bottom {
          left: 0;
          right: 0;
          bottom: 0;
          height: 2px;
          background: linear-gradient(
            to right,
            transparent 0%,
            color-mix(in srgb, var(--agb-color) 38%, transparent) 45%,
            color-mix(in srgb, var(--agb-color) 38%, transparent) 55%,
            transparent 100%
          );
          background-size: 300% 100%;
          background-repeat: no-repeat;
          filter: drop-shadow(0 0 1.5px color-mix(in srgb, var(--agb-color) 55%, transparent));
          animation: agb-run-x 3.6s linear infinite;
        }

        /* Both start at 0% 0% — the gradient's own top-left — and sweep
           forward only. Never negative, never wraps backward. */
        @keyframes agb-run-y {
          0%   { background-position: 0% 0%; }
          100% { background-position: 0% 100%; }
        }
        @keyframes agb-run-x {
          0%   { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .agb-ray { animation: none !important; }
          .graph-active-border[data-active="true"] .agb-ray { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
