/* eslint-disable prettier/prettier */
"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { projects, type ProjectKey, type Project } from "@/data/portfolio/projects";
import { CONTACT_EMAIL } from "@/lib/portfolio/gitGraphData";

const PROJECT_ORDER: ProjectKey[] = Object.values(projects)
  .sort((a, b) => new Date(a.timeframe.start).getTime() - new Date(b.timeframe.start).getTime())
  .map((p) => p.key);

const SUBJECT = "Internship / junior developer role — via portfolio";
// mailto bodies are interpreted per RFC 2368/6068, which expects CRLF line
// breaks — a bare "\n" is rendered inconsistently (or collapsed entirely)
// by some Windows mail clients (notably Outlook). Joining on "\r\n" keeps
// the body formatted the same way across platforms.
const BODY = [
  "Hi Alvy,",
  "",
  "I came across your portfolio and wanted to reach out about an internship / junior developer opportunity.",
  "",
  "",
].join("\r\n");
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  SUBJECT,
)}&body=${encodeURIComponent(BODY)}`;

// ---------------------------------------------------------------------------
// Design language for this view: the rest of the portfolio is framed as a
// git history (commit graph, "2023 — present"), so the overview leans into
// that vocabulary rather than introducing a second metaphor. Feature lists
// read as a changelog/diff ("+" additions, line numbers, a "features
// shipped" count) instead of a generic icon-card grid — the numbering and
// diff marks encode real information here (chronological order, count of
// shipped features) rather than decorating. Motion follows the same
// single-spring, one-thing-moves-at-a-time discipline as the graph toggle:
// entrances stagger in one direction, nothing blurs or scales at the same
// time as it slides.
// ---------------------------------------------------------------------------

const STAGGER_CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

// Shared stiff spring used for layout reflow + chevron rotation so the
// whole view speaks one motion language instead of mixing spring/duration.
const LAYOUT_SPRING = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };

function useMotionSafe() {
  const reduceMotion = useReducedMotion() ?? false;
  return {
    reduceMotion,
    fadeUp: reduceMotion
      ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
      : { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } },
    spring: reduceMotion
      ? { duration: 0.01 }
      : { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.8 },
    layoutSpring: reduceMotion ? { duration: 0.01 } : LAYOUT_SPRING,
  };
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-sm sm:text-base font-semibold text-white">{value}</span>
      <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500">{label}</span>
    </div>
  );
}

function FeatureRow({
  feature,
  index,
  accent,
  stagger,
}: {
  feature: Project["features"][number];
  index: number;
  accent: string;
  stagger: boolean;
}) {
  const { reduceMotion, layoutSpring } = useMotionSafe();
  return (
    <motion.div
      layout="position"
      layoutTransition={layoutSpring}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{
        duration: 0.28,
        ease: "easeOut",
        delay: stagger ? Math.min(index, 8) * 0.045 : 0,
        // Position changes triggered by siblings entering/leaving (list
        // expand/collapse) get the shared spring so remaining rows glide
        // into their new slot instead of popping, while opacity/x for this
        // row's own enter/exit keep the quicker duration-based feel above.
        layout: reduceMotion ? { duration: 0.01 } : LAYOUT_SPRING,
      }}
      className="group relative flex gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3.5 pl-4 hover:bg-white/[0.045] transition-colors"
    >
      {/* Diff gutter mark — a real "+" like an added line, colored to the
          project's own accent so the changelog still reads as belonging
          to this specific project. */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
        style={{ background: `${accent}55` }}
      />
      <span
        aria-hidden="true"
        className="select-none font-mono text-xs leading-6"
        style={{ color: accent }}
      >
        +
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-gray-500">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-sm font-semibold text-gray-200">{feature.title}</span>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-gray-400 leading-relaxed font-light">
          {feature.detail}
        </p>
      </div>
    </motion.div>
  );
}

function FeatureLog({
  features,
  accent,
  projectKey,
}: {
  features: Project["features"];
  accent: string;
  projectKey: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { reduceMotion, layoutSpring } = useMotionSafe();
  const COLLAPSED_COUNT = 4;
  const visible = expanded ? features : features.slice(0, COLLAPSED_COUNT);
  const hiddenCount = features.length - COLLAPSED_COUNT;
  const hasMore = hiddenCount > 0;
  // Stable id per project so aria-controls points a screen reader straight
  // at the grid of feature rows the button expands/collapses, instead of
  // relying on DOM proximity to convey that relationship.
  const gridId = `feature-log-${projectKey}`;

  return (
    <div className="mt-8 pt-6 border-t border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400">Feature log</h4>
        <span
          className="rounded-full border px-2 py-0.5 text-[11px] font-mono"
          style={{ borderColor: `${accent}33`, color: accent, background: `${accent}0d` }}
        >
          +{features.length} shipped
        </span>
      </div>

      <div id={gridId} className="grid gap-3 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {visible.map((f, i) => (
            <FeatureRow
              key={f.title}
              feature={f}
              index={i}
              accent={accent}
              stagger={expanded && i >= COLLAPSED_COUNT}
            />
          ))}
        </AnimatePresence>
      </div>

      {hasMore && (
        <motion.button
          onClick={() => setExpanded((v) => !v)}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          aria-expanded={expanded}
          aria-controls={gridId}
          className="mt-4 w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-mono text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34d399]"
        >
          <span>
            {expanded
              ? "Collapse feature log"
              : `Show ${hiddenCount} more feature${hiddenCount === 1 ? "" : "s"}`}
          </span>
          <motion.span
            aria-hidden="true"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={layoutSpring}
            className="inline-block"
          >
            ↓
          </motion.span>
        </motion.button>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  index,
  projectKey,
}: {
  project: Project;
  index: number;
  projectKey: string;
}) {
  const { fadeUp } = useMotionSafe();
  const shortName = project.name.split(" — ")[0];
  const tagline = project.name.split(" — ")[1];

  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="group relative rounded-2xl border p-6 sm:p-8 transition-colors duration-500 hover:border-opacity-60"
      style={{
        borderColor: `${project.accent}33`,
        background: `linear-gradient(135deg, ${project.accent}08 0%, rgba(255,255,255,0.01) 100%)`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none transition-all duration-500 group-hover:opacity-20 group-hover:scale-110"
        style={{ background: project.accent }}
      />

      <div className="relative z-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* The numbering here is a real chronological index — projects
                are sorted by start date — so it carries information about
                sequence, not just decoration. */}
            <span className="font-mono text-xs text-gray-500">
              {String(index + 1).padStart(2, "0")}.
            </span>
            <h3
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ color: project.accent }}
            >
              {shortName}
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-mono border border-white/10 bg-white/5 text-gray-400">
            {project.timeframe.label}
          </span>
        </div>

        {tagline && (
          <p className="text-sm sm:text-base text-gray-400 mt-1 font-medium">{tagline}</p>
        )}

        <p className="mt-4 text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          {project.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {project.stack.map((tag) => (
            <span
              key={tag}
              className="rounded-lg border px-2.5 py-1 text-[11px] font-mono transition-all duration-200 hover:scale-105 hover:border-opacity-100"
              style={{
                borderColor: `${project.accent}44`,
                color: project.accent,
                background: `${project.accent}10`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = project.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${project.accent}44`;
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <FeatureLog features={project.features} accent={project.accent} projectKey={projectKey} />

        <div className="mt-6 pt-4 flex flex-wrap items-center justify-between gap-4 text-sm font-mono">
          <div className="flex items-center gap-4">
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group/cta inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:scale-105 shadow-md"
              style={{ background: project.accent, color: "#000" }}
            >
              <span>Live Demo</span>
              <span className="inline-block transition-transform duration-200 group-hover/cta:translate-x-0.5">
                →
              </span>
            </a>
            {project.codeLinks.map((c) => (
              <a
                key={c.url}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link text-gray-400 hover:text-white text-xs underline decoration-dotted transition-colors"
              >
                <span>{c.label}</span>{" "}
                <span className="inline-block transition-transform duration-200 group-hover/link:translate-x-0.5">
                  →
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function GitGraphOverview() {
  const [activeTab, setActiveTab] = useState<"all" | ProjectKey>("all");
  const { reduceMotion, fadeUp, spring } = useMotionSafe();

  const filteredProjects = activeTab === "all" ? PROJECT_ORDER : [activeTab as ProjectKey];

  const tabKeys = useMemo(() => ["all", ...PROJECT_ORDER] as const, []);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Standard roving-tabindex arrow-key handling for a tablist: Left/Right
  // (and Home/End) move focus between tabs and activate the newly focused
  // one, matching native tab widget behavior instead of relying on
  // sequential Tab-key traversal through every project.
  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabKeys.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + tabKeys.length) % tabKeys.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabKeys.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const nextKey = tabKeys[nextIndex];
      setActiveTab(nextKey);
      tabRefs.current[nextKey]?.focus();
    }
  };

  // Repo-style stats — quantify the body of work the same way a README's
  // badge row does, using numbers already implied by the data rather than
  // invented metrics.
  const stats = useMemo(() => {
    const totalFeatures = PROJECT_ORDER.reduce(
      (sum, key) => sum + projects[key].features.length,
      0,
    );
    const uniqueStack = new Set(PROJECT_ORDER.flatMap((key) => projects[key].stack));
    return {
      projects: PROJECT_ORDER.length,
      features: totalFeatures,
      stack: uniqueStack.size,
    };
  }, []);

  return (
    <div className="flex flex-col gap-12 max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* 1. Executive Summary & Conversion Header */}
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 sm:p-8 backdrop-blur-xl shadow-2xl"
      >
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -left-24 -bottom-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-emerald-400">
              {/* Live status dot with an expanding radar-ping ring behind it
                  to pull the eye to availability status on load, without
                  adding a second competing animated element. */}
              <span className="relative flex w-2 h-2">
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 rounded-full bg-emerald-400 ${
                    reduceMotion ? "" : "animate-ping"
                  } opacity-75`}
                />
                <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              Open for Opportunities • RUET Chemical Engineering
              {/* A single terminal cursor blink — the one deliberate flourish
                  in this header, not repeated anywhere else in the view. */}
              <motion.span
                aria-hidden="true"
                animate={reduceMotion ? undefined : { opacity: [1, 0, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "steps(1)" }}
                className="inline-block w-[6px] h-[12px] bg-emerald-400 -mb-0.5"
              />
            </div>
            <p className="text-base sm:text-lg text-gray-200 leading-relaxed font-light">
              Self-taught full-stack engineer and applied AI builder. Shipped{" "}
              <span className="text-white font-medium">4 production systems</span>, real-time
              architectures, AI voice agents, and B2B SaaS solutions bridging rigorous technical
              problem-solving with modern web ecosystems.
            </p>
            {/* Repo-style stat row — README badge convention, but built from
                real counts in the project data rather than filler numbers. */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
              <StatChip label="Projects shipped" value={String(stats.projects)} />
              <StatChip label="Features logged" value={String(stats.features)} />
              <StatChip label="Technologies used" value={String(stats.stack)} />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <a
              href={MAILTO}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-black font-medium text-sm transition-all duration-300 hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34d399]"
            >
              Get in Touch →
            </a>
          </div>
        </div>
      </motion.div>

      {/* 2. Interactive Filter Bar (View Controls) — a branch-switcher framed
          the same way as the site's own graph/overview toggle: a sliding
          highlight pill (shared layoutId families keep the interaction
          language consistent across the page) rather than a second, unrelated
          tab affordance. */}
      <div
        className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none border-b border-white/10"
        role="tablist"
        aria-label="Filter projects"
        aria-orientation="horizontal"
      >
        {tabKeys.map((key, tabIndex) => {
          const isActive = activeTab === key;
          const label =
            key === "all"
              ? `All Projects (${PROJECT_ORDER.length})`
              : projects[key].name.split(" — ")[0];
          return (
            <button
              key={key}
              ref={(el) => {
                tabRefs.current[key] = el;
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(key)}
              onKeyDown={(e) => handleTabKeyDown(e, tabIndex)}
              className="relative px-4 py-2 rounded-lg text-xs font-mono whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34d399]"
              style={{ color: isActive ? "#fff" : "#9ca3af" }}
            >
              {isActive && (
                <motion.span
                  layoutId="overview-filter-pill"
                  transition={spring}
                  className="absolute inset-0 rounded-lg bg-white/10 border border-white/20 shadow-inner"
                />
              )}
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Project Cards Showcase — cards stagger in together rather than
          each running its own independent scroll-triggered animation, so a
          filter change (or first load) reads as one composed reveal instead
          of N unrelated ones. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0 }}
          variants={STAGGER_CONTAINER}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-8"
        >
          {filteredProjects.map((key) => (
            <ProjectCard
              key={key}
              project={projects[key]}
              index={PROJECT_ORDER.indexOf(key)}
              projectKey={key}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
