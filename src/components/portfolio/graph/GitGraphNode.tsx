import { motion, useTransform, type MotionValue } from "framer-motion";

import { PALETTE } from "@/lib/portfolio/gitGraphData";
import type { NodeMeta } from "@/lib/portfolio/gitGraphTypes";

export function GitGraphNode({
  n,
  isHovered,
  isHighlighted,
  dimmed,
  nodeScale,
  reduceMotion,
  progress,
}: {
  n: NodeMeta;
  isHovered: boolean;
  isHighlighted: boolean;
  dimmed: boolean;
  nodeScale: number;
  reduceMotion: boolean;
  /** Same scroll-progress motion value (0..1) that drives the branch
   *  paths' pathLength. Used to scrub this node's reveal in sync with its
   *  connecting line, instead of the old whileInView(once: true) pop —
   *  which played once and never reversed, so scrolling back up erased
   *  the branch line but left the commit dot stuck fully opaque with
   *  nothing connecting it. */
  progress: MotionValue<number>;
}) {
  const baseR = (n.isHead ? 7.5 : n.isMain ? 6.5 : n.isBugfix ? 4.5 : 5.5) * nodeScale;

  // Trunk "learn"/"achieve" milestones get a sonar pulse to draw the eye.
  // Deliberately a different concept from `isMilestone` in
  // GitGraphCommitRow (that one means "message contains the literal word
  // 'milestone'", for feature-branch commits like "feat(auctasync):
  // milestone — ..." — unrelated, just a name collision to watch for).
  const lowerMsg = n.message.toLowerCase();
  const isTrunkHighlight =
    n.isMain && !n.isHead && (lowerMsg.includes("learn") || lowerMsg.includes("achieve"));

  const nodeIdleTransition = (delay: number) =>
    reduceMotion ? { duration: 0.01 } : { duration: 0.35, ease: "easeOut" as const, delay };
  // Snappier than the old 300/20 — a magnetic hover should feel like it
  // *snapped* to the cursor, not eased into place. Only used for the
  // active (hover/highlight) state; idle reveal keeps its own gentler
  // timing above so the initial graph draw-in isn't sped up too.
  const nodeActiveTransition = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 420, damping: 22, mass: 0.6 };
  const dimTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.25, ease: "easeOut" as const };

  // Reversible reveal: scrubbed directly off scroll progress across this
  // node's own [start, end] row window (see nodeRevealWindow), the same
  // way the branch <motion.path>'s pathLength is scrubbed off drawRange.
  // Scrolling down plays it forward; scrolling back up plays it in
  // reverse — unlike the old whileInView(once:true), which could only
  // ever go from hidden -> shown, one time, forever.
  const revealOpacity = useTransform(progress, n.revealWindow, [0, 1]);
  const revealScale = useTransform(progress, n.revealWindow, [0.4, 1]);

  return (
    <motion.g
      style={{
        transformOrigin: `${n.x}px ${n.y}px`,
        opacity: reduceMotion ? 1 : revealOpacity,
        scale: reduceMotion ? 1 : revealScale,
      }}
    >
      <motion.g
        animate={{
          scale: isHovered || isHighlighted ? 1.25 : 1,
          opacity: dimmed ? 0.3 : 1,
          // Brightness lift is what actually sells "alive" — pure scale
          // reads as "bigger," scale + brightness reads as "lit up."
          // Highlighted (the click-pulse ring state) skips this since it
          // already has its own dedicated glow ring below; stacking a
          // second brightness pass on top of that would blow it out.
          filter: isHovered && !isHighlighted ? "brightness(1.35)" : "brightness(1)",
        }}
        transition={{
          scale:
            isHovered || isHighlighted ? nodeActiveTransition : nodeIdleTransition(n.revealDelay),
          opacity: dimTransition,
          filter: reduceMotion ? { duration: 0.01 } : { duration: 0.2, ease: "easeOut" },
        }}
        style={{
          transformOrigin: `${n.x}px ${n.y}px`,
          willChange: "transform, opacity, filter",
          cursor: "pointer",
        }}
      >
        {n.isHead && (
          <motion.circle
            cx={n.x}
            cy={n.y}
            r={12.5 * nodeScale}
            fill={PALETTE.head}
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
            style={{ willChange: "transform, opacity" }}
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
              reduceMotion ? { duration: 0.2 } : { duration: 1.2, ease: "easeOut", repeat: 1 }
            }
            style={{ filter: `drop-shadow(0 0 8px ${n.color})`, willChange: "transform, opacity" }}
          />
        )}
        {isHovered && !n.isHead && !isHighlighted && (
          <motion.circle
            cx={n.x}
            cy={n.y}
            fill={n.color}
            initial={{ r: baseR, opacity: 0 }}
            animate={{ r: baseR + 7, opacity: 0.32 }}
            exit={{ r: baseR, opacity: 0 }}
            transition={nodeActiveTransition}
            style={{ filter: `drop-shadow(0 0 10px ${n.color})`, willChange: "transform, opacity" }}
          />
        )}
        {isHighlighted && !n.isHead && (
          <circle
            cx={n.x}
            cy={n.y}
            r={baseR + 5}
            fill={n.color}
            opacity={0.4}
            style={{ filter: `drop-shadow(0 0 6px ${n.color})` }}
          />
        )}
        {isTrunkHighlight && (
          <motion.circle
            cx={n.x}
            cy={n.y}
            r={baseR}
            fill="none"
            stroke={PALETTE.mainText}
            strokeWidth={1.5}
            initial={{ scale: 1, opacity: 0.8 }}
            whileInView={reduceMotion ? { scale: 1, opacity: 0.5 } : { scale: 2.2, opacity: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={
              reduceMotion
                ? { duration: 0.01 }
                : {
                    duration: 1.5,
                    ease: "easeOut",
                    repeat: Infinity,
                    repeatDelay: 1,
                    delay: n.revealDelay, // slight per-node stagger so trunk pulses aren't all in lockstep
                  }
            }
            style={{ transformOrigin: `${n.x}px ${n.y}px`, willChange: "transform, opacity" }}
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
            fill={PALETTE.bg}
            stroke={n.color}
            strokeWidth={1.75}
            strokeDasharray="2 1.5"
          />
        ) : (
          <circle
            cx={n.x}
            cy={n.y}
            r={baseR}
            fill={PALETTE.bg}
            stroke={n.isHead ? PALETTE.head : n.color}
            strokeWidth={n.isHead ? 2.5 : 2}
            filter={n.isHead ? "url(#head-glow)" : undefined}
          />
        )}
      </motion.g>
    </motion.g>
  );
}
