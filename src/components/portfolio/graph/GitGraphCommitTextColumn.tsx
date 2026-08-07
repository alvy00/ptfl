import type { useSpring } from "framer-motion";
import type { MouseEvent } from "react";

import type { Layout, NodeMeta } from "@/lib/portfolio/gitGraphTypes";
import { GitGraphCommitRow } from "./GitGraphCommitRow";

/**
 * The commit text column — its left offset tracks the (responsive) graph
 * width directly, so it and the SVG graph always line up at every tier.
 * Kept in sync with the active-border wrapper's right offset in GitGraph —
 * both need to match or the text column and its hover border box drift
 * apart horizontally.
 */
export function GitGraphCommitTextColumn({
  allNodes,
  graphW,
  textColumnGapPx,
  hovered,
  highlighted,
  focusedBranch,
  isDimmed,
  reduceMotion,
  progress,
  rowH,
  onOpen,
  onEnter,
  onLeave,
}: {
  allNodes: NodeMeta[];
  graphW: number;
  textColumnGapPx: number;
  hovered: string | null;
  highlighted: string | null;
  focusedBranch: string | undefined;
  isDimmed: (group: string) => boolean;
  reduceMotion: boolean;
  progress: ReturnType<typeof useSpring>;
  rowH: Layout["rowH"];
  onOpen: (n: NodeMeta, evt?: MouseEvent) => void;
  onEnter: (n: NodeMeta) => void;
  onLeave: (n: NodeMeta) => void;
}) {
  return (
    <ul
      className="absolute inset-y-0 right-4 sm:right-10 pointer-events-none list-none m-0 p-0"
      style={{ left: `calc(${graphW}px + ${textColumnGapPx}px)` }}
    >
      {allNodes.map((n) => (
        <GitGraphCommitRow
          key={n.hash}
          n={n}
          isHovered={hovered === n.hash}
          isHighlighted={highlighted === n.hash}
          dimmed={isDimmed(n.branchGroup)}
          // `dimmed` only tells a row "some OTHER branch has focus" — both
          // "my branch is focused" and "nothing is focused" read as
          // dimmed=false, so it can't drive a brighten-on-focus effect by
          // itself. This is the positive signal: true only when THIS
          // row's own branch is the one currently focused.
          branchFocused={n.branchGroup !== "main" && n.branchGroup === focusedBranch}
          reduceMotion={reduceMotion}
          progress={progress}
          rowH={rowH}
          onOpen={onOpen}
          onEnter={() => onEnter(n)}
          onLeave={() => onLeave(n)}
        />
      ))}
    </ul>
  );
}
