import { motion, useScroll, useTransform, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { CONTACT_EMAIL } from "@/lib/portfolio/gitGraphData";

// The closing "open to internship / junior developer roles" line already
// exists as the HEAD commit at the bottom of the graph (see
// GitGraphCommitRow's isHeadContact/HEAD_MAILTO) — this component doesn't
// replace that, it solves a different problem: a recruiter skimming for
// 6-10 seconds may never scroll far enough to reach it. This is the same
// ask (email Alvy about a role), just always on-screen instead of buried
// at the end of a long commit history.
const SUBJECT = "Internship / junior developer role — via portfolio";
const BODY = [
  "Hi Alvy,",
  "",
  "I came across your portfolio and wanted to reach out about an internship / junior developer opportunity.",
  "",
  "",
].join("\n");
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  SUBJECT,
)}&body=${encodeURIComponent(BODY)}`;

// No resume file/link is wired in yet — RESUME_URL is left null rather
// than pointing at a guessed path. Set it to a real URL (a hosted PDF, a
// Drive link, whatever) to have the second button appear; until then only
// the "Get in Touch" mailto renders, so this never links to something
// that doesn't exist.
const RESUME_URL: string | null = null;

export function PersistentCTA() {
  const reduceMotion = useReducedMotion() ?? false;

  // Was visible immediately on load, competing with the hero for the
  // first impression and slightly deflating the graph's own "payoff at
  // the bottom" pacing (HEAD's "open to work" moment). Now fades in only
  // once the visitor has scrolled roughly past the hero — same [0, 400]
  // scroll range index.tsx already uses to fade the hero itself out, so
  // this appears right as the hero recedes rather than on an unrelated
  // timer. Still always reachable after that point, which is the actual
  // ask (a skimming recruiter shouldn't have to hunt for it) — it just
  // no longer front-loads onto the very first second on screen.
  const { scrollY } = useScroll();
  const ctaOpacity = useTransform(scrollY, [150, 400], [0, 1]);
  // opacity alone doesn't stop the links from being keyboard-focusable or
  // clickable while invisible — a tab-through before scrolling would land
  // on an invisible "Get in Touch" link, which is worse than not being
  // reachable at all (focus disappears with nothing visibly indicating
  // where it went). Tracked as real state (not derived inline from
  // ctaOpacity, a MotionValue that doesn't re-render React on change) so
  // pointer-events/tabIndex can react to the same threshold the opacity
  // fade uses.
  const [revealed, setRevealed] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setRevealed(v > 150));

  return (
    <motion.div
      style={{ opacity: reduceMotion ? 1 : ctaOpacity }}
      className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2 ${
        revealed || reduceMotion ? "" : "pointer-events-none"
      }`}
    >
      {RESUME_URL && (
        <a
          href={RESUME_URL}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={revealed || reduceMotion ? undefined : -1}
          className="rounded-full border border-white/10 bg-[#0e0f13]/90 px-4 py-2 text-[12px] sm:text-[13px] font-mono text-gray-300 backdrop-blur-md transition-colors duration-150 hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Download Resume
        </a>
      )}
      <a
        href={MAILTO}
        tabIndex={revealed || reduceMotion ? undefined : -1}
        className="rounded-full px-5 py-2.5 text-[13px] sm:text-[14px] font-mono font-semibold text-[#0e0f13] shadow-[0_4px_20px_-4px_rgba(52,211,153,0.5)] transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        style={{ background: "#34d399" }}
      >
        Get in Touch
      </a>
    </motion.div>
  );
}
