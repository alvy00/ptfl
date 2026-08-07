/* eslint-disable prettier/prettier */
/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { GitGraph } from "@/components/portfolio/graph/GitGraph";
import { GitGraphOverview } from "@/components/portfolio/graph/GitGraphOverview";
import { PersistentCTA } from "@/components/portfolio/PersistentCTA";
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
import { useState, useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";

type IndexSearch = { view?: "overview" };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    view: search.view === "overview" ? "overview" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Alvy — Dev Portfolio" },
      {
        name: "description",
        content:
          "Chemical Engineering student at RUET and self-taught full-stack developer. Career visualized as a Git commit graph.",
      },
    ],
  }),
  component: Index,
});

const VIEWS = ["graph", "overview"] as const;
type ViewName = (typeof VIEWS)[number];

export function Index() {
  const [isLoading, setIsLoading] = useState(true);

  // "graph" has no query param — bare "/" and "/?view=graph" are the same URL.
  const { view: viewParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  const view: ViewName = viewParam === "overview" ? "overview" : "graph";

  const switchTokenRef = useRef(0);
  const reduceMotion = useReducedMotion() ?? false;

  const graphSectionRef = useRef<HTMLDivElement>(null);
  const scrollSettleCleanupRef = useRef<(() => void) | null>(null);

  const SCROLL_FOCUS_OFFSET = 24; // breathing room under the sticky search bar
  const SCROLL_SETTLE_DEBOUNCE = 120; // ms of stillness before we call a smooth-scroll "arrived"
  const SCROLL_SETTLE_MAX_WAIT = 900; // hard ceiling so the swap can never hang

  const focusGraphSection = (onSettled: () => void, token: number) => {
    const el = graphSectionRef.current;
    if (!el) {
      onSettled();
      return;
    }

    const targetY = Math.max(
      0,
      window.scrollY +
        el.getBoundingClientRect().top -
        searchBarHeightRef.current -
        SCROLL_FOCUS_OFFSET,
    );

    // Skip the scroll if the section is already *reasonably* in view —
    // previously this only skipped for a near-exact pixel match (<4px),
    // which meant toggling while comfortably mid-scroll on the section
    // still yanked the page a little every time. Tolerance scales with
    // viewport height (15%) instead of a fixed px value, so it's
    // consistent across phone/tablet/desktop rather than generous on a
    // big monitor and stingy on a small one.
    const skipTolerance = window.innerHeight * 0.15;
    if (Math.abs(targetY - window.scrollY) < skipTolerance) {
      onSettled();
      return;
    }

    scrollSettleCleanupRef.current?.();

    let settleTimer: number | undefined;
    let ceilingTimer: number | undefined;
    const finish = () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(ceilingTimer);
      window.removeEventListener("scroll", onScroll);
      scrollSettleCleanupRef.current = null;
      if (switchTokenRef.current === token) onSettled();
    };
    const onScroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(finish, SCROLL_SETTLE_DEBOUNCE);
    };
    ceilingTimer = window.setTimeout(finish, SCROLL_SETTLE_MAX_WAIT);
    window.addEventListener("scroll", onScroll, { passive: true });
    scrollSettleCleanupRef.current = finish;

    searchHideY.set(0);
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const switchView = (next: ViewName) => {
    if (next === view) return;

    const token = ++switchTokenRef.current;
    scrollSettleCleanupRef.current?.();

    const applySwap = () => {
      if (switchTokenRef.current !== token) return;
      navigate({
        search: (prev) => ({ ...prev, view: next === "graph" ? undefined : next }),
        replace: true,
        // TanStack Router resets scroll to (0,0) on every navigation by
        // default; this is a same-page param swap, not a real navigation
        // the scroll position should reset for.
        resetScroll: false,
      });
    };

    if (reduceMotion) {
      applySwap();
      return;
    }

    focusGraphSection(applySwap, token);
  };

  useEffect(() => () => scrollSettleCleanupRef.current?.(), []);

  // Roving-tabindex keyboard nav for the tablist (WAI-ARIA APG "automatic
  // activation" tabs pattern) — arrow keys move focus AND switch the
  // view, Home/End jump to the ends. Without this the roles/aria-selected
  // were announcing a tab interface to assistive tech that didn't
  // actually behave like one.
  const tabRefs = useRef<Record<ViewName, HTMLButtonElement | null>>({
    graph: null,
    overview: null,
  });
  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: ViewName) => {
    const idx = VIEWS.indexOf(current);
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % VIEWS.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + VIEWS.length) % VIEWS.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = VIEWS.length - 1;
    if (nextIdx === null) return;
    e.preventDefault();
    const nextView = VIEWS[nextIdx];
    switchView(nextView);
    tabRefs.current[nextView]?.focus();
  };

  // Single shared spring — drives the toggle pill highlight, the pane
  // slide, AND the height-lock (see heightSpring below). Previously two
  // separately-tuned springs (380/30 for the pill, 400/32 for the pane)
  // that happened to feel similar; unifying means the toggle and the
  // content it controls can never quietly drift out of sync with each
  // other from a future tweak to just one of them.
  const TOGGLE_SPRING = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 400, damping: 32, mass: 0.8 };

  // Both panes stay mounted for the page's whole lifetime — GitGraph is
  // too expensive to remount on every toggle (its own useScroll-driven
  // springs, a particle canvas, event listeners all torn down and
  // rebuilt from scratch each time), and mounting/unmounting via
  // AnimatePresence also forced the exit and enter animations to run
  // sequentially (mode="wait") rather than concurrently, which is what
  // actually reads as a single continuous "morph" instead of two
  // separate hits. Visibility is driven entirely by `animate`, never by
  // mount state. Trade-off: GitGraph's internal effects keep running
  // while its pane is hidden — acceptable here since none of them are
  // expensive per-frame, just expensive to *set up*.
  const SLIDE_DISTANCE = 30;
  const paneAnimateFor = (pane: ViewName) => {
    const isActive = view === pane;
    const direction = pane === "graph" ? 1 : -1; // graph settles from the right, overview from the left
    return isActive
      ? { opacity: 1, x: 0, filter: "blur(0px)", pointerEvents: "auto" as const }
      : {
          opacity: 0,
          x: SLIDE_DISTANCE * direction,
          filter: "blur(4px)",
          pointerEvents: "none" as const,
        };
  };

  // 1. Loader Sequence
  // Was a flat 1500ms regardless of whether anything was actually ready
  // — pure perceived-latency tax with no technical backing, since nothing
  // here is being fetched. Now resolves as soon as the document/fonts are
  // actually ready, with a short floor (400ms) so the loader doesn't
  // flash for a single frame on a fast load, and a ceiling (2500ms) as a
  // safety net in case font-loading hangs or `document.fonts` is
  // unavailable in some environment.
  useEffect(() => {
    window.scrollTo(0, 0);
    let resolved = false;
    const floor = new Promise<void>((resolve) => setTimeout(resolve, 400));
    const ready = (
      typeof document !== "undefined" && "fonts" in document
        ? document.fonts.ready
        : Promise.resolve()
    ).catch(() => undefined);

    Promise.all([floor, ready]).then(() => {
      if (!resolved) {
        resolved = true;
        setIsLoading(false);
      }
    });

    const ceiling = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setIsLoading(false);
      }
    }, 2500);

    return () => window.clearTimeout(ceiling);
  }, []);

  // 2. Hero Scrubbed Minimization (Global Scroll)
  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.8]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], ["0%", "-5%"]);

  // 3. Sticky search bar: hides 70% of its own height on scroll-down,
  // fully reappears on scroll-up.
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const [searchContentEl, setSearchContentEl] = useState<HTMLDivElement | null>(null);
  const [isSearchStuck, setIsSearchStuck] = useState(false);
  const isSearchStuckRef = useRef(false);
  const searchBarHeightRef = useRef(0);
  const searchHideY = useMotionValue(0);
  const searchHideYSpring = useSpring(searchHideY, { stiffness: 320, damping: 32, mass: 0.6 });
  const searchHideYDisplay = reduceMotion ? searchHideY : searchHideYSpring;

  useEffect(() => {
    if (!sentinelEl) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const stuck = !entry.isIntersecting;
        isSearchStuckRef.current = stuck;
        setIsSearchStuck(stuck);
        if (!stuck) searchHideY.set(0);
      },
      { threshold: 0 },
    );
    io.observe(sentinelEl);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelEl]);

  useLayoutEffect(() => {
    if (searchContentEl)
      searchBarHeightRef.current = searchContentEl.getBoundingClientRect().height;
  }, [searchContentEl]);

  useEffect(() => {
    if (!searchContentEl) return;
    const ro = new ResizeObserver(([entry]) => {
      searchBarHeightRef.current = entry.contentRect.height;
    });
    ro.observe(searchContentEl);
    return () => ro.disconnect();
  }, [searchContentEl]);

  const lastScrollYRef = useRef(0);
  const SCROLL_DELTA_THRESHOLD = 6; // ignores sub-pixel scroll jitter

  useMotionValueEvent(scrollY, "change", (latest) => {
    const delta = latest - lastScrollYRef.current;
    lastScrollYRef.current = latest;

    if (!isSearchStuckRef.current) {
      searchHideY.set(0);
      return;
    }
    if (delta > SCROLL_DELTA_THRESHOLD) {
      searchHideY.set(-searchBarHeightRef.current * 0.85);
    } else if (delta < -SCROLL_DELTA_THRESHOLD) {
      searchHideY.set(0);
    }
  });

  // 4. Per-pane height measurement — both panes are permanently mounted
  // and absolutely positioned (top/left/right only, no `bottom`, so each
  // keeps its own intrinsic content height rather than stretching to
  // fill the wrapper). The wrapper's own height is driven by a spring
  // MotionValue using the SAME TOGGLE_SPRING as the pane slide, rather
  // than a separately-timed CSS transition — previously the box resized
  // on a fixed 0.45s tween while the content resized on a spring with no
  // fixed duration, so on a slow-settling spring the box could visibly
  // stop moving while the content was still animating.
  const [graphPaneEl, setGraphPaneEl] = useState<HTMLDivElement | null>(null);
  const [overviewPaneEl, setOverviewPaneEl] = useState<HTMLDivElement | null>(null);
  const [graphPaneHeight, setGraphPaneHeight] = useState<number | undefined>(undefined);
  const [overviewPaneHeight, setOverviewPaneHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (graphPaneEl) {
      const h = graphPaneEl.getBoundingClientRect().height;
      if (h > 0) setGraphPaneHeight(h);
    }
  }, [graphPaneEl]);
  useLayoutEffect(() => {
    if (overviewPaneEl) {
      const h = overviewPaneEl.getBoundingClientRect().height;
      if (h > 0) setOverviewPaneHeight(h);
    }
  }, [overviewPaneEl]);

  useEffect(() => {
    if (!graphPaneEl) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) setGraphPaneHeight(entry.contentRect.height);
    });
    ro.observe(graphPaneEl);
    return () => ro.disconnect();
  }, [graphPaneEl]);
  useEffect(() => {
    if (!overviewPaneEl) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) setOverviewPaneHeight(entry.contentRect.height);
    });
    ro.observe(overviewPaneEl);
    return () => ro.disconnect();
  }, [overviewPaneEl]);

  const activePaneHeight = view === "graph" ? graphPaneHeight : overviewPaneHeight;

  const heightMV = useMotionValue(0);
  const heightSpring = useSpring(heightMV, TOGGLE_SPRING);
  const hasSetInitialHeightRef = useRef(false);
  useEffect(() => {
    if (activePaneHeight == null) return;
    if (!hasSetInitialHeightRef.current) {
      // First real measurement — jump straight to it instead of
      // springing up from 0, since there's nothing to visually
      // transition from yet.
      heightMV.jump(activePaneHeight);
      hasSetInitialHeightRef.current = true;
    } else {
      heightMV.set(activePaneHeight);
    }
  }, [activePaneHeight]);

  return (
    <main className="min-h-screen font-mono text-sm sm:text-base selection:bg-[#34d39922] selection:text-[#34d399] bg-[#0e0f13] text-[#e5e7eb] overflow-x-clip overflow-y-visible relative">
      <PersistentCTA />

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

            <div
              id="page-content"
              className="mx-auto max-w-4xl w-full px-4 sm:px-8 pb-20 relative z-20 bg-[#0e0f13] pt-12"
            >
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
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
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
                    </div>

                    <div
                      className="relative flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 font-mono text-[11px] sm:text-[12px]"
                      role="tablist"
                      aria-label="View mode"
                    >
                      {VIEWS.map((mode) => (
                        <motion.button
                          key={mode}
                          ref={(el) => {
                            tabRefs.current[mode] = el;
                          }}
                          type="button"
                          role="tab"
                          id={`view-tab-${mode}`}
                          aria-selected={view === mode}
                          aria-controls={`view-panel-${mode}`}
                          tabIndex={view === mode ? 0 : -1}
                          onClick={() => switchView(mode)}
                          onKeyDown={(e) => handleTabKeyDown(e, mode)}
                          whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                          className="relative cursor-pointer rounded-full px-3 py-1.5 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34d399] focus:outline-none"
                          style={{ color: view === mode ? "#34d399" : "#8b93a1" }}
                        >
                          {view === mode && (
                            <motion.span
                              layoutId="view-toggle-highlight"
                              className="absolute inset-0 -z-10 rounded-full"
                              style={{ background: "#34d39922" }}
                              transition={TOGGLE_SPRING}
                            />
                          )}
                          <span className="relative inline-flex items-center gap-1.5">
                            {/* Secondary cue beyond color — a small dot
                                that only appears on the active tab, so
                                state doesn't rely purely on the text/pill
                                color shift. */}
                            <span
                              aria-hidden="true"
                              className="h-1 w-1 rounded-full transition-opacity duration-150"
                              style={{ background: "#34d399", opacity: view === mode ? 1 : 0 }}
                            />
                            {mode === "graph" ? "Git Log View" : "Standard Overview"}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              <div ref={setSentinelEl} aria-hidden="true" className="h-px" />

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="sticky top-0 z-30"
              >
                <motion.div
                  ref={setSearchContentEl}
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

              {/* Both panes below are permanently mounted — see the
                  comment above paneAnimateFor for why. `relative` gives
                  them their positioning context; `style.height` tracks
                  activePaneHeight via heightSpring, sharing TOGGLE_SPRING
                  with the pane slide so the box and its content always
                  move in lockstep. */}
              <motion.div
                ref={graphSectionRef}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative overflow-hidden bg-[#0e0f13]"
                style={{ height: activePaneHeight == null ? "auto" : heightSpring }}
              >
                <motion.div
                  ref={setGraphPaneEl}
                  role="tabpanel"
                  id="view-panel-graph"
                  aria-labelledby="view-tab-graph"
                  aria-hidden={view !== "graph"}
                  initial={false}
                  animate={paneAnimateFor("graph")}
                  transition={TOGGLE_SPRING}
                  className="absolute top-0 left-0 right-0 overflow-x-auto pb-4 scrollbar-thin"
                  style={{ zIndex: view === "graph" ? 2 : 1 }}
                >
                  <div className="min-w-[500px] sm:min-w-0">
                    <GitGraph />
                  </div>
                </motion.div>

                <motion.div
                  ref={setOverviewPaneEl}
                  role="tabpanel"
                  id="view-panel-overview"
                  aria-labelledby="view-tab-overview"
                  aria-hidden={view !== "overview"}
                  initial={false}
                  animate={paneAnimateFor("overview")}
                  transition={TOGGLE_SPRING}
                  className="absolute top-0 left-0 right-0"
                  style={{ zIndex: view === "overview" ? 2 : 1 }}
                >
                  <GitGraphOverview />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="mt-16 bg-[#0e0f13]"
              >
                <StatsPanel />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                className="mt-12 bg-[#0e0f13]"
              >
                <ContributingFooter />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
