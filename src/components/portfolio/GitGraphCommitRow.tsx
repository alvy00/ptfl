import { useState } from "react";
import { motion, useTransform, useMotionValueEvent, type MotionValue } from "framer-motion";
import type { MouseEvent } from "react";

import { CONTACT_EMAIL, PALETTE } from "@/lib/portfolio/gitGraphData";
import type { NodeMeta } from "@/lib/portfolio/gitGraphTypes";
import { useDecryptText } from "@/lib/portfolio/useDecryptText";
import { usePointerCoarse } from "@/lib/portfolio/useGitGraphResponsive";

import { CommitIcon } from "./CommitIcon";

export function GitGraphCommitRow({
  n,
  isHovered,
  isHighlighted,
  dimmed,
  branchFocused,
  reduceMotion,
  onOpen,
  onEnter,
  onLeave,
  progress,
  rowH,
}: {
  n: NodeMeta;
  isHovered: boolean;
  isHighlighted: boolean;
  dimmed: boolean;
  /** True only when THIS row's own branch is the currently-focused one
   *  (hover or scroll-focus on its whole card) — distinct from `dimmed`,
   *  which can't tell "my branch is focused" apart from "nothing is
   *  focused" (both read as dimmed=false). Drives the `$ on feat/...`
   *  label's brighten below. Always false for main-trunk rows, which
   *  don't have a "card" to focus in the first place. */
  branchFocused: boolean;
  reduceMotion: boolean;
  onOpen: (n: NodeMeta, evt?: MouseEvent) => void;
  onEnter: () => void;
  onLeave: () => void;
  /** Same scroll-progress motion value the SVG branch paths and
   *  GitGraphNode use — keeps this row's reveal reversible on scroll-up,
   *  in sync with the graph line/dot instead of a one-shot whileInView. */
  progress: MotionValue<number>;
  /** Current tier's row height (layout.rowH in GitGraph.tsx) — used only
   *  as the `contain-intrinsic-size` guess for content-visibility below,
   *  so the browser has a reasonable height to reserve for an off-screen,
   *  not-yet-painted row instead of collapsing it to 0 and causing a
   *  scroll-position jump the first time it's actually measured. */
  rowH: number;
}) {
  const isMilestone = n.message.toLowerCase().includes("milestone");
  // Typographic-contrast split: every message has a leading "type" token
  // (feat(auctasync):, fix(auctasync):, enroll:, learn:, achieve:) that's
  // bookkeeping, not the point — same role the hash already plays. The
  // actual action (implement/scaffold/milestone/resolve, or for main-
  // trunk rows the type word itself, since "learn"/"achieve"/"enroll" ARE
  // the verb there) is what a scanning eye should land on. Splitting them
  // into separate spans lets the type token recede at the hash's own dim
  // gray while the verb gets real weight+brightness — previously the
  // whole message was one uniform-weight span, so nothing in the dense
  // commit list stood out as "the word that matters" versus "the word
  // that's just plumbing."
  const messageParts = (() => {
    const colonMatch = n.message.match(/^([a-zA-Z]+(?:\([\w.-]+\))?):\s*/);
    if (!colonMatch) return { lead: null, verb: null, dash: null, rest: n.message };
    const typeToken = colonMatch[0];
    const remainder = n.message.slice(typeToken.length);
    const splitDash = (text: string) => {
      // "milestone — real-time bidding..." — pull the em-dash off as its
      // own piece so it can sit muted between the bold verb and the rest,
      // instead of butting directly against the verb with no visual
      // separation (the two were reading as one fused clause).
      const dashMatch = text.match(/^(\s*—\s*)([\s\S]*)$/);
      return dashMatch ? { dash: dashMatch[1], rest: dashMatch[2] } : { dash: null, rest: text };
    };
    if (n.isMain) {
      // "learn: React, HTML..." — the type token itself IS the verb.
      const { dash, rest } = splitDash(remainder);
      return { lead: null, verb: typeToken.replace(/:\s*$/, ""), dash, rest };
    }
    // "feat(auctasync): implement WebSocket..." — type token recedes,
    // first word of the remainder (implement/scaffold/milestone/resolve)
    // is the verb that pops.
    const wordMatch = remainder.match(/^(\S+)(\s*)([\s\S]*)$/);
    if (!wordMatch) return { lead: typeToken, verb: null, dash: null, rest: remainder };
    const [, firstWord, sep, afterWord] = wordMatch;
    const { dash, rest } = splitDash(sep + afterWord);
    return { lead: typeToken, verb: firstWord, dash, rest };
  })();
  const pointerCoarse = usePointerCoarse();
  // Pivot: a plain feature-branch commit (not main, not HEAD) is no
  // longer its own clickable thing. Every one of them used to open the
  // exact same project modal regardless of which specific commit was
  // clicked — a "click-dead" affordance (individual hover rings and
  // button semantics on 20 different rows, all leading to one identical
  // destination). The project's whole card (GitGraphActiveBorder's box in
  // GitGraph.tsx) is the click target now; these rows go back to being
  // exactly what they visually already look like — a read-only commit
  // log — and their own hover/click handlers are dropped entirely rather
  // than wired to a no-op, so there's no dead interactive surface left
  // sitting on top of the card intercepting its hover/click (see the
  // pointerEvents override on the outer <li> below).
  //
  // Bugfix commits get the exact same treatment for the exact same
  // reason: every commit in a bugfix branch used to open the identical
  // bugfix detail modal on click, so 2 separate clickable rows were 2
  // identical destinations. GitGraphBugfixBox now owns the whole
  // reproduce+resolve span as one click target (mirroring
  // GitGraphFeatureCard), so these rows are passive too.
  const isPassiveRow = !n.isMain && !n.isHead;
  // HEAD is the terminus of the whole graph — the peak-end moment, where a
  // visitor who's scrolled the entire commit history lands right as the
  // "open to work" copy appears. Treating it like every other trunk commit
  // (a click opens a read-only detail modal) wastes that moment: there's
  // nothing to inspect, the copy itself IS the ask. So HEAD renders as a
  // real mailto link instead of a modal trigger — one fewer click between
  // "I'm interested" and an email actually being drafted.
  const isHeadContact = n.isHead;
  const HEAD_EMAIL = CONTACT_EMAIL;
  const HEAD_SUBJECT = "Internship / junior developer role — via portfolio";
  const HEAD_BODY = [
    "Hi Alvy,",
    "",
    "I came across your portfolio and wanted to reach out about an internship / junior developer opportunity.",
    "",
    "",
  ].join("\n");
  const HEAD_MAILTO = `mailto:${HEAD_EMAIL}?subject=${encodeURIComponent(
    HEAD_SUBJECT,
  )}&body=${encodeURIComponent(HEAD_BODY)}`;
  const commitAriaLabel = isHeadContact
    ? `Email Alvy at ${HEAD_EMAIL} — ${n.message}`
    : n.branchGroup === "main"
      ? `Commit selection: ${n.hash} ${n.message}`
      : `Commit on ${n.branchGroup}${n.isBugfix ? ", bugfix" : ""}: ${n.hash} ${n.message}`;

  // Reversible reveal, scrubbed off the same scroll-progress value that
  // drives the branch line's pathLength and the SVG node's opacity/scale
  // (see GitGraphNode) — replaces the old whileInView(once:true), which
  // could only ever fire hidden -> shown one time. With that version,
  // scrolling back up past a branch retracted its line but left this row
  // fully opaque and already in its resting position, now describing a
  // commit whose connecting line no longer existed. These three transforms
  // (opacity, and a small x/y settle) all reverse in lockstep with the
  // line/dot instead.
  const rowOpacity = useTransform(progress, n.revealWindow, [0, 1]);
  const rowX = useTransform(progress, n.revealWindow, [-8, 0]);
  const rowY = useTransform(progress, n.revealWindow, [10, 0]);
  const labelOpacity = useTransform(progress, n.revealWindow, [0, 0.45]);
  const milestoneBgOpacity = useTransform(progress, n.revealWindow, [0, 0.04]);
  // The <li>'s pointer-events were unconditionally "auto" regardless of
  // reveal state — rowOpacity only ever gated the *button's* visual
  // opacity, so a scrolled-past/not-yet-revealed row (invisible) still
  // sat there fully hoverable/clickable. Hovering that empty space fired
  // onEnter -> focusBranch, which lit up the active border around a box
  // whose line/nodes weren't actually drawn. Gating pointer-events on the
  // same rowOpacity value closes that gap: below the threshold the row is
  // inert, matching what's actually visible.
  const rowPointerEvents = useTransform(rowOpacity, (v) => (v > 0.05 ? "auto" : "none"));
  // Subscribed into plain state rather than passed as a MotionValue
  // directly in style — that auto-unwrapping only happens inside a
  // motion.* component's style prop, and the outer element below is a
  // plain <li> (see its comment for why), so this needs an explicit
  // subscription like `inView` below already does for the same reason.
  const [pointerEventsValue, setPointerEventsValue] = useState(rowPointerEvents.get());
  useMotionValueEvent(rowPointerEvents, "change", setPointerEventsValue);

  // --- terminal-stream decrypt reveal -------------------------------------
  // Deliberately NOT applied to every row. At 26 rows, a mandatory
  // 300-500ms scramble on every single commit stops reading as a spectacle
  // by row 8 and starts being friction between the user and the content
  // they're scrolling to read. Reserved for commits that are actually
  // narratively significant: the HEAD marker, milestone commits, and the
  // first ("scaffold") commit of each branch — the moment a project starts.
  // Everything else keeps the plain fade/slide reveal below unchanged.
  const isFirstOfBranch = n.commitIndex === 0;
  const shouldDecrypt = n.isHead || isMilestone || isFirstOfBranch;

  const [inView, setInView] = useState(false);
  useMotionValueEvent(rowOpacity, "change", (v) => {
    if (v >= 1 && !inView) setInView(true);
  });
  // Touch scroll can enter several rows in the same second; coarser,
  // fewer-frame ticks keep that from adding busy work mid-scroll. Desktop
  // keeps the snappier default.
  const frameMs = pointerCoarse ? 40 : 28;

  const hashRef = useDecryptText<HTMLSpanElement>(n.hash, {
    // Don't start decrypting while this row is dimmed (another branch is
    // hovered/highlighted and this one is faded to the background) — the
    // effect should read as "this is the branch you're looking at,"
    // not fire indiscriminately on rows the user has visually deprioritized.
    active: inView && shouldDecrypt && !dimmed,
    // "HEAD" isn't a hex hash — scrambling it through 0-9a-f only would
    // never touch the letters it actually needs, so it'd flicker digits
    // right up until the snap. Give it the mixed pool instead.
    charset: n.isHead ? "mixed" : "hex",
    frameMs,
    delayMs: (n.revealDelay + 0.5) * 1000,
    reducedMotion: reduceMotion,
    glowColor: n.color,
  });
  // -------------------------------------------------------------------------

  return (
    <li
      className="absolute inset-x-0 flex flex-col"
      style={{
        top: n.y,
        // Composed with the existing -50% vertical centering, not a
        // replacement for it — when this row's branch is focused (hover
        // OR scroll-auto-focus; same signal that ignites
        // GitGraphActiveBorder), it lifts an extra 6px. The border/card
        // itself (GitGraph.tsx) no longer elevates on hover — only glows
        // — so this row-level lift is now the only elevation happening,
        // not a sync partner for a card-level one.
        //
        // This element was previously a <motion.li> despite never using
        // any actual Framer Motion feature on itself (no initial/animate/
        // whileInView) — just plain style/className. That's exactly the
        // problem: motion.* components own the `transform` CSS property
        // internally, composing it from their own x/y/scale/rotate motion
        // values. With none of those set, Framer Motion kept re-writing
        // the DOM's real transform back to its own computed value (~none)
        // on every render, silently discarding whatever raw string we put
        // in style.transform here — which is exactly why bumping the
        // value from 4px to 6px changed nothing. A plain <li> has no such
        // ownership; React just sets the inline style directly and the
        // CSS `transition` below animates it normally.
        transform: branchFocused ? "translateY(calc(-50% - 6px))" : "translateY(-50%)",
        opacity: dimmed ? 0.35 : 1,
        transition: reduceMotion ? undefined : "opacity 250ms ease-out, transform 200ms ease-out",
        pointerEvents: isPassiveRow ? "none" : reduceMotion ? "auto" : pointerEventsValue,
        // Skips layout/paint work entirely for rows the browser doesn't
        // think are near the viewport — desktop-only concern is mobile
        // frame rate during fast scroll-throughs, so this is gated to
        // coarse pointers rather than applied everywhere. Left off
        // desktop deliberately: content-visibility:auto can delay the
        // very first paint/hit-test of a row right after a fast
        // scroll-to-hover, and desktop's hover-driven focus/border-ignite
        // interactions depend on that being immediate — a tradeoff worth
        // making on mobile (no hover to protect) but not on desktop.
        // contain-intrinsic-size uses `rowH` as a reasonable placeholder
        // height for an unpainted row, so the page doesn't jump once the
        // browser actually measures it.
        contentVisibility: pointerCoarse ? "auto" : undefined,
        containIntrinsicWidth: pointerCoarse ? "auto" : undefined,
        containIntrinsicHeight: pointerCoarse ? `${rowH}px` : undefined,
      }}
    >
      {/* branch context label */}
      {n.branchName && (
        <motion.div
          style={{
            opacity: reduceMotion ? 0.45 : labelOpacity,
            y: reduceMotion ? 0 : rowY,
            transformOrigin: "left center",
          }}
          animate={{
            scale: branchFocused && !reduceMotion ? 1.06 : 1,
            filter: branchFocused
              ? `brightness(1.4) drop-shadow(0 0 6px ${n.color}77)`
              : "brightness(1) drop-shadow(0 0 0px transparent)",
          }}
          // Same spring used for GitGraphNode's hover pop (stiffness 420 /
          // damping 22) — this label brightening is the text-column half
          // of the same "this is what's active" gesture the graph side
          // already makes, so it should feel like the same hand doing it.
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : { type: "spring", stiffness: 420, damping: 22, mass: 0.6 }
          }
          className="text-[10px] sm:text-[11px] font-mono tracking-tight select-none pb-0.5 pointer-events-none flex items-center gap-1"
        >
          <span
            className="font-bold font-sans transition-colors duration-200"
            style={{ color: branchFocused ? n.color : "#4b5563" }}
          >
            $
          </span>
          <span
            className="truncate transition-colors duration-200"
            style={{ color: branchFocused ? n.color : "#9ca3af" }}
          >
            on {n.branchName}
          </span>
        </motion.div>
      )}

      {(() => {
        const sharedStyle = {
          opacity: reduceMotion ? 1 : rowOpacity,
          x: reduceMotion ? 0 : rowX,
          y: reduceMotion ? 0 : rowY,
          background: isHighlighted
            ? `${n.color}22`
            : isHovered
              ? "rgba(255,255,255,0.04)"
              : "transparent",
          boxShadow: isHighlighted ? `0 0 0 1px ${n.color}55` : "none",
        };
        const sharedClassName =
          "flex items-start gap-2 sm:gap-3 rounded-md px-1.5 py-1 sm:py-0.5 text-left transition-all duration-200 w-full relative group min-w-0 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

        const content = (
          <>
            {/* milestone row emphasis */}
            {isMilestone && (
              <motion.div
                style={{
                  opacity: reduceMotion ? 0.04 : milestoneBgOpacity,
                  backgroundColor: n.color === PALETTE.mainLine ? "#9ca3af" : n.color,
                }}
                className="absolute inset-y-0 -left-3 right-0 rounded-l-md pointer-events-none -z-[5]"
              />
            )}

            <div className="flex items-center gap-1.5 shrink-0 tabular-nums pt-[2px]">
              <CommitIcon
                message={n.message}
                color={n.isHead ? PALETTE.head : n.isMain ? "#9ca3af" : n.textColor}
              />
              {/* children are always the real hash — SSR-correct and hydration-
                  safe. The decrypt hook (when shouldDecrypt is true) mutates
                  this node's textContent directly on top of that, never
                  replaces it. */}
              <span
                ref={shouldDecrypt ? hashRef : undefined}
                className="font-mono text-[11px] sm:text-[13px] opacity-80"
                style={{ color: n.isHead ? PALETTE.head : "#707986" }}
              >
                {n.hash}
              </span>
            </div>
            <span
              // line-clamp-2 (previously applied below the sm: breakpoint)
              // removed entirely — capping message text to 2 lines while
              // the row's available width was also tight is exactly what
              // was forcing text to try to fit in too little space and
              // spill past the row's own right edge instead of wrapping.
              // Letting it wrap to as many lines as it actually needs
              // means it uses vertical space (which this graph has
              // plenty of, being one long scroll) instead of running out
              // of horizontal room.
              //
              // break-words alone (overflow-wrap: break-word) only
              // creates a break opportunity when the layout has already
              // decided there's nowhere else to wrap — [overflow-wrap:anywhere]
              // is stronger: it lets the browser break at any point,
              // including mid-word, as a last resort. Combined with
              // wordBreak below, this is a hard guarantee against
              // horizontal overflow regardless of any subtle flex/
              // min-width sizing edge case upstream, rather than relying
              // on the row's available width always being calculated
              // exactly right.
              className="leading-snug break-words [overflow-wrap:anywhere] text-[13px] sm:text-[14.5px] flex-1 min-w-0"
              style={{
                color: n.textColor,
                fontWeight: n.isMain || n.isHead || isMilestone ? 500 : 400,
                fontStyle: n.isBugfix ? "italic" : "normal",
                // Bugfix rows were previously stacking three legibility
                // penalties at once — italic + small text + this same
                // 0.85 dimming every non-main row got. Italic alone is
                // enough to mark "this is a fix"; bugfix rows now match
                // main/HEAD's 0.9 instead of sitting dimmer than even
                // plain feature-branch commits.
                opacity: n.isHead || n.isMain || n.isBugfix ? 0.9 : 0.85,
                textShadow: isHovered ? `0 0 12px ${n.color}66` : "none",
                wordBreak: "break-word",
                // HEAD's copy is the actual call-to-action, not a label —
                // an underline on hover is the one extra cue that turns
                // "text that happens to be clickable" into "this is a
                // link," matching the affordance a mailto link should
                // carry instead of reading identically to every other
                // (non-interactive-looking) commit message in the graph.
                textDecoration: isHeadContact && isHovered ? "underline" : "none",
                textUnderlineOffset: "3px",
              }}
            >
              {isHeadContact ? (
                n.message
              ) : (
                <>
                  {/* type token (feat(auctasync):, fix(...):) — recedes,
                      same dim register as the hash beside it. Absent for
                      main-trunk rows, where the type token IS the verb
                      and gets promoted to `verb` below instead. */}
                  {messageParts.lead && (
                    <span
                      className="font-normal"
                      style={{ color: "#707986" }}
                    >
                      {messageParts.lead}
                    </span>
                  )}
                  {/* the action verb — this is the word a scanning eye
                      should land on, so it gets real weight and
                      brightness contrast against everything else on the
                      row instead of blending into one uniform message
                      block. Main-trunk rows get the same brightness pop
                      as branch rows now (previously only branch verbs got
                      it, an inconsistency with no real reason behind it)
                      — just anchored to PALETTE.mainText instead of a
                      project color, since trunk rows have no branch
                      color of their own. */}
                  {messageParts.verb && (
                    <span
                      className="font-bold"
                      style={{
                        color: n.isMain ? PALETTE.mainText : n.color,
                        filter: "brightness(1.25)",
                      }}
                    >
                      {messageParts.verb}
                    </span>
                  )}
                  {/* em-dash separator, pulled off rest and rendered on
                      its own — muted, same register as `lead` — so it
                      reads as punctuation between the bold verb and the
                      plain-weight detail that follows, instead of
                      butting directly against the bold verb with no
                      visual break. */}
                  {messageParts.dash && (
                    <span style={{ color: "#707986" }}>{messageParts.dash}</span>
                  )}
                  {messageParts.rest}
                </>
              )}
              {/* Tech-stack micro-badges — milestone-only, mirrors the
                  "stack" pill treatment FeatureModal already uses for
                  project.stack in CommitModal.tsx, at a smaller scale so
                  it reads as a footnote to the message, not a competing
                  element. Wrapped in its own block so pills always start
                  on a fresh line under the message rather than trailing
                  inline after it. */}
              {isMilestone && n.badges && n.badges.length > 0 && (
                <span className="mt-1.5 flex flex-wrap gap-1 sm:gap-1.5">
                  {n.badges.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-full border px-1.5 py-[1px] sm:px-2 sm:py-0.5 text-[9px] sm:text-[10px] font-sans font-normal not-italic tracking-tight"
                      style={{
                        borderColor: `${n.color}44`,
                        color: n.color,
                        background: `${n.color}0c`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              )}
            </span>
          </>
        );

        return isHeadContact ? (
          <motion.a
            id={`commit-${n.hash}`}
            href={HEAD_MAILTO}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onFocus={onEnter}
            onBlur={onLeave}
            title={`Email ${HEAD_EMAIL}`}
            aria-label={commitAriaLabel}
            style={sharedStyle}
            className={sharedClassName}
          >
            {content}
          </motion.a>
        ) : isPassiveRow ? (
          // Plain read-only row — no onClick/onEnter/onLeave, no button
          // semantics, no focus ring. `id` is kept: GitGraphLegend's
          // "jump to project" nav and GlobalSearch results both still
          // target a specific commit hash to scrollIntoView + pulse-
          // highlight (via `isHighlighted`, driven by GitGraph's
          // `highlighted` state) — that's a locate-and-glance affordance,
          // independent of the click-to-open behavior this row no longer
          // has, so it stays working unchanged.
          <motion.div id={`commit-${n.hash}`} style={sharedStyle} className={sharedClassName}>
            {content}
          </motion.div>
        ) : (
          <motion.button
            id={`commit-${n.hash}`}
            type="button"
            onClick={(e) => onOpen(n, e)}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onFocus={onEnter}
            onBlur={onLeave}
            title={n.message}
            aria-label={commitAriaLabel}
            style={sharedStyle}
            className={sharedClassName}
          >
            {content}
          </motion.button>
        );
      })()}
    </li>
  );
}
