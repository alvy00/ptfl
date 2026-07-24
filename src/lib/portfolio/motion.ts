/* eslint-disable prettier/prettier */
import type { Variants } from "framer-motion";

// Every factory below takes `reduce` (from framer-motion's useReducedMotion())
// and returns a motion-free variant set when true — instant opacity/position
// snaps instead of springs, and no infinite/looping animation. Call these
// once per component render; they're cheap plain-object builders, not hooks.

/** Large panel/section entrance — heavier, more "weighted" spring than badges. */
export function containerVariants(reduce: boolean): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: reduce
        ? { duration: 0 }
        : { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };
}

/** Individual block within a container (heading, paragraph, stat card). */
export function itemVariants(reduce: boolean): Variants {
  return {
    hidden: reduce ? { opacity: 0 } : { y: 16, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: reduce
        ? { duration: 0.15 }
        : { type: "spring", stiffness: 140, damping: 28, mass: 1.1 },
    },
  };
}

/** Badge/pill container stagger — faster cadence than large panels since badges are small. */
export function badgeContainerVariants(reduce: boolean): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: reduce ? { duration: 0 } : { staggerChildren: 0.04 },
    },
  };
}

/** Individual badge/pill — quick, snappy spring (micro-interaction, not a layout element). */
export function badgeVariants(reduce: boolean): Variants {
  return {
    hidden: reduce ? { opacity: 0 } : { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: reduce
        ? { duration: 0.1 }
        : { type: "spring", stiffness: 420, damping: 24 },
    },
  };
}

/** Hover lift for actually-clickable cards (e.g. the LeetCode stat card). */
export function cardHoverVariants(reduce: boolean) {
  if (reduce) return { hover: {} };
  return {
    hover: {
      y: -4,
      borderColor: "rgba(52, 211, 153, 0.3)",
      boxShadow: "0 10px 30px -10px rgba(52, 211, 153, 0.15)",
      transition: { type: "spring", stiffness: 400, damping: 25 },
    },
  };
}
