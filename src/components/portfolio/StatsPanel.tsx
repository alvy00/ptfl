/* eslint-disable prettier/prettier */
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { FileTab } from "./FileTab";
import { theme, colorVarToHex } from "@/lib/portfolio/theme";
import { languageStats, statCards } from "@/data/portfolio/stats";
import {
  containerVariants,
  itemVariants,
  cardHoverVariants,
} from "@/lib/portfolio/motion";

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
          {statCards.map((card) =>
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
                <span
                  className="text-base sm:text-lg font-semibold mt-1.5 group-hover:underline decoration-[#34d399]/40 tracking-tight"
                  style={{ color: theme.green }}
                >
                  {card.value}
                </span>
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
                <span className="text-base sm:text-lg font-semibold text-white mt-1.5">
                  {card.value}
                </span>
              </motion.div>
            ),
          )}
        </motion.div>

        <div className="space-y-4 border-t pt-5 sm:pt-6" style={{ borderColor: theme.borderSubtle }}>
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
      </div>
    </section>
  );
}
