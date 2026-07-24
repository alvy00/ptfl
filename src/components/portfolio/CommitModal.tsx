/* eslint-disable prettier/prettier */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId } from "react";
import {
  commitDateFor,
  projects,
  relativeTime,
  type Project,
  type ProjectKey,
} from "@/data/portfolio/projects";
import { bugfixes, type BugfixKey } from "@/data/portfolio/bugfixes";
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
      {selection?.kind === "feature" && <FeatureModal selection={selection} onClose={onClose} />}
      {selection?.kind === "main" && <MainPopover selection={selection} onClose={onClose} />}
      {selection?.kind === "bugfix" && <BugfixModal selection={selection} onClose={onClose} />}
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
  const titleId = useId();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        aria-label="Close modal overlay"
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
        aria-labelledby={titleId}
        className="relative w-full max-w-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl font-mono max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        initial={{ opacity: 0, y: 30, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.99 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "rgba(20, 22, 30, 0.76)",
          backdropFilter: "blur(24px) saturate(160%)",
          border: `1px solid ${accent}33`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${accent}22`,
        }}
      >
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <div
            className="sticky top-0 z-10 flex items-center gap-2 sm:gap-3 border-b px-5 py-3.5 sm:px-8 sm:py-4 text-[11px] sm:text-[13px] uppercase tracking-widest backdrop-blur-md"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(20, 22, 30, 0.4)" }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-medium"
              style={{
                background: "rgba(139, 92, 246, 0.15)",
                color: "#c4b5fd",
                border: "1px solid rgba(139,92,246,0.35)",
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full"
                style={{ background: "#c4b5fd" }}
              />
              Merged
            </span>
            <span className="text-gray-500">pull request</span>
            <span className="ml-auto tabular-nums text-gray-500 text-[11px] sm:text-[13px]">
              {selection.hash}
            </span>
          </div>

          <div className="p-5 sm:p-8 md:p-9.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[11px] sm:text-[13px] text-gray-500">
              <span style={{ color: accent }} className="break-all">
                {bug.branch}
              </span>
              <span>→</span>
              <span>{bug.parentLabel}</span>
            </div>
            <h3 id={titleId} className="text-lg sm:text-xl font-semibold text-white leading-snug">
              {bug.title}
            </h3>
            <p className="mt-2 text-[13px] sm:text-[14px] text-gray-500 break-words">
              {selection.message}
            </p>

            <div className="mt-5 sm:mt-7 space-y-5 sm:space-y-6 font-sans text-[14.5px] sm:text-[15.5px] leading-relaxed">
              <PRSection label="Problem" body={bug.problem} />
              <PRSection label="What I Tried First" body={bug.triedFirst} tint="red" />
              <PRSection label="Root Cause" body={bug.rootCause} />
              <PRSection label="The Fix" body={bug.fix} tint="green" />
              <PRSection label="What I'd Do Differently" body={bug.wouldDoDifferently} />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-3 top-3.5 sm:right-4 sm:top-4 rounded-md px-2 py-1 text-xs sm:text-sm text-gray-400 hover:bg-white/5 hover:text-white z-20 bg-rgba(20,22,30,0.6) backdrop-blur-sm sm:backdrop-blur-none"
        >
          ✕ <span className="hidden sm:inline">esc</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

function PRSection({ label, body, tint }: { label: string; body: string; tint?: "red" | "green" }) {
  const marker = tint === "red" ? "-" : tint === "green" ? "+" : null;
  const tintBg =
    tint === "red"
      ? "rgba(239, 68, 68, 0.06)"
      : tint === "green"
        ? "rgba(34, 197, 94, 0.06)"
        : "rgba(255,255,255,0.01)";
  const tintBorder =
    tint === "red"
      ? "rgba(239, 68, 68, 0.25)"
      : tint === "green"
        ? "rgba(34, 197, 94, 0.25)"
        : "rgba(255,255,255,0.06)";
  const markerColor = tint === "red" ? "#f87171" : tint === "green" ? "#4ade80" : undefined;

  return (
    <div className="w-full overflow-hidden">
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-400">
        {marker && (
          <span
            className="inline-flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-sm font-mono text-[11px] sm:text-[13px] font-bold shrink-0"
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
        className="rounded-md border-l-2 py-2 px-3 sm:py-2.5 sm:pl-4 sm:pr-4 text-gray-300 break-words text-[14px] sm:text-[15.5px]"
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
  const titleId = useId();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        aria-label="Close modal overlay"
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
        aria-labelledby={titleId}
        className="relative w-full max-w-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl font-mono max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        initial={{ opacity: 0, y: 30, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.99 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "rgba(20, 22, 30, 0.76)",
          backdropFilter: "blur(24px) saturate(160%)",
          border: `1px solid ${accent}33`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${accent}22`,
        }}
      >
        <div className="overflow-y-auto flex-1 p-5 sm:p-8 md:p-9.5 custom-scrollbar">
          <div
            className="mb-5 rounded-lg border p-4 sm:p-5"
            style={{
              borderColor: `${accent}22`,
              background: `linear-gradient(180deg, ${accent}08, transparent)`,
            }}
          >
            <div className="flex items-center gap-2.5 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-400">
              <span
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
              />
              commit
              <span className="text-gray-600">·</span>
              <span className="tabular-nums text-gray-400 text-[11px] sm:text-[13px]">
                {selection.hash}
              </span>
            </div>
            <p className="mt-2 text-sm sm:text-base leading-snug text-white break-words">
              {selection.message}
            </p>
            <p className="mt-2 text-[11px] sm:text-[13px] text-gray-500">
              <span>{dateLabel}</span>
              <span className="mx-1.5 text-gray-700">·</span>
              <span>{rel}</span>
            </p>
          </div>

          <div className="mb-1 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500">
            project
          </div>
          <h3 id={titleId} className="text-lg sm:text-xl font-semibold text-white leading-tight">
            {project.name}
          </h3>
          {selection.projectKey !== "assetverse" && (
            <p className="mt-1 text-[11px] sm:text-[13px] text-gray-400">
              {project.timeframe.label}
            </p>
          )}
          <p className="mt-3 text-[14px] sm:text-[15.5px] leading-relaxed text-gray-300 font-sans break-words">
            {project.description}
          </p>

          <div className="mt-5">
            <div className="mb-2 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500">
              key features
            </div>
            <ul className="space-y-2">
              {project.features.map((f) => (
                <li
                  key={f.title}
                  className="flex gap-2.5 text-[14.5px] sm:text-[15.5px] font-sans align-top"
                >
                  <span
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: accent }}
                  />
                  <span className="text-gray-200 break-words">
                    <span className="font-medium text-white">{f.title}</span>
                    <span className="text-gray-400"> — {f.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500">
              stack
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
              {project.stack.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2.5 py-0.5 text-[11px] sm:text-[13px]"
                  style={{
                    borderColor: `${accent}44`,
                    color: accent,
                    background: `${accent}08`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-md px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-transform hover:-translate-y-0.5 select-none"
              style={{
                background: accent,
                color: "#0b0c10",
                boxShadow: `0 6px 20px ${accent}44`,
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
                className="rounded-md border px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-200 transition-colors hover:text-white select-none"
                style={{
                  borderColor: `${accent}44`,
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                {project.codeLinks.length > 1 ? link.label : "View Code"} ↗
              </a>
            ))}
          </div>

          <div className="mt-2 w-full border-t border-white/[0.04]" />
          <AskProject projectKey={selection.projectKey} accent={accent} />
        </div>

        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-3 top-3.5 sm:right-4 sm:top-4 rounded-md px-2 py-1 text-xs sm:text-sm text-gray-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 z-20 backdrop-blur-sm sm:backdrop-blur-none"
          style={{ background: "rgba(20,22,30,0.6)" }}
        >
          ✕ <span className="hidden sm:inline">esc</span>
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
    <SimplePopover
      hash={selection.hash}
      message={selection.message}
      color="#ffffff"
      label="main"
      anchorX={selection.anchorX}
      anchorY={selection.anchorY}
      onClose={onClose}
    />
  );
}

function SimplePopover({
  hash,
  message,
  color,
  label,
  anchorX,
  anchorY,
  onClose,
}: {
  hash: string;
  message: string;
  color: string;
  label: string;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
}) {
  const titleId = useId();

  // Screen check handles responsive position swapping safely inside dynamic hook lifecycle blocks
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  // Desktop coordinate constraints
  const computedLeft =
    typeof window !== "undefined" ? Math.min(anchorX + 24, window.innerWidth - 350) : anchorX + 24;

  return (
    <>
      <motion.button
        aria-label="Close popover overlay"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/40 sm:bg-transparent backdrop-blur-[2px] sm:backdrop-blur-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed z-50 font-mono left-4 right-4 bottom-4 sm:left-auto sm:right-auto sm:bottom-auto"
        style={
          isMobile
            ? {}
            : {
                left: computedLeft,
                top: anchorY - 24,
              }
        }
        initial={isMobile ? { opacity: 0, y: 20, scale: 1 } : { opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={isMobile ? { opacity: 0, y: 15, scale: 1 } : { opacity: 0, y: 4, scale: 0.96 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div
          className="w-full sm:max-w-sm rounded-xl sm:rounded-lg p-4 shadow-2xl"
          style={{
            background: "rgba(20, 22, 30, 0.9)",
            backdropFilter: "blur(20px) saturate(160%)",
            border: `1px solid ${color}25`,
            boxShadow: "0 25px 60px rgba(0,0,0,0.65), 0 0 30px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-widest text-gray-400">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: color }}
            />
            {label}
            <span className="text-gray-600">·</span>
            <span className="tabular-nums text-gray-500">{hash}</span>
          </div>
          <p
            id={titleId}
            className="mt-2 text-[14px] sm:text-[15px] leading-snug text-white break-words"
          >
            {message}
          </p>
        </div>
      </motion.div>
    </>
  );
}
