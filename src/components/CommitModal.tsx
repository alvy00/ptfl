import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { commitDateFor, projects, relativeTime, type Project, type ProjectKey } from "@/data/projects";
import { bugfixes, type BugfixKey } from "@/data/bugfixes";
import { AskProject } from "./AskProject";


export type CommitSelection =
  | {
      kind: "feature";
      hash: string;
      message: string;
      projectKey: ProjectKey;
      commitIndex: number;
      commitTotal: number;
    }
  | { kind: "main"; hash: string; message: string; anchorX: number; anchorY: number }
  | { kind: "bugfix"; hash: string; message: string; bugfixKey: BugfixKey }
  | {
      kind: "bugfix-first";
      hash: string;
      message: string;
      color: string;
      anchorX: number;
      anchorY: number;
    };

type Props = {
  selection: CommitSelection | null;
  onClose: () => void;
};

export function CommitModal({ selection, onClose }: Props) {
  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, onClose]);

  return (
    <AnimatePresence>
      {selection?.kind === "feature" && (
        <FeatureModal selection={selection} onClose={onClose} />
      )}
      {selection?.kind === "main" && (
        <MainPopover selection={selection} onClose={onClose} />
      )}
      {selection?.kind === "bugfix" && (
        <BugfixModal selection={selection} onClose={onClose} />
      )}
      {selection?.kind === "bugfix-first" && (
        <SimplePopover
          hash={selection.hash}
          message={selection.message}
          color={selection.color}
          label="bugfix"
          anchorX={selection.anchorX}
          anchorY={selection.anchorY}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

function BugfixModal({
  selection,
  onClose,
}: {
  selection: Extract<CommitSelection, { kind: "bugfix" }>;
  onClose: () => void;
}) {
  const bug = bugfixes[selection.bugfixKey];
  const accent = bug.accent;
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background: "rgba(6, 8, 14, 0.72)",
          backdropFilter: "blur(14px) saturate(140%)",
        }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl font-mono"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "rgba(20, 22, 30, 0.78)",
          backdropFilter: "blur(24px) saturate(160%)",
          border: `1px solid ${accent}33`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${accent}22`,
        }}
      >
        <div className="max-h-[85vh] overflow-y-auto">
          {/* PR-style header */}
          <div
            className="flex items-center gap-3 border-b px-6 py-3 text-[11px] uppercase tracking-widest"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "rgba(139, 92, 246, 0.15)",
                color: "#c4b5fd",
                border: "1px solid rgba(139,92,246,0.35)",
              }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#c4b5fd" }} />
              Merged
            </span>
            <span className="text-gray-500">pull request</span>
            <span className="ml-auto tabular-nums text-gray-500">{selection.hash}</span>
          </div>

          <div className="p-6 sm:p-7">
            <div className="mb-1 flex items-center gap-2 text-[11px] text-gray-500">
              <span style={{ color: accent }}>{bug.branch}</span>
              <span>→</span>
              <span>{bug.parentLabel}</span>
            </div>
            <h3 className="text-lg font-semibold text-white">{bug.title}</h3>
            <p className="mt-2 text-[12px] text-gray-500">{selection.message}</p>

            <div className="mt-6 space-y-5 font-sans text-[13px] leading-relaxed">
              <PRSection label="Problem" body={bug.problem} />
              <PRSection
                label="What I Tried First"
                body={bug.triedFirst}
                tint="red"
              />
              <PRSection label="Root Cause" body={bug.rootCause} />
              <PRSection label="The Fix" body={bug.fix} tint="green" />
              <PRSection
                label="What I'd Do Differently"
                body={bug.wouldDoDifferently}
              />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-white/5 hover:text-white"
        >
          esc ✕
        </button>
      </motion.div>
    </motion.div>
  );
}

function PRSection({
  label,
  body,
  tint,
}: {
  label: string;
  body: string;
  tint?: "red" | "green";
}) {
  const marker = tint === "red" ? "-" : tint === "green" ? "+" : null;
  const tintBg =
    tint === "red"
      ? "rgba(239, 68, 68, 0.08)"
      : tint === "green"
      ? "rgba(34, 197, 94, 0.08)"
      : "rgba(255,255,255,0.02)";
  const tintBorder =
    tint === "red"
      ? "rgba(239, 68, 68, 0.35)"
      : tint === "green"
      ? "rgba(34, 197, 94, 0.35)"
      : "rgba(255,255,255,0.08)";
  const markerColor = tint === "red" ? "#f87171" : tint === "green" ? "#4ade80" : undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-gray-400">
        {marker && (
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-sm font-mono text-[11px] font-bold"
            style={{
              background: tintBg,
              color: markerColor,
              border: `1px solid ${tintBorder}`,
            }}
            aria-hidden="true"
          >
            {marker}
          </span>
        )}
        {label}
      </div>
      <div
        className="rounded-md border-l-2 py-2 pl-3 pr-3 text-gray-300"
        style={{
          borderColor: tintBorder,
          background: tintBg,
        }}
      >
        {body}
      </div>
    </div>
  );
}

function FeatureModal({
  selection,
  onClose,
}: {
  selection: Extract<CommitSelection, { kind: "feature" }>;
  onClose: () => void;
}) {
  const project: Project = projects[selection.projectKey];
  const date = commitDateFor(project.timeframe, selection.commitIndex, selection.commitTotal);
  const rel = relativeTime(date);
  const dateLabel = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const accent = project.accent;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background: "rgba(6, 8, 14, 0.72)",
          backdropFilter: "blur(14px) saturate(140%)",
        }}
      />
      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl font-mono"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "rgba(20, 22, 30, 0.72)",
          backdropFilter: "blur(24px) saturate(160%)",
          border: `1px solid ${accent}33`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${accent}22`,
        }}
      >
        <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-7">
          {/* Commit header */}
          <div
            className="mb-5 rounded-lg border p-4"
            style={{
              borderColor: `${accent}33`,
              background: `linear-gradient(180deg, ${accent}10, transparent)`,
            }}
          >
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-gray-400">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
              />
              commit
              <span className="text-gray-600">·</span>
              <span className="tabular-nums text-gray-400">{selection.hash}</span>
            </div>
            <p className="mt-2 text-sm leading-snug text-white">{selection.message}</p>
            <p className="mt-2 text-xs text-gray-500">
              <span>{dateLabel}</span>
              <span className="mx-2 text-gray-700">·</span>
              <span>{rel}</span>
            </p>
          </div>

          {/* Project */}
          <div className="mb-1 text-[11px] uppercase tracking-widest text-gray-500">project</div>
          <h3 className="text-lg font-semibold text-white">{project.name}</h3>
          <p className="mt-1 text-xs text-gray-400">{project.timeframe.label}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-gray-300 font-sans">
            {project.description}
          </p>

          {/* Features */}
          <div className="mt-5">
            <div className="mb-2 text-[11px] uppercase tracking-widest text-gray-500">
              key features
            </div>
            <ul className="space-y-2">
              {project.features.map((f) => (
                <li key={f.title} className="flex gap-3 text-[13px] font-sans">
                  <span
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: accent }}
                  />
                  <span className="text-gray-200">
                    <span className="font-medium text-white">{f.title}</span>
                    <span className="text-gray-400"> — {f.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stack */}
          <div className="mt-5">
            <div className="mb-2 text-[11px] uppercase tracking-widest text-gray-500">stack</div>
            <div className="flex flex-wrap gap-2">
              {project.stack.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2.5 py-0.5 text-[11px]"
                  style={{
                    borderColor: `${accent}66`,
                    color: accent,
                    background: `${accent}10`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-transform hover:-translate-y-0.5"
              style={{
                background: accent,
                color: "#0b0c10",
                boxShadow: `0 8px 24px ${accent}55`,
              }}
            >
              Live Demo ↗
            </a>
            {project.codeLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:text-white"
                style={{
                  borderColor: `${accent}55`,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {project.codeLinks.length > 1 ? link.label : "View Code"} ↗
              </a>
            ))}
          </div>

          {/* AI Ask (mock) */}
          <AskProject projectKey={selection.projectKey} accent={accent} />
        </div>


        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-white/5 hover:text-white"
        >
          esc ✕
        </button>
      </motion.div>
    </motion.div>
  );
}

function MainPopover({
  selection,
  onClose,
}: {
  selection: Extract<CommitSelection, { kind: "main" }>;
  onClose: () => void;
}) {
  return (
    <>
      <motion.button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        className="fixed z-50 font-mono"
        style={{
          left: Math.min(selection.anchorX + 20, typeof window !== "undefined" ? window.innerWidth - 300 : 400),
          top: selection.anchorY - 20,
        }}
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.96 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div
          className="max-w-xs rounded-lg p-3.5 shadow-xl"
          style={{
            background: "rgba(20, 22, 30, 0.85)",
            backdropFilter: "blur(18px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
          }}
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
            main
            <span className="text-gray-600">·</span>
            <span className="tabular-nums">{selection.hash}</span>
          </div>
          <p className="mt-2 text-[13px] leading-snug text-white">{selection.message}</p>
        </div>
      </motion.div>
    </>
  );
}
