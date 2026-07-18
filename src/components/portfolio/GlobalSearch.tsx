/* eslint-disable prettier/prettier */
import { useEffect, useState, type FormEvent } from "react";
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

  return (
    <div className="mb-10">
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gray-500">search /</div>
      <form
        onSubmit={onSubmit}
        className="relative flex items-center gap-2 rounded-md border px-3 py-2 backdrop-blur"
        style={{
          borderColor: `${ACCENT}33`,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <span
          className="select-none text-[13px]"
          style={{ color: ACCENT, textShadow: `0 0 8px ${ACCENT}55` }}
        >
          $
        </span>

        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
            aria-label="Search commits"
            className="peer relative z-10 w-full bg-transparent text-[13px] text-white focus:outline-none disabled:opacity-60"
            spellCheck={false}
            autoComplete="off"
          />
          {query.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-[13px] text-gray-500">
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIdx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.4 }}
                  className="truncate"
                >
                  {PLACEHOLDERS[placeholderIdx]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>

        {status === "idle" && !query && (
          <span
            aria-hidden
            className="inline-block h-3.5 w-[7px]"
            style={{
              background: ACCENT,
              boxShadow: `0 0 6px ${ACCENT}`,
              animation: "search-blink 1s steps(2, start) infinite",
            }}
          />
        )}

        <button
          type="submit"
          disabled={disabled || !query.trim()}
          className="rounded px-2 py-0.5 text-[11px] uppercase tracking-widest transition-opacity disabled:opacity-40"
          style={{
            border: `1px solid ${ACCENT}55`,
            color: ACCENT,
            background: `${ACCENT}10`,
          }}
        >
          {status === "thinking" ? "..." : status === "cooldown" ? "wait" : "run"}
        </button>
      </form>

      <AnimatePresence>
        {(status === "thinking" || result) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-3 rounded-md border backdrop-blur"
            style={{
              borderColor: `${ACCENT}22`,
              background: "rgba(0,0,0,0.35)",
            }}
          >
            <div className="px-3 py-2 text-[12.5px] leading-relaxed" style={{ color: ACCENT }}>
              {status === "thinking" ? (
                <span className="text-gray-400">
                  <span style={{ color: ACCENT }}>›</span> thinking
                  <span
                    aria-hidden
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
              <div className="border-t px-3 py-2" style={{ borderColor: `${ACCENT}18` }}>
                <div className="mb-2 text-[11px] uppercase tracking-widest text-gray-500">
                  {result.matches.length} matching commit
                  {result.matches.length === 1 ? "" : "s"}
                </div>
                {result.matches.length === 0 ? (
                  <div className="text-[12.5px] text-gray-500">no commits matched your query.</div>
                ) : (
                  <ul className="space-y-1">
                    {result.matches.map((m) => (
                      <li key={m.hash}>
                        <button
                          type="button"
                          onClick={() => highlightCommit(m.hash)}
                          className="group flex w-full items-start gap-3 rounded px-2 py-1 text-left transition-colors hover:bg-white/5"
                        >
                          <span className="shrink-0 tabular-nums pt-[2px] text-[11.5px] text-gray-500 group-hover:text-gray-300">
                            {m.hash}
                          </span>
                          <span
                            className="text-[12.5px] leading-snug break-words"
                            style={{ color: m.accent }}
                          >
                            {m.message}
                          </span>
                          <span className="ml-auto shrink-0 pt-[2px] text-[10.5px] uppercase tracking-widest text-gray-600">
                            {m.branch}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes search-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
