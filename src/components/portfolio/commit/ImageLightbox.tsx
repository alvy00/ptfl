import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { useFocusTrap } from "@/lib/portfolio/useFocusTrap";
import { REDUCED_MOTION_TRANSITION } from "@/lib/portfolio/useModalMotion";
import type { ProjectImage } from "./ProjectImageRail";

type Props = {
  image: ProjectImage;
  accent: string;
  onClose: () => void;
};

const BACKDROP_EXIT_DELAY = 0.1;
const BACKDROP_EXIT_DURATION = 0.22;
const IMAGE_EXIT_DURATION = 0.16;

// Sits above CommitModal's feature card (z-50) at z-[60], so it can be
// closed on its own without dismissing the modal underneath it.
export function ImageLightbox({ image, accent, onClose }: Props) {
  const reducedMotion = useReducedMotion();
  const containerRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
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
