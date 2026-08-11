import { motion } from "framer-motion";
import { useId } from "react";
import { bugfixes } from "@/data/portfolio/bugfixes";
import { CloseButton, DragHandle, bugfixNodeLayoutId, surfaceStyle } from "./ModalChrome";
import { GlassSpecular, useGlassTilt } from "./useGlassTilt";
import { useFocusTrap } from "@/lib/portfolio/useFocusTrap";
import {
  BACKDROP_EXIT_DELAY,
  BACKDROP_EXIT_DURATION,
  useModalMotion,
} from "@/lib/portfolio/useModalMotion";
import { PRSection } from "./PRSection";
import type { CommitSelection } from "./CommitModal";

export function BugfixModal({
  selection,
  onClose,
}: {
  selection: Extract<CommitSelection, { kind: "bugfix" }>;
  onClose: () => void;
}) {
  const bug = bugfixes[selection.bugfixKey];
  const accent = bug.accent;
  const titleId = useId();
  const descId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>(true);
  const nodeLayoutId = bugfixNodeLayoutId(selection.bugfixKey);
  const {
    isMobile,
    reducedMotion,
    dragControls,
    dragEnabled,
    variants,
    transition,
    dragProps,
    useSharedLayout,
  } = useModalMotion(onClose, nodeLayoutId);
  const { tiltStyle, handlers, markSettled, specXPct, specYPct, active } = useGlassTilt(
    containerRef,
    {
      disabled: isMobile || Boolean(reducedMotion),
    },
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
      transition={{
        duration: reducedMotion ? 0.1 : BACKDROP_EXIT_DELAY + BACKDROP_EXIT_DURATION,
      }}
    >
      <motion.button
        aria-label="Close modal overlay"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(6, 8, 14, 0.72)", backdropFilter: "blur(14px) saturate(140%)" }}
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
        aria-labelledby={titleId}
        aria-describedby={descId}
        layout={useSharedLayout ? "position" : false}
        layoutId={useSharedLayout ? nodeLayoutId : undefined}
        className="relative w-full max-w-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl font-mono max-h-[90vh] sm:max-h-[85vh] flex flex-col outline-none"
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={transition}
        style={{ ...surfaceStyle(accent), ...tiltStyle }}
        onAnimationComplete={markSettled}
        {...handlers}
        {...dragProps}
      >
        {dragEnabled && <DragHandle dragControls={dragControls} />}
        <div className="overflow-y-auto flex-1 custom-scrollbar overscroll-contain">
          <div
            className="sticky top-0 z-10 flex items-center gap-2 sm:gap-3 border-b px-5 py-3.5 sm:px-8 sm:py-4 text-[11px] sm:text-[13px] uppercase tracking-widest backdrop-blur-md"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(20, 22, 30, 0.4)" }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-medium"
              style={{
                background: "rgba(139, 92, 246, 0.15)",
                color: "#c4b5fd",
                border: "1px solid rgba(139,92,246,0.35)",
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full"
                style={{ background: "#c4b5fd" }}
              />
              Merged
            </span>
            <span className="text-gray-500">pull request</span>
            <span className="ml-auto tabular-nums text-gray-500 text-[11px] sm:text-[13px]">
              {selection.hash}
            </span>
          </div>

          <div className="p-5 sm:p-8 md:p-9.5 max-w-[62ch] mx-auto">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[11px] sm:text-[13px] text-gray-500">
              <span style={{ color: accent }} className="break-all">
                {bug.branch}
              </span>
              <span>→</span>
              <span>{bug.parentLabel}</span>
            </div>
            <h3 id={titleId} className="text-lg sm:text-xl font-semibold text-white leading-snug">
              {bug.title}
            </h3>
            <p className="mt-2 text-[13px] sm:text-[14px] text-gray-500 break-words" id={descId}>
              {selection.message}
            </p>

            <div className="mt-5 sm:mt-7 space-y-5 sm:space-y-6 font-sans text-[14.5px] sm:text-[15.5px] leading-relaxed">
              <PRSection label="Problem" body={bug.problem} />
              <PRSection label="What I Tried First" body={bug.triedFirst} tint="red" />
              <PRSection label="Root Cause" body={bug.rootCause} />
              <PRSection label="The Fix" body={bug.fix} tint="green" />
              <PRSection label="What I'd Do Differently" body={bug.wouldDoDifferently} />
            </div>
          </div>
        </div>

        <CloseButton onClose={onClose} />
        <GlassSpecular x={specXPct} y={specYPct} accent={accent} active={active} />
      </motion.div>
    </motion.div>
  );
}
