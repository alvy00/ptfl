import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * 3D tilt + specular sheen for a glassmorphic card (FeatureModal/
 * BugfixModal's surfaceStyle() surface). Tracks mouse position within the
 * element's own bounding box and maps it to rotateX/rotateY plus a radial
 * gradient highlight that follows the cursor.
 *
 * Deliberately narrow in scope — this is a hover-only enhancement on a
 * modal that's scrollable, contains real interactive content (CTA links,
 * an AskProject chat input), and on mobile is a drag-to-dismiss sheet with
 * its own gesture system. All three of those shaped what this does and
 * doesn't do:
 *
 * - `enabled` should be false on mobile (no cursor to tilt toward, and a
 *   perspective transform stacked on an element mid-drag-gesture is asking
 *   for trouble) and under prefers-reduced-motion. Caller decides this —
 *   this hook just respects whatever it's told.
 * - Tilt tracking doesn't start until `notifySettled()` is called — meant
 *   to be wired to the modal's own `onAnimationComplete` once its entrance
 *   spring (scale/y) finishes. Composing a hover-driven transform with a
 *   still-animating entrance would fight itself.
 * - Automatically zeroes out and stops responding while an <input>,
 *   <textarea>, or contentEditable element inside the container has
 *   focus — a decorative cursor-tracking effect has no business competing
 *   with someone typing into AskProject.
 * - The specular highlight is returned as a separate motion value
 *   (`specularBackground`/`specOpacity`) meant for a `pointer-events-none`
 *   overlay element, not baked into the tilted card's own background —
 *   so it can never intercept a click on the CTAs/tags/chat input
 *   regardless of what the tilt transform is doing.
 */
export function useTiltSpecular<T extends HTMLElement>(
  containerRef: RefObject<T>,
  options: { enabled: boolean; maxTilt?: number },
) {
  const { enabled, maxTilt = 3.5 } = options; // reduced from 7 — was reading as too strong

  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);
  const specXRaw = useMotionValue(50); // percent, for the radial-gradient center
  const specYRaw = useMotionValue(50);
  const specOpacityRaw = useMotionValue(0);

  // Springs smooth out raw per-mousemove-event jumps into something that
  // reads as physical inertia rather than a value snapping frame to frame.
  const rotateX = useSpring(rotateXRaw, { stiffness: 300, damping: 30, mass: 0.5 });
  const rotateY = useSpring(rotateYRaw, { stiffness: 300, damping: 30, mass: 0.5 });
  const specOpacity = useSpring(specOpacityRaw, { stiffness: 260, damping: 28 });

  const specularBackground = useTransform(
    [specXRaw, specYRaw],
    ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.28), transparent 45%)`,
  );

  const settledRef = useRef(false);
  const inputFocusedRef = useRef(false);

  const notifySettled = useCallback(() => {
    settledRef.current = true;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const isTextInput = (node: EventTarget | null): boolean => {
      if (!(node instanceof HTMLElement)) return false;
      return node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.isContentEditable;
    };

    const resetToFlat = () => {
      rotateXRaw.set(0);
      rotateYRaw.set(0);
      specOpacityRaw.set(0);
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isTextInput(e.target)) return;
      inputFocusedRef.current = true;
      resetToFlat();
    };
    const onFocusOut = () => {
      // Deferred one frame so moving focus between two inputs (e.g. tabbing
      // through the chat form) doesn't flicker the tilt back on between them.
      requestAnimationFrame(() => {
        const active = document.activeElement;
        inputFocusedRef.current = Boolean(active && el.contains(active) && isTextInput(active));
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!settledRef.current || inputFocusedRef.current) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      // Cursor toward the top tilts the top edge toward the viewer, cursor
      // right tilts the right edge toward the viewer — if this reads
      // backwards once it's live, flip these two signs.
      rotateXRaw.set((0.5 - py) * 2 * maxTilt);
      rotateYRaw.set((px - 0.5) * 2 * maxTilt);
      specXRaw.set(px * 100);
      specYRaw.set(py * 100);
      specOpacityRaw.set(1);
    };

    const onMouseLeave = () => {
      resetToFlat();
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);

    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
      settledRef.current = false;
    };
  }, [enabled, containerRef, maxTilt, rotateXRaw, rotateYRaw, specXRaw, specYRaw, specOpacityRaw]);

  return { rotateX, rotateY, specularBackground, specOpacity, notifySettled };
}
