/* eslint-disable prettier/prettier */
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useEffect, useRef, useState, useMemo } from "react";

import { CommitModal, type CommitSelection } from "./CommitModal";
import type { ProjectKey } from "@/data/portfolio/projects";
import { bugfixes, type BugfixKey } from "@/data/portfolio/bugfixes";
import {
  mainCommitContent,
  auctasyncCommitContent,
  assetverseCommitContent,
  careerpilotCommitContent,
  auctasyncBugfixCommitContent,
  careerpilotBugfixCommitContent,
} from "@/data/portfolio/commits";

type Commit = { hash: string; message: string };
type MainCommit = Commit & { row: number };

type Branch = {
  name: string;
  projectKey: ProjectKey;
  color: string;
  lane: number;
  sourceY: number;
  mergeY: number;
  commits: (Commit & { row: number })[];
  delay: number;
};

type BugfixBranch = {
  name: string;
  bugfixKey: BugfixKey;
  color: string;
  parentLane: number;
  lane: number;
  sourceY: number;
  mergeY: number;
  commits: (Commit & { row: number })[];
  delay: number;
};

// Increased row height slightly to give wrapped two-line commits breathing room
const ROW_H = 64;
const TOP_PAD = 48;
const MAIN_X = 28;
const LANE_W = 40;
const TOTAL_LANES = 6; // main(0) auc(1) bug-auc(2) asset(3) career(4) bug-career(5)
const GRAPH_W = MAIN_X + LANE_W * TOTAL_LANES;

const yOf = (row: number) => TOP_PAD + row * ROW_H;
const laneX = (lane: number) => MAIN_X + lane * LANE_W;

const MAIN_ROWS = [0, 1, 8, 19];
const AUCTASYNC_ROWS = [2, 3, 6, 7];
const ASSETVERSE_ROWS = [9, 10, 11, 12];
const CAREERPILOT_ROWS = [13, 14, 15, 18];
const AUCTASYNC_BUGFIX_ROWS = [4, 5];
const CAREERPILOT_BUGFIX_ROWS = [16, 17];

const withRows = (content: Commit[], rows: number[]): (Commit & { row: number })[] =>
  content.map((c, i) => ({ ...c, row: rows[i] }));

const mainCommits: MainCommit[] = withRows(mainCommitContent, MAIN_ROWS);

const branches: Branch[] = [
  {
    name: "feat/auctasync",
    projectKey: "auctasync",
    color: "#f59e0b",
    lane: 1,
    sourceY: yOf(1) + 22,
    mergeY: yOf(8) - 22,
    delay: 1.0,
    commits: withRows(auctasyncCommitContent, AUCTASYNC_ROWS),
  },
  {
    name: "feat/assetverse",
    projectKey: "assetverse",
    color: "#a78bfa",
    lane: 3,
    sourceY: yOf(8) + 22,
    mergeY: yOf(12) + 28,
    delay: 1.5,
    commits: withRows(assetverseCommitContent, ASSETVERSE_ROWS),
  },
  {
    name: "feat/careerpilot",
    projectKey: "careerpilot",
    color: "#34d399",
    lane: 4,
    sourceY: yOf(13) - 28,
    mergeY: yOf(18) + 28,
    delay: 2.0,
    commits: withRows(careerpilotCommitContent, CAREERPILOT_ROWS),
  },
];

const bugfixBranches: BugfixBranch[] = [
  {
    name: "bugfix/auctasync-race-condition",
    bugfixKey: "auctasync-race-condition",
    color: "#f59e0b",
    parentLane: 1,
    lane: 2,
    sourceY: yOf(3) + 20,
    mergeY: yOf(6) - 20,
    delay: 1.4,
    commits: withRows(auctasyncBugfixCommitContent, AUCTASYNC_BUGFIX_ROWS),
  },
  {
    name: "bugfix/careerpilot-session-state",
    bugfixKey: "careerpilot-session-state",
    color: "#34d399",
    parentLane: 4,
    lane: 5,
    sourceY: yOf(15) + 20,
    mergeY: yOf(18) - 20,
    delay: 2.4,
    commits: withRows(careerpilotBugfixCommitContent, CAREERPILOT_BUGFIX_ROWS),
  },
];

const TOTAL_ROWS = 20;
const HEIGHT = TOP_PAD * 2 + (TOTAL_ROWS - 1) * ROW_H;

const TOTAL_COMMIT_COUNT =
  mainCommits.length +
  branches.reduce((sum, b) => sum + b.commits.length, 0) +
  bugfixBranches.reduce((sum, b) => sum + b.commits.length, 0);

function branchPath(b: Branch): string {
  const bx = laneX(b.lane);
  const firstY = yOf(b.commits[0].row);
  const lastY = yOf(b.commits[b.commits.length - 1].row);
  const c1 = (firstY - b.sourceY) / 2;
  const c2 = (b.mergeY - lastY) / 2;
  return [
    `M ${MAIN_X} ${b.sourceY}`,
    `C ${MAIN_X} ${b.sourceY + c1}, ${bx} ${firstY - c1}, ${bx} ${firstY}`,
    `L ${bx} ${lastY}`,
    `C ${bx} ${lastY + c2}, ${MAIN_X} ${b.mergeY - c2}, ${MAIN_X} ${b.mergeY}`,
  ].join(" ");
}

function bugfixPath(b: BugfixBranch): string {
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
}

type NodeMeta = {
  x: number;
  y: number;
  hash: string;
  message: string;
  color: string;
  textColor: string; // Separate desaturated value for text-specific styling
  isHead?: boolean;
  isMain?: boolean;
  isBugfix?: boolean;
  revealDelay: number;
  projectKey?: ProjectKey;
  commitIndex?: number;
  commitTotal?: number;
  bugfixKey?: BugfixKey;
  bugfixCommitIndex?: number;
  branchName?: string; // Appended context to track branch roots
};

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
        className="fixed left-0 top-0 z-[60] h-[2px] origin-left"
        style={{
          scaleX: progress,
          width: "100%",
          background: "linear-gradient(90deg, #34d399, #f59e0b, #a78bfa)",
          boxShadow: "0 0 8px rgba(255,255,255,0.35)",
        }}
      />
      <div
        aria-label={`Logged commits counter: ${count} of ${TOTAL_COMMIT_COUNT}`}
        className="fixed right-3 top-2 z-[60] rounded px-2 py-0.5 font-mono text-[10px] tabular-nums tracking-widest text-gray-500"
        style={{ background: "rgba(14,15,19,0.6)", backdropFilter: "blur(6px)" }}
      >
        {count} / {TOTAL_COMMIT_COUNT}
      </div>
    </>
  );
}

// Helper to render semantic inline SVGs based on commit message keywords
function CommitIcon({ message, color }: { message: string; color: string }) {
  const lowerMsg = message.toLowerCase();

  // 1. Sprout/Seedling for "scaffold"
  if (lowerMsg.includes("scaffold")) {
    return (
      <svg
        className="shrink-0 w-3 h-3 self-center"
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

  // 2. Lightning Bolt for "implement" or "integrate"
  if (lowerMsg.includes("implement") || lowerMsg.includes("integrate")) {
    return (
      <svg
        className="shrink-0 w-3 h-3 self-center"
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

  // 3. Wrench for "fix(" or "resolve"
  if (lowerMsg.startsWith("fix(") || lowerMsg.includes("resolve")) {
    return (
      <svg
        className="shrink-0 w-3 h-3 self-center"
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

  // 4. Flag for "milestone"
  if (lowerMsg.includes("milestone")) {
    return (
      <svg
        className="shrink-0 w-3 h-3 self-center"
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

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end end"],
  });
  const spineProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // SCROLL-REACTIVE AMBIENT BACKGROUND: Interpolates background colors based on linear progression through story forks
  const ambientAmber = "rgba(245,158,11,0.06)";
  const ambientPurple = "rgba(167,139,250,0.06)";
  const ambientGreen = "rgba(52,211,153,0.06)";
  const ambientNeutral = "rgba(30,41,59,0.01)";

  const ambientColor = useTransform(
    spineProgress,
    [0.0, 0.1, 0.35, 0.45, 0.6, 0.7, 0.9, 1.0],
    [
      ambientNeutral, // main early
      ambientAmber, // auctasync active
      ambientAmber,
      ambientNeutral, // main mid
      ambientPurple, // assetverse active
      ambientNeutral, // main lower mid
      ambientGreen, // careerpilot active
      ambientNeutral, // final main commits
    ],
  );

  useEffect(() => {
    let timeoutId: number;

    function onHighlight(e: Event) {
      const hash = (e as CustomEvent<string>).detail;
      if (!hash) return;
      const el = document.getElementById(`commit-${hash}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
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
  }, []);

  // Maps text colors about 10-15% toward gray to desaturate them for layout labels
  const allNodes = useMemo<NodeMeta[]>(
    () => [
      ...mainCommits.map((c, i) => ({
        x: MAIN_X,
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
          if (b.projectKey === "auctasync") textColor = "#de9722"; // #f59e0b desaturated
          if (b.projectKey === "assetverse") textColor = "#a28ded"; // #a78bfa desaturated
          if (b.projectKey === "careerpilot") textColor = "#3cdbb1"; // #34d399 desaturated

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
            branchName: i === 0 ? b.name : undefined, // Attach only on branch root
          };
        }),
      ),
      ...bugfixBranches.flatMap((b, bi) =>
        b.commits.map((c, i) => {
          let textColor = b.color;
          if (b.bugfixKey.startsWith("auctasync")) textColor = "#de9722";
          if (b.bugfixKey.startsWith("careerpilot")) textColor = "#3cdbb1";

          return {
            x: laneX(b.lane),
            y: yOf(c.row),
            hash: c.hash,
            message: c.message,
            color: b.color,
            textColor,
            isBugfix: true,
            revealDelay: bi * 0.1 + i * 0.06,
            bugfixKey: b.bugfixKey,
            bugfixCommitIndex: i,
            branchName: i === 0 ? b.name : undefined, // Attach only on branch root
          };
        }),
      ),
    ],
    [],
  );

  const openCommit = (n: NodeMeta, evt?: React.MouseEvent) => {
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

  return (
    <>
      <ScrollProgress progress={spineProgress} />

      <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
        {/* SCROLL-REACTIVE AMBIENT BACKGROUND: Custom background layer syncing color switches to spine state */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 graph-ambient"
          style={{ backgroundColor: ambientColor }}
        />

        {/* SVG graph */}
        <svg
          className="pointer-events-none absolute inset-y-0 left-0"
          width={GRAPH_W}
          height={HEIGHT}
          viewBox={`0 0 ${GRAPH_W} ${HEIGHT}`}
          style={{ overflow: "visible" }}
          aria-hidden="true"
        >
          <defs>
            <filter id="head-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" opacity="0.35" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* main spine */}
          <motion.line
            x1={MAIN_X}
            y1={yOf(0)}
            x2={MAIN_X}
            y2={useTransform(spineProgress, [0, 1], [yOf(0), yOf(TOTAL_ROWS - 1)])}
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
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0.5 }}
              whileInView={{ pathLength: 1, opacity: 0.9 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
            />
          ))}

          {/* bugfix branches */}
          {bugfixBranches.map((b) => (
            <motion.path
              key={b.name}
              d={bugfixPath(b)}
              fill="none"
              stroke={b.color}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeDasharray="5 4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.85 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          ))}

          {/* nodes */}
          {allNodes.map((n) => {
            const isHovered = hovered === n.hash;
            const isHighlighted = highlighted === n.hash;
            const baseR = n.isHead ? 7 : n.isMain ? 6 : n.isBugfix ? 4 : 5;
            return (
              <motion.g
                key={n.hash}
                initial={{ opacity: 0, scale: 0.4 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                animate={isHovered || isHighlighted ? { scale: 1.25 } : { scale: 1 }}
                transition={
                  isHovered || isHighlighted
                    ? { type: "spring", stiffness: 300, damping: 20 }
                    : { duration: 0.35, ease: "easeOut", delay: n.revealDelay }
                }
                style={{ transformOrigin: `${n.x}px ${n.y}px` }}
              >
                {n.isHead && (
                  <motion.circle
                    cx={n.x}
                    cy={n.y}
                    r={12}
                    fill="#34d399"
                    opacity={0.35}
                    animate={{ r: [12, 20, 12], opacity: [0.45, 0.05, 0.45] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
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
                    transition={{ duration: 1.2, ease: "easeOut", repeat: 1 }}
                    style={{ filter: `drop-shadow(0 0 10px ${n.color})` }}
                  />
                )}
                {(isHovered || isHighlighted) && !n.isHead && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={baseR + 6}
                    fill={n.color}
                    opacity={isHighlighted ? 0.4 : 0.25}
                    style={{ filter: `drop-shadow(0 0 8px ${n.color})` }}
                  />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={baseR}
                  fill="#0e0f13"
                  stroke={n.isHead ? "#34d399" : n.color}
                  strokeWidth={n.isHead ? 2.5 : n.isBugfix ? 1.5 : 2}
                  strokeDasharray={n.isBugfix ? "2 1.5" : undefined}
                  filter={n.isHead ? "url(#head-glow)" : undefined}
                />
              </motion.g>
            );
          })}
        </svg>

        {/* Interactive overlay */}
        <div className="absolute inset-0">
          {allNodes.map((n) => {
            const isHovered = hovered === n.hash;
            const isHighlighted = highlighted === n.hash;
            const isMilestone = n.message.toLowerCase().includes("milestone");

            return (
              <div
                key={n.hash}
                className="absolute flex flex-col"
                style={{
                  top: n.y,
                  left: GRAPH_W + 8,
                  right: 0,
                  transform: "translateY(-50%)",
                }}
              >
                {/* 1. BRANCH CONTEXT LABEL: Rendered contextually right above the first branch commit entry */}
                {n.branchName && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    whileInView={{ opacity: 0.45, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: n.revealDelay }}
                    className="text-[10px] font-mono tracking-tight text-gray-400 select-none pb-1 pointer-events-none flex items-center gap-1"
                  >
                    <span className="text-gray-600 font-bold font-sans">$</span>
                    <span>on branch {n.branchName}</span>
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
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: n.revealDelay + 0.05 }}
                  className="flex items-start gap-3 rounded-md px-1 py-0.5 text-left transition-all duration-200 w-full relative group"
                  style={{
                    background: isHighlighted
                      ? `${n.color}22`
                      : isHovered
                        ? "rgba(255,255,255,0.04)"
                        : "transparent",
                    boxShadow: isHighlighted ? `0 0 0 1px ${n.color}55` : "none",
                  }}
                >
                  {/* MILESTONE ROW EMPHASIS: Fades in a soft, low-opacity backdrop band reflecting branch colors */}
                  {isMilestone && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 0.04 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: n.revealDelay }}
                      className="absolute inset-y-0 -left-4 right-0 rounded-l-md pointer-events-none -z-[5]"
                      style={{ backgroundColor: n.color === "#ffffff" ? "#9ca3af" : n.color }}
                    />
                  )}

                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums pt-[2px]">
                    {/* 2. SEMANTIC ICONS: Prefixed dynamically according to the matched message criteria */}
                    <CommitIcon
                      message={n.message}
                      color={n.isHead ? "#34d399" : n.isMain ? "#9ca3af" : n.textColor}
                    />
                    <span style={{ color: n.isHead ? "#34d399" : "#6b7280", fontSize: 12 }}>
                      {n.hash}
                    </span>
                  </div>
                  <span
                    className="leading-snug break-words"
                    style={{
                      color: n.textColor,
                      // MILESTONE ROW EMPHASIS: Gives milestone titles a slight relative font size lift
                      fontSize: isMilestone ? 14 : 13,
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
            radial-gradient(circle at 15% 20%, rgba(245,158,11,0.035), transparent 45%),
            radial-gradient(circle at 85% 55%, rgba(167,139,250,0.035), transparent 45%),
            radial-gradient(circle at 25% 85%, rgba(52,211,153,0.035), transparent 45%);
          background-size: 160% 160%;
          animation: graph-ambient-drift 24s ease-in-out infinite;
          opacity: 0.65;
          transition: background-color 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes graph-ambient-drift {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 60%; }
        }
      `}</style>
    </>
  );
}
