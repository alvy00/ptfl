/* eslint-disable prettier/prettier */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useMotionTemplate,
  useSpring,
} from "framer-motion";
import { projects, type ProjectKey, type Project } from "@/data/portfolio/projects";

// Explicit display order, per request — no longer derived from
// timeframe.start. Update this array directly to reorder the wall.
const PROJECT_ORDER: ProjectKey[] = ["careerpilot", "auctasync", "asynclangai", "assetverse"];

// ---------------------------------------------------------------------------
// This tab is the general-audience view: recruiters, hiring managers and
// founders skimming on a phone. It deliberately does NOT borrow the graph
// tab's vocabulary (commit nodes, diff marks, changelog framing, mono as
// display type). It reads as an editorial case-study wall — big color-washed
// covers, one plain sentence per project, technical depth folded away behind
// an accordion until asked for.
// ---------------------------------------------------------------------------

// [DRAFTED COPY] Outcome-first, plain-language one-liners written for a
// non-technical reader. These override project.description in THIS TAB ONLY —
// the data layer and the graph tab keep the original technical copy.
const OUTCOME_COPY: Record<ProjectKey, string> = {
  auctasync:
    "A live auction platform where hundreds of people can bid at the same time and everyone sees the same price instantly, with payments handled end to end.",
  assetverse:
    "A tool that lets companies stop tracking laptops and equipment in spreadsheets, with a clear record of who has what and when it came back.",
  asynclangai:
    "An AI speaking partner that lets people practise English out loud and get honest, useful feedback straight after the conversation.",
  careerpilot:
    "Turns any goal — a job, a subject, a certification — into a step-by-step learning plan, with AI voice practice and quizzes to check you actually got it.",
};

// Shared easing curve so every animated element in this tab decelerates the
// same way — small consistency detail, reads as more "designed" than mixing
// default easings per component.
const EASE = [0.16, 1, 0.3, 1] as const;

// The page shell sets font-mono globally for the terminal/graph tab; this tab
// is editorial, so it resets to a humanist sans and demotes mono to labels.
const SANS =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function useMotionSafe() {
  const reduceMotion = useReducedMotion() ?? false;
  return {
    reduceMotion,
    // Tuned snappier per review note — higher stiffness / lower damping than
    // before gives the active-filter pill a more magnetic, decisive snap.
    spring: reduceMotion
      ? { duration: 0.01 }
      : { type: "spring" as const, stiffness: 400, damping: 30 },
  };
}

function shortNameOf(project: Project) {
  return project.name.split(" — ")[0];
}

// --- Small helper: magnetic pull for CTA-style buttons (desktop only) -----
// Subtly translates an element toward the cursor within its own bounds. Kept
// as a small hook so both the header CTA and each project's demo button can
// reuse it without duplicating the listener logic.

function useMagnetic(enabled: boolean) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 22, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 22, mass: 0.5 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      // Small pull radius — a few px of max displacement, not a rubber band.
      x.set(relX * 0.22);
      y.set(relY * 0.22);
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled, x, y]);

  return { ref, style: enabled ? { x: springX, y: springY } : undefined };
}

function useMotionSafeVariants(reduceMotion: boolean) {
  return {
    list: {
      hidden: {},
      show: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.045,
          delayChildren: reduceMotion ? 0 : 0.05,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: reduceMotion ? 0.01 : 0.3, ease: EASE },
      },
    },
    // Stack tags get a slightly springier entrance than the feature list —
    // a small scale+lift so they read as snapping into place rather than
    // just fading, like items landing in a list.
    tagItem: {
      hidden: { opacity: 0, y: reduceMotion ? 0 : 6, scale: reduceMotion ? 1 : 0.9 },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: reduceMotion
          ? { duration: 0.01 }
          : { type: "spring" as const, stiffness: 420, damping: 24 },
      },
    },
  };
}

// --- Small helper: scramble-in text --------------------------------------
// Resolves to `target` through a few frames of random characters. Used on
// the cursor-follow chip's label so each chip's entrance has a bit of the
// terminal/monospace flavor of the utility type it's set in, without ever
// touching display type. Reduced motion skips straight to the final text.

function useScrambleText(target: string, active: boolean, reduceMotion: boolean) {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (!active || reduceMotion) {
      setDisplay(target);
      return;
    }
    const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const totalFrames = 10;
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      const revealCount = Math.ceil((frame / totalFrames) * target.length);
      setDisplay(
        target
          .split("")
          .map((ch, i) =>
            i < revealCount || ch === " " ? ch : glyphs[Math.floor(Math.random() * glyphs.length)],
          )
          .join(""),
      );
      if (frame >= totalFrames) window.clearInterval(id);
    }, 26);
    return () => window.clearInterval(id);
    // Re-run only when this chip becomes active (i.e. on mount, since it's
    // unmounted while inactive) or the target text itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target, reduceMotion]);

  return display;
}

// --- Small helper: count-up for small inline metrics -----------------------
// Used for the accordion's "N features" badge. rAF-driven rather than a
// timer loop so it stays smooth without piling up intervals.

function useCountUp(target: number, active: boolean, reduceMotion: boolean) {
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (reduceMotion) {
      setValue(target);
      return;
    }
    let raf: number;
    const duration = 500;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, reduceMotion]);

  return value;
}

// --- Small helper: rAF-batched pointer-percent tracker ---------------------
// Coalesces mousemove updates through requestAnimationFrame so fast/high
// polling-rate pointer input doesn't dispatch a React-visible update (or a
// motion-value write) more than once per frame.

function usePointerPercent(enabled: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const px = useMotionValue(50);
  const py = useMotionValue(50);
  const frame = useRef<number | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, []);

  const onMove = (e: React.MouseEvent) => {
    if (!enabled) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    pending.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
    if (frame.current == null) {
      frame.current = requestAnimationFrame(() => {
        if (pending.current) {
          px.set(pending.current.x);
          py.set(pending.current.y);
        }
        frame.current = null;
      });
    }
  };

  return { ref, px, py, onMove };
}

// --- Cursor-follow preview chip (desktop pointer devices only) -------------

// --- Small helper: shrink-to-fit for the hero title -------------------------
// Guarantees the project name stays on one line inside the hero, whatever
// its length or the hero's width at a given breakpoint, instead of relying
// on font-size alone (which wraps long names at narrow/tablet widths).
// Measures natural (unscaled) text width vs. available container width and
// applies a CSS transform scale down to fit — layout width is untouched, so
// this never affects the rest of the hero.

function useFitTitle(text: string) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLHeadingElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const measure = () => {
      const containerWidth = container.clientWidth;
      textEl.style.transform = "scale(1)";
      const textWidth = textEl.scrollWidth;
      if (textWidth > containerWidth && containerWidth > 0) {
        // Floor the scale so extremely long names still stay legible rather
        // than shrinking to near-nothing.
        setScale(Math.max(containerWidth / textWidth, 0.5));
      } else {
        setScale(1);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text]);

  return { containerRef, textRef, scale };
}

function usePointerFine() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(pointer: fine)");
    setFine(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setFine(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return fine;
}

function CursorPreview({
  containerRef,
  active,
  label,
  accent,
  reduceMotion,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  active: boolean;
  label: string;
  accent: string;
  reduceMotion: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Reduced motion: snap the chip to the cursor instead of trailing it.
  const springConfig = reduceMotion
    ? { stiffness: 2000, damping: 100, mass: 0.1 }
    : { stiffness: 220, damping: 26, mass: 0.6 };
  const sx = useSpring(x, springConfig);
  const sy = useSpring(y, springConfig);

  // Listener is scoped to this panel's hero, not window, so it only runs
  // while the cursor is actually over this project's cover.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !active) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      x.set(e.clientX - rect.left);
      y.set(e.clientY - rect.top);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [active, containerRef, x, y]);

  const scrambledLabel = useScrambleText(label, active, reduceMotion);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden="true"
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{
            opacity: { duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" },
            scale: { duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" },
            layout: reduceMotion
              ? { duration: 0.01 }
              : { type: "spring", stiffness: 320, damping: 28 },
          }}
          style={{
            x: sx,
            y: sy,
            background: accent,
            translateX: "-50%",
            translateY: "-50%",
          }}
          // Width/height are now intrinsic (padding + content) instead of a
          // fixed box, so the chip morphs to fit each project's short name —
          // the `layout` prop animates that size change smoothly.
          className="pointer-events-none absolute left-0 top-0 z-30 inline-flex h-auto min-h-[64px] w-auto min-w-[110px] max-w-[190px] items-end justify-start rounded-2xl px-4 py-3 shadow-2xl"
        >
          <span className="text-[11px] font-semibold leading-tight tracking-tight text-[#0B0C10]">
            {scrambledLabel}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Accordion: "See what's inside" ----------------------------------------

function CaseStudyAccordion({ project, projectKey }: { project: Project; projectKey: string }) {
  const [open, setOpen] = useState(false);
  const { reduceMotion } = useMotionSafe();
  const variants = useMotionSafeVariants(reduceMotion);
  const panelId = `overview-details-${projectKey}`;
  const triggerId = `${panelId}-trigger`;
  const featureCount = useCountUp(project.features.length, open, reduceMotion);

  return (
    <div className="mt-8 border-t border-white/[0.08] pt-5">
      <button
        type="button"
        id={triggerId}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl text-left text-sm font-medium text-[#F5F5F3]/80 transition-colors hover:text-[#F5F5F3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF6B4A] sm:w-auto"
      >
        <span className="inline-flex items-center gap-2">
          See what&rsquo;s inside
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: EASE }}
                className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[#8A8D94]"
              >
                {featureCount} feature{featureCount === 1 ? "" : "s"}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.25, ease: EASE }}
          className="inline-block text-[#8A8D94]"
        >
          ↓
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            role="region"
            aria-labelledby={triggerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-6">
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-[#8A8D94]">
                Built with
              </h4>
              <motion.div
                variants={variants.list}
                initial="hidden"
                animate="show"
                className="mt-3 flex flex-wrap gap-2"
              >
                {project.stack.map((tag) => (
                  <motion.span
                    key={tag}
                    variants={variants.tagItem}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-[#8A8D94]"
                  >
                    {tag}
                  </motion.span>
                ))}
              </motion.div>

              <h4 className="mt-7 text-xs font-medium uppercase tracking-[0.14em] text-[#8A8D94]">
                What&rsquo;s inside
              </h4>
              <motion.ul
                variants={variants.list}
                initial="hidden"
                animate="show"
                className="mt-3 grid gap-5 sm:grid-cols-2"
              >
                {project.features.map((f) => (
                  <motion.li key={f.title} variants={variants.item}>
                    <p className="text-sm font-semibold text-[#F5F5F3]">{f.title}</p>
                    <p className="mt-1 text-sm font-light leading-relaxed text-[#8A8D94]">
                      {f.detail}
                    </p>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Case-study panel -------------------------------------------------------

function CaseStudyPanel({
  project,
  projectKey,
  index,
  pointerFine,
}: {
  project: Project;
  projectKey: ProjectKey;
  index: number;
  pointerFine: boolean;
}) {
  const { reduceMotion } = useMotionSafe();
  const [hovered, setHovered] = useState(false);
  const [panelHovered, setPanelHovered] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const shortName = shortNameOf(project);
  const tagline = project.name.split(" — ")[1];
  const accent = project.accent;
  // Even index -> cover on the left, odd -> cover on the right. Desktop only;
  // below lg the panel stacks cover-on-top regardless.
  const coverRight = index % 2 === 1;

  // Cursor-tracked spotlight inside the hero: a small radial highlight that
  // follows the pointer, layered on top of the existing static color wash.
  // Position updates are rAF-batched (see usePointerPercent) so a
  // high-polling-rate mouse doesn't dispatch more than one motion-value
  // write per frame; the actual visual smoothing still comes from the
  // spring below.
  const heroTrack = usePointerPercent(pointerFine);
  const springSpotX = useSpring(heroTrack.px, { stiffness: 150, damping: 20 });
  const springSpotY = useSpring(heroTrack.py, { stiffness: 150, damping: 20 });
  const spotlightBackground = useMotionTemplate`radial-gradient(260px circle at ${springSpotX}% ${springSpotY}%, ${accent}38, transparent 70%)`;

  // Same rAF-batched tracking, scoped to the whole panel, drives a
  // pointer-proximity border glow (see the wrapper below).
  const panelTrack = usePointerPercent(pointerFine);
  const borderGlow = useMotionTemplate`conic-gradient(from 90deg at ${panelTrack.px}% ${panelTrack.py}%, transparent, ${accent}80, transparent 55%)`;

  const magnetic = useMagnetic(pointerFine && !reduceMotion);
  const fitTitle = useFitTitle(shortName);

  return (
    <div
      ref={(el) => {
        panelTrack.ref.current = el;
      }}
      className="relative"
      onMouseMove={panelTrack.onMove}
      onMouseEnter={pointerFine ? () => setPanelHovered(true) : undefined}
      onMouseLeave={pointerFine ? () => setPanelHovered(false) : undefined}
    >
      {pointerFine && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-[calc(1.5rem+1px)] blur-[3px]"
          style={{ background: borderGlow, opacity: panelHovered ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      )}
      <article className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#15171C]">
        <div className={`flex flex-col lg:flex-row ${coverRight ? "lg:flex-row-reverse" : ""}`}>
          {/* Color-wash cover */}
          <motion.div
            ref={(el) => {
              heroRef.current = el;
              heroTrack.ref.current = el;
            }}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 24, clipPath: "inset(6% 6% 6% 6% round 24px)" }
            }
            whileInView={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 24px)" }
            }
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: reduceMotion ? 0.2 : 0.7, ease: EASE }}
            onMouseEnter={pointerFine ? () => setHovered(true) : undefined}
            onMouseLeave={pointerFine ? () => setHovered(false) : undefined}
            onMouseMove={heroTrack.onMove}
            className="relative flex h-[140px] shrink-0 items-end overflow-hidden p-6 sm:h-[220px] sm:p-8 lg:h-auto lg:min-h-[340px] lg:w-[40%]"
            style={{
              background: `radial-gradient(120% 120% at ${
                coverRight ? "80%" : "20%"
              } 20%, ${accent}${hovered ? "40" : "24"} 0%, ${accent}0f 45%, #15171C 100%)`,
              transition: "background 400ms ease",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                background: `linear-gradient(160deg, ${accent}1a 0%, transparent 60%)`,
              }}
            />
            {pointerFine && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ background: spotlightBackground, opacity: hovered ? 1 : 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            )}
            {!reduceMotion && <HeroCornerBrackets accent={accent} />}
            <div ref={fitTitle.containerRef} className="relative z-10 w-full overflow-hidden">
              <h3
                ref={fitTitle.textRef}
                className="inline-block whitespace-nowrap font-bold leading-[0.95] text-[#F5F5F3]"
                style={{
                  fontSize: "clamp(1.75rem, 3.6vw, 3.25rem)",
                  letterSpacing: "-0.02em",
                  transform: `scale(${fitTitle.scale})`,
                  transformOrigin: "left bottom",
                }}
              >
                {shortName}
              </h3>
            </div>
            {pointerFine && (
              <CursorPreview
                containerRef={heroRef}
                active={hovered}
                label={shortName}
                accent={accent}
                reduceMotion={reduceMotion}
              />
            )}
          </motion.div>

          {/* Content */}
          <div className="flex-1 p-6 sm:p-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8A8D94]">
              {project.timeframe.label}
            </p>

            {tagline && (
              <p className="mt-3 text-lg font-semibold tracking-tight text-[#F5F5F3] sm:text-xl">
                {tagline}
              </p>
            )}

            <p className="mt-3 max-w-[60ch] text-[15px] font-light leading-[1.7] text-[#8A8D94]">
              {OUTCOME_COPY[projectKey]}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <motion.a
                ref={magnetic.ref}
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.96 }}
                className="group/cta inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-[#0B0C10] transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF6B4A]"
                style={{ ...magnetic.style, background: accent }}
              >
                <span>View live demo</span>
                <span className="inline-block transition-transform duration-200 group-hover/cta:translate-x-0.5">
                  →
                </span>
              </motion.a>
              {project.codeLinks.map((c) => (
                <a
                  key={c.url}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link relative text-sm text-[#8A8D94] transition-colors hover:text-[#F5F5F3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF6B4A]"
                >
                  <span className="relative">
                    {c.label}
                    <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-200 ease-out group-hover/link:scale-x-100" />
                  </span>{" "}
                  <span className="inline-block transition-transform duration-200 group-hover/link:translate-x-0.5">
                    →
                  </span>
                </a>
              ))}
            </div>

            <CaseStudyAccordion project={project} projectKey={projectKey} />
          </div>
        </div>
      </article>
    </div>
  );
}

// Four L-shaped corner brackets that frame the hero on load, then retreat
// as the panel settles — a viewfinder/engineered-edge accent instead of a
// generic rounded-rectangle scale-up. Purely decorative; skipped entirely
// under reduced motion rather than given a static fallback.
function HeroCornerBrackets({ accent }: { accent: string }) {
  const corners: Array<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    rotate: number;
  }> = [
    { top: 14, left: 14, rotate: 0 },
    { top: 14, right: 14, rotate: 90 },
    { bottom: 14, right: 14, rotate: 180 },
    { bottom: 14, left: 14, rotate: 270 },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <motion.svg
          key={i}
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          className="pointer-events-none absolute z-10"
          style={{
            top: c.top,
            bottom: c.bottom,
            left: c.left,
            right: c.right,
            rotate: c.rotate,
          }}
          initial={{ opacity: 1, scale: 1.3 }}
          whileInView={{ opacity: 0, scale: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
        >
          <path d="M1 9V1H9" stroke={accent} strokeWidth="1.5" />
        </motion.svg>
      ))}
    </>
  );
}

// --- Root -------------------------------------------------------------------

export function GitGraphOverview() {
  const { reduceMotion } = useMotionSafe();
  const pointerFine = usePointerFine();

  return (
    <div
      className="font-sans mx-auto flex max-w-6xl flex-col gap-14 px-4 py-10 sm:px-6 sm:py-14"
      style={{ fontFamily: SANS }}
    >
      {/* Case-study wall */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.25, ease: "easeOut" }}
        className="flex flex-col gap-10 sm:gap-14"
      >
        {PROJECT_ORDER.map((key, i) => (
          <CaseStudyPanel
            key={key}
            project={projects[key]}
            projectKey={key}
            index={i}
            pointerFine={pointerFine}
          />
        ))}
      </motion.div>
    </div>
  );
}
