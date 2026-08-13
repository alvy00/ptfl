/* eslint-disable prettier/prettier */
import { motion, useMotionValueEvent, useTransform } from "framer-motion";
import { useRef } from "react";
import { createPortal } from "react-dom";

import { BRANCH_DEFS, PALETTE, TOTAL_COMMIT_COUNT, TOTAL_ROWS } from "@/lib/portfolio/gitGraphData";

const ANNOUNCE_STEP = Math.max(1, Math.round(TOTAL_COMMIT_COUNT / 10));
const IDLE_COLOR = "#6b7280"; // tailwind gray-500, matches the old static text-gray-500

export function GitGraphScrollProgress({
  progress,
}: {
  progress: ReturnType<typeof useTransform<number, number>>;
}) {
  // Written directly to the DOM instead of through useState — fires on
  // every scroll tick, and React state here would re-render the whole
  // subtree per pixel of scroll.
  const countRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const lastAnnouncedRef = useRef(0);
  // Read once rather than on every callback invocation — this doesn't
  // need to react to the setting changing mid-session.
  const prefersReducedMotionRef = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useMotionValueEvent(progress, "change", (v) => {
    const count = Math.min(TOTAL_COMMIT_COUNT, Math.max(0, Math.round(v * TOTAL_COMMIT_COUNT)));
    const el = countRef.current;
    // isConnected guard: framer unsubscribes this on unmount, but a stray
    // callback landing on an already-detached node (e.g. mid fast-teardown)
    // should no-op rather than throw.
    if (el && el.isConnected) {
      const prev = Number(el.textContent) || 0;
      el.textContent = String(count);

      // Project-sector color: which BRANCH_DEFS row range `v` falls in,
      // same row-fraction math branchGlowWindow uses elsewhere.
      const row = v * (TOTAL_ROWS - 1);
      const activeBranch = BRANCH_DEFS.find((b) => row >= b.sourceRow && row < b.mergeRow);
      el.style.color = activeBranch ? PALETTE.projects[activeBranch.projectKey].accent : IDLE_COLOR;

      // Brief flicker on multi-commit jumps (fast scroll), skipped for
      // ordinary single-step increments and under reduced motion. Uses
      // the Web Animations API rather than a class-toggle + forced
      // reflow restart trick — no synchronous layout read in this
      // high-frequency callback.
      if (Math.abs(count - prev) > 1 && !prefersReducedMotionRef.current) {
        el.animate(
          [{ filter: "brightness(2.2) blur(0.4px)" }, { filter: "brightness(1) blur(0)" }],
          { duration: 140, easing: "ease-out" },
        );
      }
    }

    if (fillRef.current) fillRef.current.style.width = `${Math.min(100, Math.max(0, v * 100))}%`;

    // Throttled live-region announcement — not every pixel/commit, or
    // fast scrolling would spam a screen reader with updates.
    if (
      liveRef.current &&
      (Math.abs(count - lastAnnouncedRef.current) >= ANNOUNCE_STEP ||
        count === 0 ||
        count === TOTAL_COMMIT_COUNT)
    ) {
      lastAnnouncedRef.current = count;
      liveRef.current.textContent = `Commit ${count} of ${TOTAL_COMMIT_COUNT}`;
    }
  });

  const headLeft = useTransform(progress, (v) => `${Math.min(100, Math.max(0, v * 100))}%`);

  // Approximates against the whole document's scroll height, not the
  // exact ["start 65%","end end"] offset range GitGraph.tsx's own
  // useScroll target uses — this component only receives the derived
  // `progress` value, not that container ref, so an exact reverse-mapping
  // back to a scroll position isn't available here.
  const handleQuickJump = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const doc = document.documentElement;
    window.scrollTo({
      top: fraction * Math.max(0, doc.scrollHeight - window.innerHeight),
      behavior: prefersReducedMotionRef.current ? "auto" : "smooth",
    });
  };

  // Portaled to <body>: GitGraph mounts inside index.tsx's `whileInView`
  // motion.div, which carries an inline `transform` while its own reveal
  // plays — that creates a containing block for `position: fixed`
  // descendants, briefly pinning this bar to the wrapper's box instead of
  // the viewport. Portaling sidesteps that regardless of transforms
  // anywhere above it in the tree. Guarded for SSR/hydration.
  if (typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <>
      <div className="fixed left-0 top-0 z-[60] h-[3px] w-full overflow-hidden">
        <motion.div
          aria-hidden="true"
          className="h-full w-full origin-left"
          style={{
            scaleX: progress,
            background: `linear-gradient(90deg, ${PALETTE.projects.assetverse.accent}, ${PALETTE.projects.auctasync.accent}, ${PALETTE.projects.asynclangai.accent}, ${PALETTE.projects.careerpilot.accent})`,
            boxShadow: "0 0 8px rgba(255,255,255,0.35)",
            willChange: "transform",
          }}
        />
        {/* Shimmer sweep — pure CSS, disabled under reduced motion below. */}
        <div aria-hidden="true" className="gp-shimmer pointer-events-none absolute inset-0" />
      </div>

      <motion.div
        aria-hidden="true"
        className="fixed top-0 z-[61] h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: headLeft,
          backgroundColor: "#fff",
          boxShadow: "0 0 12px #fff, 0 0 4px #fff",
        }}
      />

      <div
        className="group fixed right-2 sm:right-4 z-[60] rounded px-1.5 py-0.5 sm:px-2 font-mono text-[10px] sm:text-[12px] tabular-nums tracking-widest"
        style={{
          background: "rgba(14,15,19,0.6)",
          backdropFilter: "blur(6px)",
          top: "max(0.5rem, env(safe-area-inset-top))",
        }}
      >
        <div aria-label="Scroll progress through the commit history">
          <span ref={countRef} className="text-gray-500">
            0
          </span>{" "}
          / {TOTAL_COMMIT_COUNT}
        </div>
        <span ref={liveRef} aria-live="polite" className="sr-only" />

        {/* Hover-revealed quick-jump bar — click anywhere along it to
            scroll to roughly that fraction of the page. */}
        <div
          onClick={handleQuickJump}
          className="mt-1 h-1 w-full cursor-pointer overflow-hidden rounded-full bg-white/10 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
          <div ref={fillRef} className="h-full rounded-full bg-white/60" style={{ width: "0%" }} />
        </div>
      </div>

      <style>{`
        .gp-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          width: 40%;
          animation: gp-shimmer-sweep 2.2s linear infinite;
        }
        @keyframes gp-shimmer-sweep {
          from { transform: translateX(-100%); }
          to { transform: translateX(350%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gp-shimmer { animation: none; display: none; }
        }
      `}</style>
    </>,
    document.body,
  );
}
