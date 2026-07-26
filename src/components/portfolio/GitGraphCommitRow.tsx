import { motion } from "framer-motion";
import type { MouseEvent } from "react";

import { PALETTE } from "@/lib/portfolio/gitGraphData";
import type { NodeMeta } from "@/lib/portfolio/gitGraphTypes";

import { CommitIcon } from "./CommitIcon";

export function GitGraphCommitRow({
  n,
  isHovered,
  isHighlighted,
  dimmed,
  reduceMotion,
  onOpen,
  onEnter,
  onLeave,
}: {
  n: NodeMeta;
  isHovered: boolean;
  isHighlighted: boolean;
  dimmed: boolean;
  reduceMotion: boolean;
  onOpen: (n: NodeMeta, evt?: MouseEvent) => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const isMilestone = n.message.toLowerCase().includes("milestone");
  const commitAriaLabel =
    n.branchGroup === "main"
      ? `Commit selection: ${n.hash} ${n.message}`
      : `Commit on ${n.branchGroup}${n.isBugfix ? ", bugfix" : ""}: ${n.hash} ${n.message}`;

  const nodeIdleTransition = (delay: number) =>
    reduceMotion ? { duration: 0.01 } : { duration: 0.35, ease: "easeOut" as const, delay };

  return (
    <li
      className="absolute inset-x-0 flex flex-col pointer-events-auto"
      style={{
        top: n.y,
        transform: "translateY(-50%)",
        opacity: dimmed ? 0.35 : 1,
        transition: reduceMotion ? undefined : "opacity 250ms ease-out",
      }}
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
        onClick={(e) => onOpen(n, e)}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        title={n.message}
        aria-label={commitAriaLabel}
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
              reduceMotion ? { duration: 0.01 } : { duration: 0.5, ease: "easeOut", delay: n.revealDelay }
            }
            className="absolute inset-y-0 -left-3 right-0 rounded-l-md pointer-events-none -z-[5]"
            style={{ backgroundColor: n.color === PALETTE.mainLine ? "#9ca3af" : n.color }}
          />
        )}

        <div className="flex items-center gap-1.5 shrink-0 tabular-nums pt-[2px]">
          <CommitIcon
            message={n.message}
            color={n.isHead ? PALETTE.head : n.isMain ? "#9ca3af" : n.textColor}
          />
          <span
            className="font-mono text-[11px] sm:text-[13px]"
            style={{ color: n.isHead ? PALETTE.head : "#6b7280" }}
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
    </li>
  );
}
