/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { GitGraph } from "@/components/portfolio/GitGraph";
import { GlobalSearch } from "@/components/portfolio/GlobalSearch";
import { Hero } from "@/components/portfolio/Hero";
import { StatsPanel } from "@/components/portfolio/StatsPanel";
import { ContributingFooter } from "@/components/portfolio/ContributingFooter";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";
import { useState, useEffect, useLayoutEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alvy — Developer Portfolio" },
      {
        name: "description",
        content:
          "Chemical Engineering student at RUET and self-taught full-stack developer. Career visualized as a Git commit graph.",
      },
    ],
  }),
  component: Index,
});

export function Index() {
  const [isLoading, setIsLoading] = useState(true);

  // 1. Loader Sequence
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // 2. Hero Scrubbed Minimization (Global Scroll)
  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.8]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], ["0%", "-5%"]);

  // 3. Sticky search bar: hides 70% of its own height on scroll-down,
  // fully reappears on scroll-up — the standard "app bar" pattern (Gmail,
  // most mobile browser chrome, Material app bars) rather than either a
  // bar that's permanently pinned taking up space, or one that fully
  // vanishes and has to be scrolled back to.
  const reduceMotion = useReducedMotion() ?? false;
  const searchSentinelRef = useRef<HTMLDivElement>(null);
  const searchContentRef = useRef<HTMLDivElement>(null);
  const [isSearchStuck, setIsSearchStuck] = useState(false);
  const isSearchStuckRef = useRef(false);
  const searchBarHeightRef = useRef(0);
  const searchHideY = useMotionValue(0);
  // Config landed on after review: stiff/damped enough to feel like it
  // snaps into place rather than floats (matching the "magnetic" feel
  // GitGraphNode's hover spring already established elsewhere in this
  // codebase), not a slow ease that would lag behind a fast scroll.
  const searchHideYSpring = useSpring(searchHideY, { stiffness: 320, damping: 32, mass: 0.6 });
  // Under prefers-reduced-motion, the bar still hides/shows on scroll —
  // only the *animation* of that transition is what's being reduced, not
  // the functionality itself. Feeding the raw (unsprung) motion value
  // straight to the DOM makes the position change land in a single frame
  // instead of easing over ~200ms, while the spring stays available for
  // everyone else.
  const searchHideYDisplay = reduceMotion ? searchHideY : searchHideYSpring;

  // Stuck-detection via a 1px sentinel placed immediately before the
  // sticky bar, observed with IntersectionObserver — the standard
  // technique for knowing when a `position: sticky` element has actually
  // engaged, since sticky offers no native "I'm stuck now" event. Robust
  // to layout shifts above it (unlike computing a fixed pixel threshold
  // from scrollY once and hoping nothing above ever changes height).
  // Depends on isLoading, not []: the sentinel/search-bar DOM only exists
  // once the loading screen (isLoading) has cleared — until then this ref
  // is null. With an empty dep array this effect only ever ran once, at
  // the very first mount, while still loading — it hit `if (!el) return`
  // and quit for good, and since [] never re-fires, the observer was
  // never actually attached for the rest of the session. Depending on
  // isLoading gives it a second, correctly-timed attempt right after the
  // real content mounts.
  useEffect(() => {
    const el = searchSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const stuck = !entry.isIntersecting;
        isSearchStuckRef.current = stuck;
        setIsSearchStuck(stuck);
        // Snap fully visible the instant it un-sticks (scrolled back up
        // past its own resting position) rather than waiting for the next
        // scroll-delta tick to notice — otherwise it could sit mid-hide
        // for a frame right as it re-enters normal flow.
        if (!stuck) searchHideY.set(0);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Measures the bar's own rendered height (GlobalSearch's box, margin
  // collapsed out of this wrapper — see the comment on the sticky
  // wrapper below) so "70%" is 70% of the actual visible bar, not a
  // guessed pixel value that drifts the moment copy or breakpoint changes
  // the bar's real height.
  // ResizeObserver's first callback is async — if a scroll-down happens
  // before it fires, searchBarHeightRef.current is still 0 and the "hide"
  // amount computes to -0 * 0.7, i.e. no visible movement at all even
  // though the stuck/delta logic is running correctly. Grabbing the real
  // height synchronously on mount (before paint) closes that gap; the
  // ResizeObserver below still keeps it accurate afterward (font load,
  // resize, breakpoint change, etc).
  // Same isLoading-dependency fix as the IntersectionObserver above —
  // searchContentRef is null until the loading screen clears, so an
  // empty dep array here would permanently no-op too.
  useLayoutEffect(() => {
    const el = searchContentRef.current;
    if (el) searchBarHeightRef.current = el.getBoundingClientRect().height;
  }, [isLoading]);

  useEffect(() => {
    const el = searchContentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      searchBarHeightRef.current = entry.contentRect.height;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoading]);

  const lastScrollYRef = useRef(0);
  // Minimum scroll movement before reacting at all — without this,
  // sub-pixel scroll jitter (trackpads, some Android browsers) flickers
  // the bar in and out on what should read as a stationary page.
  const SCROLL_DELTA_THRESHOLD = 6;

  useMotionValueEvent(scrollY, "change", (latest) => {
    const delta = latest - lastScrollYRef.current;
    lastScrollYRef.current = latest;

    if (!isSearchStuckRef.current) {
      searchHideY.set(0);
      return;
    }
    if (delta > SCROLL_DELTA_THRESHOLD) {
      searchHideY.set(-searchBarHeightRef.current * 0.7);
    } else if (delta < -SCROLL_DELTA_THRESHOLD) {
      searchHideY.set(0);
    }
  });

  return (
    <main className="min-h-screen font-mono text-sm sm:text-base selection:bg-[#34d39922] selection:text-[#34d399] bg-[#0e0f13] text-[#e5e7eb] overflow-x-clip overflow-y-visible relative">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0e0f13]"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              className="h-10 w-10 rounded-full border-2 border-[#34d399] border-t-transparent shadow-[0_0_15px_rgba(52,211,153,0.3)] mb-6"
            />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col"
          >
            {/* HERO SECTION: Centered on screen, scales/fades on scroll */}
            <div className="h-screen w-full flex items-center justify-center px-4 sm:px-8 sticky top-0 z-10 bg-[#0e0f13]">
              <motion.div
                style={{
                  scale: heroScale,
                  opacity: heroOpacity,
                  y: heroY,
                  willChange: "transform, opacity",
                }}
                className="w-full max-w-4xl"
              >
                <Hero />
              </motion.div>
            </div>

            {/* REST OF THE PAGE CONTENT: Flows naturally right after the hero */}
            <div
              id="page-content"
              className="mx-auto max-w-4xl w-full px-4 sm:px-8 pb-20 relative z-20 bg-[#0e0f13] pt-12"
            >
              {/* "The Journey" Title Arrival */}
              <div className="pt-4 pb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 1.4, y: 30, x: -20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ transformOrigin: "top left", willChange: "transform, opacity" }}
                  className="w-max"
                >
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    className="flex items-center gap-2 font-mono text-xs sm:text-sm text-[#34d399] mb-2 tracking-widest uppercase"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" />
                    2023 — present
                  </motion.p>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    The Journey
                  </h2>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "2.5rem" }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
                    className="h-[2px] bg-[#34d399] mt-3 shadow-[0_0_6px_#34d399]"
                  />
                </motion.div>
              </div>

              {/* 1px sentinel for stuck-detection — see the
                  IntersectionObserver effect above. Placed immediately
                  before the sticky bar so it scrolls out of view at
                  exactly the moment the bar itself engages `sticky`. */}
              <div ref={searchSentinelRef} aria-hidden="true" className="h-px" />

              {/* Search bar — sticky, so it stays reachable while scrolling
                  the (fairly long, 27-row) commit graph below instead of
                  requiring a scroll back to the top every time. Deliberately
                  pulled out of the graph's reveal wrapper below rather than
                  just adding `sticky` in place: that wrapper's
                  `overflow-hidden` (there only to clip its own one-time
                  y:60 -> y:0 entrance so the animation doesn't flash a
                  scrollbar) would also neutralize `position: sticky` on
                  anything inside it — an ancestor with overflow other than
                  visible becomes the sticky element's scroll-container
                  reference, and that wrapper never scrolls internally, so
                  a sticky child inside it would never actually engage.
                  #page-content itself (this wrapper's parent) has no
                  overflow or transform of its own, so it's a clean sticky
                  context.

                  Two nested motion.divs, deliberately not one: the OUTER
                  one owns the one-time entrance reveal (opacity/y via
                  initial->whileInView) and the `sticky` positioning
                  itself. The INNER one owns the continuous scroll-linked
                  hide/show transform, driven by an external spring
                  MotionValue on `style.y`. Framer Motion doesn't like a
                  single element's `y` being driven by both an
                  initial/animate target AND an externally-set style
                  MotionValue at once — they fight over the same transform
                  property. Splitting them across two elements sidesteps
                  that entirely rather than trying to merge two motion
                  systems into one animate call. */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="sticky top-0 z-30"
              >
                <motion.div
                  ref={searchContentRef}
                  style={{ y: searchHideYDisplay }}
                  className="bg-[#0e0f13]/95 backdrop-blur-md"
                  animate={{
                    boxShadow: isSearchStuck
                      ? "0 8px 24px -12px rgba(0,0,0,0.5)"
                      : "0 0 0 rgba(0,0,0,0)",
                  }}
                >
                  <GlobalSearch />
                </motion.div>
              </motion.div>

              {/* GitGraph Reveal */}
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="overflow-hidden bg-[#0e0f13]"
              >
                <div className="overflow-x-auto pb-4 scrollbar-thin">
                  <div className="min-w-[500px] sm:min-w-0">
                    <GitGraph />
                  </div>
                </div>
              </motion.div>

              {/* Synchronized Footer Arrival */}
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                className="mt-20 space-y-12 bg-[#0e0f13]"
              >
                <StatsPanel />
                <ContributingFooter />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
