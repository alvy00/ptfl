import { useEffect, useLayoutEffect, useRef } from "react";

const HEX_GLYPHS = "0123456789abcdef";
const ASCII_GLYPHS = "!@#$%^&*<>[]{}/\\|_+=~";

interface DecryptOptions {
  /** Starts the scramble when this flips true. Caller owns "when" (e.g. an
   *  onViewportEnter callback higher up) — this hook has no observer of
   *  its own. */
  active: boolean;
  /** ms the scramble runs before locking onto the real string. Default 650.
   *  Needs to be long enough, relative to frameMs, that even a short hash
   *  gets several ticks per character before it's eligible to lock — too
   *  short and every character resolves within the first couple frames,
   *  which reads as instant rather than decoding. */
  duration?: number;
  /** ms between each character-frame tick. Lower = faster flicker. Default 28. */
  frameMs?: number;
  /** minimum frames every character must flicker before it's eligible to
   *  lock in, regardless of its position in the string. Without this,
   *  short strings compress all lock points into the first few frames and
   *  the scramble is over before it's visible. Default 5. */
  minHoldFrames?: number;
  /** glyph pool used while scrambling. */
  charset?: "hex" | "ascii" | "mixed";
  /** delay in ms before starting. */
  delayMs?: number;
  /** skip the scramble entirely — element already shows target via SSR, so
   *  this is just "don't touch it." */
  reducedMotion?: boolean;
  /** max +/- frame offset applied per character's lock time, so characters
   *  don't all snap on the same metronomic beat. Default 2. */
  jitterFrames?: number;
  /** brief text-shadow flash in this color when a character locks in,
   *  fading out over ~350ms. Omit for no glow. */
  glowColor?: string;
}

function glyphPool(charset: DecryptOptions["charset"]) {
  if (charset === "ascii") return ASCII_GLYPHS;
  if (charset === "mixed") return HEX_GLYPHS + ASCII_GLYPHS;
  return HEX_GLYPHS;
}

function randomChar(pool: string) {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Cypher-decode reveal: scrambles through random glyphs, then locks onto
 * `target` left-to-right (with light per-character jitter) like a build log
 * resolving a hash.
 *
 * Mutates the target element's textContent directly via ref instead of
 * driving React state per frame — with dozens of rows potentially animating
 * during a fast scroll, that's dozens of avoided re-renders. React never
 * needs to know the intermediate frames happened: the element's *initial*
 * rendered content should already be `target` (passed as normal JSX
 * children, so SSR output is always the real string — this hook only ever
 * animates on top of correct content, never replaces missing content).
 *
 * Usage:
 *   const ref = useDecryptText(n.hash, { active: inView, charset: "hex" });
 *   <span ref={ref}>{n.hash}</span>
 */
export function useDecryptText<T extends HTMLElement>(target: string, options: DecryptOptions) {
  const {
    active,
    duration = 1650,
    frameMs = 28,
    charset = "hex",
    delayMs = 0,
    reducedMotion = false,
    jitterFrames = 2,
    minHoldFrames = 5,
    glowColor,
  } = options;

  const ref = useRef<T | null>(null);
  const hasRun = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Runs once on mount, before paint. The element's JSX children are the
  // real `target` (that's what keeps SSR output correct — a crawler or a
  // client with JS disabled still sees the real hash). But if we leave
  // that real text sitting there until the scramble kicks in, "decrypting"
  // has nothing to visibly resolve *from* — it just reappears as itself.
  // So immediately post-mount, before the user's eye has registered
  // anything, swap it to a garbled placeholder of the same length. The
  // decrypt effect below then resolves that placeholder into the real
  // string the first time it activates.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    const pool = glyphPool(charset);
    el.textContent = Array.from(target, (ch) =>
      /[a-zA-Z0-9]/.test(ch) ? randomChar(pool) : ch,
    ).join("");
    // Intentionally mount-only — this is a one-time "what shows before the
    // decrypt runs" placeholder, not something that should re-garble on
    // every prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only ever decrypts once. Later activations (e.g. this row getting
    // dimmed and then un-dimmed again) should just show the
    // already-resolved real string, not replay the effect.
    if (reducedMotion || !active || hasRun.current) return;
    const el = ref.current;
    if (!el) return;
    hasRun.current = true;

    const pool = glyphPool(charset);
    const len = target.length;
    const totalFrames = Math.max(1, Math.round(duration / frameMs));

    // Per-character lock frame: linear base position + small random jitter,
    // floored at minHoldFrames so nothing can lock before it's actually had
    // a chance to flicker, and clamped to totalFrames so the last
    // characters don't blow past the animation window.
    const lockAt = Array.from({ length: len }, (_, i) => {
      const base = (i / len) * totalFrames;
      const jitter = (Math.random() * 2 - 1) * jitterFrames;
      return Math.min(totalFrames, Math.max(minHoldFrames, Math.round(base + jitter)));
    });

    let frame = 0;

    const flashGlow = () => {
      if (!glowColor) return;
      el.style.transition = "none";
      el.style.textShadow = `0 0 10px ${glowColor}, 0 0 20px ${glowColor}88`;
      // Force reflow so the transition below animates from this value
      // instead of being coalesced with it.
      void el.offsetWidth;
      // Hold at full intensity for a beat before fading — an instant fade
      // starting the same frame it appears reads as barely-there. Give the
      // eye time to actually register the blip before it starts leaving.
      window.setTimeout(() => {
        el.style.transition = "text-shadow 550ms ease-out";
        el.style.textShadow = "none";
      }, 180);
    };

    const tick = () => {
      frame += 1;

      let next = "";
      for (let i = 0; i < len; i++) {
        const ch = target[i];
        if (frame >= lockAt[i]) {
          next += ch;
        } else if (!/[a-zA-Z0-9]/.test(ch)) {
          // preserve punctuation/symbols/spaces — real log output doesn't
          // randomize its structural characters, only the content
          next += ch;
        } else {
          next += randomChar(pool);
        }
      }
      el.textContent = next;

      if (frame < totalFrames) {
        timeoutRef.current = setTimeout(() => {
          rafRef.current = requestAnimationFrame(tick);
        }, frameMs);
      } else {
        el.textContent = target; // guarantee exact final string
        flashGlow();
      }
    };

    const start = () => {
      rafRef.current = requestAnimationFrame(tick);
    };

    if (delayMs > 0) {
      timeoutRef.current = setTimeout(start, delayMs);
    } else {
      start();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Defensive: if interrupted mid-scramble, don't leave garbage glyphs
      // rendered — snap back to the real string.
      if (el) el.textContent = target;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target, reducedMotion]);

  return ref;
}
