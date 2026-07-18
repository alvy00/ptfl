/* eslint-disable prettier/prettier */
import { useEffect, useState, useMemo, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getSearchResponse, type CommitMatch } from "@/lib/portfolio/search";

const ACCENT = "#e5e7eb";
const COOLDOWN_MS = 2000;
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

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking" | "cooldown">("idle");
  const [result, setResult] = useState<{ answer: string; matches: CommitMatch[] } | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length),
      3200,
    );
    return () => window.clearInterval(id);
  }, []);

  const disabled = status !== "idle";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || disabled) return;
    setStatus("thinking");
    setResult(null);
    try {
      const res = await getSearchResponse(q);
      setResult(res);
    } catch {
      setResult({ answer: "[error] request failed. try again.", matches: [] });
    } finally {
      setStatus("cooldown");
      window.setTimeout(() => setStatus("idle"), COOLDOWN_MS);
    }
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
      width: 7px;
      height: 14px;
      margin-left: 2px;
      vertical-align: middle;
      animation: search-cursor-pulse 1s steps(2, start) infinite;
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
  `,
    [],
  );

  return (
    <div className="mb-10 w-full max-w-3xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />

      <div className="mb-2 text-[11px] uppercase tracking-widest text-gray-500 font-mono">
        search /
      </div>

      <form
        onSubmit={onSubmit}
        className="relative flex items-center gap-2 rounded-md border px-3 py-2 backdrop-blur-md transition-all duration-300"
        style={{
          borderColor: `${ACCENT}22`,
          background: "rgba(255,255,255,0.02)",
          boxShadow: status === "thinking" ? `0 0 15px ${ACCENT}11` : "none",
        }}
      >
        <span
          className="select-none text-[13px] font-mono font-bold"
          style={{ color: ACCENT, textShadow: `0 0 8px ${ACCENT}33` }}
        >
          $
        </span>

        <div className="relative flex-1 flex items-center h-5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
            aria-label="Search commits"
            className="peer relative z-10 w-full bg-transparent text-[13px] font-mono text-white focus:outline-none disabled:opacity-60"
            spellCheck={false}
            autoComplete="off"
          />

          {query.length === 0 && (
            <div className="pointer-events-none absolute left-0 overflow-hidden text-[13px] font-mono text-gray-600">
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="block truncate"
                >
                  {PLACEHOLDERS[placeholderIdx]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>

        {status === "idle" && !query && <span aria-hidden className="search-cursor" />}

        <motion.button
          type="submit"
          disabled={disabled || !query.trim()}
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          className="rounded px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-widest transition-all duration-200 disabled:opacity-30"
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
        {(status === "thinking" || result) && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className="mt-3 overflow-hidden rounded-md border backdrop-blur-md"
            style={{
              borderColor: `${ACCENT}15`,
              background: "rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="px-3 py-2 text-[12.5px] font-mono leading-relaxed"
              style={{ color: ACCENT }}
            >
              {status === "thinking" ? (
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
                  <span>{result?.answer}</span>
                </>
              )}
            </div>

            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="border-t px-3 py-2"
                style={{ borderColor: `${ACCENT}11` }}
              >
                <div className="mb-2 text-[10.5px] font-mono uppercase tracking-widest text-gray-500">
                  {result.matches.length} matching commit
                  {result.matches.length === 1 ? "" : "s"}
                </div>

                {result.matches.length === 0 ? (
                  <div className="text-[12.5px] font-mono text-gray-500 py-1">
                    no commits matched your query.
                  </div>
                ) : (
                  <motion.ul
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-1 max-h-[260px] overflow-y-auto pr-1"
                  >
                    {result.matches.map((m) => (
                      <motion.li key={m.hash} variants={itemVariants}>
                        <button
                          type="button"
                          onClick={() => highlightCommit(m.hash)}
                          className="group flex w-full items-start gap-3 rounded px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white/5"
                        >
                          <span className="shrink-0 tabular-nums pt-[2px] text-[11.5px] font-mono text-gray-500 group-hover:text-gray-300">
                            {m.hash}
                          </span>
                          <span
                            className="text-[12.5px] font-mono leading-snug break-all flex-1"
                            style={{ color: m.accent || ACCENT }}
                          >
                            {m.message}
                          </span>
                          <span className="shrink-0 pt-[2px] text-[10.5px] font-mono uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">
                            {m.branch}
                          </span>
                        </button>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
