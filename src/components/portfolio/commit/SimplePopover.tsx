import { motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { useId, useLayoutEffect, useState } from "react";
import { useMediaQuery } from "@/lib/portfolio/useMediaQuery";
import { useFocusTrap } from "@/lib/portfolio/useFocusTrap";
import { REDUCED_MOTION_TRANSITION } from "@/lib/portfolio/useModalMotion";
import { DragHandle } from "./ModalChrome";

const popoverSpring = { type: "spring", damping: 22, stiffness: 340 } as const;
const POPOVER_WIDTH = 370;
const FALLBACK_HEIGHT = 140;
const MARGIN = 16;
const MOBILE_BREAKPOINT = 640;

function computePos(anchorX: number, anchorY: number, height: number) {
  let left = anchorX + 24;
  if (left + POPOVER_WIDTH > window.innerWidth - MARGIN) left = anchorX - POPOVER_WIDTH - 24;
  left = Math.min(Math.max(MARGIN, left), window.innerWidth - POPOVER_WIDTH - MARGIN);

  let top = anchorY - 24;
  if (top + height > window.innerHeight - MARGIN) top = window.innerHeight - height - MARGIN;
  top = Math.max(MARGIN, top);

  return { left, top };
}

type PopoverProps = {
  hash: string;
  message: string;
  color: string;
  label: string;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
};

export function SimplePopover({
  hash,
  message,
  color,
  label,
  anchorX,
  anchorY,
  onClose,
}: PopoverProps) {
  const titleId = useId();
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  const containerRef = useFocusTrap<HTMLDivElement>(true);
  const reducedMotion = useReducedMotion();
  const dragControls = useDragControls();
  const dragEnabled = isMobile && !reducedMotion;

  // window.innerWidth is checked directly here (not the isMobile hook,
  // which only settles after mount) so the very first render already has
  // a real position instead of falling through to an unpositioned `{}`
  // style for one frame.
  const [pos, setPos] = useState<{ left: number; top: number } | null>(() => {
    if (typeof window === "undefined" || window.innerWidth < MOBILE_BREAKPOINT) return null;
    return computePos(anchorX, anchorY, FALLBACK_HEIGHT);
  });

  useLayoutEffect(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setPos(null);
      return;
    }
    const measured = containerRef.current?.getBoundingClientRect().height;
    const height = measured && measured > 0 ? measured : FALLBACK_HEIGHT;
    setPos(computePos(anchorX, anchorY, height));
  }, [anchorX, anchorY]);

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

  return (
    <>
      <motion.button
        aria-label="Close popover overlay"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/40 sm:bg-transparent backdrop-blur-[2px] sm:backdrop-blur-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0.08 : 0.15 }}
      />
      <motion.div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed z-50 font-mono left-4 right-4 bottom-4 sm:left-auto sm:right-auto sm:bottom-auto outline-none"
        style={isMobile || !pos ? {} : { left: pos.left, top: pos.top }}
        initial={
          reducedMotion
            ? { opacity: 0 }
            : isMobile
              ? { opacity: 0, y: 20, scale: 1 }
              : { opacity: 0, y: 6, scale: 0.96 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={
          reducedMotion
            ? { opacity: 0 }
            : isMobile
              ? { opacity: 0, y: 15, scale: 1 }
              : { opacity: 0, y: 4, scale: 0.96 }
        }
        transition={reducedMotion ? REDUCED_MOTION_TRANSITION : popoverSpring}
        {...dragProps}
      >
        <div
          className={`w-full sm:max-w-sm rounded-xl sm:rounded-lg p-4 shadow-2xl ${dragEnabled ? "pt-1.5" : ""}`}
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)), rgba(18, 20, 27, 0.94)",
            backdropFilter: "blur(18px) saturate(150%)",
            WebkitBackdropFilter: "blur(18px) saturate(150%)",
            border: `1px solid ${color}25`,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.65), 0 0 30px rgba(0,0,0,0.2)",
          }}
        >
          {dragEnabled && <DragHandle dragControls={dragControls} />}
          <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-widest text-gray-400">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: color }}
            />
            {label}
            <span className="text-gray-600">·</span>
            <span className="tabular-nums text-gray-500">{hash}</span>
          </div>
          <p
            id={titleId}
            className="mt-2 text-[14px] sm:text-[15px] leading-snug text-white break-words"
          >
            {message}
          </p>
        </div>
      </motion.div>
    </>
  );
}
