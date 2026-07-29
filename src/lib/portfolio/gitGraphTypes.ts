import type { ProjectKey } from "@/data/portfolio/projects";
import type { BugfixKey } from "@/data/portfolio/bugfixes";

export type Commit = { hash: string; message: string };
export type MainCommit = Commit & { row: number };

export type BranchDef = {
  name: string;
  projectKey: ProjectKey;
  color: string;
  lane: number;
  sourceRow: number;
  mergeRow: number;
  delay: number;
  commits: (Commit & { row: number })[];
};

export type BugfixDef = {
  name: string;
  bugfixKey: BugfixKey;
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
// buildGeometry() (see gitGraphGeometry.ts). This replaces the old approach
// of a fixed-width SVG that relied on the parent page forcing a horizontal
// scrollbar on mobile.
// ---------------------------------------------------------------------------
export type Tier = "xs" | "sm" | "md" | "lg";

export type Layout = {
  rowH: number;
  topPad: number;
  mainX: number;
  laneW: number;
  nodeScale: number;
};

export type NodeMeta = {
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
  /** [start, end] fractions of overall scroll progress (matching the same
   *  0..1 domain `drawRange`/branch `pathLength` use) across which this
   *  node's reveal (opacity + scale) is scrubbed. Replaces a one-shot
   *  whileInView trigger so the node can un-reveal on scroll-up in sync
   *  with its connecting branch line retracting — see GitGraphNode. */
  revealWindow: [number, number];
  /** Which branch this node belongs to, for hover-focus dimming of siblings.
   *  "main" for trunk commits, the branch name (e.g. "feat/auctasync") for
   *  everything else — a bugfix node's group is its *parent* feature branch,
   *  so hovering either highlights both together. */
  branchGroup: string;
};
