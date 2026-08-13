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
import { ArrowUpRight, FileDown } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
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

// Rendered as stacked <span className="block"> lines, second line's word
// cascade starting only after the first finishes (lineStartDelay below).
const INTRO_LINES = [
  "I'm a Chemical Engineering senior at RUET who fell into full-stack development and stayed for the problem-solving. Turns out a lot of the systems thinking carries over.",
];

const ROLE_TAGLINE = "Full-Stack Developer";

// Replace these with your real profile URLs / resume file path.
const SOCIAL_LINKS = {
  github: "https://github.com/alvy00",
  linkedin: "https://linkedin.com/in/alvy00",
  resume: "https://drive.google.com/file/d/1zGCxzbQpefrQmL6c9Zr1VkU0n8Ouh6-E/view?usp=sharing",
};

// Inline data-URI fractal-noise texture — no extra asset request for a
// 3%-opacity overlay.
const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * True only for a real mouse/trackpad on a wide-enough viewport — gates
 * every desktop-hover flourish (tilt, cursor glow, magnetic badges, noise
 * overlay) off entirely on touch rather than just making them subtler.
 * Starts false (matches SSR), flips on after mount.
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
 * A tech-stack badge that pulls toward the cursor while hovered (spring-
 * mapped so it snaps back on mouse-leave), plus a specular highlight that
 * tracks raw cursor position within the badge for a coin-tilt glint. Both
 * are skipped on touch/small screens (`enableMagnetic=false`) — badges
 * still get the plain scale/color hover, just without the tracking.
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

  // Raw (top-left-relative) position, separate from the center-relative
  // spring-driven pull above — the specular highlight needs to land
  // exactly under the cursor, not at the pull's damped offset.
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const specular = useMotionTemplate`radial-gradient(70px circle at ${glowX}px ${glowY}px, rgba(255,255,255,0.4), transparent 70%)`;

  function handleMouseMove(e: ReactMouseEvent<HTMLSpanElement>) {
    if (!enableMagnetic) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * 0.3);
    y.set(relY * 0.3);
    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
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
      className={`relative overflow-hidden ${className ?? ""}`}
    >
      {children}
      {enableMagnetic && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{ background: specular }}
        />
      )}
    </motion.span>
  );
}

export function Hero() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -24]);
  const parallaxOpacity = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.75]);

  const heavyEffects = useHeavyEffectsEnabled(reduce);

  const panelScale = useTransform(scrollYProgress, [0, 1], [1, heavyEffects ? 0.95 : 1]);
  const panelRotateX = useTransform(scrollYProgress, [0, 1], [0, heavyEffects ? 5 : 0]);

  const container = containerVariants(reduce);
  const item = itemVariants(reduce);
  const badgeContainer = badgeContainerVariants(reduce);
  const badge = badgeVariants(reduce);

  // Cursor-tracked glow — desktop only. Updates are rAF-batched (below)
  // rather than applied straight off every raw mousemove event.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowBackground = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, ${theme.green}1a, transparent 70%)`;

  const panelRafRef = useRef<number | null>(null);
  const pendingPanelPos = useRef<{ x: number; y: number } | null>(null);
  useEffect(
    () => () => {
      if (panelRafRef.current != null) cancelAnimationFrame(panelRafRef.current);
    },
    [],
  );

  function handlePanelMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (!heavyEffects) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pendingPanelPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (panelRafRef.current == null) {
      panelRafRef.current = requestAnimationFrame(() => {
        panelRafRef.current = null;
        if (pendingPanelPos.current) {
          mouseX.set(pendingPanelPos.current.x);
          mouseY.set(pendingPanelPos.current.y);
        }
      });
    }
  }

  // Live BST clock — null on both server and first client render (no
  // hydration mismatch), ticks after mount. Fixed-width span reserves
  // "· 00:00 PM BST" so populating it causes zero layout shift.
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

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0f13]";
  // Static Tailwind color rather than an interpolated arbitrary-value
  // class — Tailwind's JIT scanner needs a literal class string in source.
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
      <div className="flex items-center gap-1.5">
        <FileTab label="README.md" dotColor={theme.green} pulse reduceMotion={reduce} />
        {/* Blinking terminal caret next to the tab — FileTab's own markup
            isn't available here, so this sits alongside it rather than
            inside it. */}
        <motion.span
          aria-hidden="true"
          className="inline-block h-3.5 w-[2px] translate-y-[1px]"
          style={{ backgroundColor: theme.green }}
          animate={reduce ? { opacity: 0.6 } : { opacity: [1, 1, 0, 0] }}
          transition={
            reduce
              ? { duration: 0.01 }
              : { duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }
          }
        />
      </div>

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
        {/* Sharp light pulse traveling the top border, with a pause
            between sweeps — reads as a circuit bus firing periodically
            rather than a continuous shimmer. */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.5) 45%, #fff 50%, rgba(255,255,255,0.5) 55%, transparent)",
            backgroundSize: "60% 100%",
            backgroundRepeat: "no-repeat",
          }}
          animate={reduce ? undefined : { backgroundPositionX: ["-60%", "160%"] }}
          transition={
            reduce
              ? undefined
              : { duration: 1.1, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }
          }
        />

        {heavyEffects && (
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
            style={{ backgroundImage: NOISE_BG }}
          />
        )}

        {heavyEffects && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: glowBackground }}
          />
        )}

        <div className="relative z-10 flex flex-col-reverse md:flex-row md:items-center gap-8 md:gap-10 lg:gap-14 p-6 sm:p-10 lg:p-14 pt-4 sm:pt-5 lg:pt-6">
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

            <motion.p
              variants={item}
              className="text-[11px] sm:text-xs text-gray-500 font-mono mb-2 flex items-center gap-1.5"
            >
              <span aria-hidden="true">📍</span>
              Based in Bangladesh
            </motion.p>

            <motion.h1
              variants={item}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white flex items-center gap-2"
            >
              Alvy Ahmed
            </motion.h1>

            {/* Word-by-word spring reveal, each word blurring in rather
                than a plain translateY/opacity fade — reads closer to a
                terminal log resolving into focus. Two lines, second line's
                cascade starts only once the first finishes (lineStartDelay). */}
            <motion.p
              variants={item}
              className="mt-4 text-gray-400 text-lg sm:text-xl leading-relaxed max-w-2xl font-sans"
            >
              {INTRO_LINES.map((line, lineIndex) => {
                const words = line.split(" ");
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
                        initial={{
                          opacity: 0,
                          y: reduce ? 0 : 10,
                          filter: reduce ? "blur(0px)" : "blur(4px)",
                        }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
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
                <FaGithub className="h-4 w-4" />
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
                <FaLinkedin className="h-4 w-4" />
              </motion.a>
            </motion.div>
          </div>

          {/* Photo column — reveals on its own timing (scale + blur-in)
              just after text/badges finish, deliberately with no
              fabricated "live" stats. */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.85, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: reduce ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
            whileHover={heavyEffects ? { scale: 1.03 } : undefined}
            className="relative shrink-0 mx-auto md:mx-0 w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64"
          >
            {/* Slow breathing pulse — reads as a live/online indicator
                rather than a static glow, independent of hover. */}
            <motion.div
              className="absolute -inset-2 rounded-[2rem] blur-xl pointer-events-none"
              style={{ background: `radial-gradient(circle, ${theme.green}55, transparent 70%)` }}
              animate={
                reduce ? { opacity: 0.4 } : { opacity: [0.4, 0.6, 0.4], scale: [1, 1.05, 1] }
              }
              transition={
                reduce ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
              }
            />
            <div
              className="relative w-full h-full flex items-center justify-center rounded-3xl border overflow-hidden"
              style={{ borderColor: theme.border, background: "rgba(255,255,255,0.03)" }}
            >
              <img
                src="/alvy-avatar.png"
                alt={`Portrait of Alvy, ${ROLE_TAGLINE.toLowerCase()} based in Bangladesh`}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>

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
