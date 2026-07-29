/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { GitGraph } from "@/components/portfolio/GitGraph";
import { GlobalSearch } from "@/components/portfolio/GlobalSearch";
import { Hero } from "@/components/portfolio/Hero";
import { StatsPanel } from "@/components/portfolio/StatsPanel";
import { ContributingFooter } from "@/components/portfolio/ContributingFooter";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alvy — Developer Portfolio" },
      {
        name: "description",
        content:
          "Chemical Engineering student at RUET and self-taught full-stack developer. Career visualized as a Git commit graph.",
      },
    ],
  }),
  component: Index,
});

export function Index() {
  const [isLoading, setIsLoading] = useState(true);

  // 1. Loader Sequence
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // 2. Hero Scrubbed Minimization (Global Scroll)
  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.8]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], ["0%", "-5%"]);

  return (
    <main className="min-h-screen font-mono text-sm sm:text-base selection:bg-[#34d39922] selection:text-[#34d399] bg-[#0e0f13] text-[#e5e7eb] overflow-x-clip relative">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0e0f13]"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              className="h-10 w-10 rounded-full border-2 border-[#34d399] border-t-transparent shadow-[0_0_15px_rgba(52,211,153,0.3)] mb-6"
            />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col"
          >
            {/* HERO SECTION: Centered on screen, scales/fades on scroll */}
            <div className="h-screen w-full flex items-center justify-center px-4 sm:px-8 sticky top-0 z-10 bg-[#0e0f13]">
              <motion.div
                style={{
                  scale: heroScale,
                  opacity: heroOpacity,
                  y: heroY,
                  willChange: "transform, opacity",
                }}
                className="w-full max-w-4xl"
              >
                <Hero />
              </motion.div>
            </div>

            {/* REST OF THE PAGE CONTENT: Flows naturally right after the hero */}
            <div
              id="page-content"
              className="mx-auto max-w-4xl w-full px-4 sm:px-8 pb-20 relative z-20 bg-[#0e0f13] pt-12"
            >
              {/* "The Journey" Title Arrival */}
              <div className="pt-4 pb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 1.4, y: 30, x: -20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ transformOrigin: "top left", willChange: "transform, opacity" }}
                  className="w-max"
                >
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    className="flex items-center gap-2 font-mono text-xs sm:text-sm text-[#34d399] mb-2 tracking-widest uppercase"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" />
                    2023 — present
                  </motion.p>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    The Journey
                  </h2>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "2.5rem" }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
                    className="h-[2px] bg-[#34d399] mt-3 shadow-[0_0_6px_#34d399]"
                  />
                </motion.div>
              </div>

              {/* GitGraph & Search Reveal */}
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-6 sm:space-y-8 overflow-hidden bg-[#0e0f13]"
              >
                <GlobalSearch />
                <div className="overflow-x-auto pb-4 scrollbar-thin">
                  <div className="min-w-[500px] sm:min-w-0">
                    <GitGraph />
                  </div>
                </div>
              </motion.div>

              {/* Synchronized Footer Arrival */}
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                className="mt-20 space-y-12 bg-[#0e0f13]"
              >
                <StatsPanel />
                <ContributingFooter />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
