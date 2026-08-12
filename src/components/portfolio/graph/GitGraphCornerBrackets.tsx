/* eslint-disable prettier/prettier */
import { useEffect, useRef } from "react";

/**
 * Camera-focus-style corner brackets — the "locked on" hover/active cue
 * for GitGraphFeatureCard / bugfix boxes. `active="group"` lets pure CSS
 * :hover/:focus-visible drive it (feature card owns its own `group`
 * element); a plain boolean is for callers with no hoverable element of
 * their own, tracking externally computed focus state instead.
 *
 * Corners slide in diagonally from outside their own corner, staggered
 * in opposing pairs (tl/br, then tr/bl), with a color-matched glow and
 * a faster linear exit than the eased entrance.
 */

type BracketMode = "group" | "active" | "inactive";

function resolveMode(active: "group" | boolean): BracketMode {
  if (active === "group") return "group";
  if (typeof active === "boolean") return active ? "active" : "inactive";
  if (process.env.NODE_ENV !== "production") {
    console.warn('GitGraphCornerBrackets: `active` must be "group" or a boolean, got', active);
  }
  return "inactive";
}

const CORNERS = [
  {
    key: "tl",
    position: "-top-0.5 -left-0.5",
    border: "border-l-2 border-t-2 rounded-tl-md",
    restTranslate: "-translate-x-1.5 -translate-y-1.5",
    delay: "",
  },
  {
    key: "br",
    position: "-bottom-0.5 -right-0.5",
    border: "border-r-2 border-b-2 rounded-br-md",
    restTranslate: "translate-x-1.5 translate-y-1.5",
    delay: "",
  },
  {
    key: "tr",
    position: "-top-0.5 -right-0.5",
    border: "border-r-2 border-t-2 rounded-tr-md",
    restTranslate: "translate-x-1.5 -translate-y-1.5",
    delay: "delay-[70ms]",
  },
  {
    key: "bl",
    position: "-bottom-0.5 -left-0.5",
    border: "border-l-2 border-b-2 rounded-bl-md",
    restTranslate: "-translate-x-1.5 translate-y-1.5",
    delay: "delay-[70ms]",
  },
] as const;

const GLOW = "shadow-[0_0_6px_color-mix(in_srgb,var(--corner-color)_55%,transparent)]";

export function GitGraphCornerBrackets({
  active,
  color,
}: {
  active: "group" | boolean;
  color: string;
}) {
  const mode = resolveMode(active);
  const style = { ["--corner-color" as string]: color };
  const wrapRef = useRef<HTMLSpanElement>(null);

  // Dev-only: the negative-offset corners need a positioned, non-clipping
  // parent to render correctly, so warn instead of failing silently.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const parent = wrapRef.current?.parentElement;
    if (!parent) return;
    const computed = getComputedStyle(parent);
    if (computed.position === "static") {
      console.warn(
        "GitGraphCornerBrackets: parent has no positioning context (position: static) — corners will anchor to a further ancestor instead of this box.",
      );
    }
    if (computed.overflow !== "visible") {
      console.warn(
        "GitGraphCornerBrackets: parent clips overflow — corners sit slightly outside the box edge and will be cut off.",
      );
    }
  }, []);

  return (
    <span ref={wrapRef} className="contents">
      {CORNERS.map(({ key, position, border, restTranslate, delay }) => {
        const base = `pointer-events-none absolute h-4 w-4 border-[var(--corner-color)] ${border} ${position} transition-all duration-100 ease-in motion-reduce:transition-none`;
        const rest = `opacity-0 ${restTranslate} shadow-none`;
        const enter = `opacity-100 translate-x-0 translate-y-0 duration-200 ease-out ${GLOW} ${delay}`;

        const stateClasses =
          mode === "active"
            ? enter
            : mode === "inactive"
              ? rest
              : `${rest} ${enter
                  .split(" ")
                  .filter(Boolean)
                  .flatMap((c) => [`group-hover:${c}`, `group-focus-visible:${c}`])
                  .join(" ")}`;

        return (
          <span key={key} aria-hidden="true" className={`${base} ${stateClasses}`} style={style} />
        );
      })}
    </span>
  );
}
