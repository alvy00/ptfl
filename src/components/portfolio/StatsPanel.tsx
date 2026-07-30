/* eslint-disable prettier/prettier */
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { FileTab } from "./FileTab";
import { theme, colorVarToHex } from "@/lib/portfolio/theme";
import { languageStats, statCards } from "@/data/portfolio/stats";
import { containerVariants, itemVariants, cardHoverVariants } from "@/lib/portfolio/motion";

// "Commit Summary" finish-line pop: each metric value gets its own small
// scale-up spring the instant its card becomes visible, turning the panel
// from "text that happened to fade in" into something that reads as a
// result actually landing. Deliberately a *variant*, not its own
// initial/whileInView pair — the card above it (motion.a / motion.div,
// using `item`) is already a motion component observing the container's
// `whileInView="visible"`, and Framer Motion propagates a named animation
// state down through any chain of motion components that also declare
// `variants` — this just needs to declare `visible`/`hidden` under the
// same names to pick up that same trigger for free, rather than paying for
// a second IntersectionObserver per number.
//
// Addition on top of the base ask: a brief brightness flash timed to land
// just after the scale settles (`filter`, keyed on its own `times`) — the
// same "brightness lift" language GitGraphNode already uses for its own
// hover-pop elsewhere in this codebase, so this reads as the same visual
// vocabulary rather than a one-off effect invented just for this panel.
// `delay` staggers metrics by index so they pop in sequence — like a
// build log printing results one line at a time — instead of every number
// snapping at once.
function metricPopVariants(reduce: boolean, delay: number) {
  return {
    hidden: { scale: 0.95, opacity: 0, filter: "brightness(1)" },
    visible: {
      scale: 1,
      opacity: 1,
      filter: reduce ? "brightness(1)" : ["brightness(1)", "brightness(1.55)", "brightness(1)"],
      transition: reduce
        ? { duration: 0.15 }
        : {
            scale: { type: "spring" as const, stiffness: 340, damping: 16, mass: 0.5, delay },
            opacity: { duration: 0.3, delay },
            filter: {
              duration: 0.5,
              times: [0, 0.4, 1],
              delay: delay + 0.05,
              ease: "easeOut" as const,
            },
          },
    },
  };
}

// Small, deliberately capped stagger step — statCards is a short, fixed-
// length list (stat tiles, not a long feed), so this never needs to scale
// down dynamically the way a large list's stagger would.
const METRIC_STAGGER = 0.06;

// Sourced directly from the resume — this wasn't represented anywhere in
// the portfolio before. Kept as plain static content in this component
// (not pulled from stats.ts) since it isn't derived/computed data the way
// statCards and languageStats are; it's fixed biographical fact.
const CERTIFICATIONS = [
  "Complete Web Development Bootcamp — Programming Hero",
  "Career Bootcamp 1.0 — CoderVai",
  "Competitive Programming — Codeforces · LeetCode · Codewars",
];

export function StatsPanel() {
  const reduce = useReducedMotion() ?? false;
  const [activeLang, setActiveLang] = useState<string | null>(null);

  const container = containerVariants(reduce);
  const item = itemVariants(reduce);
  const cardHover = cardHoverVariants(reduce);

  const activeEntry = languageStats.find((l) => l.id === activeLang);

  return (
    <section className="mt-10 sm:mt-14" aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Platform Statistics and Architecture Insights
      </h2>

      <FileTab label="stats.json" dotColor={theme.purple} reduceMotion={reduce} />

      <div
        className="rounded-b-md rounded-tr-md border p-5 sm:p-6 backdrop-blur-sm relative"
        style={{ borderColor: theme.border, background: theme.panelBg }}
      >
        {/* Intermediate breakpoint added (sm:grid-cols-2 lg:grid-cols-3) so
            the row doesn't jump straight from a single column to three
            across, which felt cramped on tablet-width viewports. */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-6 sm:mb-7"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={container}
        >
          {statCards.map((card, index) =>
            card.href ? (
              <motion.a
                key={card.id}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                layout
                variants={item}
                whileHover={reduce ? undefined : cardHover.hover}
                className="rounded-md border p-4 sm:p-5 flex flex-col justify-center group transition-all duration-200 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/60"
                style={{ borderColor: theme.border, background: `${theme.green}03` }}
                aria-label={card.ariaLabel}
              >
                <div className="absolute top-0 right-0 p-2 opacity-30 group-hover:opacity-80 transition-opacity duration-200">
                  <span className="text-xs transform inline-block transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    ↗
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  {card.eyebrow}
                </span>
                <motion.span
                  variants={metricPopVariants(reduce, index * METRIC_STAGGER)}
                  className="text-base sm:text-lg font-semibold mt-1.5 group-hover:underline decoration-[#34d399]/40 tracking-tight"
                  style={{ color: theme.green }}
                >
                  {card.value}
                </motion.span>
              </motion.a>
            ) : (
              // Non-clickable stat cards intentionally get no hover lift and
              // no pointer cursor — applying interactive affordances to a
              // static element implies clickability that isn't there.
              <motion.div
                key={card.id}
                layout
                variants={item}
                className="rounded-md border p-4 sm:p-5 flex flex-col justify-center"
                style={{ borderColor: theme.borderSubtle, background: "rgba(255,255,255,0.01)" }}
              >
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  {card.eyebrow}
                </span>
                <motion.span
                  variants={metricPopVariants(reduce, index * METRIC_STAGGER)}
                  className="text-base sm:text-lg font-semibold text-white mt-1.5"
                >
                  {card.value}
                </motion.span>
              </motion.div>
            ),
          )}
        </motion.div>

        <div
          className="space-y-4 border-t pt-5 sm:pt-6"
          style={{ borderColor: theme.borderSubtle }}
        >
          <div className="flex justify-between items-center text-[11px] sm:text-[13px]">
            <span className="text-gray-500 font-medium">Language Breakdown</span>
            {/* aria-live announces the active-language swap to screen reader
                users, who otherwise have no way to know hover/focus changed
                anything here. */}
            <AnimatePresence mode="wait">
              {activeEntry ? (
                <motion.span
                  key={activeEntry.id}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  className="font-semibold"
                  style={{ color: colorVarToHex[activeEntry.colorVar] }}
                  aria-live="polite"
                >
                  {activeEntry.shortLabel}: {activeEntry.pct}%
                </motion.span>
              ) : (
                <span className="text-gray-400 font-medium" aria-live="polite">
                  Metrics
                </span>
              )}
            </AnimatePresence>
          </div>

          {/* Each segment is a real <button>, not a bare div — keyboard and
              screen-reader users can now tab through and activate these the
              same way mouse users hover them. cursor-pointer replaces the
              previous cursor-crosshair, which read as a data-tool cursor
              rather than a standard interactive indicator. */}
          <div
            className="h-3.5 w-full rounded-full flex overflow-hidden bg-gray-900/60 p-[2px] border border-white/5"
            role="group"
            aria-label="Language and technology breakdown by relative usage"
          >
            {languageStats.map((lang) => (
              <motion.button
                key={lang.id}
                type="button"
                onMouseEnter={() => setActiveLang(lang.id)}
                onMouseLeave={() => setActiveLang((cur) => (cur === lang.id ? null : cur))}
                onFocus={() => setActiveLang(lang.id)}
                onBlur={() => setActiveLang((cur) => (cur === lang.id ? null : cur))}
                aria-label={`${lang.label}: ${lang.pct} percent`}
                aria-pressed={activeLang === lang.id}
                style={{ width: `${lang.pct}%`, backgroundColor: colorVarToHex[lang.colorVar] }}
                className="h-full first:rounded-l-full last:rounded-r-full cursor-pointer transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-inset"
                whileHover={reduce ? undefined : { scaleY: 1.15, filter: "brightness(1.2)" }}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-[11px] sm:text-[13px]">
            {languageStats.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onMouseEnter={() => setActiveLang(lang.id)}
                onMouseLeave={() => setActiveLang((cur) => (cur === lang.id ? null : cur))}
                onFocus={() => setActiveLang(lang.id)}
                onBlur={() => setActiveLang((cur) => (cur === lang.id ? null : cur))}
                aria-pressed={activeLang === lang.id}
                className="flex items-center gap-1.5 text-gray-400 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
              >
                <span
                  className="h-2 w-2 rounded-full transition-transform duration-200"
                  style={{
                    backgroundColor: colorVarToHex[lang.colorVar],
                    transform: activeLang === lang.id ? "scale(1.3)" : "scale(1)",
                  }}
                />
                {lang.shortLabel}
                <span className="text-gray-600 text-[10px]">({lang.pct}%)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Certifications & Practice — none of this was represented
            anywhere in the site before. Positioned as the last thing
            before ContributingFooter's own ask: concrete, third-party-
            verifiable credibility signals land better right before "reach
            out" than buried earlier in the page, where a reader hasn't
            yet decided whether to care. Reuses `item` (not the numeric
            metricPopVariants scale-pop above) — these are static badges,
            not "a result landing," and giving every element in the panel
            the same flashy entrance would blunt the one place it's
            actually earning its keep. */}
        <div
          className="space-y-3 border-t pt-5 sm:pt-6 mt-5"
          style={{ borderColor: theme.borderSubtle }}
        >
          <span className="text-gray-500 font-medium text-[11px] sm:text-[13px] block">
            Certifications &amp; Practice
          </span>
          <motion.div
            className="flex flex-wrap gap-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={container}
          >
            {CERTIFICATIONS.map((cert) => (
              <motion.span
                key={cert}
                variants={item}
                className="rounded-full border px-3 py-1 text-[11px] sm:text-[12px] text-gray-300"
                style={{ borderColor: theme.borderSubtle, background: "rgba(255,255,255,0.02)" }}
              >
                {cert}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
