/* eslint-disable prettier/prettier */
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { getAIResponse } from "@/lib/portfolio/ask-project.mock";
import type { ProjectKey } from "@/data/portfolio/projects";

type Props = {
  projectKey: ProjectKey;
  accent: string;
};

const COOLDOWN_MS = 2000;

export function AskProject({ projectKey, accent }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "thinking" | "cooldown">("idle");

  const disabled = status !== "idle";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || disabled) return;
    setStatus("thinking");
    setAnswer(null);
    try {
      const res = await getAIResponse(projectKey, q);
      setAnswer(res);
    } catch {
      setAnswer("[error] request failed. try again.");
    } finally {
      setStatus("cooldown");
      setTimeout(() => setStatus("idle"), COOLDOWN_MS);
    }
  }

  return (
    <div className="mt-5 sm:mt-7 w-full max-w-full overflow-hidden">
      {/* Reduced font size slightly for a tighter terminal-badge feel */}
      <div className="mb-2 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500">
        ask
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-md border px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur w-full"
        style={{
          borderColor: `${accent}44`, // Subtly reduced opacity for a cleaner line trace
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <span
          className="select-none text-[14px] sm:text-[15.5px] shrink-0"
          style={{ color: accent, textShadow: `0 0 6px ${accent}55` }}
        >
          $
        </span>

        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={disabled}
          placeholder="ask about this project"
          aria-label="Ask about this project"
          className="flex-1 min-w-0 bg-transparent text-[14px] sm:text-[15.5px] text-white placeholder:text-gray-500 focus:outline-none disabled:opacity-60"
          spellCheck={false}
          autoComplete="off"
        />

        {status === "idle" && !question && (
          <span
            aria-hidden
            className="ask-cursor -ml-1 shrink-0"
            style={{ background: accent, ["--ask-accent" as string]: accent }}
          />
        )}

        <motion.button
          type="submit"
          disabled={disabled || !question.trim()}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.1 }}
          className="rounded px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-[13px] uppercase tracking-widest transition-opacity disabled:opacity-30 shrink-0 select-none"
          style={{
            border: `1px solid ${accent}55`,
            color: accent,
            background: `${accent}08`,
          }}
        >
          {status === "thinking" ? "..." : status === "cooldown" ? "wait" : "run"}
        </motion.button>
      </form>

      {/* Output Panel: Scaled down with text wrapping protection for smaller devices */}
      {(status === "thinking" || answer) && (
        <div
          className="mt-2 rounded-md border px-3 py-2 sm:px-4 sm:py-2.5 text-[13.5px] sm:text-[15px] leading-relaxed break-words word-break"
          style={{
            borderColor: `${accent}22`,
            background: "rgba(0,0,0,0.25)",
            color: accent,
          }}
        >
          {status === "thinking" ? (
            <span className="text-gray-400">
              <span style={{ color: accent }}>›</span> thinking
              <span aria-hidden style={{ animation: "ask-blink 1s steps(2, start) infinite" }}>
                ...
              </span>
            </span>
          ) : (
            <div className="flex items-start gap-1.5">
              <span className="text-gray-500 shrink-0 select-none">›</span>
              {/* Inherits accent color gracefully but avoids eye strain with long reading text */}
              <span className="text-gray-200 flex-1 min-w-0 break-words">{answer}</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes ask-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .ask-cursor {
          display: inline-block;
          width: 6px;
          height: 14px;
          animation: ask-cursor-pulse 1s steps(2, start) infinite;
        }
        @media (min-width: 640px) {
          .ask-cursor {
            width: 8px;
            height: 16.5px;
          }
        }
        @keyframes ask-cursor-pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 6px var(--ask-accent), 0 0 2px var(--ask-accent);
          }
          50% {
            opacity: 0;
            box-shadow: 0 0 0px transparent;
          }
        }
      `}</style>
    </div>
  );
}
