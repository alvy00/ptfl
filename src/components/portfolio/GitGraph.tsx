/* eslint-disable prettier/prettier */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { CommitModal, type CommitSelection } from "./CommitModal";
import type { ProjectKey } from "@/data/portfolio/projects";
import { bugfixes, type BugfixKey } from "@/data/portfolio/bugfixes";

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

const ROW_H = 56;
const TOP_PAD = 48;
const MAIN_X = 28;
const LANE_W = 40;
const TOTAL_LANES = 6; // main(0) auc(1) bug-auc(2) asset(3) career(4) bug-career(5)
const GRAPH_W = MAIN_X + LANE_W * TOTAL_LANES;

const yOf = (row: number) => TOP_PAD + row * ROW_H;
const laneX = (lane: number) => MAIN_X + lane * LANE_W;

const mainCommits: MainCommit[] = [
  { hash: "a1b2c3d", message: "enroll: begin Chemical Engineering at RUET", row: 0 },
  { hash: "e4f5g6h", message: "learn: start self-teaching full-stack web development", row: 1 },
  { hash: "i7j8k9l", message: "apply: first internship application push", row: 8 },
  { hash: "HEAD", message: "open to internship / junior developer roles", row: 19 },
];

const branches: Branch[] = [
  {
    name: "feat/auctasync",
    projectKey: "auctasync",
    color: "#f59e0b",
    lane: 1,
    sourceY: yOf(1) + 22,
    mergeY: yOf(8) - 22,
    delay: 1.0,
    commits: [
      { hash: "b1c2d3e", message: "feat(auctasync): scaffold real-time auction platform", row: 2 },
      { hash: "b4f5g6h", message: "feat(auctasync): implement WebSocket bidding core", row: 3 },
      { hash: "b7i8j9k", message: "feat(auctasync): integrate SSLCommerz payment gateway", row: 6 },
      {
        hash: "b0l1m2n",
        message:
          "feat(auctasync): production deployment and load validation for concurrent bidding",
        row: 7,
      },
    ],
  },
  {
    name: "feat/assetverse",
    projectKey: "assetverse",
    color: "#a78bfa",
    lane: 3,
    sourceY: yOf(8) + 22,
    mergeY: yOf(12) + 28,
    delay: 1.5,
    commits: [
      {
        hash: "d1e2f3g",
        message: "feat(assetverse): scaffold role-based asset management system",
        row: 9,
      },
      {
        hash: "d4g5h6i",
        message: "feat(assetverse): implement RBAC with role hierarchy and permission checks",
        row: 10,
      },
      {
        hash: "d7h8i9j",
        message: "feat(assetverse): build audit trail logging every asset state change",
        row: 11,
      },
      {
        hash: "d7k8l9m",
        message: "feat(assetverse): milestone — full audit trail across asset lifecycle shipped",
        row: 12,
      },
    ],
  },
  {
    name: "feat/careerpilot",
    projectKey: "careerpilot",
    color: "#34d399",
    lane: 4,
    sourceY: yOf(13) - 28,
    mergeY: yOf(18) + 28,
    delay: 2.0,
    commits: [
      {
        hash: "c1d2e3f",
        message: "feat(careerpilot): scaffold career roadmap generator, define user input flow",
        row: 13,
      },
      {
        hash: "c4g5h6i",
        message: "feat(careerpilot): integrate LLM API for personalized roadmap generation",
        row: 14,
      },
      {
        hash: "c7h8i9j",
        message: "feat(careerpilot): build voice-based mock interview pipeline",
        row: 15,
      },
      {
        hash: "c7j8k9l",
        message: "feat(careerpilot): milestone — end-to-end roadmap + voice interview flow shipped",
        row: 18,
      },
    ],
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
    commits: [
      {
        hash: "ra1c2d3",
        message:
          "fix(auctasync): [PLACEHOLDER] reproduce and isolate race condition in concurrent bid updates",
        row: 4,
      },
      {
        hash: "ra4e5f6",
        message:
          "fix(auctasync): [PLACEHOLDER] resolve race condition with server-authoritative bid ordering",
        row: 5,
      },
    ],
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
    commits: [
      {
        hash: "sc1d2e3",
        message:
          "fix(careerpilot): [PLACEHOLDER] reproduce and isolate session-state bug in voice interview flow",
        row: 16,
      },
      {
        hash: "sc4f5g6",
        message:
          "fix(careerpilot): [PLACEHOLDER] resolve session-state bug with corrected state management",
        row: 17,
      },
    ],
  },
];

const TOTAL_ROWS = 20;
const HEIGHT = TOP_PAD * 2 + (TOTAL_ROWS - 1) * ROW_H;

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
  isHead?: boolean;
  isMain?: boolean;
  isBugfix?: boolean;
  revealAt: number;
  projectKey?: ProjectKey;
  commitIndex?: number;
  commitTotal?: number;
  bugfixKey?: BugfixKey;
  bugfixCommitIndex?: number;
};

export function GitGraph() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selection, setSelection] = useState<CommitSelection | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    function onHighlight(e: Event) {
      const hash = (e as CustomEvent<string>).detail;
      if (!hash) return;
      const el = document.getElementById(`commit-${hash}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlighted(hash);
      window.setTimeout(() => setHighlighted((h) => (h === hash ? null : h)), 1800);
    }
    window.addEventListener("highlight-commit", onHighlight as EventListener);
    return () => window.removeEventListener("highlight-commit", onHighlight as EventListener);
  }, []);

  const allNodes: NodeMeta[] = [
    ...mainCommits.map((c, i) => ({
      x: MAIN_X,
      y: yOf(c.row),
      hash: c.hash,
      message: c.message,
      color: "#ffffff",
      isHead: c.hash === "HEAD",
      isMain: true,
      revealAt: 0.15 + i * 0.15,
    })),
    ...branches.flatMap((b) =>
      b.commits.map((c, i) => ({
        x: laneX(b.lane),
        y: yOf(c.row),
        hash: c.hash,
        message: c.message,
        color: b.color,
        revealAt: b.delay + 0.2 + i * 0.18,
        projectKey: b.projectKey,
        commitIndex: i,
        commitTotal: b.commits.length,
      })),
    ),
    ...bugfixBranches.flatMap((b) =>
      b.commits.map((c, i) => ({
        x: laneX(b.lane),
        y: yOf(c.row),
        hash: c.hash,
        message: c.message,
        color: b.color,
        isBugfix: true,
        revealAt: b.delay + 0.2 + i * 0.18,
        bugfixKey: b.bugfixKey,
        bugfixCommitIndex: i,
      })),
    ),
  ];

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
      <div className="relative w-full" style={{ height: HEIGHT }}>
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
              <feGaussianBlur stdDeviation="4" result="blur" />
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
            y2={yOf(TOTAL_ROWS - 1)}
            stroke="#ffffff"
            strokeWidth={4}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
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
              animate={{ pathLength: 1, opacity: 0.9 }}
              transition={{ duration: 0.9, ease: "easeInOut", delay: b.delay }}
            />
          ))}

          {/* bugfix branches — dashed detour + recovery */}
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
              animate={{ opacity: 0.85 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: b.delay }}
            />
          ))}

          {/* nodes (visual only; interactive hitboxes are in HTML overlay) */}
          {allNodes.map((n) => {
            const isHovered = hovered === n.hash;
            const isHighlighted = highlighted === n.hash;
            const baseR = n.isHead ? 7 : n.isMain ? 6 : n.isBugfix ? 4 : 5;
            return (
              <motion.g
                key={n.hash}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: isHovered || isHighlighted ? 1.25 : 1 }}
                transition={
                  isHovered || isHighlighted
                    ? { duration: 0.2, ease: "easeOut" }
                    : { duration: 0.35, ease: "easeOut", delay: n.revealAt }
                }
                style={{ transformOrigin: `${n.x}px ${n.y}px`, transformBox: "fill-box" as const }}
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
                  fill="#0b0c10"
                  stroke={n.isHead ? "#34d399" : n.color}
                  strokeWidth={n.isHead ? 2.5 : n.isBugfix ? 1.5 : 2}
                  strokeDasharray={n.isBugfix ? "2 1.5" : undefined}
                  filter={n.isHead ? "url(#head-glow)" : undefined}
                />
              </motion.g>
            );
          })}
        </svg>

        {/* Interactive overlay: row = hitbox for node + label */}
        <div className="absolute inset-0">
          {allNodes.map((n) => {
            const isHovered = hovered === n.hash;
            const isHighlighted = highlighted === n.hash;
            return (
              <motion.button
                key={n.hash}
                id={`commit-${n.hash}`}
                type="button"
                onClick={(e) => openCommit(n, e)}
                onMouseEnter={() => setHovered(n.hash)}
                onMouseLeave={() => setHovered((h) => (h === n.hash ? null : h))}
                onFocus={() => setHovered(n.hash)}
                onBlur={() => setHovered((h) => (h === n.hash ? null : h))}
                title={n.message}
                aria-label={`${n.hash} ${n.message}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: n.revealAt + 0.05 }}
                className="absolute flex items-start gap-3 rounded-md px-1 py-0.5 text-left transition-colors"
                style={{
                  top: n.y,
                  left: GRAPH_W + 8,
                  right: 0,
                  transform: "translateY(-50%)",
                  background: isHighlighted
                    ? `${n.color}22`
                    : isHovered
                      ? "rgba(255,255,255,0.04)"
                      : "transparent",
                  boxShadow: isHighlighted ? `0 0 0 1px ${n.color}55` : "none",
                }}
              >
                <span
                  className="shrink-0 tabular-nums pt-[2px]"
                  style={{ color: n.isHead ? "#34d399" : "#6b7280", fontSize: 12 }}
                >
                  {n.hash}
                </span>
                <span
                  className="leading-snug break-words"
                  style={{
                    color: n.isHead ? "#34d399" : n.isMain ? "#ffffff" : n.color,
                    fontSize: 13,
                    fontWeight: n.isMain || n.isHead ? 500 : 400,
                    fontStyle: n.isBugfix ? "italic" : "normal",
                    opacity: n.isBugfix ? 0.9 : 1,
                    textShadow: isHovered ? `0 0 12px ${n.color}66` : "none",
                  }}
                >
                  {n.message}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <CommitModal selection={selection} onClose={() => setSelection(null)} />
    </>
  );
}
