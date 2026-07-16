import { motion } from "framer-motion";

type Commit = { hash: string; message: string };

type MainCommit = Commit & { row: number };

type Branch = {
  name: string;
  color: string;
  lane: number; // 1-based lane index (0 = main)
  sourceY: number; // y where the branch forks off main
  mergeY: number; // y where the branch merges back into main
  commits: (Commit & { row: number })[];
  delay: number; // animation stagger
};

const ROW_H = 56;
const TOP_PAD = 48;
const MAIN_X = 28;
const LANE_W = 40;
const GRAPH_W = MAIN_X + LANE_W * 5; // room for 4 branches + 1 future lane


const yOf = (row: number) => TOP_PAD + row * ROW_H;
const laneX = (lane: number) => MAIN_X + lane * LANE_W;

const mainCommits: MainCommit[] = [
  { hash: "a1b2c3d", message: "enroll: begin Chemical Engineering at RUET", row: 0 },
  { hash: "e4f5g6h", message: "learn: start self-teaching full-stack web development", row: 1 },
  { hash: "i7j8k9l", message: "apply: first internship application push", row: 6 },
  { hash: "HEAD", message: "open to internship / junior developer roles", row: 15 },
];

const branches: Branch[] = [
  {
    name: "feat/auctasync",
    color: "#f59e0b",
    lane: 1,
    sourceY: yOf(1) + 22,
    mergeY: yOf(6) - 22,
    delay: 1.0,
    commits: [
      { hash: "b1c2d3e", message: "feat(auctasync): scaffold real-time auction platform", row: 2 },
      { hash: "b4f5g6h", message: "feat(auctasync): implement WebSocket bidding core", row: 3 },
      { hash: "b7i8j9k", message: "feat(auctasync): integrate SSLCommerz payment gateway", row: 4 },
      { hash: "b0l1m2n", message: "feat(auctasync): production deployment and load validation for concurrent bidding", row: 5 },
    ],
  },
  {
    name: "feat/assetverse",
    color: "#a78bfa",
    lane: 2,
    sourceY: yOf(6) + 22,
    mergeY: yOf(10) + 28,
    delay: 1.5,
    commits: [
      { hash: "d1e2f3g", message: "feat(assetverse): scaffold role-based asset management system", row: 7 },
      { hash: "d4g5h6i", message: "feat(assetverse): implement RBAC with role hierarchy and permission checks", row: 8 },
      { hash: "d7h8i9j", message: "feat(assetverse): build audit trail logging every asset state change", row: 9 },
      { hash: "d7k8l9m", message: "feat(assetverse): milestone — full audit trail across asset lifecycle shipped", row: 10 },
    ],
  },
  {
    name: "feat/careerpilot",
    color: "#34d399",
    lane: 3,
    sourceY: yOf(11) - 28,
    mergeY: yOf(14) + 28,
    delay: 2.0,
    commits: [
      { hash: "c1d2e3f", message: "feat(careerpilot): scaffold career roadmap generator, define user input flow", row: 11 },
      { hash: "c4g5h6i", message: "feat(careerpilot): integrate LLM API for personalized roadmap generation", row: 12 },
      { hash: "c7h8i9j", message: "feat(careerpilot): build voice-based mock interview pipeline", row: 13 },
      { hash: "c7j8k9l", message: "feat(careerpilot): milestone — end-to-end roadmap + voice interview flow shipped", row: 14 },
    ],
  },
];

const TOTAL_ROWS = 16;
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

export function GitGraph() {
  const allNodes: {
    x: number;
    y: number;
    hash: string;
    message: string;
    color: string;
    isHead?: boolean;
    isMain?: boolean;
    revealAt: number;
  }[] = [
    ...mainCommits.map((c, i) => ({
      x: MAIN_X,
      y: yOf(c.row),
      hash: c.hash,
      message: c.message,
      color: "#e5e7eb",
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
      })),
    ),
  ];

  return (
    <div
      className="relative w-full"
      style={{ height: HEIGHT }}
    >
      {/* SVG graph layer */}
      <svg
        className="absolute inset-y-0 left-0"
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

        {/* main spine — draws first, thickest + brightest so it reads as the timeline */}
        <motion.line
          x1={MAIN_X}
          y1={yOf(0)}
          x2={MAIN_X}
          y2={yOf(15)}
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        />


        {/* branches */}
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

        {/* nodes */}
        {allNodes.map((n) => (
          <motion.g
            key={n.hash}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: n.revealAt }}
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
            <circle
              cx={n.x}
              cy={n.y}
              r={n.isHead ? 7 : n.isMain ? 6 : 5}
              fill="#0b0c10"
              stroke={n.isHead ? "#34d399" : n.color}
              strokeWidth={n.isHead ? 2.5 : 2}
              filter={n.isHead ? "url(#head-glow)" : undefined}
            />
          </motion.g>
        ))}
      </svg>

      {/* Message labels — HTML overlay for natural truncation */}
      <div className="absolute inset-y-0 right-0" style={{ left: GRAPH_W }}>
        {allNodes.map((n) => (
          <motion.div
            key={n.hash}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: n.revealAt + 0.05 }}
            className="absolute flex items-center gap-3 pr-4"
            style={{ top: n.y - 12, left: 12, right: 0, height: 24 }}
          >
            <span
              className="shrink-0 tabular-nums"
              style={{ color: n.isHead ? "#34d399" : "#6b7280", fontSize: 12 }}
            >
              {n.hash}
            </span>
            <span
              className="truncate"
              style={{
                color: n.isHead ? "#34d399" : n.isMain ? "#e5e7eb" : n.color,
                fontSize: 13,
                opacity: n.isMain || n.isHead ? 1 : 0.92,
              }}
              title={n.message}
            >
              {n.message}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
