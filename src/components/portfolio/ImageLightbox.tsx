import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { useFocusTrap, REDUCED_MOTION_TRANSITION } from "./CommitModal";
import type { ProjectImage } from "./ProjectImageRail";

type Props = {
  image: ProjectImage;
  accent: string;
  onClose: () => void;
};

// How long the backdrop lags behind the image on the way out. Kept as a
// shared constant so the outer wrapper's own exit duration (which just
// keeps AnimatePresence from unmounting everything early — it has no
// visible fill of its own) can be sized to match exactly.
const BACKDROP_EXIT_DELAY = 0.1;
const BACKDROP_EXIT_DURATION = 0.22;
const IMAGE_EXIT_DURATION = 0.16;

// Sits above CommitModal's feature card (z-50) at z-[60], so it can be
// closed on its own without dismissing the modal underneath it — Escape
// and outside-click here only ever call this component's onClose.
export function ImageLightbox({ image, accent, onClose }: Props) {
  const reducedMotion = useReducedMotion();
  const containerRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    // Listen on this lightbox's own focused container rather than the
    // window. CommitModal has an equivalent Escape listener on window;
    // capture:true previously jumped this handler ahead of it by forcing
    // the capture phase, which runs before ANY bubble-phase listener on
    // the page — including ones unrelated to this modal stack, which is
    // where the leakage risk comes from. Attaching to the container
    // instead relies on ordinary DOM tree flow: Escape fires while focus
    // is trapped inside this element (see useFocusTrap), so the native
    // event originates here and would bubble up through this node before
    // it ever reaches CommitModal's window-level listener. Stopping
    // propagation here is then just standard bubble-phase behavior, not
    // a phase-jumping trick.
    const node = containerRef.current;
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [onClose, containerRef]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // This wrapper is a transparent positioning container — it has no
      // visible fill of its own, so animating its opacity does nothing
      // visually. Its only job on exit is to keep AnimatePresence from
      // tearing the whole tree down before the staggered children below
      // (image out first, backdrop lingering after) finish their own
      // exits, so it just holds for exactly as long as the slower of the
      // two: the delayed backdrop.
      exit={{ opacity: 1 }}
      transition={{
        duration: reducedMotion ? 0.1 : BACKDROP_EXIT_DELAY + BACKDROP_EXIT_DURATION,
      }}
    >
      <motion.button
        aria-label="Close image"
        onClick={onClose}
        className="absolute inset-0 cursor-zoom-out"
        style={{ background: "rgba(4, 5, 9, 0.92)", backdropFilter: "blur(6px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: reducedMotion ? 0.1 : BACKDROP_EXIT_DURATION,
          // The scrim holds a beat after the image has already left —
          // that brief stretch of empty dark space is what gives the eye
          // somewhere to rest before the rail reappears underneath it,
          // rather than both surfaces dissolving in lockstep and leaving
          // nothing for attention to land on mid-transition. It creates
          // a sense of focal depth: image (foreground) recedes first,
          // then the dark field (background) clears to reveal what's
          // behind it, guiding the eye back toward the source rail.
          delay: reducedMotion ? 0 : BACKDROP_EXIT_DELAY,
        }}
      />
      <motion.div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={image.alt}
        className="relative max-h-[92vh] max-w-[96vw] sm:max-h-[90vh] sm:max-w-[90vw] outline-none"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        // The image itself exits first and fast — no delay — so it reads
        // as snapping back toward the rail it came from, ahead of the
        // backdrop that's still holding the scene dark behind it.
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
        transition={
          reducedMotion
            ? REDUCED_MOTION_TRANSITION
            : { type: "spring", damping: 26, stiffness: 320, duration: IMAGE_EXIT_DURATION }
        }
      >
        <img
          src={image.src}
          alt={image.alt}
          className="max-h-[92vh] max-w-[96vw] sm:max-h-[90vh] sm:max-w-[90vw] rounded-lg object-contain shadow-2xl"
          style={{ boxShadow: `0 30px 90px rgba(0,0,0,0.6), 0 0 0 1px ${accent}22` }}
        />
        <button
          onClick={onClose}
          aria-label="Close image"
          className="absolute -right-2 -top-2 sm:right-3 sm:top-3 flex h-9 w-9 items-center justify-center rounded-full text-sm text-gray-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "rgba(10,12,18,0.75)", outlineColor: accent }}
        >
          ✕
        </button>
      </motion.div>
    </motion.div>
  );
}
