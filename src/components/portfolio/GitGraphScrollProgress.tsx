import { motion, useMotionValueEvent, useTransform } from "framer-motion";
import { useRef } from "react";
import { createPortal } from "react-dom";

import { PALETTE, TOTAL_COMMIT_COUNT } from "@/lib/portfolio/gitGraphData";

export function GitGraphScrollProgress({
  progress,
}: {
  progress: ReturnType<typeof useTransform<number, number>>;
}) {
  // Written directly to the DOM instead of through useState — this fires on
  // every scroll tick, and routing it through React state would re-render
  // the whole subtree on every pixel of scroll. A screen reader doesn't
  // need this number narrated in real time either, so the label below is
  // static rather than trying to keep aria-live in sync with a fast-moving
  // value (which would just spam announcements).
  const countRef = useRef<HTMLSpanElement>(null);

  useMotionValueEvent(progress, "change", (v) => {
    const count = Math.min(TOTAL_COMMIT_COUNT, Math.max(0, Math.round(v * TOTAL_COMMIT_COUNT)));
    if (countRef.current) countRef.current.textContent = String(count);
  });

  // Portaled straight to <body> rather than rendered in place. GitGraph
  // (and therefore this component) is mounted deep inside index.tsx's
  // `whileInView` motion.div wrapper around the GlobalSearch/GitGraph
  // section — while that wrapper's reveal animation is playing it carries
  // an inline `transform`, which creates a new containing block for any
  // `position: fixed` descendant. Without the portal, that briefly pins
  // this bar/counter to the wrapper's box (making it appear parked next
  // to the search input) instead of the viewport, until the animation
  // finishes and the transform is cleared. Rendering into `document.body`
  // sidesteps that entirely — this is always fixed to the true viewport,
  // regardless of what transforms exist anywhere in the React tree above
  // it. Guarded for SSR/hydration since `document` isn't available server-
  // side; TanStack Router's client render will have `document` by the
  // time this component actually mounts and runs its effects, but the
  // guard keeps this safe if it's ever imported somewhere with SSR.
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <motion.div
        aria-hidden="true"
        className="fixed left-0 top-0 z-[60] h-[3px] origin-left"
        style={{
          scaleX: progress,
          width: "100%",
          background: `linear-gradient(90deg, ${PALETTE.projects.assetverse.accent}, ${PALETTE.projects.auctasync.accent}, ${PALETTE.projects.asynclangai.accent}, ${PALETTE.projects.careerpilot.accent})`,
          boxShadow: "0 0 8px rgba(255,255,255,0.35)",
          willChange: "transform",
        }}
      />
      <div
        aria-label="Scroll progress through the commit history"
        className="fixed right-2 top-2 sm:right-4 sm:top-3 z-[60] rounded px-1.5 py-0.5 sm:px-2 font-mono text-[10px] sm:text-[12px] tabular-nums tracking-widest text-gray-500"
        style={{
          background: "rgba(14,15,19,0.6)",
          backdropFilter: "blur(6px)",
          top: "max(0.5rem, env(safe-area-inset-top))",
        }}
      >
        <span ref={countRef}>0</span> / {TOTAL_COMMIT_COUNT}
      </div>
    </>,
    document.body,
  );
}
