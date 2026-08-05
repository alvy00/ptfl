/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { GitGraph } from "@/components/portfolio/GitGraph";
import { GitGraphOverview } from "@/components/portfolio/GitGraphOverview";
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
import { useState, useEffect, useLayoutEffect, useRef } from "react";

// Search-param shape for this route. Only `view` is ever set on the URL,
// and only when it's "overview" — "graph" is the default/clean state, so
// a bare `/` and `/?view=graph` behave identically and we never write
// the redundant param. Kept as a loose Record in, narrowed shape out —
// TanStack Router calls this on every navigation (including ones it
// didn't originate, like a hand-typed URL or a stale bookmark), so it
// has to tolerate garbage input rather than assume it's always well-formed.
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

export function Index() {
  const [isLoading, setIsLoading] = useState(true);

  // Which of the two equivalent views is showing — "graph" is the
  // original git-log visualization, "overview" is the plain-language,
  // recruiter-facing summary (GitGraphOverview).
  //
  // This is derived from the URL's search params (see validateSearch
  // above) rather than kept in local useState. Two reasons: (1) a
  // recruiter who switches to "Standard Overview" can copy the address
  // bar URL and send it straight to a hiring manager, who lands directly
  // in that view instead of the graph; (2) if the page is ever
  // navigated away from (a project deep-link, say) and the user hits
  // the browser back button, whichever view was active is restored
  // instead of always resetting to the graph. "graph" has no query
  // param at all, so the common case — arriving fresh — keeps a bare,
  // shareable URL.
  const { view: viewParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  const view: "graph" | "overview" = viewParam === "overview" ? "overview" : "graph";

  // Drives the light-sweep overlay (see the AnimatePresence block right
  // above the graph/overview swap below) — a separate, short-lived flag
  // rather than deriving "is switching" from `view` changing, since the
  // sweep needs to play for a fixed window around the swap and then turn
  // itself off, not track view's value directly.
  const [isSwitchingView, setIsSwitchingView] = useState(false);
  const switchViewTimeoutRef = useRef<number | undefined>(undefined);
  // Monotonic token for the pending "turn the sweep off" timeout.
  // window.clearTimeout below already cancels the *previous* timer
  // outright on every call, so in practice only the most recent timer's
  // callback ever fires — this token is defense-in-depth for that same
  // guarantee, so rapid back-and-forth toggling (3+ clicks in quick
  // succession) can't leave isSwitchingView stuck true because a stale
  // timer's callback ran after a newer one was scheduled.
  const switchTokenRef = useRef(0);

  const reduceMotion = useReducedMotion() ?? false;

  // Ref to the whole graph/overview pane section (attached further down,
  // on the "GitGraph Reveal" motion.div). Used to scroll that section
  // into a consistent, focused position *before* the crossfade plays —
  // so the swap always happens somewhere the visitor can actually see
  // it, rather than possibly off-screen if they toggled while scrolled
  // down at the footer, or still up at the hero.
  const graphSectionRef = useRef<HTMLDivElement>(null);
  // Holds a "finish early" callback for whichever scroll-settle listener
  // is currently in flight, so a second click arriving before the first
  // scroll has finished can tear down the stale listener instead of
  // leaving two competing ones attached at once.
  const scrollSettleCleanupRef = useRef<(() => void) | null>(null);

  // Breathing room left between the sticky search bar and the section
  // being scrolled to — purely cosmetic, so the section's heading isn't
  // touching the bar.
  const SCROLL_FOCUS_OFFSET = 24;
  // How long the page has to sit still (no scroll events) before we
  // consider a programmatic smooth-scroll "arrived". A fixed guess at
  // scroll *duration* would be wrong for most distances — this instead
  // waits for movement to actually stop.
  const SCROLL_SETTLE_DEBOUNCE = 120;
  // Hard ceiling in case scroll never cleanly settles (e.g. the user
  // starts manually scrolling mid-animation, or a scroll-snap conflict
  // keeps firing events) — so the swap can never hang indefinitely.
  const SCROLL_SETTLE_MAX_WAIT = 900;

  // Scrolls graphSectionRef's top edge to just under the sticky search
  // bar and calls `onSettled` once that scroll has actually finished —
  // detected via a debounced scroll listener rather than a guessed fixed
  // delay, since smooth-scroll duration varies with how far there is to
  // travel. Resolves immediately (no scroll, no wait) if the section is
  // already effectively in that position, since a `scrollTo` to
  // (near-)the current offset fires no scroll events to debounce against
  // and would otherwise hang until the ceiling.
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

    if (Math.abs(targetY - window.scrollY) < 4) {
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

    // Make sure the sticky bar is fully visible (not mid-hide from
    // whatever the user was doing right before clicking the toggle) so
    // the SCROLL_FOCUS_OFFSET math above lines up with what's actually
    // on screen once we arrive.
    searchHideY.set(0);
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  // Single entry point for the toggle buttons. Two-phase now rather than
  // an immediate swap: first the page scrolls to bring the graph section
  // into focus (see focusGraphSection above), and only once that scroll
  // has settled does the actual view swap happen — URL update, then the
  // sweep-overlay window timed to roughly cover the crossfade's own
  // duration (see VIEW_TRANSITION below). No-ops if the target is
  // already active (clicking the already-selected tab shouldn't replay
  // any of this).
  const switchView = (next: "graph" | "overview") => {
    if (next === view) return;

    const token = ++switchTokenRef.current;
    window.clearTimeout(switchViewTimeoutRef.current);
    scrollSettleCleanupRef.current?.();

    // `replace: true` on the eventual navigate() — toggling the view
    // swaps a query param on the same page, not a real navigation the
    // user would expect "back" to step through one click at a time.
    // Replacing keeps back/forward meaningful for actual navigation
    // while still persisting the current view in the URL for reloads,
    // copy-paste, and navigating away and back.
    //
    // Gated on `token` so that if a second click arrives while this
    // scroll is still in flight, the *first* click's swap never fires —
    // only the most recent click's does.
    const applySwap = () => {
      if (switchTokenRef.current !== token) return;
      navigate({
        search: (prev) => ({ ...prev, view: next === "graph" ? undefined : next }),
        replace: true,
        // TanStack Router resets scroll to (0, 0) on every navigation by
        // default — same as a real page load — which was silently
        // undoing the focus-scroll above the instant this fires,
        // snapping the page back up to the Hero section right as the
        // crossfade played. This is a same-page param swap, not a real
        // navigation the scroll position should reset for.
        resetScroll: false,
      });
      if (reduceMotion) return;
      setIsSwitchingView(true);
      switchViewTimeoutRef.current = window.setTimeout(() => {
        if (switchTokenRef.current === token) setIsSwitchingView(false);
      }, 700);
    };

    if (reduceMotion) {
      applySwap();
      return;
    }

    focusGraphSection(applySwap, token);
  };

  useEffect(() => () => window.clearTimeout(switchViewTimeoutRef.current), []);
  useEffect(() => () => scrollSettleCleanupRef.current?.(), []);

  // Shared transition for both the graph and overview panes' enter/exit —
  // kept as one named constant so the two stay in lockstep (a mismatched
  // pair would make the crossfade feel like two separate animations
  // instead of one continuous swap). The curve is a soft ease-out-back
  // approximation, not a linear/easeOut — a little overshoot-then-settle
  // reads as more "cinematic weight" than a flat ease, without being
  // bouncy enough to feel like a toy UI.
  const VIEW_TRANSITION = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

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
  // fully reappears on scroll-up — the standard "app bar" pattern (Gmail,
  // most mobile browser chrome, Material app bars) rather than either a
  // bar that's permanently pinned taking up space, or one that fully
  // vanishes and has to be scrolled back to.
  // State (not plain useRef) specifically so it can be a *dependency* for
  // the effects below — a callback ref fires exactly when React attaches
  // the DOM node, whenever that actually happens, rather than us having
  // to guess which upstream timing signal (isLoading, an animation
  // duration, etc.) coincides with it. This mount is gated behind
  // AnimatePresence's loader exit animation, one layer beyond isLoading
  // itself, which is exactly the kind of shifting timing this sidesteps
  // for good instead of chasing it dependency by dependency.
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const [searchContentEl, setSearchContentEl] = useState<HTMLDivElement | null>(null);
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
  // Depends on sentinelEl (state set via a callback ref), not [] or
  // isLoading. The sentinel only exists once AnimatePresence has actually
  // finished swapping the loader out for the real content — which lands
  // a beat after isLoading itself flips (mode="wait" keeps the loader
  // mounted through its own ~0.6s exit animation first). An empty dep
  // array fired once, immediately, while the ref was still null, and
  // never got a second chance. Depending on isLoading fired too, just
  // earlier than the DOM node actually existed. The callback ref sidesteps
  // guessing the right timing signal altogether — this fires exactly when
  // React attaches the node, whatever that turns out to be.
  useEffect(() => {
    if (!sentinelEl) return;
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
    io.observe(sentinelEl);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelEl]);

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
  // Depends on searchContentEl (state set via callback ref), not a fixed
  // timing signal like isLoading — see the note on sentinelEl/
  // searchContentEl above. Fires exactly when the DOM node attaches,
  // whatever the mount timing turns out to be.
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
      searchHideY.set(-searchBarHeightRef.current * 0.85);
    } else if (delta < -SCROLL_DELTA_THRESHOLD) {
      searchHideY.set(0);
    }
  });

  // 4. Graph/Overview pane height lock — GitGraph and GitGraphOverview
  // have very different natural heights. AnimatePresence's mode="wait"
  // fully unmounts the exiting pane before mounting the entering one, so
  // without this, the wrapping box collapses to ~0 height for a beat
  // mid-swap — yanking anything below it (StatsPanel, the footer) up the
  // page, and dragging the user's own scroll position along with it if
  // they're scrolled past the fold. Instead, the box's height is pinned
  // to whichever pane is (or was last) actually rendered, and
  // CSS-transitions to the new value once the incoming pane mounts and
  // reports its real height — so the box resizes smoothly alongside the
  // crossfade instead of snapping.
  const [graphPaneEl, setGraphPaneEl] = useState<HTMLDivElement | null>(null);
  const [graphPaneHeight, setGraphPaneHeight] = useState<number | undefined>(undefined);

  // Synchronous initial read — same pattern as searchContentEl/
  // searchBarHeightRef above — so the very first render already has a
  // definite pixel height instead of "auto", closing the gap before
  // ResizeObserver's first (async) callback would otherwise fire.
  useLayoutEffect(() => {
    if (graphPaneEl) {
      const h = graphPaneEl.getBoundingClientRect().height;
      if (h > 0) setGraphPaneHeight(h);
    }
  }, [graphPaneEl]);

  useEffect(() => {
    if (!graphPaneEl) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      // Ignore 0-height readings — these happen for the single beat
      // between the outgoing pane unmounting and the incoming one
      // mounting (mode="wait"). Skipping them means the box holds its
      // last real height through that gap instead of collapsing and
      // then immediately re-growing, which is the exact jump this is
      // meant to prevent.
      if (h > 0) setGraphPaneHeight(h);
    });
    ro.observe(graphPaneEl);
    return () => ro.disconnect();
  }, [graphPaneEl]);

  return (
    <main className="min-h-screen font-mono text-sm sm:text-base selection:bg-[#34d39922] selection:text-[#34d399] bg-[#0e0f13] text-[#e5e7eb] overflow-x-clip overflow-y-visible relative">
      {/* Persistent CTA — fixed to the viewport, independent of scroll
          position AND of which view (graph/overview) is active, since the
          whole point is a recruiter should never have to hunt for it in
          either mode. Mounted once at the top level rather than inside
          either view. */}
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

                    {/* View toggle — "Git Log View" is the graph a
                        technical visitor came for; "Standard Overview" is
                        the same underlying project data (projects.ts)
                        presented as a normal recruiter-facing summary, no
                        commit syntax at all. A pill-style two-way switch
                        (not a checkbox/dropdown) so both options are
                        visible and labeled at once — a recruiter
                        shouldn't have to already know the graph exists to
                        find the plain-English version.
                        layoutId-shared active pill (same pattern used
                        for the earlier project filter pills, now reused
                        here) — the highlight slides between the two tabs
                        via Framer Motion's layout animation instead of a
                        hard color swap, so the toggle itself already
                        feels like the first frame of "something is about
                        to move," priming the bigger swap that follows. */}
                    <div
                      className="relative flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 font-mono text-[11px] sm:text-[12px]"
                      role="tablist"
                      aria-label="View mode"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={view === "graph"}
                        onClick={() => switchView("graph")}
                        className="relative cursor-pointer rounded-full px-3 py-1.5 transition-colors duration-150"
                        style={{ color: view === "graph" ? "#34d399" : "#8b93a1" }}
                      >
                        {view === "graph" && (
                          <motion.span
                            layoutId="view-toggle-highlight"
                            className="absolute inset-0 -z-10 rounded-full"
                            style={{ background: "#34d39922" }}
                            transition={
                              reduceMotion
                                ? { duration: 0.01 }
                                : { type: "spring", stiffness: 380, damping: 30 }
                            }
                          />
                        )}
                        <span className="relative">Git Log View</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={view === "overview"}
                        onClick={() => switchView("overview")}
                        className="relative cursor-pointer rounded-full px-3 py-1.5 transition-colors duration-150"
                        style={{ color: view === "overview" ? "#34d399" : "#8b93a1" }}
                      >
                        {view === "overview" && (
                          <motion.span
                            layoutId="view-toggle-highlight"
                            className="absolute inset-0 -z-10 rounded-full"
                            style={{ background: "#34d39922" }}
                            transition={
                              reduceMotion
                                ? { duration: 0.01 }
                                : { type: "spring", stiffness: 380, damping: 30 }
                            }
                          />
                        )}
                        <span className="relative">Standard Overview</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* 1px sentinel for stuck-detection — see the
                  IntersectionObserver effect above. Placed immediately
                  before the sticky bar so it scrolls out of view at
                  exactly the moment the bar itself engages `sticky`. Kept
                  outside the view-toggle branch below — the search bar
                  stays sticky/reachable in both views, not just the
                  graph. */}
              <div ref={setSentinelEl} aria-hidden="true" className="h-px" />

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

              {/* GitGraph Reveal — the entrance animation (opacity/y) runs
                  once regardless of which view is active; only the INNER
                  content swaps between GitGraph and GitGraphOverview.
                  `relative` here gives the light-sweep overlay below its
                  positioning context.

                  `style.height` is pinned to graphPaneHeight (see the
                  measurement effects above) with a property-scoped CSS
                  transition — scoped to `height` only, not `transition:
                  all` — because this same element also has its
                  opacity/y driven by framer-motion's own initial/
                  whileInView animation loop, which mutates style directly
                  on every frame rather than going through CSS
                  transitions. Scoping to `height` means the two never
                  fight over the same property: framer owns opacity/
                  transform, this owns height. Together with the pane
                  measurement, this is what stops the box from collapsing
                  to ~0 height for a beat when AnimatePresence's
                  mode="wait" fully unmounts the outgoing pane before
                  mounting the incoming one — instead it eases from the
                  old height to the new one alongside the crossfade. */}
              <motion.div
                ref={graphSectionRef}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative overflow-hidden bg-[#0e0f13]"
                style={{
                  height: graphPaneHeight ? `${graphPaneHeight}px` : "auto",
                  transition: reduceMotion
                    ? undefined
                    : "height 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {/* Light-sweep overlay — plays once per view switch,
                    timed via isSwitchingView (armed by switchView() for a
                    fixed window). A single soft-edged bar travels left to
                    right across the whole pane while the crossfade below
                    is happening, so the swap reads as one deliberate
                    "wipe" event rather than two unrelated things (a color
                    pill sliding in the toggle, a crossfade in the content)
                    happening independently. Purely decorative — z-40,
                    pointer-events-none, aria-hidden — never intercepts
                    input or announces anything to assistive tech.
                    Skipped entirely under reduced motion (isSwitchingView
                    never even gets set to true in that case — see
                    switchView above). */}
                <AnimatePresence>
                  {isSwitchingView && (
                    <motion.div
                      key="sweep"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
                    >
                      <motion.div
                        initial={{ x: "-120%" }}
                        animate={{ x: "220%" }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-y-0 w-1/3 skew-x-[-8deg]"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, rgba(52,211,153,0.16), rgba(52,211,153,0.05), transparent)",
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* The swap itself — was a plain opacity crossfade; now a
                    small multi-property move (blur clears, a slight scale
                    settle, a directional y-drift matching which "way" the
                    toggle moved) so it reads as a deliberate cut between
                    two states rather than a soft dissolve. Direction is
                    fixed (graph always drifts up-and-in / down-and-out,
                    overview the mirror) rather than tied to toggle
                    position, since the toggle can be clicked from either
                    side — a direction that flipped depending on prior
                    state would feel inconsistent rather than intentional.

                    Wrapped in a plain ref'd div (setGraphPaneEl) purely
                    for height measurement — see the ResizeObserver/
                    useLayoutEffect pair above. This div itself carries no
                    styling of its own; it exists so the outer motion.div's
                    explicit height always tracks whichever pane is
                    actually mounted inside it. */}
                <div ref={setGraphPaneEl}>
                  <AnimatePresence mode="wait">
                    {view === "graph" ? (
                      <motion.div
                        key="graph"
                        initial={{ opacity: 0, scale: 0.97, y: 16, filter: "blur(8px)" }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.97, y: -16, filter: "blur(8px)" }}
                        transition={VIEW_TRANSITION}
                        className="overflow-x-auto pb-4 scrollbar-thin"
                      >
                        <div className="min-w-[500px] sm:min-w-0">
                          <GitGraph />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="overview"
                        initial={{ opacity: 0, scale: 0.97, y: -16, filter: "blur(8px)" }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.97, y: 16, filter: "blur(8px)" }}
                        transition={VIEW_TRANSITION}
                      >
                        <GitGraphOverview />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* StatsPanel — reads as a "compilation summary" (commit
                  counts, LOC, tech parsed). Split from ContributingFooter
                  below into its own component-scoped whileInView rather
                  than the two sharing one motion.div and one entrance —
                  a single monolithic block risks a bigger layout shift on
                  mobile when it lands, and forces both pieces to animate
                  in lockstep instead of as two distinct beats. Every
                  animated property here is opacity/y (transform), which
                  Framer Motion promotes to its own GPU layer and manages
                  `will-change` for automatically only while the animation
                  is actually running — no manual will-change needed. */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="mt-16 bg-[#0e0f13]"
              >
                <StatsPanel />
              </motion.div>

              {/* ContributingFooter — the final prompt/action node
                  ("connect", "open an issue," etc.). Its own viewport
                  trigger + a small delay relative to StatsPanel's own
                  transition (not relative to StatsPanel's *trigger* —
                  each observes independently) is what gives the two an
                  actual sequential feel on a normal scroll speed, rather
                  than both firing in the same instant because a fast
                  scroll crossed both margins in one frame. */}
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
