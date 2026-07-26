/* eslint-disable prettier/prettier */
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionTemplate,
  useSpring,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode, CSSProperties } from "react";
import { Github, Linkedin, ArrowUpRight, FileDown } from "lucide-react";
import { FileTab } from "./FileTab";
import { theme } from "@/lib/portfolio/theme";
import {
  containerVariants,
  itemVariants,
  badgeContainerVariants,
  badgeVariants,
} from "@/lib/portfolio/motion";

const TECH_TAGS = [
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "NestJS",
  "TypeScript",
  "PostgreSQL",
  "MongoDB",
];

// Two separate lines instead of one block of text — rendered as two
// stacked <span className="block"> lines below, with the second line's
// word-cascade starting only after the first line's finishes (see
// lineStartDelay in the JSX). Keeping them as an array (rather than a
// template string with an embedded newline) makes that per-line stagger
// straightforward to compute.
const INTRO_LINES = [
  "I'm a Chemical Engineering senior at RUET who fell into full-stack development and stayed for the problem-solving. Turns out a lot of the systems thinking carries over.",
];

const ROLE_TAGLINE = "Full-Stack Developer";

// Replace these with your real profile URLs / resume file path.
const SOCIAL_LINKS = {
  github: "https://github.com/",
  linkedin: "https://linkedin.com/in/",
  resume: "/resume.pdf",
};

// Low-opacity fractal-noise texture for a tactile "frosted glass" feel on
// the panel background. Inline data URI so there's no extra asset/network
// request just for a 3%-opacity overlay.
const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * True only for devices that actually have a mouse/trackpad (fine pointer)
 * on a wide-enough viewport. Cursor-follow glow, the magnetic badge pull,
 * the scroll-linked 3D tilt, and the noise overlay are all desktop-hover
 * flourishes that cost real paint/composite time for no visual benefit on
 * a phone (no hover, no cursor) — so they're switched off there entirely
 * rather than just made subtler. Starts `false` (matches SSR) and flips
 * on after mount once we can check `matchMedia`.
 */
function useHeavyEffectsEnabled(reduce: boolean) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (reduce) return;
    const query = window.matchMedia("(pointer: fine) and (min-width: 768px)");
    setEnabled(query.matches);
    const handler = (e: MediaQueryListEvent) => setEnabled(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, [reduce]);
  return enabled;
}

/**
 * A tech-stack badge that gently pulls toward the cursor while hovered,
 * mapped through a spring so it snaps back smoothly on mouse-leave.
 * Layered on top of the existing scale/color hover treatment rather than
 * replacing it. The magnetic pull itself is skipped on touch/small
 * screens (`enableMagnetic=false`) — the badges still get the plain
 * scale/color hover, just without the spring-driven tracking. Hover now
 * tints the border toward green (rather than plain white) so the pull
 * feels reactive to *this* portfolio's palette rather than generic.
 */
function MagneticBadge({
  children,
  reduce,
  enableMagnetic,
  className,
  style,
}: {
  children: ReactNode;
  reduce: boolean;
  enableMagnetic: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  function handleMouseMove(e: ReactMouseEvent<HTMLSpanElement>) {
    if (!enableMagnetic) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * 0.3);
    y.set(relY * 0.3);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span
      variants={badgeVariants(reduce)}
      onMouseMove={enableMagnetic ? handleMouseMove : undefined}
      onMouseLeave={enableMagnetic ? handleMouseLeave : undefined}
      whileHover={
        reduce ? undefined : { scale: 1.08, borderColor: `${theme.green}88`, color: "#ffffff" }
      }
      style={enableMagnetic ? { x: springX, y: springY, ...style } : style}
      className={className}
    >
      {children}
    </motion.span>
  );
}

export function Hero() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);

  // Subtle scroll-driven parallax: the hero panel drifts and fades slightly
  // as the user scrolls past it, rather than only ever animating once on
  // mount. Kept intentionally subtle — this is a "hello" panel, not a hero
  // banner that should fight for attention on the way out.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -24]);
  const parallaxOpacity = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.75]);

  // Desktop-with-a-mouse only — see useHeavyEffectsEnabled for why. This is
  // the single switch for the tilt, the cursor glow, the magnetic badges,
  // and the noise overlay, so phones get the same clean fades/stagger
  // without paying for scroll-linked 3D transforms or mousemove handlers.
  const heavyEffects = useHeavyEffectsEnabled(reduce);

  // 3D "recess" effect: the panel scales down slightly and tilts back on
  // its X axis as it scrolls away, so it reads as sinking into the page
  // rather than just sliding up and fading. Disabled on mobile: a
  // continuously-updating rotateX/scale on a backdrop-blurred, blended
  // layer is one of the more expensive things you can ask a phone's
  // compositor to do every scroll frame.
  const panelScale = useTransform(scrollYProgress, [0, 1], [1, heavyEffects ? 0.95 : 1]);
  const panelRotateX = useTransform(scrollYProgress, [0, 1], [0, heavyEffects ? 5 : 0]);

  const container = containerVariants(reduce);
  const item = itemVariants(reduce);
  const badgeContainer = badgeContainerVariants(reduce);
  const badge = badgeVariants(reduce);

  // Cursor-tracked glow that follows the mouse across the panel — desktop only.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowBackground = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, ${theme.green}1a, transparent 70%)`;

  function handlePanelMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (!heavyEffects) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  // Live BST clock next to "Based in Bangladesh" — a small practical detail
  // for recruiters/clients scheduling across timezones. Starts at null so
  // server and first client render match, then ticks once mounted. The
  // wrapping span below reserves a fixed width matching "00:00 PM BST" so
  // there's zero layout shift the moment the real time populates on mount.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const bstTime = now
    ? new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Dhaka",
      }).format(now)
    : null;

  // Shared focus-visible ring classes for every interactive element in the
  // hero, so keyboard users get a clear, on-brand focus indicator instead
  // of relying on whileHover (which never fires for keyboard navigation).
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0f13]";
  // Static Tailwind color (emerald-400 ≈ theme.green's #34d399) rather than
  // interpolating theme.green into an arbitrary-value class — Tailwind's
  // JIT scanner needs literal class strings in source to generate the
  // corresponding CSS, so a runtime-built `ring-[${theme.green}]` string
  // would silently produce no ring at all.
  const focusRingGreen = `${focusRing} focus-visible:ring-emerald-400`;

  return (
    <motion.header
      ref={ref}
      className="mb-10 sm:mb-12"
      initial="hidden"
      animate="visible"
      variants={container}
      style={{ y: parallaxY, opacity: parallaxOpacity }}
    >
      <FileTab label="README.md" dotColor={theme.green} pulse reduceMotion={reduce} />

      <motion.div
        variants={item}
        onMouseMove={heavyEffects ? handlePanelMouseMove : undefined}
        className="rounded-b-md rounded-tr-md border backdrop-blur-sm relative overflow-hidden transition-all duration-300"
        style={{
          borderColor: theme.border,
          background: theme.panelBg,
          scale: panelScale,
          rotateX: panelRotateX,
          transformPerspective: 800,
        }}
      >
        {/* Sweeping shimmer along the top border, replacing the old static line */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
            backgroundSize: "200% 100%",
          }}
          animate={reduce ? undefined : { backgroundPositionX: ["0%", "200%"] }}
          transition={reduce ? undefined : { duration: 3.5, repeat: Infinity, ease: "linear" }}
        />

        {/* Subtle frosted-glass noise texture — desktop only, see heavyEffects */}
        {heavyEffects && (
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
            style={{ backgroundImage: NOISE_BG }}
          />
        )}

        {/* Cursor-tracked glow — desktop only, see heavyEffects */}
        {heavyEffects && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: glowBackground }}
          />
        )}

        {/* Main content: text pitch + photo, side by side from md up. */}
        <div className="relative z-10 flex flex-col-reverse md:flex-row md:items-center gap-8 md:gap-10 lg:gap-14 p-6 sm:p-10 lg:p-14 pt-4 sm:pt-5 lg:pt-6">
          {/* Text column */}
          <div className="flex-1 min-w-0">
            <motion.p
              variants={item}
              className="font-mono text-xs sm:text-sm tracking-widest uppercase mb-2 flex items-center gap-2"
              style={{ color: theme.green }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: theme.green, boxShadow: `0 0 8px ${theme.green}` }}
              />
              {ROLE_TAGLINE}
            </motion.p>

            <motion.h1
              variants={item}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white flex items-center gap-2"
            >
              Alvy
            </motion.h1>

            {/* Body copy in sans-serif, revealed word-by-word with spring
                physics instead of a fixed-duration timer — words settle
                with a slight kinetic overshoot rather than a mechanical
                linear fade. Two lines instead of one flowing paragraph:
                each line is its own block-level span, and each line's
                cascade starts only once the previous line's words have
                finished settling (lineStartDelay below), rather than all
                words across both lines animating on one shared clock. */}
            <motion.p
              variants={item}
              className="mt-4 text-gray-400 text-lg sm:text-xl leading-relaxed max-w-2xl font-sans"
            >
              {INTRO_LINES.map((line, lineIndex) => {
                const words = line.split(" ");
                // How long the prior line(s) took to finish their own
                // word-cascade: word count * 0.03s stagger, summed across
                // every line before this one, plus a small 0.2s breathing
                // pause so line 2 doesn't start the instant line 1 ends.
                const priorWordDelay = INTRO_LINES.slice(0, lineIndex).reduce(
                  (total, priorLine) => total + priorLine.split(" ").length * 0.03,
                  0,
                );
                const lineStartDelay = 0.4 + priorWordDelay + (lineIndex > 0 ? 0.2 : 0);

                return (
                  <span key={lineIndex} className="block">
                    {words.map((word, i) => (
                      <motion.span
                        key={`${word}-${i}`}
                        initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={
                          reduce
                            ? { duration: 0.01 }
                            : {
                                type: "spring",
                                stiffness: 200,
                                damping: 15,
                                delay: lineStartDelay + i * 0.03,
                              }
                        }
                        className="inline-block mr-[0.3em]"
                      >
                        {word}
                      </motion.span>
                    ))}
                  </span>
                );
              })}
            </motion.p>

            {/* CTA row — microcopy tightened to match the terminal/git
                aesthetic instead of generic "Get in Touch" boilerplate.
                Every interactive element carries an explicit
                focus-visible ring for keyboard navigation. */}
            <motion.div
              variants={badgeContainer}
              className="mt-7 sm:mt-8 flex flex-wrap items-center gap-3"
            >
              <motion.a
                variants={badge}
                href="mailto:alvyahmed03@gmail.com?subject=Opportunity"
                whileHover={reduce ? undefined : { scale: 1.03, y: -1 }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium no-underline transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(52,211,153,0.35)] ${focusRingGreen}`}
                style={{ background: theme.green, color: "#0e0f13" }}
              >
                Let's Build Together
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
              </motion.a>

              <motion.a
                variants={badge}
                href={SOCIAL_LINKS.resume}
                download
                whileHover={reduce ? undefined : { scale: 1.03, y: -1 }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium no-underline text-gray-200 transition-colors duration-200 hover:text-white ${focusRingGreen}`}
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <FileDown className="h-4 w-4" />
                Resume
              </motion.a>

              <motion.a
                variants={badge}
                href={SOCIAL_LINKS.github}
                target="_blank"
                rel="noreferrer"
                whileHover={reduce ? undefined : { scale: 1.08 }}
                aria-label="GitHub profile"
                className={`inline-flex items-center justify-center h-10 w-10 rounded-lg border text-gray-300 transition-colors duration-200 hover:text-white ${focusRingGreen}`}
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <Github className="h-4 w-4" />
              </motion.a>

              <motion.a
                variants={badge}
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noreferrer"
                whileHover={reduce ? undefined : { scale: 1.08 }}
                aria-label="LinkedIn profile"
                className={`inline-flex items-center justify-center h-10 w-10 rounded-lg border text-gray-300 transition-colors duration-200 hover:text-white ${focusRingGreen}`}
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <Linkedin className="h-4 w-4" />
              </motion.a>
            </motion.div>
          </div>

          {/* Photo column — visible at every breakpoint (centered above the
              text on mobile, beside it from md up) since a face earns
              trust fastest, and this panel is the only thing on screen
              right after load. Reveals on its own timing (scale + blur-in,
              arriving just after the text/badges finish) rather than
              fading in flat with everything else. Swap the <img> src for
              a new file if needed — it just needs to live directly in
              /public. Deliberately does NOT include any fabricated
              "live" stats (commit counters, fake status strings) — the
              micro-header above already carries the one true live detail
              (the clock), and the avatar's presence comes from its size
              and glow rather than invented telemetry. */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.85, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: reduce ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
            whileHover={heavyEffects ? { scale: 1.03 } : undefined}
            className="relative shrink-0 mx-auto md:mx-0 w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64"
          >
            <div
              className="absolute -inset-2 rounded-[2rem] opacity-40 blur-xl pointer-events-none"
              style={{ background: `radial-gradient(circle, ${theme.green}55, transparent 70%)` }}
            />
            <div
              className="relative w-full h-full flex items-center justify-center rounded-3xl border overflow-hidden"
              style={{ borderColor: theme.border, background: "rgba(255,255,255,0.03)" }}
            >
              <img src="/alvy-avatar.png" alt="Alvy" className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </div>

        {/* Footer strip — full-width tech stack only. Availability/location
            moved up to the top micro-header, so this strip no longer
            duplicates that information — it's purely "here's the stack." */}
        <motion.div
          variants={badgeContainer}
          className="relative z-10 border-t px-6 sm:px-10 lg:px-14 py-4 sm:py-5 flex flex-wrap items-center gap-2"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          {TECH_TAGS.map((tag) => (
            <MagneticBadge
              key={tag}
              reduce={reduce}
              enableMagnetic={heavyEffects}
              className="rounded-full border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-[13px] text-gray-400 cursor-default transition-colors duration-200"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              {tag}
            </MagneticBadge>
          ))}
        </motion.div>
      </motion.div>
    </motion.header>
  );
}
