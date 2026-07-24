/* eslint-disable prettier/prettier */
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState, useMemo, type MouseEvent } from "react";

import { CommitModal, type CommitSelection } from "./CommitModal";
import type { ProjectKey } from "@/data/portfolio/projects";
import { bugfixes, type BugfixKey } from "@/data/portfolio/bugfixes";
import {
  mainCommitContent,
  auctasyncCommitContent,
  assetverseCommitContent,
  asynclangaiCommitContent,
  careerpilotCommitContent,
  auctasyncBugfixCommitContent,
  careerpilotBugfixCommitContent,
} from "@/data/portfolio/commits";

type Commit = { hash: string; message: string };
type MainCommit = Commit & { row: number };

type BranchDef = {
  name: string;
  projectKey: ProjectKey;
  color: string;
  lane: number;
  sourceRow: number;
  mergeRow: number;
  delay: number;
  commits: (Commit & { row: number })[];
};

type BugfixDef = {
  name: string;
  bugfixKey: BugfixKey;
  color: string;
  parentLane: number;
  lane: number;
  sourceRow: number;
  mergeRow: number;
  delay: number;
  commits: (Commit & { row: number })[];
};

// ---------------------------------------------------------------------------
// Layout: fully fluid across screen sizes instead of one fixed pixel grid.
// The graph's row/lane *topology* (who forks from whom, on which row) never
// changes — only the pixel spacing scales per tier, computed in
// buildGeometry() below. This replaces the old approach of a fixed-width SVG
// that relied on the parent page forcing a horizontal scrollbar on mobile.
// ---------------------------------------------------------------------------
type Tier = "xs" | "sm" | "md" | "lg";

type Layout = {
  rowH: number;
  topPad: number;
  mainX: number;
  laneW: number;
  nodeScale: number;
};

const LAYOUTS: Record<Tier, Layout> = {
  xs: { rowH: 56, topPad: 40, mainX: 12, laneW: 17, nodeScale: 0.8 }, // <400px
  sm: { rowH: 60, topPad: 44, mainX: 16, laneW: 23, nodeScale: 0.88 }, // 400-639px
  md: { rowH: 66, topPad: 48, mainX: 20, laneW: 30, nodeScale: 0.96 }, // 640-1023px
  lg: { rowH: 68, topPad: 52, mainX: 24, laneW: 34, nodeScale: 1 }, // 1024px+
};

function getTier(width: number): Tier {
  if (width < 400) return "xs";
  if (width < 640) return "sm";
  if (width < 1024) return "md";
  return "lg";
}

/**
 * Reads the viewport tier client-side only. Starts at "lg" (the SSR-safe
 * default) so the first client render matches the server-rendered markup
 * exactly — avoiding hydration mismatches — then corrects itself in an
 * effect once `window` is available. Resize handling is rAF-throttled so
 * dragging a browser window doesn't spam re-renders.
 */
function useLayoutTier(): Tier {
  const [tier, setTier] = useState<Tier>("lg");

  useEffect(() => {
    let frame = 0;
    const measure = () => setTier(getTier(window.innerWidth));
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return tier;
}

// Fixed offsets (in the old code: +27 / -27 and +24 / -24) expressed as a
// ratio of row height instead, so they scale with the layout tier too.
const FEATURE_OFFSET_RATIO = 27 / 68;
const BUGFIX_OFFSET_RATIO = 24 / 68;

// Bugfix branches always use this color, regardless of which project they
// belong to — color now encodes "what kind of branch is this" (project vs.
// fix), not project identity, so a fix is recognizable at a glance no
// matter which project it's on.
const BUGFIX_COLOR = "#fb7185";

const TOTAL_LANES = 7;
const TOTAL_ROWS = 26;

// Row plan (26 rows total, 0-25), verified for full coverage with no
// gaps/collisions before this was written:
// 0 enroll | 1 learn(react/html/css/tailwind/node/framer/express)
// 2-5 AssetVerse | 6 achieve(bootcamp) | 7 learn(nextjs/gsap)
// 8-13 AuctaSync (10-11 = its bugfix) | 14 learn(ai/llm/rag)
// 15-18 AsyncLangAI | 19-24 CareerPilot (22-23 = its bugfix) | 25 HEAD
const MAIN_ROWS = [0, 1, 6, 7, 14, 25];
const ASSETVERSE_ROWS = [2, 3, 4, 5];
const AUCTASYNC_ROWS = [8, 9, 12, 13];
const AUCTASYNC_BUGFIX_ROWS = [10, 11];
const ASYNCLANGAI_ROWS = [15, 16, 17, 18];
const CAREERPILOT_ROWS = [19, 20, 21, 24];
const CAREERPILOT_BUGFIX_ROWS = [22, 23];

const withRows = (content: Commit[], rows: number[]): (Commit & { row: number })[] =>
  content.map((c, i) => ({ ...c, row: rows[i] }));

const mainCommits: MainCommit[] = withRows(mainCommitContent, MAIN_ROWS);

// Topology only (no pixel values) — stays constant across tiers.
const BRANCH_DEFS: BranchDef[] = [
  {
    name: "feat/assetverse",
    projectKey: "assetverse",
    color: "#a78bfa",
    lane: 1,
    sourceRow: 1,
    mergeRow: 6,
    delay: 1.0,
    commits: withRows(assetverseCommitContent, ASSETVERSE_ROWS),
  },
  {
    name: "feat/auctasync",
    projectKey: "auctasync",
    color: "#f59e0b",
    lane: 2,
    sourceRow: 7,
    mergeRow: 14,
    delay: 1.5,
    commits: withRows(auctasyncCommitContent, AUCTASYNC_ROWS),
  },
  {
    name: "feat/asynclangai",
    projectKey: "asynclangai",
    color: "#38bdf8",
    lane: 4,
    sourceRow: 14,
    mergeRow: 19,
    delay: 1.75,
    commits: withRows(asynclangaiCommitContent, ASYNCLANGAI_ROWS),
  },
  {
    name: "feat/careerpilot",
    projectKey: "careerpilot",
    color: "#34d399",
    lane: 5,
    sourceRow: 19,
    mergeRow: 25,
    delay: 2.0,
    commits: withRows(careerpilotCommitContent, CAREERPILOT_ROWS),
  },
];

const BUGFIX_DEFS: BugfixDef[] = [
  {
    name: "bugfix/auctasync-race-condition",
    bugfixKey: "auctasync-race-condition",
    color: "#f59e0b",
    parentLane: 2,
    lane: 3,
    sourceRow: 9,
    mergeRow: 12,
    delay: 1.4,
    commits: withRows(auctasyncBugfixCommitContent, AUCTASYNC_BUGFIX_ROWS),
  },
  {
    name: "bugfix/careerpilot-session-state",
    bugfixKey: "careerpilot-session-state",
    color: "#34d399",
    parentLane: 5,
    lane: 6,
    sourceRow: 21,
    mergeRow: 24,
    delay: 2.4,
    commits: withRows(careerpilotBugfixCommitContent, CAREERPILOT_BUGFIX_ROWS),
  },
];

const TOTAL_COMMIT_COUNT =
  mainCommits.length +
  BRANCH_DEFS.reduce((sum, b) => sum + b.commits.length, 0) +
  BUGFIX_DEFS.reduce((sum, b) => sum + b.commits.length, 0);

type NodeMeta = {
  x: number;
  y: number;
  hash: string;
  message: string;
  color: string;
  textColor: string;
  isHead?: boolean;
  isMain?: boolean;
  isBugfix?: boolean;
  revealDelay: number;
  projectKey?: ProjectKey;
  commitIndex?: number;
  commitTotal?: number;
  bugfixKey?: BugfixKey;
  bugfixCommitIndex?: number;
  branchName?: string;
};

/** All pixel geometry derived from a Layout — rebuilt only when the tier changes. */
function buildGeometry(layout: Layout) {
  const { rowH, topPad, mainX, laneW } = layout;
  const yOf = (row: number) => topPad + row * rowH;
  const laneX = (lane: number) => mainX + lane * laneW;
  const graphW = mainX + laneW * TOTAL_LANES;
  const height = topPad * 2 + (TOTAL_ROWS - 1) * rowH;
  const featureOffset = rowH * FEATURE_OFFSET_RATIO;
  const bugfixOffset = rowH * BUGFIX_OFFSET_RATIO;

  const branches = BRANCH_DEFS.map((b) => ({
    ...b,
    sourceY: yOf(b.sourceRow) + featureOffset,
    mergeY: yOf(b.mergeRow) - featureOffset,
  }));

  const bugfixBranches = BUGFIX_DEFS.map((b) => ({
    ...b,
    sourceY: yOf(b.sourceRow) + bugfixOffset,
    mergeY: yOf(b.mergeRow) - bugfixOffset,
  }));

  const branchPath = (b: (typeof branches)[number]): string => {
    const bx = laneX(b.lane);
    const firstY = yOf(b.commits[0].row);
    const lastY = yOf(b.commits[b.commits.length - 1].row);
    const c1 = (firstY - b.sourceY) / 2;
    const c2 = (b.mergeY - lastY) / 2;
    return [
      `M ${mainX} ${b.sourceY}`,
      `C ${mainX} ${b.sourceY + c1}, ${bx} ${firstY - c1}, ${bx} ${firstY}`,
      `L ${bx} ${lastY}`,
      `C ${bx} ${lastY + c2}, ${mainX} ${b.mergeY - c2}, ${mainX} ${b.mergeY}`,
    ].join(" ");
  };

  const bugfixPath = (b: (typeof bugfixBranches)[number]): string => {
    const px = laneX(b.parentLane);
    const bx = laneX(b.lane);
    const firstY = yOf(b.commits[0].row);
    const lastY = yOf(b.commits[b.commits.length - 1].row);
    const c1 = (firstY - b.sourceY) / 2;
    const c2 = (b.mergeY - lastY) / 2;
    return [
      `M ${px} ${b.sourceY}`,
      `C ${px} ${b.sourceY + c1}, ${bx} ${firstY - c1}, ${bx} ${firstY}`,
      `L ${bx} ${lastY}`,
      `C ${bx} ${lastY + c2}, ${px} ${b.mergeY - c2}, ${px} ${b.mergeY}`,
    ].join(" ");
  };

  const allNodes: NodeMeta[] = [
    ...mainCommits.map((c, i) => ({
      x: mainX,
      y: yOf(c.row),
      hash: c.hash,
      message: c.message,
      color: "#ffffff",
      textColor: c.hash === "HEAD" ? "#3cdbb1" : "#e2e4e9",
      isHead: c.hash === "HEAD",
      isMain: true,
      revealDelay: i * 0.06,
    })),
    ...branches.flatMap((b, bi) =>
      b.commits.map((c, i) => {
        let textColor = b.color;
        if (b.projectKey === "auctasync") textColor = "#de9722";
        if (b.projectKey === "assetverse") textColor = "#a28ded";
        if (b.projectKey === "asynclangai") textColor = "#7dd3fc";
        if (b.projectKey === "careerpilot") textColor = "#3cdbb1";

        return {
          x: laneX(b.lane),
          y: yOf(c.row),
          hash: c.hash,
          message: c.message,
          color: b.color,
          textColor,
          revealDelay: bi * 0.1 + i * 0.06,
          projectKey: b.projectKey,
          commitIndex: i,
          commitTotal: b.commits.length,
          branchName: i === 0 ? b.name : undefined,
        };
      }),
    ),
    ...bugfixBranches.flatMap((b, bi) =>
      b.commits.map((c, i) => ({
        x: laneX(b.lane),
        y: yOf(c.row),
        hash: c.hash,
        message: c.message,
        color: BUGFIX_COLOR,
        textColor: BUGFIX_COLOR,
        isBugfix: true,
        revealDelay: bi * 0.1 + i * 0.06,
        bugfixKey: b.bugfixKey,
        bugfixCommitIndex: i,
        branchName: i === 0 ? b.name : undefined,
      })),
    ),
  ];

  return { yOf, laneX, graphW, height, branches, bugfixBranches, branchPath, bugfixPath, allNodes };
}

function ScrollProgress({
  progress,
}: {
  progress: ReturnType<typeof useTransform<number, number>>;
}) {
  const [count, setCount] = useState(0);

  useMotionValueEvent(progress, "change", (v) => {
    setCount(Math.min(TOTAL_COMMIT_COUNT, Math.max(0, Math.round(v * TOTAL_COMMIT_COUNT))));
  });

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="fixed left-0 top-0 z-[60] h-[3px] origin-left"
        style={{
          scaleX: progress,
          width: "100%",
          background: "linear-gradient(90deg, #34d399, #f59e0b, #a78bfa)",
          boxShadow: "0 0 8px rgba(255,255,255,0.35)",
        }}
      />
      <div
        aria-label={`Logged commits counter: ${count} of ${TOTAL_COMMIT_COUNT}`}
        className="fixed right-2 top-2 sm:right-4 sm:top-3 z-[60] rounded px-1.5 py-0.5 sm:px-2 font-mono text-[10px] sm:text-[12px] tabular-nums tracking-widest text-gray-500"
        style={{
          background: "rgba(14,15,19,0.6)",
          backdropFilter: "blur(6px)",
          top: "max(0.5rem, env(safe-area-inset-top))",
        }}
      >
        {count} / {TOTAL_COMMIT_COUNT}
      </div>
    </>
  );
}

function AmbientGlow({
  amber,
  purple,
  green,
  reduceMotion,
}: {
  amber: ReturnType<typeof useTransform<number, string>>;
  purple: ReturnType<typeof useTransform<number, string>>;
  green: ReturnType<typeof useTransform<number, string>>;
  reduceMotion: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useMotionValueEvent(amber, "change", (v) => {
    ref.current?.style.setProperty("--amber-a", v);
  });
  useMotionValueEvent(purple, "change", (v) => {
    ref.current?.style.setProperty("--purple-a", v);
  });
  useMotionValueEvent(green, "change", (v) => {
    ref.current?.style.setProperty("--green-a", v);
  });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 graph-ambient${reduceMotion ? " graph-ambient-static" : ""}`}
      style={{
        ["--amber-a" as string]: "rgba(245,158,11,0.02)",
        ["--purple-a" as string]: "rgba(167,139,250,0.02)",
        ["--green-a" as string]: "rgba(52,211,153,0.02)",
      }}
    />
  );
}

function Legend() {
  return (
    <div
      className="relative z-10 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1.5 sm:px-4 font-mono text-[10px] sm:text-[11px] text-gray-500"
      role="note"
      aria-label="Legend: a circle marks a regular commit, a diamond marks a bugfix commit, a glowing circle marks HEAD"
    >
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        commit
      </span>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect
            x="1.5"
            y="1.5"
            width="7"
            height="7"
            rx="1"
            fill="none"
            stroke={BUGFIX_COLOR}
            strokeWidth="1.5"
            transform="rotate(45 5 5)"
          />
        </svg>
        <span style={{ color: BUGFIX_COLOR }}>fix</span>
      </span>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="#34d399" opacity={0.9} />
        </svg>
        <span style={{ color: "#34d399" }}>HEAD</span>
      </span>
    </div>
  );
}

function CommitIcon({ message, color }: { message: string; color: string }) {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("scaffold")) {
    return (
      <svg
        className="shrink-0 w-3.5 h-3.5 self-center"
        fill="none"
        viewBox="0 0 24 24"
        stroke={color}
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 19v-7m0 0c0-2.5-2-4.5-4.5-4.5S3 9.5 3 12h9zm0 0c0-2.5 2-4.5 4.5-4.5S21 9.5 21 12h-9z"
        />
      </svg>
    );
  }

  if (lowerMsg.includes("implement") || lowerMsg.includes("integrate")) {
    return (
      <svg
        className="shrink-0 w-3.5 h-3.5 self-center"
        fill="none"
        viewBox="0 0 24 24"
        stroke={color}
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    );
  }

  if (lowerMsg.startsWith("fix(") || lowerMsg.includes("resolve")) {
    return (
      <svg
        className="shrink-0 w-3.5 h-3.5 self-center"
        fill="none"
        viewBox="0 0 24 24"
        stroke={color}
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83m-3.75 3.75a3.75 3.75 0 11-5.304-5.304 3.75 3.75 0 015.304 5.304zm0 0l4.22-4.22m-4.22 4.22l-1.9-1.9"
        />
      </svg>
    );
  }

  if (lowerMsg.includes("milestone")) {
    return (
      <svg
        className="shrink-0 w-3.5 h-3.5 self-center"
        fill="none"
        viewBox="0 0 24 24"
        stroke={color}
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 21V3m0 2.25h16.5l-2.25 4.5 2.25 4.5H3"
        />
      </svg>
    );
  }

  return null;
}

export function GitGraph() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selection, setSelection] = useState<CommitSelection | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tier = useLayoutTier();
  const reduceMotion = useReducedMotion() ?? false;
  const layout = LAYOUTS[tier];

  const geometry = useMemo(() => buildGeometry(layout), [layout]);
  const { yOf, graphW, height, branches, bugfixBranches, branchPath, bugfixPath, allNodes } =
    geometry;

  const nodeScale = layout.nodeScale;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end end"],
  });
  const spineProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const spineY2 = useTransform(spineProgress, [0, 1], [yOf(0), yOf(TOTAL_ROWS - 1)]);

  const smoothProgress = useSpring(spineProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.5,
  });

  // Windows recalculated from each branch's actual row span as a fraction
  // of TOTAL_ROWS-1 (=21), with a small ramp-in/out pad — AssetVerse
  // (purple) forks first, AuctaSync (amber) second, CareerPilot (green) last.
  const purpleGlow = useTransform(
    smoothProgress,
    [0.0, 0.06, 0.26, 0.33],
    [
      "rgba(167,139,250,0.02)",
      "rgba(167,139,250,0.09)",
      "rgba(167,139,250,0.09)",
      "rgba(167,139,250,0.02)",
    ],
  );

  const amberGlow = useTransform(
    smoothProgress,
    [0.33, 0.4, 0.65, 0.72],
    [
      "rgba(245,158,11,0.02)",
      "rgba(245,158,11,0.09)",
      "rgba(245,158,11,0.09)",
      "rgba(245,158,11,0.02)",
    ],
  );

  const greenGlow = useTransform(
    smoothProgress,
    [0.7, 0.78, 0.98, 1.0],
    [
      "rgba(52,211,153,0.02)",
      "rgba(52,211,153,0.09)",
      "rgba(52,211,153,0.09)",
      "rgba(52,211,153,0.02)",
    ],
  );

  useEffect(() => {
    let timeoutId: number;

    function onHighlight(e: Event) {
      const hash = (e as CustomEvent<string>).detail;
      if (!hash) return;
      const el = document.getElementById(`commit-${hash}`);
      if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      setHighlighted(hash);

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setHighlighted((h) => (h === hash ? null : h));
      }, 1800);
    }

    window.addEventListener("highlight-commit", onHighlight as EventListener);
    return () => {
      window.removeEventListener("highlight-commit", onHighlight as EventListener);
      window.clearTimeout(timeoutId);
    };
  }, [reduceMotion]);

  const openCommit = (n: NodeMeta, evt?: MouseEvent) => {
    if (n.isBugfix && n.bugfixKey !== undefined) {
      if (n.bugfixCommitIndex === 1) {
        setSelection({
          kind: "bugfix",
          hash: n.hash,
          message: n.message,
          bugfixKey: n.bugfixKey,
        });
      } else {
        const rect = (evt?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect();
        setSelection({
          kind: "bugfix-first",
          hash: n.hash,
          message: n.message,
          color: n.color,
          anchorX: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
          anchorY: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
        });
      }
      return;
    }
    if (n.isMain) {
      const rect = (evt?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect();
      setSelection({
        kind: "main",
        hash: n.hash,
        message: n.message,
        anchorX: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        anchorY: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
      });
    } else if (n.projectKey) {
      setSelection({
        kind: "feature",
        hash: n.hash,
        message: n.message,
        projectKey: n.projectKey,
        commitIndex: n.commitIndex ?? 0,
        commitTotal: n.commitTotal ?? 1,
      });
    }
  };

  // Entrance transitions collapse to a near-instant fade for
  // prefers-reduced-motion, matching the pattern used elsewhere in the app
  // (see lib/portfolio/motion.ts) instead of springing/drawing in.
  const pathTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.9, ease: "easeInOut" as const };
  const bugfixPathTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.6, ease: "easeOut" as const };
  const nodeIdleTransition = (delay: number) =>
    reduceMotion ? { duration: 0.01 } : { duration: 0.35, ease: "easeOut" as const, delay };
  const nodeActiveTransition = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 300, damping: 20 };

  return (
    <>
      <ScrollProgress progress={spineProgress} />

      <AmbientGlow
        amber={amberGlow}
        purple={purpleGlow}
        green={greenGlow}
        reduceMotion={reduceMotion}
      />

      <Legend />

      {/* Fully fluid width now — no forced horizontal scroll. The graph and
          its text column both shrink together via the tier-based layout, so
          this fits from small phones up through desktop without clipping. */}
      <div
        ref={containerRef}
        className="relative w-full max-w-full px-1.5 sm:px-4"
        style={{ height }}
      >
        {/* SVG graph */}
        <svg
          className="pointer-events-none absolute inset-y-0 left-1.5 sm:left-4"
          width={graphW}
          height={height}
          viewBox={`0 0 ${graphW} ${height}`}
          style={{ overflow: "visible" }}
          aria-hidden="true"
        >
          <defs>
            <filter id="head-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* main spine */}
          <motion.line
            x1={layout.mainX}
            y1={yOf(0)}
            x2={layout.mainX}
            y2={spineY2}
            stroke="#ffffff"
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* feature branches */}
          {branches.map((b) => (
            <motion.path
              key={b.name}
              d={branchPath(b)}
              fill="none"
              stroke={b.color}
              strokeWidth={2.25}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0.5 }}
              whileInView={{ pathLength: 1, opacity: 0.9 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={pathTransition}
            />
          ))}

          {/* bugfix branches */}
          {bugfixBranches.map((b) => (
            <motion.path
              key={b.name}
              d={bugfixPath(b)}
              fill="none"
              stroke={BUGFIX_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="5 4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.85 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={bugfixPathTransition}
            />
          ))}

          {/* nodes */}
          {allNodes.map((n) => {
            const isHovered = hovered === n.hash;
            const isHighlighted = highlighted === n.hash;
            const baseR = (n.isHead ? 7.5 : n.isMain ? 6.5 : n.isBugfix ? 4.5 : 5.5) * nodeScale;
            return (
              <motion.g
                key={n.hash}
                initial={{ opacity: 0, scale: 0.4 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                animate={isHovered || isHighlighted ? { scale: 1.25 } : { scale: 1 }}
                transition={
                  isHovered || isHighlighted
                    ? nodeActiveTransition
                    : nodeIdleTransition(n.revealDelay)
                }
                style={{ transformOrigin: `${n.x}px ${n.y}px` }}
              >
                {n.isHead && (
                  <motion.circle
                    cx={n.x}
                    cy={n.y}
                    r={12.5 * nodeScale}
                    fill="#34d399"
                    opacity={0.35}
                    animate={
                      reduceMotion
                        ? { opacity: 0.3 }
                        : {
                            r: [12.5 * nodeScale, 20 * nodeScale, 12.5 * nodeScale],
                            opacity: [0.45, 0.05, 0.45],
                          }
                    }
                    transition={
                      reduceMotion
                        ? { duration: 0.01 }
                        : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }
                  />
                )}
                {isHighlighted && (
                  <motion.circle
                    cx={n.x}
                    cy={n.y}
                    r={baseR + 4}
                    fill="none"
                    stroke={n.color}
                    strokeWidth={2}
                    initial={{ r: baseR, opacity: 0.9 }}
                    animate={{ r: baseR + 18, opacity: 0 }}
                    transition={
                      reduceMotion
                        ? { duration: 0.2 }
                        : { duration: 1.2, ease: "easeOut", repeat: 1 }
                    }
                    style={{ filter: `drop-shadow(0 0 8px ${n.color})` }}
                  />
                )}
                {(isHovered || isHighlighted) && !n.isHead && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={baseR + 5}
                    fill={n.color}
                    opacity={isHighlighted ? 0.4 : 0.25}
                    style={{ filter: `drop-shadow(0 0 6px ${n.color})` }}
                  />
                )}
                {n.isBugfix ? (
                  <rect
                    x={n.x - baseR * 0.85}
                    y={n.y - baseR * 0.85}
                    width={baseR * 1.7}
                    height={baseR * 1.7}
                    rx={1.5}
                    transform={`rotate(45 ${n.x} ${n.y})`}
                    fill="#0e0f13"
                    stroke={n.color}
                    strokeWidth={1.75}
                    strokeDasharray="2 1.5"
                  />
                ) : (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={baseR}
                    fill="#0e0f13"
                    stroke={n.isHead ? "#34d399" : n.color}
                    strokeWidth={n.isHead ? 2.5 : 2}
                    filter={n.isHead ? "url(#head-glow)" : undefined}
                  />
                )}
              </motion.g>
            );
          })}
        </svg>

        {/* Text column — its left offset tracks the (now-responsive) graph
            width directly, so the two always line up at every tier. */}
        <div
          className="absolute inset-y-0 right-1.5 sm:right-4 pointer-events-none"
          style={{ left: `calc(${graphW}px + 1.5rem)` }}
        >
          {allNodes.map((n) => {
            const isHovered = hovered === n.hash;
            const isHighlighted = highlighted === n.hash;
            const isMilestone = n.message.toLowerCase().includes("milestone");

            return (
              <div
                key={n.hash}
                className="absolute inset-x-0 flex flex-col pointer-events-auto"
                style={{ top: n.y, transform: "translateY(-50%)" }}
              >
                {/* branch context label */}
                {n.branchName && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    whileInView={{ opacity: 0.45, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={nodeIdleTransition(n.revealDelay)}
                    className="text-[10px] sm:text-[11px] font-mono tracking-tight text-gray-400 select-none pb-0.5 pointer-events-none flex items-center gap-1"
                  >
                    <span className="text-gray-600 font-bold font-sans">$</span>
                    <span className="truncate">on {n.branchName}</span>
                  </motion.div>
                )}

                <motion.button
                  id={`commit-${n.hash}`}
                  type="button"
                  onClick={(e) => openCommit(n, e)}
                  onMouseEnter={() => setHovered(n.hash)}
                  onMouseLeave={() => setHovered((h) => (h === n.hash ? null : h))}
                  onFocus={() => setHovered(n.hash)}
                  onBlur={() => setHovered((h) => (h === n.hash ? null : h))}
                  title={n.message}
                  aria-label={`Commit selection: ${n.hash} ${n.message}`}
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={nodeIdleTransition(n.revealDelay + 0.05)}
                  className="flex items-start gap-2 sm:gap-3 rounded-md px-1.5 py-1 sm:py-0.5 text-left transition-all duration-200 w-full relative group min-w-0 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  style={{
                    background: isHighlighted
                      ? `${n.color}22`
                      : isHovered
                        ? "rgba(255,255,255,0.04)"
                        : "transparent",
                    boxShadow: isHighlighted ? `0 0 0 1px ${n.color}55` : "none",
                  }}
                >
                  {/* milestone row emphasis */}
                  {isMilestone && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 0.04 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={
                        reduceMotion
                          ? { duration: 0.01 }
                          : { duration: 0.5, ease: "easeOut", delay: n.revealDelay }
                      }
                      className="absolute inset-y-0 -left-3 right-0 rounded-l-md pointer-events-none -z-[5]"
                      style={{ backgroundColor: n.color === "#ffffff" ? "#9ca3af" : n.color }}
                    />
                  )}

                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums pt-[2px]">
                    <CommitIcon
                      message={n.message}
                      color={n.isHead ? "#34d399" : n.isMain ? "#9ca3af" : n.textColor}
                    />
                    <span
                      className="font-mono text-[11px] sm:text-[13px]"
                      style={{ color: n.isHead ? "#34d399" : "#6b7280" }}
                    >
                      {n.hash}
                    </span>
                  </div>
                  <span
                    className="leading-snug break-words text-[13px] sm:text-[14.5px] line-clamp-2 sm:line-clamp-none flex-1 min-w-0"
                    style={{
                      color: n.textColor,
                      fontWeight: n.isMain || n.isHead || isMilestone ? 500 : 400,
                      fontStyle: n.isBugfix ? "italic" : "normal",
                      opacity: n.isHead ? 0.9 : n.isMain ? 0.9 : 0.85,
                      textShadow: isHovered ? `0 0 12px ${n.color}66` : "none",
                    }}
                  >
                    {n.message}
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      <CommitModal selection={selection} onClose={() => setSelection(null)} />

      <style>{`
        .graph-ambient {
          background-image:
            radial-gradient(circle at 15% 20%, var(--amber-a, rgba(245,158,11,0.02)) 0%, transparent 50%),
            radial-gradient(circle at 85% 55%, var(--purple-a, rgba(167,139,250,0.02)) 0%, transparent 50%),
            radial-gradient(circle at 25% 85%, var(--green-a, rgba(52,211,153,0.02)) 0%, transparent 50%);
          background-size: 160% 160%;
          animation: graph-ambient-drift 24s ease-in-out infinite;
          opacity: 0.85;
        }
        .graph-ambient-static {
          animation: none;
          background-position: 40% 30%;
        }
        @keyframes graph-ambient-drift {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 60%; }
        }
      `}</style>
    </>
  );
}
