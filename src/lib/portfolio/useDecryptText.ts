import { useEffect, useRef, useState } from "react";

const HEX_GLYPHS = "0123456789abcdef";
const ASCII_GLYPHS = "!@#$%^&*<>[]{}/\\|_+=~";

interface DecryptOptions {
  /** Starts the scramble when this flips true. Caller owns "when" (e.g. an
   *  onViewportEnter callback higher up) — this hook has no observer of
   *  its own, so multiple fields on the same row don't pay for redundant
   *  IntersectionObservers. */
  active: boolean;
  /** ms the scramble runs before locking onto the real string. Default 300. */
  duration?: number;
  /** ms between each character-frame tick. Lower = faster flicker. Default 28. */
  frameMs?: number;
  /** glyph pool used while scrambling. 'hex' for hashes, 'mixed' for messages. */
  charset?: "hex" | "ascii" | "mixed";
  /** delay in ms before starting, for staggering hash vs. message. Default 0. */
  delayMs?: number;
  /** skip the scramble entirely and just show target immediately. */
  reducedMotion?: boolean;
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
 * `target` left-to-right, index by index, like a build log resolving hashes.
 *
 * Does not detect viewport entry itself — pass `active` from whatever
 * already knows the row is in view (e.g. GitGraphCommitRow's existing
 * viewport trigger via onViewportEnter).
 */
export function useDecryptText(target: string, options: DecryptOptions) {
  const {
    active,
    duration = 300,
    frameMs = 28,
    charset = "hex",
    delayMs = 0,
    reducedMotion = false,
  } = options;

  const [text, setText] = useState(reducedMotion ? target : "");
  const hasRun = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setText(target);
      return;
    }
    if (!active || hasRun.current) return;
    hasRun.current = true;

    const pool = glyphPool(charset);
    const len = target.length;
    const totalFrames = Math.max(1, Math.round(duration / frameMs));
    let frame = 0;

    const tick = () => {
      frame += 1;
      const lockedCount = Math.floor((frame / totalFrames) * len);

      let next = "";
      for (let i = 0; i < len; i++) {
        if (i < lockedCount) {
          next += target[i];
        } else if (target[i] === " ") {
          next += " "; // preserve word spacing so it doesn't glitch mid-word
        } else {
          next += randomChar(pool);
        }
      }
      setText(next);

      if (frame < totalFrames) {
        timeoutRef.current = setTimeout(() => {
          rafRef.current = requestAnimationFrame(tick);
        }, frameMs);
      } else {
        setText(target); // guarantee exact final string, no leftover glyphs
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target, reducedMotion]);

  return text;
}
