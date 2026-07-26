import { BUGFIX_COLOR, PALETTE } from "@/lib/portfolio/gitGraphData";

export function GitGraphLegend() {
  return (
    <div
      className="relative z-10 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1.5 sm:px-4 font-mono text-[10px] sm:text-[11px] text-gray-500"
      role="note"
      aria-label="Legend: a circle marks a regular commit, a diamond marks a bugfix commit, a glowing circle marks HEAD"
    >
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        commit
      </span>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect
            x="1.5"
            y="1.5"
            width="7"
            height="7"
            rx="1"
            fill="none"
            stroke={BUGFIX_COLOR}
            strokeWidth="1.5"
            transform="rotate(45 5 5)"
          />
        </svg>
        <span style={{ color: BUGFIX_COLOR }}>fix</span>
      </span>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill={PALETTE.head} opacity={0.9} />
        </svg>
        <span style={{ color: PALETTE.head }}>HEAD</span>
      </span>
    </div>
  );
}
