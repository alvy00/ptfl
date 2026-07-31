/* eslint-disable prettier/prettier */
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getMatches, getSearchAnswer, type CommitMatch } from "@/lib/portfolio/search";

const ACCENT = "#e5e7eb";
const ERROR_ACCENT = "#fb7185";
// Only the failure path pays a cooldown now — a successful search used to
// lock the input for 2s regardless of outcome, which reads as being
// punished for doing nothing wrong. Errors (esp. rate limits) still need
// a beat before retrying.
const ERROR_COOLDOWN_MS = 2500;
const MAX_QUERY_LENGTH = 200;
const PLACEHOLDERS = [
  'git log --all --grep="websockets"',
  'git log --all --grep="css animations"',
  'git log --all --grep="payment integration"',
  'git log --all --grep="race condition"',
  'git log --all --grep="roadmap"',
];

// Animation variants for cascading results list
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as const;

function highlightCommit(hash: string) {
  window.dispatchEvent(new CustomEvent<string>("highlight-commit", { detail: hash }));
}

type ResultState = {
  matches: CommitMatch[];
  answer: string | null; // null while the AI synthesis is still in flight
  isError: boolean;
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking" | "cooldown">("idle");
  const [result, setResult] = useState<ResultState | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderPaused, setPlaceholderPaused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (placeholderPaused) return;
    const id = window.setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length),
      3200,
    );
    return () => window.clearInterval(id);
  }, [placeholderPaused]);

  // "/" focuses search from anywhere on the page, the way command
  // palettes do — fits the terminal framing and gives keyboard users a
  // fast path to a widget that's otherwise easy to scroll past.
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const disabled = status !== "idle";

  function clear() {
    setQuery("");
    setResult(null);
    requestIdRef.current++; // invalidate any in-flight request so it can't repopulate result after this
    setStatus("idle");
    inputRef.current?.focus();
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (query || result) {
        clear();
      } else {
        inputRef.current?.blur();
      }
    }
  }

  async function runQuery(q: string) {
    const requestId = ++requestIdRef.current;
    setStatus("thinking");

    // Matches are computed locally and instantly — show them right away
    // instead of making the user wait on the network call just to see a
    // list that was already known. The AI synthesis fills in above it
    // once it resolves.
    const matches = getMatches(q);
    setResult({ matches, answer: null, isError: false });

    try {
      const answer = await getSearchAnswer(q, matches);
      if (requestIdRef.current !== requestId) return; // superseded by a newer search
      setResult({ matches, answer, isError: false });
      setStatus("idle");
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setResult({
        matches,
        answer: err instanceof Error ? err.message : "request failed. try again.",
        isError: true,
      });
      setStatus("cooldown");
      window.setTimeout(() => setStatus("idle"), ERROR_COOLDOWN_MS);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || disabled) return;
    await runQuery(q);
  }

  function runSuggestion(q: string) {
    if (disabled) return;
    setQuery(q);
    void runQuery(q);
  }

  // Memoizing style block prevents browser restyling recalculations on state variations
  const dynamicStyles = useMemo(
    () => `
    @keyframes search-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    .search-cursor {
      display: inline-block;
      width: 6px;
      height: 14px;
      margin-left: 2px;
      vertical-align: middle;
      animation: search-cursor-pulse 1s steps(2, start) infinite;
    }
    @media (min-width: 640px) {
      .search-cursor {
        width: 8px;
        height: 16.5px;
      }
    }
    @keyframes search-cursor-pulse {
      0%, 100% {
        opacity: 1;
        background: ${ACCENT};
        box-shadow: 0 0 6px ${ACCENT}55, 0 0 2px ${ACCENT};
      }
      50% {
        opacity: 0;
        background: transparent;
        box-shadow: 0 0 0px transparent;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .search-cursor {
        animation: none;
        opacity: 1;
      }
    }
  `,
    [],
  );

  const resultColor = result?.isError ? ERROR_ACCENT : ACCENT;
  const nearLimit = query.length >= MAX_QUERY_LENGTH - 20;

  return (
    <div className="pt-3 sm:pt-4 mb-8 sm:mb-12 w-full max-w-4xl mx-auto px-4 sm:px-0">
      <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />

      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500 font-mono">
          search /
        </span>
        <span className="hidden sm:inline text-[11px] font-mono text-gray-600">
          press <kbd className="px-1 py-0.5 rounded border border-gray-700 text-gray-500">/</kbd> to
          focus
        </span>
      </div>

      <form
        onSubmit={onSubmit}
        className="relative flex items-center gap-2 sm:gap-3 rounded-md border px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md transition-all duration-300"
        style={{
          borderColor: `${ACCENT}22`,
          background: "rgba(255,255,255,0.02)",
          boxShadow: status === "thinking" ? `0 0 15px ${ACCENT}11` : "none",
        }}
      >
        <span
          className="select-none text-sm sm:text-[15.5px] font-mono font-bold"
          style={{ color: ACCENT, textShadow: `0 0 8px ${ACCENT}33` }}
        >
          $
        </span>

        <div className="relative flex-1 flex items-center h-5 sm:h-6 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            onFocus={() => setPlaceholderPaused(true)}
            onBlur={() => setPlaceholderPaused(false)}
            disabled={disabled}
            maxLength={MAX_QUERY_LENGTH}
            aria-label="Search commits"
            className="peer relative z-10 w-full bg-transparent text-sm sm:text-[15.5px] font-mono text-white focus:outline-none disabled:opacity-60"
            spellCheck={false}
            autoComplete="off"
          />

          {query.length === 0 && (
            <div className="pointer-events-none absolute left-0 right-0 overflow-hidden text-sm sm:text-[15.5px] font-mono text-gray-600">
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIdx}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="block truncate"
                >
                  {PLACEHOLDERS[placeholderIdx]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>

        {nearLimit && (
          <span className="shrink-0 text-[11px] font-mono tabular-nums text-gray-500">
            {MAX_QUERY_LENGTH - query.length}
          </span>
        )}

        {status === "idle" && !query && <span aria-hidden className="search-cursor" />}

        {(query || result) && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors px-0.5"
          >
            ×
          </button>
        )}

        <motion.button
          type="submit"
          disabled={disabled || !query.trim()}
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          className="rounded px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-[13px] font-mono uppercase tracking-widest transition-all duration-200 disabled:opacity-30 shrink-0"
          style={{
            border: `1px solid ${ACCENT}44`,
            color: ACCENT,
            background: `${ACCENT}08`,
          }}
        >
          {status === "thinking" ? "..." : status === "cooldown" ? "wait" : "run"}
        </motion.button>
      </form>

      <AnimatePresence initial={false}>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className="mt-3 sm:mt-4 overflow-hidden rounded-md border backdrop-blur-md"
            style={{
              borderColor: `${resultColor}15`,
              background: "rgba(0,0,0,0.4)",
            }}
          >
            <div
              role="status"
              aria-live="polite"
              className="px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-[15px] font-mono leading-relaxed break-words"
              style={{ color: resultColor }}
            >
              {result.answer === null ? (
                <span className="text-gray-400">
                  <span style={{ color: ACCENT }}>›</span> thinking
                  <span
                    aria-hidden
                    className="ml-1 inline-block"
                    style={{ animation: "search-blink 1s steps(2, start) infinite" }}
                  >
                    ...
                  </span>
                </span>
              ) : (
                <>
                  <span className="text-gray-500">› </span>
                  <span>{result.answer}</span>
                </>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="border-t px-3 py-2.5 sm:px-4 sm:py-3"
              style={{ borderColor: `${ACCENT}11` }}
            >
              <div className="mb-2 text-[11px] sm:text-[12.5px] font-mono uppercase tracking-widest text-gray-500">
                {result.matches.length} matching commit
                {result.matches.length === 1 ? "" : "s"}
              </div>

              {result.matches.length === 0 ? (
                <div className="py-1">
                  <div className="text-sm sm:text-[15px] font-mono text-gray-500 mb-2">
                    no commits matched your query.
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map((p) => {
                      const label = p.match(/grep="(.+)"/)?.[1] ?? p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => runSuggestion(label)}
                          className="rounded border px-2 py-1 text-[11px] sm:text-[12.5px] font-mono text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
                          style={{ borderColor: `${ACCENT}22` }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <motion.ul
                  variants={prefersReducedMotion ? undefined : containerVariants}
                  initial={prefersReducedMotion ? undefined : "hidden"}
                  animate={prefersReducedMotion ? undefined : "show"}
                  className="space-y-1.5 max-h-[260px] sm:max-h-[300px] overflow-y-auto pr-1 custom-scrollbar"
                >
                  {result.matches.map((m) => (
                    <motion.li
                      key={m.hash}
                      variants={prefersReducedMotion ? undefined : itemVariants}
                    >
                      <button
                        type="button"
                        onClick={() => highlightCommit(m.hash)}
                        aria-label={`Jump to commit ${m.hash} on ${m.branch}: ${m.message}`}
                        className="group flex flex-col sm:flex-row w-full items-stretch sm:items-start gap-1 sm:gap-4 rounded px-2 py-2 text-left transition-colors duration-150 hover:bg-white/5 border border-transparent hover:border-white/5 sm:border-none"
                      >
                        <div className="flex items-center justify-between sm:justify-start gap-4 shrink-0">
                          <span className="tabular-nums text-xs sm:text-[13.5px] font-mono text-gray-500 group-hover:text-gray-300">
                            {m.hash}
                          </span>
                          <span className="inline-block sm:hidden text-[11px] font-mono uppercase tracking-widest text-gray-600 group-hover:text-gray-400">
                            {m.branch}
                          </span>
                        </div>

                        <span
                          className="text-xs sm:text-[15px] font-mono leading-snug break-words flex-1 min-w-0"
                          style={{ color: m.accent || ACCENT }}
                        >
                          {m.message}
                        </span>

                        <span className="hidden sm:inline shrink-0 pt-[2px] text-[12.5px] font-mono uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">
                          {m.branch}
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
