/**
 * Camera-focus-style corner brackets — the "locked on" hover/active cue
 * that replaced the card's old translateY elevation (see GitGraphFeatureCard).
 * Four small L-shapes at each corner, snapping from a slightly-inset/faded
 * rest state to full opacity/scale, in the branch's own color.
 *
 * Two modes because the two callers don't have the same relationship to
 * "hover": the feature card is a real, directly-hoverable element (it has
 * `group` + onMouseEnter/focus handlers of its own), so `active="group"`
 * lets pure CSS :hover/:focus-visible drive this with zero JS involved —
 * same reasoning the feature card's own hover comment gives for staying
 * off React state where possible. Bugfix boxes have no such element of
 * their own (they're driven by the same focus state as their border, not
 * their own hover target), so there's nothing to :hover here; `active` as
 * a plain boolean lets it track that computed focus state directly.
 */
export function GitGraphCornerBrackets({
  active,
  color,
}: {
  active: "group" | boolean;
  color: string;
}) {
  const base =
    "pointer-events-none absolute h-4 w-4 border-[var(--corner-color)] transition-all duration-200 ease-out motion-reduce:transition-none";
  const visibility =
    active === "group"
      ? "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100"
      : active
        ? "opacity-100 scale-100"
        : "opacity-0 scale-90";
  const style = { ["--corner-color" as string]: color };
  return (
    <>
      <span
        aria-hidden="true"
        className={`${base} ${visibility} -top-0.5 -left-0.5 border-l-2 border-t-2 rounded-tl-md`}
        style={style}
      />
      <span
        aria-hidden="true"
        className={`${base} ${visibility} -top-0.5 -right-0.5 border-r-2 border-t-2 rounded-tr-md`}
        style={style}
      />
      <span
        aria-hidden="true"
        className={`${base} ${visibility} -bottom-0.5 -left-0.5 border-l-2 border-b-2 rounded-bl-md`}
        style={style}
      />
      <span
        aria-hidden="true"
        className={`${base} ${visibility} -bottom-0.5 -right-0.5 border-r-2 border-b-2 rounded-br-md`}
        style={style}
      />
    </>
  );
}
