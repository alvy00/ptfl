/* eslint-disable prettier/prettier */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useSpring,
} from "framer-motion";
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
// This tab is the general-audience view: recruiters, hiring managers and
// founders skimming on a phone. It deliberately does NOT borrow the graph
// tab's vocabulary (commit nodes, diff marks, changelog framing, mono as
// display type). It reads as an editorial case-study wall — big color-washed
// covers, one plain sentence per project, technical depth folded away behind
// an accordion until asked for.
// ---------------------------------------------------------------------------

// [DRAFTED COPY] Outcome-first, plain-language one-liners written for a
// non-technical reader. These override project.description in THIS TAB ONLY —
// the data layer and the graph tab keep the original technical copy.
const OUTCOME_COPY: Record<ProjectKey, string> = {
  auctasync:
    "A live auction platform where hundreds of people can bid at the same time and everyone sees the same price instantly, with payments handled end to end.",
  assetverse:
    "A tool that lets companies stop tracking laptops and equipment in spreadsheets, with a clear record of who has what and when it came back.",
  asynclangai:
    "An AI speaking partner that lets people practise English out loud and get honest, useful feedback straight after the conversation.",
  careerpilot:
    "Turns any goal — a job, a subject, a certification — into a step-by-step learning plan, with AI voice practice and quizzes to check you actually got it.",
};

const ACCENT = "#FF6B4A";

// The page shell sets font-mono globally for the terminal/graph tab; this tab
// is editorial, so it resets to a humanist sans and demotes mono to labels.
const SANS =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function useMotionSafe() {
  const reduceMotion = useReducedMotion() ?? false;
  return {
    reduceMotion,
    spring: reduceMotion
      ? { duration: 0.01 }
      : { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.8 },
  };
}

function shortNameOf(project: Project) {
  return project.name.split(" — ")[0];
}

// --- Cursor-follow preview chip (desktop pointer devices only) -------------

function usePointerFine() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(pointer: fine)");
    setFine(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setFine(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return fine;
}

function CursorPreview({
  containerRef,
  active,
  label,
  accent,
  reduceMotion,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  active: boolean;
  label: string;
  accent: string;
  reduceMotion: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Reduced motion: snap the chip to the cursor instead of trailing it.
  const springConfig = reduceMotion
    ? { stiffness: 2000, damping: 100, mass: 0.1 }
    : { stiffness: 220, damping: 26, mass: 0.6 };
  const sx = useSpring(x, springConfig);
  const sy = useSpring(y, springConfig);

  // Listener is scoped to this panel's hero, not window, so it only runs
  // while the cursor is actually over this project's cover.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !active) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      x.set(e.clientX - rect.left);
      y.set(e.clientY - rect.top);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [active, containerRef, x, y]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}
          style={{
            x: sx,
            y: sy,
            background: accent,
            translateX: "-50%",
            translateY: "-50%",
          }}
          className="pointer-events-none absolute left-0 top-0 z-30 flex h-[90px] w-[140px] items-end rounded-2xl p-3 shadow-2xl"
        >
          <span className="text-[11px] font-semibold tracking-tight text-[#0B0C10]">{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Accordion: "See what's inside" ----------------------------------------

function CaseStudyAccordion({
  project,
  projectKey,
}: {
  project: Project;
  projectKey: string;
}) {
  const [open, setOpen] = useState(false);
  const { reduceMotion } = useMotionSafe();
  const panelId = `overview-details-${projectKey}`;

  return (
    <div className="mt-8 border-t border-white/[0.08] pt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl text-left text-sm font-medium text-[#F5F5F3]/80 transition-colors hover:text-[#F5F5F3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF6B4A] sm:w-auto"
      >
        <span>See what&rsquo;s inside</span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.25, ease: "easeOut" }}
          className="inline-block text-[#8A8D94]"
        >
          ↓
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.35, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-6">
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-[#8A8D94]">
                Built with
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.stack.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-[#8A8D94]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h4 className="mt-7 text-xs font-medium uppercase tracking-[0.14em] text-[#8A8D94]">
                What&rsquo;s inside
              </h4>
              <ul className="mt-3 grid gap-5 sm:grid-cols-2">
                {project.features.map((f) => (
                  <li key={f.title}>
                    <p className="text-sm font-semibold text-[#F5F5F3]">{f.title}</p>
                    <p className="mt-1 text-sm font-light leading-relaxed text-[#8A8D94]">
                      {f.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Case-study panel -------------------------------------------------------

function CaseStudyPanel({
  project,
  projectKey,
  index,
  pointerFine,
}: {
  project: Project;
  projectKey: ProjectKey;
  index: number;
  pointerFine: boolean;
}) {
  const { reduceMotion } = useMotionSafe();
  const [hovered, setHovered] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const shortName = shortNameOf(project);
  const tagline = project.name.split(" — ")[1];
  const accent = project.accent;
  // Even index -> cover on the left, odd -> cover on the right. Desktop only;
  // below lg the panel stacks cover-on-top regardless.
  const coverRight = index % 2 === 1;

  return (
    <article className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#15171C]">
      <div className={`flex flex-col lg:flex-row ${coverRight ? "lg:flex-row-reverse" : ""}`}>
        {/* Color-wash cover */}
        <motion.div
          ref={heroRef}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
          whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: reduceMotion ? 0.2 : 0.6, ease: "easeOut" }}
          onMouseEnter={pointerFine ? () => setHovered(true) : undefined}
          onMouseLeave={pointerFine ? () => setHovered(false) : undefined}
          className="relative flex h-[140px] shrink-0 items-end overflow-hidden p-6 sm:h-[220px] sm:p-8 lg:h-auto lg:min-h-[340px] lg:w-[40%]"
          style={{
            background: `radial-gradient(120% 120% at ${
              coverRight ? "80%" : "20%"
            } 20%, ${accent}${hovered ? "40" : "24"} 0%, ${accent}0f 45%, #15171C 100%)`,
            transition: "background 400ms ease",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background: `linear-gradient(160deg, ${accent}1a 0%, transparent 60%)`,
            }}
          />
          <h3
            className="relative z-10 w-full break-words font-bold leading-[0.95] tracking-tight text-[#F5F5F3]"
            style={{ fontSize: "clamp(1.75rem, 3.6vw, 3.25rem)" }}
          >
            {shortName}
          </h3>
          {pointerFine && (
            <CursorPreview
              containerRef={heroRef}
              active={hovered}
              label={shortName}
              accent={accent}
              reduceMotion={reduceMotion}
            />
          )}
        </motion.div>

        {/* Content */}
        <div className="flex-1 p-6 sm:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8A8D94]">
            {project.timeframe.label}
          </p>

          {tagline && (
            <p className="mt-3 text-lg font-semibold tracking-tight text-[#F5F5F3] sm:text-xl">
              {tagline}
            </p>
          )}

          <p className="mt-3 max-w-[60ch] text-[15px] font-light leading-[1.7] text-[#8A8D94]">
            {OUTCOME_COPY[projectKey]}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group/cta inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-[#0B0C10] transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF6B4A]"
              style={{ background: accent }}
            >
              <span>View live demo</span>
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
                className="group/link text-sm text-[#8A8D94] transition-colors hover:text-[#F5F5F3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF6B4A]"
              >
                <span>{c.label}</span>{" "}
                <span className="inline-block transition-transform duration-200 group-hover/link:translate-x-0.5">
                  →
                </span>
              </a>
            ))}
          </div>

          <CaseStudyAccordion project={project} projectKey={projectKey} />
        </div>
      </div>
    </article>
  );
}

// --- Root -------------------------------------------------------------------

export function GitGraphOverview() {
  const [activeTab, setActiveTab] = useState<"all" | ProjectKey>("all");
  const { reduceMotion, spring } = useMotionSafe();
  const pointerFine = usePointerFine();

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
    <div
      className="font-sans mx-auto flex max-w-6xl flex-col gap-14 px-4 py-10 sm:px-6 sm:py-14"
      style={{ fontFamily: SANS }}
    >
      {/* A. Header */}
      <header className="flex flex-col gap-7">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-[#8A8D94]">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-400" />
          Open for Opportunities • RUET Chemical Engineering
        </div>

        <h2
          className="max-w-[18ch] font-bold leading-[1.05] tracking-[-0.03em] text-[#F5F5F3]"
          style={{ fontSize: "clamp(2.25rem, 5.5vw, 4rem)" }}
        >
          Self-taught engineer shipping real, production software.
        </h2>

        <p className="max-w-[60ch] text-base font-light leading-[1.7] text-[#8A8D94] sm:text-lg">
          Four products built end to end — real-time bidding, AI voice practice, and B2B tooling —
          each shipped, deployed, and used by people outside my own laptop.
        </p>

        <p className="text-sm text-[#8A8D94]">
          <span className="text-[#F5F5F3]">{stats.projects}</span> projects shipped ·{" "}
          <span className="text-[#F5F5F3]">{stats.features}</span> features logged ·{" "}
          <span className="text-[#F5F5F3]">{stats.stack}</span> technologies used
        </p>

        <div>
          <a
            href={MAILTO}
            className="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold text-[#0B0C10] shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF6B4A]"
            style={{ background: ACCENT, boxShadow: `0 10px 30px -12px ${ACCENT}80` }}
          >
            Get in touch
          </a>
        </div>
      </header>

      {/* B. Filter bar — same tablist semantics, calmer styling. */}
      <div
        className="scrollbar-none -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1"
        role="tablist"
        aria-label="Filter projects"
        aria-orientation="horizontal"
      >
        {tabKeys.map((key, tabIndex) => {
          const isActive = activeTab === key;
          const label = key === "all" ? "All projects" : shortNameOf(projects[key]);
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
              className="relative min-h-[40px] whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B4A]"
              style={{ color: isActive ? "#0B0C10" : "#8A8D94" }}
            >
              {isActive && (
                <motion.span
                  layoutId="overview-filter-pill"
                  transition={spring}
                  className="absolute inset-0 rounded-full"
                  style={{ background: ACCENT }}
                />
              )}
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>

      {/* C. Case-study wall */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.25, ease: "easeOut" }}
          className="flex flex-col gap-10 sm:gap-14"
        >
          {filteredProjects.map((key, i) => (
            <CaseStudyPanel
              key={key}
              project={projects[key]}
              projectKey={key}
              index={i}
              pointerFine={pointerFine}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
