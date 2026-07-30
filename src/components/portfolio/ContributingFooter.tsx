/* eslint-disable prettier/prettier */
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FileTab } from "./FileTab";
import { theme } from "@/lib/portfolio/theme";

const EMAIL = "alvyahmed03@gmail.com";

export function ContributingFooter() {
  const reduce = useReducedMotion() ?? false;
  const [copied, setCopied] = useState(false);

  // `mailto:` silently does nothing on any device without a default mail
  // client configured (increasingly common — most people read email in a
  // browser tab, not a native app) — the primary CTA next to this one can
  // fail with zero feedback to the user and zero way for them to recover.
  // Copy-to-clipboard is the reliable fallback for that exact case, not
  // just a nicety.
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (older browsers, insecure
      // context, denied permission) — the mailto link right next to this
      // button is still there either way, so a silent no-op is fine here
      // rather than surfacing an error for a purely secondary action.
    }
  };

  return (
    <section className="mt-10 sm:mt-14" aria-labelledby="contributing-heading">
      <FileTab label="CONTRIBUTING.md" dotColor={theme.green} reduceMotion={reduce} />

      <div
        className="rounded-b-md rounded-tr-md border p-5 sm:p-7 backdrop-blur-sm relative overflow-hidden"
        style={{ borderColor: theme.border, background: theme.panelBg }}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        {/* Status pill — answers the first question a recruiter actually
            has ("is this person even looking right now?") before they've
            read a single line of copy. Concrete and scannable beats
            implied — nothing about the old copy actually stated
            availability at all. */}
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] sm:text-[12px] font-medium mb-4"
          style={{
            borderColor: `${theme.green}33`,
            background: `${theme.green}0d`,
            color: theme.green,
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor] animate-pulse" />
          Open to Internship / Junior Full-Stack roles
        </div>

        <h2
          id="contributing-heading"
          className="text-lg sm:text-xl font-semibold tracking-tight text-white break-all"
        >
          git checkout -b feature/collaboration
        </h2>

        <p className="mt-3 text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl font-sans">
          Have an opening, an interesting project, or a team that needs a fast-learning full-stack
          hire? Reach out directly I read every message myself.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t pt-5 border-white/[0.04]">
          {/* Primary CTA — deliberately the highest-emphasis element here.
              Copy Email rides along as its immediate fallback (mailto:
              silently does nothing without a configured default mail
              client), not as an equally-weighted alternative. */}
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <a
              href={`mailto:${EMAIL}`}
              aria-label={`Email Alvy at ${EMAIL}`}
              className="inline-flex items-center justify-center px-5 py-3 font-semibold text-sm sm:text-[15px] rounded transition-all duration-200 bg-[#34d399] text-[#0b0c10] hover:bg-[#22c55e] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Email Me
            </a>
            <button
              type="button"
              onClick={handleCopyEmail}
              aria-label={
                copied ? "Email address copied to clipboard" : `Copy email address ${EMAIL}`
              }
              className="inline-flex items-center justify-center min-w-[9.5rem] px-4 py-2.5 sm:py-3 font-medium text-xs sm:text-sm rounded border transition-all duration-200 text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={{ duration: reduce ? 0.1 : 0.2 }}
                    style={{ color: theme.green }}
                  >
                    Copied ✓
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={{ duration: reduce ? 0.1 : 0.2 }}
                  >
                    Copy Email
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Identity / verification group — visually secondary (outline
              only, no fill) and pinned to the far side via justify-between
              on the parent, so the card's full width is actually used
              instead of everything huddled in the top-left corner with a
              dead gap next to it. */}
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row w-full sm:w-auto">
            <a
              href="https://github.com/alvy00"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Alvy's GitHub profile in a new tab"
              className="inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded border transition-all duration-200 text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/alvy00"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Alvy's LinkedIn profile in a new tab"
              className="inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded border transition-all duration-200 text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              LinkedIn
            </a>
            <a
              href="https://drive.google.com/file/d/1u9nMHao6Zk2U6Cji2StL9iiIguAPIAQ4/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Alvy's resume document in a new tab"
              className="col-span-2 inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded border transition-all duration-200 text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Download Resume
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
