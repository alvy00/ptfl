/* eslint-disable prettier/prettier */
import { useState, type FormEvent } from "react";
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
    <div className="mt-6">
      <div className="mb-2 text-[11px] uppercase tracking-widest text-gray-500">ask</div>
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-md border px-3 py-2 backdrop-blur"
        style={{
          borderColor: `${accent}55`,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <span
          className="select-none text-[13px]"
          style={{ color: accent, textShadow: `0 0 8px ${accent}66` }}
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
          className="flex-1 bg-transparent text-[13px] text-white placeholder:text-gray-500 focus:outline-none disabled:opacity-60"
          spellCheck={false}
          autoComplete="off"
        />
        {status === "idle" && !question && (
          <span
            aria-hidden
            className="inline-block h-3.5 w-[7px] -ml-1"
            style={{
              background: accent,
              boxShadow: `0 0 6px ${accent}`,
              animation: "ask-blink 1s steps(2, start) infinite",
            }}
          />
        )}
        <button
          type="submit"
          disabled={disabled || !question.trim()}
          className="rounded px-2 py-0.5 text-[11px] uppercase tracking-widest transition-opacity disabled:opacity-40"
          style={{
            border: `1px solid ${accent}66`,
            color: accent,
            background: `${accent}10`,
          }}
        >
          {status === "thinking" ? "..." : status === "cooldown" ? "wait" : "run"}
        </button>
      </form>

      {(status === "thinking" || answer) && (
        <div
          className="mt-2 rounded-md border px-3 py-2 text-[12.5px] leading-relaxed"
          style={{
            borderColor: `${accent}33`,
            background: "rgba(0,0,0,0.3)",
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
            <>
              <span className="text-gray-500">› </span>
              <span style={{ color: accent }}>{answer}</span>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes ask-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
