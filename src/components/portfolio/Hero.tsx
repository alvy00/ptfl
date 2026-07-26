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

const INTRO_TEXT =
  "Chemical Engineering student at RUET — self-taught full-stack developer dedicated to shipping performant systems and polished interface architectures.";

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
 * scale/color hover, just without the spring-driven tracking.
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
        reduce
          ? undefined
          : { scale: 1.08, borderColor: "rgba(255,255,255,0.25)", color: "#ffffff" }
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
  // server and first client render match, then ticks once mounted.
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

  // Split the intro line into words for a cascading reveal instead of a
  // single fade-in block.
  const introWords = INTRO_TEXT.split(" ");

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
        className="rounded-b-md rounded-tr-md border p-5 sm:p-7 backdrop-blur-sm relative overflow-hidden transition-all duration-300"
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

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
          {/* Text column */}
          <div className="flex-1 min-w-0">
            <motion.h1
              variants={item}
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-white flex items-center gap-2"
            >
              Alvy
            </motion.h1>

            {/* Body copy in sans-serif, revealed word-by-word rather than as
                a single fade-in block. */}
            <motion.p
              variants={item}
              className="mt-3 text-gray-400 text-base sm:text-lg leading-relaxed max-w-3xl font-sans"
            >
              {introWords.map((word, i) => (
                <motion.span
                  key={`${word}-${i}`}
                  initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: reduce ? 0 : 0.4 + i * 0.03 }}
                  className="inline-block mr-[0.3em]"
                >
                  {word}
                </motion.span>
              ))}
            </motion.p>

            <motion.nav
              variants={badgeContainer}
              className="mt-6 sm:mt-7 flex flex-wrap gap-2 items-center"
              aria-label="Technology and availability tags"
            >
              {/* Now an actual link — clicking it opens an email draft
                  instead of just sitting there decoratively. */}
              <motion.a
                href="mailto:alvyahmed03@gmail.com?subject=Opportunity"
                variants={badge}
                whileHover={reduce ? undefined : { scale: 1.05, y: -1 }}
                className="relative inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-[13px] font-medium no-underline transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                style={{
                  borderColor: `${theme.green}66`,
                  color: theme.green,
                  background: `${theme.green}10`,
                }}
              >
                <span className="relative flex h-2 w-2">
                  {!reduce && (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ background: theme.green }}
                    />
                  )}
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ background: theme.green }}
                  />
                </span>
                Open to Work
              </motion.a>

              <motion.span
                variants={badge}
                whileHover={reduce ? undefined : { scale: 1.05, y: -1 }}
                className="rounded-full border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-[13px] text-gray-400 cursor-default tabular-nums"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                Based in Bangladesh{bstTime ? ` · ${bstTime} BST` : ""}
              </motion.span>

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
            </motion.nav>
          </div>

          {/* Photo column — reserved slot for a headshot. Hidden on small
              screens so the panel doesn't get cramped on mobile; shows up
              from md and grows slightly on lg. Reveals on its own timing
              (scale + blur-in, arriving just after the text/badges finish)
              rather than just fading in flat with everything else. Swap
              the placeholder span for a real <img> when the photo is
              ready, keeping the same wrapper className for size/shape/
              border — the reveal animation applies either way. */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.85, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: reduce ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
            whileHover={heavyEffects ? { scale: 1.04 } : undefined}
            className="hidden md:flex shrink-0 items-center justify-center w-28 h-28 lg:w-36 lg:h-36 rounded-2xl border overflow-hidden"
            style={{ borderColor: theme.border, background: "rgba(255,255,255,0.03)" }}
          >
            {/* Swap the src below if you rename the file — it just needs
                to live directly in /public so it's served from the site root. */}
            <img src="/alvy-avatar.png" alt="Alvy" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      </motion.div>
    </motion.header>
  );
}
