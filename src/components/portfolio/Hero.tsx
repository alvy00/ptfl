/* eslint-disable prettier/prettier */
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { FileTab } from "./FileTab";
import { theme } from "@/lib/portfolio/theme";
import {
  containerVariants,
  itemVariants,
  badgeContainerVariants,
  badgeVariants,
} from "@/lib/portfolio/motion";

const TECH_TAGS = ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL"];

export function Hero() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);

  // Subtle scroll-driven parallax: the hero panel drifts and fades slightly
  // as the user scrolls past it, rather than only ever animating once on
  // mount. Kept intentionally subtle — this is a "hello" panel, not a hero
  // banner that should fight for attention on the way out.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -24]);
  const parallaxOpacity = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.75]);

  const container = containerVariants(reduce);
  const item = itemVariants(reduce);
  const badgeContainer = badgeContainerVariants(reduce);
  const badge = badgeVariants(reduce);

  return (
    <motion.header
      ref={ref}
      className="mb-10 sm:mb-12"
      initial="hidden"
      animate="visible"
      variants={container}
      style={{ y: parallaxY, opacity: parallaxOpacity }}
    >
      <FileTab label="README.md" dotColor={theme.green} pulse reduceMotion={reduce} />

      <motion.div
        variants={item}
        className="rounded-b-md rounded-tr-md border p-5 sm:p-7 backdrop-blur-sm relative overflow-hidden transition-all duration-300"
        style={{ borderColor: theme.border, background: theme.panelBg }}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        <motion.h1
          variants={item}
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-white flex items-center gap-2"
        >
          Alvy
        </motion.h1>

        {/* Body copy in sans-serif — breaks the font-mono monotony flagged
            across headings/labels/body alike, and matches the precedent
            already set in CommitModal.tsx, which uses font-sans for prose
            while keeping mono for hashes/labels. */}
        <motion.p
          variants={item}
          className="mt-3 text-gray-400 text-base sm:text-lg leading-relaxed max-w-3xl font-sans"
        >
          Chemical Engineering student at RUET — self-taught full-stack developer dedicated to
          shipping performant systems and polished interface architectures.
        </motion.p>

        <motion.nav
          variants={badgeContainer}
          className="mt-6 sm:mt-7 flex flex-wrap gap-2"
          aria-label="Technology and availability tags"
        >
          <motion.span
            variants={badge}
            whileHover={reduce ? undefined : { scale: 1.05, y: -1 }}
            className="rounded-full border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-[13px] cursor-default font-medium transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)]"
            style={{ borderColor: `${theme.green}66`, color: theme.green, background: `${theme.green}10` }}
          >
            ● Open to Work
          </motion.span>

          <motion.span
            variants={badge}
            whileHover={reduce ? undefined : { scale: 1.05, y: -1 }}
            className="rounded-full border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-[13px] text-gray-400 cursor-default"
            style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)" }}
          >
            Based in Bangladesh
          </motion.span>

          {TECH_TAGS.map((tag) => (
            <motion.span
              key={tag}
              variants={badge}
              whileHover={
                reduce
                  ? undefined
                  : { scale: 1.05, y: -1, borderColor: "rgba(255,255,255,0.25)", color: "#ffffff" }
              }
              className="rounded-full border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-[13px] text-gray-400 cursor-default transition-colors duration-200"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
            >
              {tag}
            </motion.span>
          ))}
        </motion.nav>
      </motion.div>
    </motion.header>
  );
}
