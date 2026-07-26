import { useEffect, useState } from "react";

import type { Tier } from "./gitGraphTypes";

function getTier(width: number): Tier {
  if (width < 400) return "xs";
  if (width < 640) return "sm";
  if (width < 1024) return "md";
  return "lg";
}

/**
 * Reads the viewport tier client-side only. Starts at "lg" (the SSR-safe
 * default) so the first client render matches the server-rendered markup
 * exactly — avoiding hydration mismatches — then corrects itself in an
 * effect once `window` is available. Resize handling is rAF-throttled so
 * dragging a browser window doesn't spam re-renders.
 */
export function useLayoutTier(): Tier {
  const [tier, setTier] = useState<Tier>("lg");

  useEffect(() => {
    let frame = 0;
    const measure = () => setTier(getTier(window.innerWidth));
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return tier;
}

/** True on touch/coarse-pointer devices. Used to tune scroll-spring physics
 *  — touch scrolling already has its own momentum from the OS, so a lower
 *  mass / snappier spring here avoids the motion feeling like it's dragging
 *  half a second behind the user's finger. */
export function usePointerCoarse(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setCoarse(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return coarse;
}
