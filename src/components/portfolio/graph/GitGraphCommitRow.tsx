/* eslint-disable prettier/prettier */
import { useEffect, useRef, useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import type { FocusEvent, MouseEvent } from "react";

import { CONTACT_EMAIL, PALETTE } from "@/lib/portfolio/gitGraphData";
import type { NodeMeta } from "@/lib/portfolio/gitGraphTypes";
import { useDecryptText } from "@/lib/portfolio/useDecryptText";
import { usePointerCoarse } from "@/lib/portfolio/useGitGraphResponsive";

import { CommitIcon } from "../commit/CommitIcon";

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
  branchFocused: boolean;
  reduceMotion: boolean;
  onOpen: (n: NodeMeta, evt?: MouseEvent) => void;
  onEnter: () => void;
  onLeave: () => void;
  progress: MotionValue<number>;
  rowH: number;
}) {
  const isMilestone = n.message.toLowerCase().includes("milestone");
  const messageParts = (() => {
    const colonMatch = n.message.match(/^([a-zA-Z]+(?:\([\w.-]+\))?):\s*/);
    if (!colonMatch) return { lead: null, verb: null, dash: null, rest: n.message };
    const typeToken = colonMatch[0];
    const remainder = n.message.slice(typeToken.length);
    const splitDash = (text: string) => {
      const dashMatch = text.match(/^(\s*—\s*)([\s\S]*)$/);
      return dashMatch ? { dash: dashMatch[1], rest: dashMatch[2] } : { dash: null, rest: text };
    };
    if (n.isMain) {
      const { dash, rest } = splitDash(remainder);
      return { lead: null, verb: typeToken.replace(/\s+$/, ""), dash, rest };
    }
    const wordMatch = remainder.match(/^(\S+)(\s*)([\s\S]*)$/);
    if (!wordMatch) return { lead: typeToken, verb: null, dash: null, rest: remainder };
    const [, firstWord, sep, afterWord] = wordMatch;
    const { dash, rest } = splitDash(sep + afterWord);
    return { lead: typeToken, verb: firstWord, dash, rest };
  })();
  const pointerCoarse = usePointerCoarse();
  const isPassiveRow = !n.isMain && !n.isHead;
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

  const rowOpacity = useTransform(progress, n.revealWindow, [0, 1]);
  const rowX = useTransform(progress, n.revealWindow, [-8, 0]);
  const rowY = useTransform(progress, n.revealWindow, [10, 0]);
  const labelOpacity = useTransform(progress, n.revealWindow, [0, 0.45]);
  const milestoneBgOpacity = useTransform(progress, n.revealWindow, [0, 0.04]);
  // Fed straight into a motion.* component's `style` below as a MotionValue,
  // not mirrored into React state — Framer applies MotionValues to the DOM
  // imperatively, so this row never re-renders for it. (Previously synced
  // via useMotionValueEvent + setState purely to re-embed as a plain value;
  // with hundreds of rows mounted, that's hundreds of extra render passes
  // during a scroll for a value nothing here ever actually needed as JS.)
  const rowPointerEvents = useTransform(rowOpacity, (v) => (v > 0.05 ? "auto" : "none"));

  const isFirstOfBranch = n.commitIndex === 0;
  const shouldDecrypt = n.isHead || isMilestone || isFirstOfBranch;

  // `inView` genuinely needs to be React state (useDecryptText takes a
  // plain boolean), but the subscription below unsubscribes itself the
  // moment it latches true instead of staying live for the row's whole
  // mounted lifetime — reveal is a one-shot "has this ever come into view"
  // latch, so there's nothing left for it to watch afterward.
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (inView) return;
    const unsubscribe = rowOpacity.on("change", (v) => {
      if (v >= 1) {
        setInView(true);
        unsubscribe();
      }
    });
    return unsubscribe;
  }, [inView, rowOpacity]);

  const frameMs = pointerCoarse ? 40 : 28;

  const hashRef = useDecryptText<HTMLSpanElement>(n.hash, {
    active: inView && shouldDecrypt && !dimmed,
    charset: n.isHead ? "mixed" : "hex",
    frameMs,
    delayMs: (n.revealDelay + 0.5) * 1000,
    reducedMotion: reduceMotion,
    glowColor: n.color,
  });

  // Fires once per false->true transition of branchFocused — keys the
  // label's brief "stabilizing" sweep below so it replays on every
  // re-focus instead of only playing once ever.
  const prevBranchFocusedRef = useRef(branchFocused);
  const [focusFlashTick, setFocusFlashTick] = useState(0);
  useEffect(() => {
    if (branchFocused && !prevBranchFocusedRef.current) {
      setFocusFlashTick((t) => t + 1);
    }
    prevBranchFocusedRef.current = branchFocused;
  }, [branchFocused]);

  // Skips onEnter when the focus came from useFocusTrap's silent
  // modal-close restoration (data-suppress-focus-highlight), so closing
  // a modal doesn't permanently pin the active-branch border here.
  const handleFocus = (e: FocusEvent<HTMLElement>) => {
    if (e.currentTarget.dataset.suppressFocusHighlight) return;
    onEnter();
  };

  return (
    <li
      className="absolute inset-x-0"
      style={{
        top: n.y,
        // Static — always exactly -50%, never animated. The branchFocused
        // nudge used to be folded into this same transform as
        // `translateY(calc(-50% - 6px))`, toggled straight in inline
        // style; transitioning a calc() that mixes a percentage with a
        // fixed px term forces the browser to re-resolve the percentage
        // against layout on every interpolated frame, which is what was
        // producing the sub-pixel jitter on hidpi displays. The nudge now
        // lives on the plain-pixel inner transform below instead, with
        // the percentage centering held constant here.
        transform: "translateY(-50%)",
        pointerEvents: isPassiveRow ? "none" : "auto",
        contentVisibility: pointerCoarse ? "auto" : undefined,
        containIntrinsicWidth: pointerCoarse ? "auto" : undefined,
        containIntrinsicHeight: pointerCoarse ? `${rowH}px` : undefined,
      }}
    >
      <div
        className="flex flex-col"
        style={{
          opacity: dimmed ? 0.35 : 1,
          transform: branchFocused ? "translateY(-6px)" : "translateY(0)",
          transition: reduceMotion ? undefined : "opacity 250ms ease-out, transform 200ms ease-out",
        }}
      >
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
            transition={
              reduceMotion
                ? { duration: 0.01 }
                : { type: "spring", stiffness: 420, damping: 22, mass: 0.6 }
            }
            className="relative overflow-hidden text-[10px] sm:text-[11px] font-mono tracking-tight select-none pb-0.5 pointer-events-none flex items-center gap-1"
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
            {/* Brief sweep across the label when it re-focuses — reads as
                a shell stabilizing on the new context rather than a flat
                color/scale snap. One-shot per focus via focusFlashTick. */}
            {focusFlashTick > 0 && !reduceMotion && (
              <motion.span
                key={`stabilize-${focusFlashTick}`}
                aria-hidden="true"
                initial={{ opacity: 0.85, x: "-100%" }}
                animate={{ opacity: 0, x: "100%" }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 w-full pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent, ${n.color}55, transparent)`,
                }}
              />
            )}
          </motion.div>
        )}

        {(() => {
          const sharedStyle = {
            opacity: reduceMotion ? 1 : rowOpacity,
            x: reduceMotion ? 0 : rowX,
            y: reduceMotion ? 0 : rowY,
            pointerEvents: isPassiveRow ? "none" : reduceMotion ? "auto" : rowPointerEvents,
            background: isHighlighted
              ? `${n.color}22`
              : isHovered
                ? "rgba(255,255,255,0.04)"
                : "transparent",
            boxShadow: isHighlighted ? `0 0 0 1px ${n.color}55` : "none",
            ["--row-ring-color" as string]: n.color,
          };
          const sharedClassName =
            "block rounded-md px-1.5 py-1 sm:py-0.5 text-left transition-all duration-200 w-full relative group min-w-0 touch-manipulation focus-visible:outline-none focus-visible:[box-shadow:inset_0_0_0_1px_var(--row-ring-color)]";

          const content = (
            <>
              {isMilestone && (
                <motion.div
                  aria-hidden="true"
                  style={{
                    opacity: reduceMotion ? 0.05 : milestoneBgOpacity,
                    // Was a flat backgroundColor fill. Now a tint +
                    // hairline vertical-scanline texture, masked to fade
                    // out toward the right edge instead of stopping at a
                    // hard rectangle — reads as a release banner rather
                    // than a plain highlight block.
                    background: `linear-gradient(90deg, ${
                      n.color === PALETTE.mainLine ? "#9ca3af" : n.color
                    }33 0%, transparent 100%), repeating-linear-gradient(90deg, ${
                      n.color === PALETTE.mainLine ? "#9ca3af" : n.color
                    }26 0px, ${
                      n.color === PALETTE.mainLine ? "#9ca3af" : n.color
                    }26 1px, transparent 1px, transparent 4px)`,
                    WebkitMaskImage:
                      "linear-gradient(90deg, black 0%, black 55%, transparent 100%)",
                    maskImage: "linear-gradient(90deg, black 0%, black 55%, transparent 100%)",
                  }}
                  className="absolute inset-y-0 -left-3 right-0 rounded-l-md pointer-events-none -z-[5]"
                />
              )}

              {/* Sharp left-edge indicator, paired with the row's own
                  hover-slide below — reads as a command-line cursor
                  landing on the active row rather than a flat highlight. */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-0.5 bottom-0.5 w-0.5 rounded-full transition-opacity duration-150 motion-reduce:transition-none"
                style={{ backgroundColor: n.color, opacity: isHovered ? 0.9 : 0 }}
              />

              <div
                className="flex w-full items-start gap-2 sm:gap-3 min-w-0 transition-transform duration-150 ease-out motion-reduce:transition-none"
                style={{
                  transform: isHovered && !reduceMotion ? "translateX(4px)" : "translateX(0)",
                }}
              >
                <div className="flex items-center gap-1.5 shrink-0 tabular-nums pt-[2px]">
                  {!n.isMain && (
                    <CommitIcon message={n.message} color={n.isHead ? PALETTE.head : n.textColor} />
                  )}
                  <span
                    ref={shouldDecrypt ? hashRef : undefined}
                    className="font-mono text-[11px] sm:text-[13px] opacity-80"
                    style={{
                      color: n.isHead ? PALETTE.head : "#707986",
                      // Dual-tone phosphor glow: a bright tight core plus a
                      // softer wider halo in the branch's own color, only
                      // once the hash has actually decrypted into view —
                      // reads as freshly-resolved text still carrying a
                      // trace of the scramble it came from.
                      textShadow:
                        inView && shouldDecrypt && !dimmed && !reduceMotion
                          ? `0 0 2px ${n.color}99, 0 0 6px ${n.color}44`
                          : "none",
                    }}
                  >
                    {n.hash}
                  </span>
                </div>
                <span
                  className="leading-snug break-words [overflow-wrap:anywhere] text-[13px] sm:text-[14.5px] flex-1 min-w-0"
                  style={{
                    color: n.textColor,
                    fontWeight: n.isMain || n.isHead || isMilestone ? 500 : 400,
                    fontStyle: n.isBugfix ? "italic" : "normal",
                    opacity: n.isHead || n.isMain || n.isBugfix ? 0.9 : 0.85,
                    textShadow: isHovered ? `0 0 12px ${n.color}66` : "none",
                    wordBreak: "break-word",
                    textDecoration: isHeadContact && isHovered ? "underline" : "none",
                    textUnderlineOffset: "3px",
                  }}
                >
                  {isHeadContact ? (
                    <>
                      {n.message}
                      {/* Slow terminal caret, only while hovered — an
                          invitation to "type here" rather than a constant
                          idle blink. */}
                      <motion.span
                        aria-hidden="true"
                        className="inline-block w-[6px] h-[0.95em] align-text-bottom ml-0.5 translate-y-[1px]"
                        style={{ backgroundColor: PALETTE.head }}
                        animate={
                          reduceMotion || !isHovered ? { opacity: 0 } : { opacity: [1, 1, 0, 0] }
                        }
                        transition={
                          reduceMotion || !isHovered
                            ? { duration: 0.15 }
                            : {
                                duration: 1,
                                repeat: Infinity,
                                times: [0, 0.5, 0.5, 1],
                                ease: "linear",
                              }
                        }
                      />
                    </>
                  ) : (
                    <>
                      {messageParts.lead && (
                        <span className="font-normal" style={{ color: "#707986" }}>
                          {messageParts.lead}
                        </span>
                      )}
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
                      {messageParts.dash && (
                        <span style={{ color: "#707986" }}>{messageParts.dash}</span>
                      )}
                      {messageParts.rest}
                    </>
                  )}
                  {isMilestone && n.badges && n.badges.length > 0 && (
                    <span
                      role="list"
                      aria-label="Milestone highlights"
                      className="mt-1.5 flex flex-wrap gap-1 sm:gap-1.5"
                    >
                      {n.badges.map((tag) => (
                        <span
                          key={tag}
                          role="listitem"
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
              </div>
            </>
          );

          return isHeadContact ? (
            <motion.a
              id={`commit-${n.hash}`}
              href={HEAD_MAILTO}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
              onFocus={handleFocus}
              onBlur={onLeave}
              title={`Email ${HEAD_EMAIL}`}
              aria-label={commitAriaLabel}
              style={sharedStyle}
              className={sharedClassName}
            >
              {content}
            </motion.a>
          ) : isPassiveRow ? (
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
              onFocus={handleFocus}
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
      </div>
    </li>
  );
}
