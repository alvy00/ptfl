/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { GitGraph } from "@/components/portfolio/GitGraph";
import { GlobalSearch } from "@/components/portfolio/GlobalSearch";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alvy — Developer Portfolio" },
      {
        name: "description",
        content:
          "Chemical Engineering student at RUET and self-taught full-stack developer. Career visualized as a Git commit graph.",
      },
      { property: "og:title", content: "Alvy — Developer Portfolio" },
      {
        property: "og:description",
        content:
          "Chemical Engineering student at RUET and self-taught full-stack developer. Career visualized as a Git commit graph.",
      },
    ],
  }),
  component: Index,
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 200, damping: 22 },
  },
} as const;

const badgeContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
} as const;

const badgeVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
} as const;

const cardHoverVariants = {
  hover: {
    y: -4,
    borderColor: "rgba(52, 211, 153, 0.3)",
    boxShadow: "0 10px 30px -10px rgba(52, 211, 153, 0.15)",
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
};

export function Index() {
  const [activeLang, setActiveLang] = useState<string | null>(null);

  const languages = [
    { id: "ts-js", label: "TypeScript/JavaScript", pct: "40%", color: "#34d399" },
    { id: "node", label: "Node.js/Express", pct: "25%", color: "#a78bfa" },
    { id: "db", label: "Database (Mongo/Postgres)", pct: "20%", color: "#f59e0b" },
    { id: "ui", label: "CSS/Tailwind/Motion", pct: "15%", color: "rgba(255,255,255,0.3)" },
  ];

  return (
    <main
      className="min-h-screen px-4 sm:px-8 py-12 sm:py-20 font-mono text-sm sm:text-base selection:bg-[#34d39922] selection:text-[#34d399]"
      style={{ backgroundColor: "#0e0f13", color: "#e5e7eb" }}
    >
      <div className="mx-auto max-w-4xl w-full">
        {/* Profile / Header Panel */}
        <motion.header
          className="mb-10 sm:mb-12"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* README.md File Tab Accent */}
          <motion.div
            variants={itemVariants}
            className="mb-0 inline-flex items-center gap-2 rounded-t-md border border-b-0 px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
          >
            <motion.span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: "#34d399" }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            README.md
          </motion.div>

          {/* Core Panel */}
          <motion.div
            variants={itemVariants}
            className="rounded-b-md rounded-tr-md border p-5 sm:p-7 backdrop-blur-sm relative overflow-hidden transition-all duration-300"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

            <motion.h1
              variants={itemVariants}
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-white flex items-center gap-2"
            >
              Alvy
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-3 text-gray-400 text-base sm:text-lg leading-relaxed max-w-3xl"
            >
              Chemical Engineering student at RUET — self-taught full-stack developer dedicated to
              shipping performant systems and polished interface architectures.
            </motion.p>

            {/* Cascading Tech Shields Container */}
            <motion.nav
              variants={badgeContainerVariants}
              className="mt-6 sm:mt-7 flex flex-wrap gap-2"
              aria-label="Technology and availability tags"
            >
              <motion.span
                variants={badgeVariants}
                whileHover={{ scale: 1.05, y: -1 }}
                className="rounded-full border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-[13px] cursor-default font-medium transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                style={{ borderColor: "#34d39966", color: "#34d399", background: "#34d39910" }}
              >
                ● Open to Work
              </motion.span>

              <motion.span
                variants={badgeVariants}
                whileHover={{ scale: 1.05, y: -1 }}
                className="rounded-full border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-[13px] text-gray-400 cursor-default"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                Based in Bangladesh
              </motion.span>

              {["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL"].map((tag) => (
                <motion.span
                  key={tag}
                  variants={badgeVariants}
                  whileHover={{
                    scale: 1.05,
                    y: -1,
                    borderColor: "rgba(255,255,255,0.25)",
                    color: "#ffffff",
                  }}
                  className="rounded-full border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-[13px] text-gray-400 cursor-default transition-colors duration-200"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  {tag}
                </motion.span>
              ))}
            </motion.nav>
          </motion.div>
        </motion.header>

        {/* System Interfaces */}
        <div className="space-y-6 sm:space-y-8 overflow-hidden">
          <GlobalSearch />
          <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
            <div className="min-w-[500px] sm:min-w-0">
              <GitGraph />
            </div>
          </div>
        </div>

        {/* Git/Insights Stats File View Section */}
        <section className="mt-10 sm:mt-14" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Platform Statistics and Architecture Insights
          </h2>

          <div
            className="mb-0 inline-flex items-center gap-2 rounded-t-md border border-b-0 px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: "#a78bfa" }}
            />
            stats.json
          </div>

          <div
            className="rounded-b-md rounded-tr-md border p-5 sm:p-6 backdrop-blur-sm relative"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}
          >
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6 sm:mb-7"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              <motion.div
                variants={itemVariants}
                whileHover="hover"
                className="rounded-md border p-4 sm:p-5 flex flex-col justify-center transition-colors duration-200"
                style={{
                  borderColor: "rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Deployments
                </span>
                <span className="text-base sm:text-lg font-semibold text-white mt-1.5">
                  3 Projects Shipped
                </span>
              </motion.div>

              <motion.div
                variants={itemVariants}
                whileHover="hover"
                className="rounded-md border p-4 sm:p-5 flex flex-col justify-center transition-colors duration-200"
                style={{
                  borderColor: "rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Stability
                </span>
                <span className="text-base sm:text-lg font-semibold text-white mt-1.5">
                  2 Bugs Squashed
                </span>
              </motion.div>

              <motion.a
                href="https://leetcode.com/u/alvy00/"
                target="_blank"
                rel="noopener noreferrer"
                variants={itemVariants}
                whileHover="hover"
                className="rounded-md border p-4 sm:p-5 flex flex-col justify-center group transition-all duration-200 relative overflow-hidden"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(52,211,153,0.01)",
                }}
                aria-label="Open Alvy's LeetCode profile in a new window"
              >
                <div className="absolute top-0 right-0 p-2 opacity-30 group-hover:opacity-80 transition-opacity duration-200">
                  <span className="text-xs transform inline-block transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    ↗
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Algorithms
                </span>
                <span className="text-base sm:text-lg font-semibold text-[#34d399] mt-1.5 group-hover:underline decoration-[#34d399]/40 tracking-tight">
                  Competitive Programmer
                </span>
              </motion.a>
            </motion.div>

            <div
              className="space-y-4 border-t pt-5 sm:pt-6"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div className="flex justify-between items-center text-[11px] sm:text-[13px]">
                <span className="text-gray-500 font-medium">Language Breakdown</span>
                <AnimatePresence mode="wait">
                  {activeLang ? (
                    <motion.span
                      key={activeLang}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-[#34d399] font-semibold"
                    >
                      {languages.find((l) => l.id === activeLang)?.label}:{" "}
                      {languages.find((l) => l.id === activeLang)?.pct}
                    </motion.span>
                  ) : (
                    <span className="text-gray-400 font-medium">Metrics</span>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-3.5 w-full rounded-full flex overflow-hidden bg-gray-900/60 p-[2px] border border-white/5">
                {languages.map((lang) => (
                  <motion.div
                    key={lang.id}
                    onMouseEnter={() => setActiveLang(lang.id)}
                    onMouseLeave={() => setActiveLang(null)}
                    style={{ width: lang.pct, backgroundColor: lang.color }}
                    className="h-full first:rounded-l-full last:rounded-r-full cursor-crosshair transition-opacity duration-150"
                    whileHover={{ scaleY: 1.15, filter: "brightness(1.2)" }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-[11px] sm:text-[13px]">
                {languages.map((lang) => (
                  <div
                    key={lang.id}
                    onMouseEnter={() => setActiveLang(lang.id)}
                    onMouseLeave={() => setActiveLang(null)}
                    className="flex items-center gap-1.5 text-gray-400 cursor-default transition-colors duration-150 hover:text-white"
                  >
                    <span
                      className="h-2 w-2 rounded-full transition-transform duration-200"
                      style={{
                        backgroundColor: lang.color,
                        transform: activeLang === lang.id ? "scale(1.3)" : "scale(1)",
                      }}
                    />
                    {lang.label.split(" (")[0]}
                    <span className="text-gray-600 text-[10px]">({lang.pct})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Git/Repository Documentation Footer Section */}
        <section className="mt-10 sm:mt-14" aria-labelledby="contributing-heading">
          <div
            className="mb-0 inline-flex items-center gap-2 rounded-t-md border border-b-0 px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: "#34d399" }}
            />
            CONTRIBUTING.md
          </div>

          <div
            className="rounded-b-md rounded-tr-md border p-5 sm:p-7 backdrop-blur-sm relative overflow-hidden"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

            <h2
              id="contributing-heading"
              className="text-lg sm:text-xl font-semibold tracking-tight text-white break-all"
            >
              git checkout -b feature/collaboration
            </h2>

            <p className="mt-3 text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl">
              Have an opening, an interesting project framework, or want to spin up a collaborative
              PR? Let's initialize a handshake protocol.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t pt-5 border-white/[0.04]">
              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                <a
                  href="mailto:alvyahmed03@gmail.com"
                  className="inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded transition-all duration-200 bg-[#34d399] text-[#0b0c10] hover:bg-[#22c55e] active:scale-[0.98]"
                >
                  Email Command
                </a>
                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row">
                  <a
                    href="https://github.com/alvy00"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded border transition-all duration-200 text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white"
                  >
                    GitHub
                  </a>
                  <a
                    href="https://www.linkedin.com/in/alvy00"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded border transition-all duration-200 text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>

              <div className="flex items-center w-full sm:w-auto">
                <a
                  href="https://docs.google.com/document/d/1YeXt4lR46hJY9yUgSHyA0Gm0hJzywIyV31WC_9uVH_s/edit?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded border transition-all duration-200 text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white"
                >
                  Download Resume
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
