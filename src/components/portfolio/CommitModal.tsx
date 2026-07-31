/* eslint-disable prettier/prettier */
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { projects, type Project, type ProjectKey } from "@/data/portfolio/projects";
import { bugfixes, type BugfixKey } from "@/data/portfolio/bugfixes";
import { AskProject } from "./AskProject";
import { GlassSpecular, useGlassTilt } from "./useGlassTilt";

export type CommitSelection =
  | { kind: "feature"; projectKey: ProjectKey }
  | { kind: "main"; hash: string; message: string; anchorX: number; anchorY: number }
  | { kind: "bugfix"; hash: string; message: string; bugfixKey: BugfixKey }
  | {
      kind: "bugfix-first";
      hash: string;
      message: string;
      color: string;
      anchorX: number;
      anchorY: number;
    };

type Props = {
  selection: CommitSelection | null;
  onClose: () => void;
};

/* -----------------------------------------------------------------------
 * Shared motion tokens — spring physics give every modal/popover a
 * consistent, organic "voice" instead of a robotic fixed-duration ease.
 * Mobile sheets carry slightly more damping (bigger, heavier surface);
 * desktop popovers are snappier (small, low-inertia UI).
 * ---------------------------------------------------------------------*/
const modalSpring = { type: "spring", damping: 26, stiffness: 300 } as const;
const mobileSheetSpring = { type: "spring", damping: 28, stiffness: 300 } as const;
const popoverSpring = { type: "spring", damping: 22, stiffness: 340 } as const;
const REDUCED_MOTION_TRANSITION = { duration: 0.15, ease: "linear" as const };

/* -----------------------------------------------------------------------
 * useMediaQuery — replaces the one-shot `window.innerWidth < 640` check.
 * Reacts to resize/rotate and is SSR-safe (defaults to false on server,
 * corrected on mount before paint via useLayoutEffect).
 * ---------------------------------------------------------------------*/
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useLayoutEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/* -----------------------------------------------------------------------
 * useBodyScrollLock — prevents background scroll while any modal is open.
 * Preserves scrollbar width so the page doesn't jump/shift.
 * ---------------------------------------------------------------------*/
function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body } = document;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [active]);
}

/* -----------------------------------------------------------------------
 * useFocusTrap — locks Tab/Shift+Tab cycling inside the container while
 * mounted, focuses the first focusable element on open, and restores
 * focus to whatever triggered the modal when it closes.
 * ---------------------------------------------------------------------*/
function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const getFocusable = useCallback(() => {
    const el = containerRef.current;
    if (!el) return [];
    return Array.from(
      el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((n) => n.offsetParent !== null);
  }, []);

  useEffect(() => {
    if (!active) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const focusable = getFocusable();
      // preventScroll matters here specifically: getFocusable() returns
      // elements in DOM order, and in FeatureModal that means the first
      // focusable element is usually the "Live Demo" link — which sits
      // well below the fold, after the description/features/stack. Without
      // preventScroll, focus()'s default browser behavior scrolls the
      // nearest scrollable ancestor (the modal's own overflow-y-auto
      // content div) to bring that link into view, so every modal opened
      // already scrolled down instead of at the top. This keeps the
      // accessibility behavior (focus still moves correctly for keyboard/
      // screen-reader users) without also relocating the visible scroll
      // position as a side effect.
      (focusable[0] ?? containerRef.current)?.focus({ preventScroll: true });
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      // isConnected guards against restoring focus to an element that's
      // since been removed from the DOM (e.g. the commit list re-rendered
      // while this modal was open) — calling .focus() on a detached node
      // is a silent no-op in most browsers but not guaranteed everywhere,
      // so check first rather than relying on that being universally safe.
      const prev = previouslyFocused.current;
      if (prev?.isConnected) prev.focus();
    };
  }, [active, getFocusable]);

  return containerRef;
}

/* -----------------------------------------------------------------------
 * useModalMotion — single source of truth for how a full-screen modal
 * (FeatureModal / BugfixModal) enters, exits, and responds to touch.
 *
 * - Mobile: anchored bottom sheet (slides up from y:100%), draggable
 *   via a dedicated handle so it never fights the body's own scroll.
 * - Desktop: centered scale/fade, no drag.
 * - Respects prefers-reduced-motion: drops to a plain opacity fade and
 *   disables drag entirely, regardless of viewport.
 * ---------------------------------------------------------------------*/
function useModalMotion(onClose: () => void) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const reducedMotion = useReducedMotion();
  const dragControls = useDragControls();
  const dragEnabled = isMobile && !reducedMotion;

  const variants = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : isMobile
      ? {
          initial: { opacity: 0, y: "100%" },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: "100%" },
        }
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
        dragListener: false, // only the handle starts a drag — never the scrollable body
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: 0, bottom: 0.5 },
        dragMomentum: false,
        onDragEnd: (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
          if (info.offset.y > 100 || info.velocity.y > 400) onClose();
        },
      }
    : {};

  return { isMobile, reducedMotion, dragControls, dragEnabled, variants, transition, dragProps };
}

/* -----------------------------------------------------------------------
 * DragHandle — the small grabber bar mobile sheets use to opt in to a
 * drag gesture without hijacking touches meant for scrolling content.
 * ---------------------------------------------------------------------*/
function DragHandle({ dragControls }: { dragControls: ReturnType<typeof useDragControls> }) {
  return (
    <div
      className="flex shrink-0 touch-none cursor-grab justify-center pt-2.5 pb-1 active:cursor-grabbing sm:hidden"
      onPointerDown={(e) => dragControls.start(e)}
      aria-hidden="true"
    >
      <div className="h-1 w-10 rounded-full bg-white/20" />
    </div>
  );
}

export function CommitModal({ selection, onClose }: Props) {
  useBodyScrollLock(Boolean(selection));

  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, onClose]);

  return (
    <AnimatePresence>
      {selection?.kind === "feature" && <FeatureModal selection={selection} onClose={onClose} />}
      {selection?.kind === "main" && <MainPopover selection={selection} onClose={onClose} />}
      {selection?.kind === "bugfix" && <BugfixModal selection={selection} onClose={onClose} />}
      {selection?.kind === "bugfix-first" && (
        <SimplePopover
          hash={selection.hash}
          message={selection.message}
          color={selection.color}
          label="bugfix"
          anchorX={selection.anchorX}
          anchorY={selection.anchorY}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

/* -----------------------------------------------------------------------
 * Reusable close button — consistent active/focus states everywhere.
 * ---------------------------------------------------------------------*/
function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close dialog"
      className="absolute cursor-pointer right-3 top-3.5 sm:right-4 sm:top-4 rounded-md px-2 py-1 text-xs sm:text-sm text-gray-400 transition-all hover:bg-white/5 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 z-20 backdrop-blur-sm sm:backdrop-blur-none"
      style={{ background: "rgba(20,22,30,0.6)" }}
    >
      ✕
    </button>
  );
}

/* -----------------------------------------------------------------------
 * Shared surface style — solid fallback color under the blur (avoids
 * GPU thrashing / illegibility on weak devices or busy backgrounds),
 * plus a top inner highlight for a touch of skeuomorphic depth.
 * ---------------------------------------------------------------------*/
function surfaceStyle(accent: string) {
  return {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)) , rgba(17, 19, 26, 0.92)",
    backdropFilter: "blur(20px) saturate(150%)",
    WebkitBackdropFilter: "blur(20px) saturate(150%)",
    border: `1px solid ${accent}33`,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${accent}22`,
  } as const;
}

function BugfixModal({
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
  const { isMobile, reducedMotion, dragControls, dragEnabled, variants, transition, dragProps } =
    useModalMotion(onClose);
  const { tiltStyle, handlers, markSettled, specXPct, specYPct, active } = useGlassTilt(
    containerRef,
    { disabled: isMobile || Boolean(reducedMotion) },
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.1 : 0.2 }}
    >
      <button
        aria-label="Close modal overlay"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background: "rgba(6, 8, 14, 0.72)",
          backdropFilter: "blur(14px) saturate(140%)",
        }}
      />
      <motion.div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
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

function PRSection({ label, body, tint }: { label: string; body: string; tint?: "red" | "green" }) {
  const marker = tint === "red" ? "-" : tint === "green" ? "+" : null;
  const tintBg =
    tint === "red"
      ? "rgba(239, 68, 68, 0.06)"
      : tint === "green"
        ? "rgba(34, 197, 94, 0.06)"
        : "rgba(255,255,255,0.01)";
  const tintBorder =
    tint === "red"
      ? "rgba(239, 68, 68, 0.25)"
      : tint === "green"
        ? "rgba(34, 197, 94, 0.25)"
        : "rgba(255,255,255,0.06)";
  const markerColor = tint === "red" ? "#f87171" : tint === "green" ? "#4ade80" : undefined;

  return (
    <div className="w-full overflow-hidden">
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-400">
        {marker && (
          <span
            className="inline-flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-sm font-mono text-[11px] sm:text-[13px] font-bold shrink-0"
            style={{
              background: tintBg,
              color: markerColor,
              border: `1px solid ${tintBorder}`,
            }}
            aria-hidden="true"
          >
            {marker}
          </span>
        )}
        {label}
      </div>
      <div
        className="rounded-md border-l-2 py-2 px-3 sm:py-2.5 sm:pl-4 sm:pr-4 text-gray-300 break-words text-[14px] sm:text-[15.5px]"
        style={{
          borderColor: tintBorder,
          background: tintBg,
        }}
      >
        {body}
      </div>
    </div>
  );
}

function FeatureModal({
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
  const { isMobile, reducedMotion, dragControls, dragEnabled, variants, transition, dragProps } =
    useModalMotion(onClose);
  const { tiltStyle, handlers, markSettled, specXPct, specYPct, active } = useGlassTilt(
    containerRef,
    { disabled: isMobile || Boolean(reducedMotion) },
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.1 : 0.2 }}
    >
      <button
        aria-label="Close modal overlay"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background: "rgba(6, 8, 14, 0.72)",
          backdropFilter: "blur(14px) saturate(140%)",
        }}
      />
      <motion.div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
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
        <div className="overflow-y-auto flex-1 p-5 sm:p-8 md:p-9.5 custom-scrollbar overscroll-contain">
          <div className="max-w-[62ch] mx-auto">
            <div className="mb-1 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500">
              project
            </div>
            <h3 id={titleId} className="text-lg sm:text-xl font-semibold text-white leading-tight">
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
                  style={{
                    borderColor: `${accent}44`,
                    background: "rgba(255,255,255,0.01)",
                  }}
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
    </motion.div>
  );
}

function MainPopover({
  selection,
  onClose,
}: {
  selection: Extract<CommitSelection, { kind: "main" }>;
  onClose: () => void;
}) {
  return (
    <SimplePopover
      hash={selection.hash}
      message={selection.message}
      color="#ffffff"
      label="main"
      anchorX={selection.anchorX}
      anchorY={selection.anchorY}
      onClose={onClose}
    />
  );
}

function SimplePopover({
  hash,
  message,
  color,
  label,
  anchorX,
  anchorY,
  onClose,
}: {
  hash: string;
  message: string;
  color: string;
  label: string;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
}) {
  const titleId = useId();
  const isMobile = useMediaQuery("(max-width: 639px)");
  const containerRef = useFocusTrap<HTMLDivElement>(true);
  const reducedMotion = useReducedMotion();
  const dragControls = useDragControls();
  const dragEnabled = isMobile && !reducedMotion;

  // Viewport-safe placement: clamps horizontally AND vertically, and flips
  // to the opposite side of the anchor when the default side would clip
  // off the right or bottom edge (e.g. commits near the far edge of the
  // graph), instead of just sliding along the edge and covering the node.
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (isMobile) {
      setPos(null);
      return;
    }
    const POPOVER_WIDTH = 370;
    // Used only as a fallback for the one edge case where containerRef
    // somehow isn't attached yet when this runs (shouldn't happen in
    // practice — refs attach during commit, before layout effects fire —
    // but getBoundingClientRect() on a null ref would throw, so this is
    // the safety net, not the primary source of truth anymore).
    const FALLBACK_HEIGHT_ESTIMATE = 140;
    const margin = 16;

    let left = anchorX + 24;
    if (left + POPOVER_WIDTH > window.innerWidth - margin) {
      left = anchorX - POPOVER_WIDTH - 24; // flip to the left of the anchor
    }
    left = Math.min(Math.max(margin, left), window.innerWidth - POPOVER_WIDTH - margin);

    // Real measured height, not a guess — by this point containerRef is
    // already mounted with its actual content (hash + commit message),
    // so its rendered height reflects real text length/wrapping instead
    // of assuming every commit message fits inside one fixed estimate.
    // This matters because a longer commit message wrapping to 2-3 lines
    // could exceed a fixed guess and clip off the bottom edge — measuring
    // means the vertical clamp below is always accurate to what's
    // actually being placed, regardless of message length.
    const measuredHeight = containerRef.current?.getBoundingClientRect().height;
    const popoverHeight =
      measuredHeight && measuredHeight > 0 ? measuredHeight : FALLBACK_HEIGHT_ESTIMATE;

    let top = anchorY - 24;
    if (top + popoverHeight > window.innerHeight - margin) {
      top = window.innerHeight - popoverHeight - margin; // push up off the bottom edge
    }
    top = Math.max(margin, top);

    setPos({ left, top });
  }, [anchorX, anchorY, isMobile]);

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
          className={`w-full sm:max-w-sm rounded-xl sm:rounded-lg p-4 shadow-2xl ${
            dragEnabled ? "pt-1.5" : ""
          }`}
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
