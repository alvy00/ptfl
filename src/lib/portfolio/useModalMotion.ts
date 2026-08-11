import { useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { useMediaQuery } from "./useMediaQuery";

export const modalSpring = { type: "spring", damping: 26, stiffness: 300 } as const;
const mobileSheetSpring = { type: "spring", damping: 28, stiffness: 300 } as const;
export const REDUCED_MOTION_TRANSITION = { duration: 0.15, ease: "linear" as const };

// Backdrop exit lag: the scrim/blur outlives the card's own exit by this
// much, so the card visibly finishes its scale/translate before the
// backdrop clears — a lingering fade instead of both surfaces cutting
// out in lockstep. Shared by FeatureModal and BugfixModal.
export const BACKDROP_EXIT_DELAY = 0.12;
export const BACKDROP_EXIT_DURATION = 0.24;

export function useModalMotion(onClose: () => void, layoutId?: string) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const reducedMotion = useReducedMotion();
  const dragControls = useDragControls();
  const dragEnabled = isMobile && !reducedMotion;
  const useSharedLayout = Boolean(layoutId) && !isMobile && !reducedMotion;

  const variants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : isMobile
      ? {
          initial: { opacity: 0, y: "100%" },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: "100%" },
        }
      : useSharedLayout
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : {
            initial: { opacity: 0, scale: 0.92, y: 12 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 0.95, y: 8 },
          };

  const transition = reducedMotion
    ? REDUCED_MOTION_TRANSITION
    : isMobile
      ? mobileSheetSpring
      : modalSpring;

  const dragProps = dragEnabled
    ? {
        drag: "y" as const,
        dragControls,
        dragListener: false,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: 0, bottom: 0.5 },
        dragMomentum: false,
        onDragEnd: (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
          if (info.offset.y > 100 || info.velocity.y > 400) onClose();
        },
      }
    : {};

  return {
    isMobile,
    reducedMotion,
    dragControls,
    dragEnabled,
    variants,
    transition,
    dragProps,
    useSharedLayout,
  };
}
