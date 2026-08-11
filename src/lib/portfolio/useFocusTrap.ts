import { useCallback, useEffect, useRef } from "react";

let trapStack: symbol[] = [];

// Safari has a long-standing bug where it ignores the `preventScroll`
// option on `.focus()` entirely — it scrolls the target into view
// regardless. That's not fixable by passing the option correctly; the
// only reliable cross-browser guard is to snapshot the actual scroll
// position immediately before focusing and force it back immediately
// after, so even a browser that scrolls anyway gets silently corrected
// in the same frame before the user perceives any movement.
function focusPreservingScroll(el: HTMLElement) {
  const x = window.scrollX;
  const y = window.scrollY;
  el.focus({ preventScroll: true });
  if (window.scrollX !== x || window.scrollY !== y) {
    window.scrollTo({ left: x, top: y, behavior: "instant" as ScrollBehavior });
  }
}

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const trapId = useRef(Symbol());

  const getFocusable = useCallback(() => {
    const el = containerRef.current;
    if (!el) return [];
    return Array.from(
      el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((n) => n.offsetParent !== null);
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = trapId.current;
    trapStack.push(id);
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const focusable = getFocusable();
      const target = focusable[0] ?? containerRef.current;
      if (target) focusPreservingScroll(target);
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (trapStack[trapStack.length - 1] !== id) return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      trapStack = trapStack.filter((stackId) => stackId !== id);
      if (previouslyFocused.current?.isConnected) {
        focusPreservingScroll(previouslyFocused.current);
      }
    };
  }, [active, getFocusable]);

  return containerRef;
}
