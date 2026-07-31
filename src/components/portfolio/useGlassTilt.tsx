import { useState, type RefObject } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";

const MAX_TILT = 2; // degrees — "noticeable" per design call, not a showpiece extreme
// Softer spring than the button micro-interactions elsewhere in this file
// (those want to feel snappy/immediate) — a tilting glass surface should
// feel like it has a bit of weight/inertia to it, not snap to the cursor.
const TILT_SPRING = { stiffness: 150, damping: 18, mass: 0.4 } as const;
// Specular highlight tracks a bit more eagerly than the tilt itself — the
// "catching light" moment reads better when it's slightly quicker than the
// surface's own motion, not perfectly locked to it.
const SPECULAR_SPRING = { stiffness: 220, damping: 24 } as const;

/**
 * Tilt + specular tracking for a glassmorphic card. Reuses the SAME
 * container ref the caller already has (e.g. useFocusTrap's containerRef)
 * rather than creating its own — this hook doesn't own the DOM node, it
 * just reads pointer position relative to whatever ref is passed in and
 * hands back motion values + event handlers to attach.
 *
 * Deliberately NOT active until:
 *  - `disabled` is false (caller passes isMobile || reducedMotion — no
 *    cursor to tilt toward on touch, and reduced-motion means no drift)
 *  - the entrance spring has finished (`markSettled`, meant to be wired to
 *    the motion.div's own onAnimationComplete) — composing a hover-driven
 *    tilt with an in-flight scale/y entrance spring would fight itself
 *  - no text field inside the card currently has focus (AskProject's
 *    input, most likely) — typing shouldn't share a transform layer with
 *    a decorative cursor-tracking effect
 */
export function useGlassTilt<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  { disabled }: { disabled: boolean },
) {
  const [settled, setSettled] = useState(false);
  const [fieldFocused, setFieldFocused] = useState(false);

  const px = useMotionValue(0.5); // 0..1 normalized pointer position within the card
  const py = useMotionValue(0.5);
  const tiltX = useSpring(px, TILT_SPRING);
  const tiltY = useSpring(py, TILT_SPRING);
  const specX = useSpring(px, SPECULAR_SPRING);
  const specY = useSpring(py, SPECULAR_SPRING);

  // Standard tilt-card convention: hovering the top half tips the top edge
  // toward the viewer (positive rotateX), hovering the left half tips the
  // left edge away (negative rotateY) — mirrors how vanilla-tilt/
  // react-parallax-tilt map these so it reads as "physical" rather than
  // arbitrary.
  const rotateX = useTransform(tiltY, [0, 1], [MAX_TILT, -MAX_TILT]);
  const rotateY = useTransform(tiltX, [0, 1], [-MAX_TILT, MAX_TILT]);
  const specXPct = useTransform(specX, (v) => v * 100);
  const specYPct = useTransform(specY, (v) => v * 100);

  const active = !disabled && settled && !fieldFocused;

  const isTextField = (el: EventTarget | null) => {
    const node = el as HTMLElement | null;
    if (!node) return false;
    return node.tagName === "TEXTAREA" || node.tagName === "INPUT" || node.isContentEditable;
  };

  const handlers = {
    onMouseMove: (e: React.MouseEvent<T>) => {
      if (!active) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      px.set((e.clientX - rect.left) / rect.width);
      py.set((e.clientY - rect.top) / rect.height);
    },
    onMouseLeave: () => {
      px.set(0.5);
      py.set(0.5);
    },
    onFocusCapture: (e: React.FocusEvent<T>) => {
      if (isTextField(e.target)) setFieldFocused(true);
    },
    onBlurCapture: (e: React.FocusEvent<T>) => {
      if (isTextField(e.target)) setFieldFocused(false);
    },
  };

  const tiltStyle = disabled
    ? {}
    : {
        transformPerspective: 1000,
        rotateX,
        rotateY,
      };

  return {
    tiltStyle,
    handlers,
    markSettled: () => setSettled(true),
    specXPct,
    specYPct,
    active,
  };
}

/**
 * Specular highlight overlay — decoupled from the tilt transform on
 * purpose. Rendered as a pointer-events-none absolutely-positioned child
 * rather than baked into the tilted element's own background, so it can
 * never intercept clicks on the real content (CTAs, stack tags,
 * AskProject) underneath it regardless of what the 3D transform is doing.
 *
 * Two layers:
 *  - a soft surface sheen following the cursor, for the general "catching
 *    light" feel across the glass
 *  - an edge ring using the standard gradient-border mask trick (two
 *    backgrounds, padding-box + border-box, XOR'd via mask-composite so
 *    only the ~1px seam between them paints) — this is the part that
 *    actually reads as "the glass edge catching physical light," per the
 *    original ask, rather than just a glow across the whole face.
 */
export function GlassSpecular({
  x,
  y,
  accent,
  active,
}: {
  x: ReturnType<typeof useTransform<number, number>>;
  y: ReturnType<typeof useTransform<number, number>>;
  accent: string;
  active: boolean;
}) {
  const sheenBg = useMotionTemplate`radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.05), transparent 32%)`;
  const edgeBg = useMotionTemplate`radial-gradient(circle at ${x}% ${y}%, ${accent}, transparent 55%)`;

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: sheenBg,
          opacity: active ? 1 : 0,
          transition: "opacity 220ms ease-out",
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          padding: 1,
          background: edgeBg,
          WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          opacity: active ? 0.32 : 0,
          transition: "opacity 220ms ease-out",
        }}
      />
    </>
  );
}
