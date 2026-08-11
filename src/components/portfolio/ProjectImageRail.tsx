import { motion, useReducedMotion } from "framer-motion";
import { useState, type CSSProperties } from "react";

export type ProjectImage = {
  id: string;
  src: string;
  alt: string;
};

type Props = {
  images: ProjectImage[];
  accent: string; // hex — matches the project's branch/accent color
  onSelect: (image: ProjectImage) => void;
};

// Card geometry for the interactive deck. At rest, all photos sit
// tightly stacked near the container's anchor point — a minimal
// footprint, like a held deck of cards. Hovering the deck container
// bursts them straight downward in one physics-driven cascade: each
// card overshoots its resting spot and springs back (the "burst" feel),
// staggered card-by-card, with a touch of rotateX depth that grows the
// further down the stack a card lands.
const CARD_WIDTH = 104; // up from 80 — the "scaled up a bit more" pass
const STACK_OFFSET = 2.5; // per-card px stagger in the tightly-stacked rest state
const STACK_TILT_DEG = 2.5; // per-card degree stagger in the tightly-stacked rest state
const VERTICAL_STEP = 68; // px each card sits below the one above it once burst open
const TOP_OFFSET = 28; // top padding before the first card's burst position
const BURST_TILT_DEG = 8; // alternating left/right tilt once burst open
const BURST_TILT_X = 14; // max backward 3D tilt for cards further down the burst

// Deck-at-rest position — all cards sit nearly on top of one another
// near the container's anchor, each offset by only a couple of px and a
// couple of degrees so the deck still reads as a stack of distinct
// photos (not one flat card) while keeping a minimal footprint.
function stackedFor(i: number) {
  return {
    x: i * STACK_OFFSET,
    y: i * STACK_OFFSET,
    rotateZ: i % 2 === 0 ? -STACK_TILT_DEG : STACK_TILT_DEG,
    rotateX: 0,
  };
}

// Burst (expanded) position — reached only while the deck container is
// hovered. Purely vertical: x stays put, each card just drops further
// down the column than the one above it, like the deck being dropped
// open card by card. rotateX grows with depth in the stack, giving
// lower cards a slight backward curl so the cascade reads with depth
// instead of everything sliding on one flat plane.
function burstFor(i: number, total: number) {
  return {
    x: 0,
    y: TOP_OFFSET + i * VERTICAL_STEP,
    rotateZ: i % 2 === 0 ? -BURST_TILT_DEG : BURST_TILT_DEG,
    rotateX: total <= 1 ? 0 : (i / (total - 1)) * BURST_TILT_X,
  };
}

function PolaroidFrame({
  img,
  accent,
  className,
  style,
  onClick,
}: {
  img: ProjectImage;
  accent: string;
  className: string;
  style?: CSSProperties;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View screenshot: ${img.alt}`}
      className={className}
      style={{ border: "1px solid rgba(255,255,255,0.08)", ...style }}
    >
      {/* pin — small accent dot poking over the top edge, the one spot of
          color in an otherwise monochrome frame */}
      <span
        aria-hidden="true"
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full"
        style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
      />
      <span className="block overflow-hidden rounded-[2px] aspect-square bg-white/[0.03]">
        <img src={img.src} alt={img.alt} loading="lazy" className="h-full w-full object-cover" />
      </span>
    </button>
  );
}

// Desktop-only: an interactive deck-of-cards burst meant to live in the
// backdrop margin to the right of the modal card (the parent positions
// this via left-full on its own wrapper — this component just fills
// whatever box it's given). At rest the photos sit tightly stacked in a
// minimal footprint; hovering the deck container bursts them straight
// downward with physics-driven overshoot, staggered card by card. Works
// for any number of images — the burst column just runs longer.
export function ProjectImageScatter({ images, accent, onSelect }: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const [expanded, setExpanded] = useState(false);
  if (images.length === 0) return null;

  const total = images.length;
  // Reserve space for the fully-burst column even at rest, so hovering
  // the deck never triggers a layout shift in the parent — visually it
  // still reads as a tight stack because the cards themselves cluster
  // near the top of this reserved box until burst open.
  const canvasHeight = TOP_OFFSET + (total - 1) * VERTICAL_STEP + CARD_WIDTH + 20;

  return (
    <motion.div
      className="relative"
      // perspective gives the rotateX tilt on each card actual depth
      // instead of just squashing it — without this, 3D rotation on a
      // flat 2D plane just looks like a vertical scale change.
      style={{ width: CARD_WIDTH + 24, height: canvasHeight, perspective: 900 }}
      aria-label="Project screenshots"
      // Hovering the deck as a whole — not any individual card — is what
      // triggers the burst, same as dropping a whole held deck open in
      // one motion rather than one card at a time.
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
    >
      {images.map((img, i) => {
        const stacked = stackedFor(i);
        const burst = burstFor(i, total);
        const target = expanded ? burst : stacked;
        return (
          <motion.div
            key={img.id}
            initial={
              reduceMotion
                ? false
                : { opacity: 0, scale: 0.5, rotateZ: stacked.rotateZ, rotateX: 0 }
            }
            animate={{
              opacity: 1,
              scale: 1,
              x: target.x,
              y: target.y,
              rotateZ: target.rotateZ,
              rotateX: target.rotateX,
              zIndex: total - i, // stacked deck order at rest: first card on top
            }}
            transition={{
              // Position settles cleanly regardless of direction.
              default: {
                type: "spring",
                stiffness: expanded ? 260 : 340,
                damping: expanded ? 18 : 30,
                delay: reduceMotion ? 0 : expanded ? i * 0.035 : 0,
              },
              // rotateZ runs looser/underdamped on the deal only, so each
              // card visibly overshoots its arc angle and springs back —
              // the "burst" read, like a card flicked out with force
              // rather than eased into position. Closing back into the
              // stack skips the overshoot; a fanned hand collapses
              // cleanly, it doesn't wobble shut.
              rotateZ: {
                type: "spring",
                stiffness: expanded ? 200 : 340,
                damping: expanded ? 11 : 30,
                delay: reduceMotion ? 0 : expanded ? i * 0.035 : 0,
              },
            }}
            whileHover={
              reduceMotion
                ? undefined
                : {
                    scale: 1.14,
                    rotateZ: 0,
                    rotateX: 0,
                    zIndex: total + 10,
                    transition: { type: "spring", stiffness: 400, damping: 22 },
                  }
            }
            whileTap={reduceMotion ? undefined : { scale: 1.06 }}
            className="absolute left-0 top-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            <PolaroidFrame
              img={img}
              accent={accent}
              onClick={() => onSelect(img)}
              className="rounded-sm p-2 pb-2.5 bg-[#161821] shadow-lg cursor-pointer relative"
              style={{ width: CARD_WIDTH, boxShadow: "0 10px 24px -8px rgba(0,0,0,0.6)" }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// Mobile-only: no backdrop margin to scatter into (the modal becomes a
// full-width bottom sheet), so this renders as a plain horizontal strip
// instead — same alternating rotation for personality, but laid out in
// flow, not absolute/overlapping, so nothing blocks a tap.
export function ProjectImageStrip({ images, accent, onSelect }: Props) {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Project screenshots">
      {images.map((img, i) => (
        <PolaroidFrame
          key={img.id}
          img={img}
          accent={accent}
          onClick={() => onSelect(img)}
          className="relative shrink-0 w-16 rounded-sm p-1 pb-1.5 bg-[#161821]"
          style={{ transform: `rotate(${i % 2 === 0 ? -4 : 4}deg)` }}
        />
      ))}
    </div>
  );
}
