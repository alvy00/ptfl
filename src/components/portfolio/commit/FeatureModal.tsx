import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";
import { projects, type Project } from "@/data/portfolio/projects";
import { AskProject } from "./AskProject";
import { CloseButton, DragHandle, featureNodeLayoutId, surfaceStyle } from "./ModalChrome";
import { GlassSpecular, useGlassTilt } from "./useGlassTilt";
import { useFocusTrap } from "@/lib/portfolio/useFocusTrap";
import {
  BACKDROP_EXIT_DELAY,
  BACKDROP_EXIT_DURATION,
  useModalMotion,
} from "@/lib/portfolio/useModalMotion";
import { ProjectImageScatter, ProjectImageStrip, type ProjectImage } from "./ProjectImageRail";
import { ImageLightbox } from "./ImageLightbox";
import type { CommitSelection } from "./CommitModal";

// Fast, fixed fade for the image rail — deliberately NOT tied to the
// backdrop's lagged exit timing. The rail has no visual meaning once the
// card is gone, so it should clear out in step with the card, not sit
// static on screen until the outer wrapper (which now lingers for the
// backdrop) finally unmounts the whole subtree.
const RAIL_EXIT_DURATION = 0.18;

export function FeatureModal({
  selection,
  onClose,
}: {
  selection: Extract<CommitSelection, { kind: "feature" }>;
  onClose: () => void;
}) {
  const project: Project = projects[selection.projectKey];
  const accent = project.accent;
  const titleId = useId();
  const descId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>(true);
  const nodeLayoutId = featureNodeLayoutId(selection.projectKey);
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
  const [activeImage, setActiveImage] = useState<ProjectImage | null>(null);
  const images = project.images ?? [];

  const railExitTransition = { duration: reducedMotion ? 0.08 : RAIL_EXIT_DURATION };

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
      <div className="relative w-full max-w-2xl">
        <motion.div
          ref={containerRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          layout={useSharedLayout ? "position" : false}
          layoutId={useSharedLayout ? nodeLayoutId : undefined}
          className="relative w-full overflow-hidden rounded-t-2xl sm:rounded-2xl font-mono max-h-[90vh] sm:max-h-[85vh] flex flex-col outline-none"
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
          <div className="overflow-y-auto flex-1 p-5 sm:p-8 md:p-9.5 custom-scrollbar overscroll-contain">
            <div className="max-w-[62ch] mx-auto">
              <div className="mb-1 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500">
                project
              </div>
              <h3
                id={titleId}
                className="text-lg sm:text-xl font-semibold text-white leading-tight"
              >
                {project.name}
              </h3>
              {selection.projectKey !== "assetverse" && (
                <p className="mt-1 text-[11px] sm:text-[13px] text-gray-400">
                  {project.timeframe.label}
                </p>
              )}
              <p
                id={descId}
                className="mt-3 text-[14px] sm:text-[15.5px] leading-relaxed text-gray-300 font-sans break-words"
              >
                {project.description}
              </p>

              {images.length > 0 && (
                <motion.div
                  className="mt-5 sm:hidden"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={railExitTransition}
                >
                  <div className="mb-2 text-[11px] uppercase tracking-widest text-gray-500">
                    screenshots
                  </div>
                  <ProjectImageStrip images={images} accent={accent} onSelect={setActiveImage} />
                </motion.div>
              )}

              <div className="mt-5">
                <div className="mb-2 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500">
                  key features
                </div>
                <ul className="space-y-2">
                  {project.features.map((f) => (
                    <li
                      key={f.title}
                      className="flex gap-2.5 text-[14.5px] sm:text-[15.5px] font-sans align-top"
                    >
                      <span
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: accent }}
                      />
                      <span className="text-gray-200 break-words">
                        <span className="font-medium text-white">{f.title}</span>
                        <span className="text-gray-400"> — {f.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500">
                  stack
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
                  {project.stack.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border px-2.5 py-0.5 text-[11px] sm:text-[13px]"
                      style={{
                        borderColor: `${accent}44`,
                        color: accent,
                        background: `${accent}08`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-md px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-transform hover:-translate-y-0.5 active:scale-95 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  style={{
                    background: accent,
                    color: "#0b0c10",
                    boxShadow: `0 6px 20px ${accent}44`,
                  }}
                >
                  Live Demo ↗
                </a>
                {project.codeLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-md border px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-200 transition-colors hover:text-white active:scale-95 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    style={{ borderColor: `${accent}44`, background: "rgba(255,255,255,0.01)" }}
                  >
                    {project.codeLinks.length > 1 ? link.label : "View Code"} ↗
                  </a>
                ))}
              </div>

              <div className="mt-2 w-full border-t border-white/[0.04]" />
              <AskProject projectKey={selection.projectKey} accent={accent} />
            </div>
          </div>

          <CloseButton onClose={onClose} />
          <GlassSpecular x={specXPct} y={specYPct} accent={accent} active={active} />
        </motion.div>

        {images.length > 0 && (
          <motion.div
            className="hidden sm:block sm:absolute sm:left-full sm:top-2 sm:ml-8"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={railExitTransition}
          >
            <ProjectImageScatter images={images} accent={accent} onSelect={setActiveImage} />
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {activeImage && (
          <ImageLightbox image={activeImage} accent={accent} onClose={() => setActiveImage(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
