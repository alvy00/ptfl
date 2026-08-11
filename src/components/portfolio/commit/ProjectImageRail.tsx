import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";

export type ProjectImage = {
  id: string;
  src: string;
  alt: string;
};

type Props = {
  images: ProjectImage[];
  accent: string;
  onSelect: (image: ProjectImage) => void;
};

const CARD_WIDTH = 104;
const STACK_OFFSET = 2.5;
const STACK_TILT_DEG = 2.5;
const VERTICAL_STEP = 68;
const TOP_OFFSET = 28;
const BURST_TILT_DEG = 8;
const BURST_TILT_X = 14;
const ENTRANCE_STAGGER = 0.055;

function stackedFor(i: number) {
  return {
    x: i * STACK_OFFSET,
    y: i * STACK_OFFSET,
    rotateZ: i % 2 === 0 ? -STACK_TILT_DEG : STACK_TILT_DEG,
    rotateX: 0,
  };
}

function burstFor(i: number, total: number) {
  return {
    x: 0,
    y: TOP_OFFSET + i * VERTICAL_STEP,
    rotateZ: i % 2 === 0 ? -BURST_TILT_DEG : BURST_TILT_DEG,
    rotateX: total <= 1 ? 0 : (i / (total - 1)) * BURST_TILT_X,
  };
}

// Shimmer placeholder + crossfade: the photo stays invisible until
// decoded, with a pulsing gradient standing in for it, then crossfades
// in — avoids a fully-formed image popping into a frame that was empty
// a moment ago.
function PolaroidFrame({
  img,
  accent,
  className,
  style,
  aspectClassName = "aspect-square",
  onClick,
}: {
  img: ProjectImage;
  accent: string;
  className: string;
  style?: CSSProperties;
  aspectClassName?: string;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View screenshot: ${img.alt}`}
      className={className}
      style={{ border: "1px solid rgba(255,255,255,0.08)", ...style }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full"
        style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
      />
      <span
        className={`relative block overflow-hidden rounded-[2px] ${aspectClassName} bg-white/[0.03]`}
      >
        {!loaded && (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-pulse"
            style={{
              background:
                "linear-gradient(110deg, rgba(255,255,255,0.03) 8%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.03) 33%)",
              backgroundSize: "200% 100%",
            }}
          />
        )}
        <img
          src={img.src}
          alt={img.alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className="h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      </span>
    </button>
  );
}

export function ProjectImageScatter({ images, accent, onSelect }: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const [expanded, setExpanded] = useState(false);
  const [settled, setSettled] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const total = images.length;

  useEffect(() => {
    if (reduceMotion || total === 0) {
      setSettled(true);
      return;
    }
    const totalReveal = (total - 1) * ENTRANCE_STAGGER * 1000 + 420;
    settleTimer.current = setTimeout(() => setSettled(true), totalReveal);
    return () => clearTimeout(settleTimer.current);
  }, [reduceMotion, total]);

  if (images.length === 0) return null;

  const canvasHeight = TOP_OFFSET + (total - 1) * VERTICAL_STEP + CARD_WIDTH + 20;

  return (
    <motion.div
      className="relative"
      style={{ width: CARD_WIDTH + 24, height: canvasHeight, perspective: 900 }}
      aria-label="Project screenshots"
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
    >
      {images.map((img, i) => {
        const stacked = stackedFor(i);
        const burst = burstFor(i, total);
        const target = expanded ? burst : stacked;
        const entranceDelay = !settled ? i * ENTRANCE_STAGGER : 0;
        const burstDelay = expanded ? i * 0.035 : 0;

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
              zIndex: total - i,
            }}
            transition={{
              default: {
                type: "spring",
                stiffness: expanded ? 260 : 340,
                damping: expanded ? 18 : 30,
                delay: reduceMotion ? 0 : !settled ? entranceDelay : burstDelay,
              },
              rotateZ: {
                type: "spring",
                stiffness: expanded ? 200 : 340,
                damping: expanded ? 11 : 30,
                delay: reduceMotion ? 0 : !settled ? entranceDelay : burstDelay,
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

const stripContainer = {
  hidden: {},
  show: { transition: { staggerChildren: ENTRANCE_STAGGER } },
};

const stripCard = {
  hidden: { opacity: 0, y: 8, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 340, damping: 28 } },
} as const;

// Peek sizing: each card is ~76% of the viewport, so the next one is
// always visibly poking in from the right edge — that partial sliver is
// what tells a first-time visitor "this scrolls" without needing an
// instructional label. snap-mandatory + snap-center means a swipe always
// settles on one full card, never a half-scrolled state.
const CARD_VIEWPORT_FRACTION = "76%";
const CARD_MAX_WIDTH = 240;

export function ProjectImageStrip({ images, accent, onSelect }: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  if (images.length === 0) return null;

  return (
    <div className="relative -mx-1">
      {/* Gradient fade masks signal "more content past this edge" the
          same way peek sizing does, but read even before any scrolling
          has happened — decorative and non-interactive, so they sit above
          the strip without blocking touches. Matches the modal's own
          surface color so the fade reads as a true edge, not a visible
          seam. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6"
        style={{ background: "linear-gradient(90deg, #11131a, transparent)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6"
        style={{ background: "linear-gradient(270deg, #11131a, transparent)" }}
      />
      <motion.div
        className="flex gap-3 overflow-x-auto overflow-y-hidden px-1 pb-1 snap-x snap-mandatory"
        style={{
          scrollPaddingInline: "0.25rem",
          // Isolates this element's horizontal swipe from the modal
          // body's vertical scroll — without this, a swipe that starts
          // even slightly off-axis on a touch device gets captured by
          // the wrong scroll container and the carousel never moves.
          touchAction: "pan-x",
          overscrollBehaviorX: "contain",
          WebkitOverflowScrolling: "touch",
        }}
        aria-label="Project screenshots"
        variants={reduceMotion ? undefined : stripContainer}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "show"}
      >
        {images.map((img) => (
          <motion.div
            key={img.id}
            variants={reduceMotion ? undefined : stripCard}
            className="shrink-0 snap-center"
            style={{ width: CARD_VIEWPORT_FRACTION, maxWidth: CARD_MAX_WIDTH }}
          >
            <PolaroidFrame
              img={img}
              accent={accent}
              onClick={() => onSelect(img)}
              aspectClassName="aspect-[4/3]"
              className="relative w-full rounded-sm p-1.5 pb-2 bg-[#161821]"
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
