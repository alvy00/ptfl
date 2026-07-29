import { motion } from "framer-motion";
import { createPortal } from "react-dom";

// --- redesign rationale -----------------------------------------------
// Previous version ran four saturated hues (purple/amber/cyan/green) at
// once, all sliding together via a single `background-position` keyframe
// animation. That's four independent light sources competing for
// attention rather than one atmosphere, `background-position` isn't
// GPU-accelerated (full-viewport paint every frame), and a repeating,
// fairly fast (24s), sharply-reversing sweep reads as low-grade motion
// noise rather than calm — peripheral motion is one of the more
// attention-grabbing stimuli we have, so a "soothing" background needs to
// be slow, non-repeating-feeling, and never compete with foreground text.
//
// This version:
//  - Restricts saturated color to ONE note at a time: whichever branch is
//    currently hovered or scrolled-past (`activeColor`, passed down from
//    GitGraph's existing `focusedBranch`/BRANCH_DEFS lookup — not a new
//    source of truth). Nothing focused → no saturated color at all, just
//    the neutral wash below.
//  - Two always-on neutral (desaturated slate) blobs provide baseline
//    texture/depth regardless of focus state, so the background isn't
//    flatly inert between hovers.
//  - All motion is on `transform` (GPU-accelerated), not
//    `background-position`. Durations are 65-90s with easeInOut, so any
//    single sweep is imperceptible moment-to-moment — it reads as
//    "alive," not "moving."
//  - Color changes crossfade via Framer Motion's built-in color
//    interpolation (a plain `animate={{ background: activeColor }}` with
//    an eased transition) instead of raw `style.setProperty` — no color
//    pops, only fades.
//  - reduceMotion freezes all spatial animation; the color crossfade
//    still runs (it's not spatial motion) but drops to a near-instant
//    transition so it reads as a state change, not an animation.
// -------------------------------------------------------------------------

const NEUTRAL = "#3f4656"; // desaturated slate-blue — baseline wash, tied to no branch

type NeutralBlob = {
  size: number;
  top: string;
  left: string;
  duration: number;
  x: number[];
  y: number[];
  opacity: number;
};

// Two only, deliberately — a third started to reintroduce the "too much
// happening at once" feeling this redesign is trying to get away from.
const NEUTRAL_BLOBS: NeutralBlob[] = [
  {
    size: 620,
    top: "8%",
    left: "5%",
    duration: 70,
    x: [0, 50, -25, 0],
    y: [0, -35, 20, 0],
    opacity: 0.035,
  },
  {
    size: 540,
    top: "55%",
    left: "68%",
    duration: 88,
    x: [0, -45, 30, 0],
    y: [0, 30, -20, 0],
    opacity: 0.022,
  },
];

export function GitGraphAmbientGlow({
  activeColor,
  reduceMotion,
}: {
  activeColor: string | null;
  reduceMotion: boolean;
}) {
  // Portaled into the #page-content div in index.tsx — NOT document.body,
  // and NOT <main>. This component is mounted inside index.tsx's
  // `whileInView` motion.div around the GlobalSearch/GitGraph section;
  // while that wrapper's reveal animation plays it carries an inline
  // `transform`, which creates a new containing block for `position:
  // fixed` descendants. Without a portal, that briefly renders this glow
  // sized/positioned to the wrapper's box instead of the full viewport,
  // then snaps to true full-screen coverage once the transform clears.
  // #page-content has no transform of its own, so portaling there escapes
  // that containing-block issue.
  //
  // Portaling to <main> fixes the glitch but breaks visibility: main's own
  // children — the hero section (z-10) and #page-content (z-20) — both
  // carry opaque bg-[#0e0f13] backgrounds and together cover the entire
  // page. As a *sibling* of those sections, this glow's z-0 would lose to
  // their z-index and render completely hidden underneath. It works as a
  // *descendant* of #page-content because children always paint above
  // their own parent's background, regardless of z-index math.
  const target = typeof document === "undefined" ? null : document.getElementById("page-content");
  if (!target) return null;

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {NEUTRAL_BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: NEUTRAL,
            opacity: b.opacity,
            filter: "blur(150px)",
            willChange: "transform",
          }}
          animate={reduceMotion ? undefined : { x: b.x, y: b.y }}
          transition={
            reduceMotion ? undefined : { duration: b.duration, repeat: Infinity, ease: "easeInOut" }
          }
        />
      ))}

      {/* The one saturated note. Crossfades to whichever branch is
          focused (hover or scroll-position — see GitGraph's
          `focusedBranch`); sits fully transparent when nothing is
          focused, rather than idling on a default color. */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 640,
          height: 640,
          top: "32%",
          left: "42%",
          filter: "blur(170px)",
          willChange: "opacity, background",
        }}
        animate={{
          background: activeColor ?? NEUTRAL,
          opacity: activeColor ? 0.035 : 0,
        }}
        transition={{ duration: reduceMotion ? 0.01 : 1.1, ease: "easeInOut" }}
      />
    </div>,
    target,
  );
}
