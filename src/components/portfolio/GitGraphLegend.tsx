import { BRANCH_DEFS, BUGFIX_COLOR, PALETTE } from "@/lib/portfolio/gitGraphData";
import { projects } from "@/data/portfolio/projects";

// Dispatches the exact same event GlobalSearch's result rows already use
// (see highlightCommit() in GlobalSearch.tsx) — GitGraph.tsx's listener
// doesn't care who fired it, so a returning visitor clicking a project
// here gets identical behavior (scrollIntoView + the highlight pulse) to
// clicking a search result, instead of a second, parallel jump mechanism
// with its own scroll/highlight logic to keep in sync.
function highlightCommit(hash: string) {
  window.dispatchEvent(new CustomEvent<string>("highlight-commit", { detail: hash }));
}

// One jump target per feature branch, in the same trunk order they fork
// off in (BRANCH_DEFS is already ordered assetverse -> auctasync ->
// asynclangai -> careerpilot to match the row plan) — reading left to
// right here matches scrolling top to bottom in the graph itself.
// Targets each branch's *first* commit (commits[0]) since that's the
// "start of this project" moment, and it's guaranteed to exist for every
// branch (unlike e.g. a milestone commit, which not every project has).
const PROJECT_JUMPS = BRANCH_DEFS.map((b) => ({
  hash: b.commits[0].hash,
  color: b.color,
  // Project names in projects.ts are the long form ("AuctaSync —
  // Real-Time Auction Platform") meant for the detail modal; a minimap
  // label needs just the project name itself, so split on the em dash
  // rather than duplicating a short-name field that doesn't otherwise
  // exist anywhere in the data.
  label: projects[b.projectKey].name.split(" — ")[0],
}));

// Filter pills (a project-scoped timeline prune) were removed — this
// component is back to its original scope: a jump-to-project minimap
// plus the shape key. No props needed anymore; GitGraph.tsx mounts this
// with no arguments.
export function GitGraphLegend() {
  return (
    <div className="relative z-10 mb-3 flex flex-col gap-2 px-1.5 sm:px-4">
      {/* Click-to-jump minimap — lets a returning visitor go straight to a
          project instead of scroll-hunting for it. Purely additive next to
          the shape key below; neither reads from or affects the other.
          Text and svg sizing steps down at each tier (a bare `text-[Npx]`
          with sm:/md: overrides — no xs: variant, since this codebase's
          breakpoints don't define one) so the row stays on one wrapped
          block instead of overflowing on the narrowest phones, without
          needing a separate "jump" icon-only fallback. */}
      <nav
        className="flex flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-1.5 sm:gap-y-1.5 font-mono text-[9px] sm:text-[11px]"
        aria-label="Jump to project"
      >
        <span className="text-gray-600 select-none pr-0.5 whitespace-nowrap" aria-hidden="true">
          jump:
        </span>
        {PROJECT_JUMPS.map((p) => (
          <button
            key={p.hash}
            type="button"
            onClick={() => highlightCommit(p.hash)}
            aria-label={`Jump to ${p.label}`}
            className="rounded px-1.5 py-0.5 sm:px-2 whitespace-nowrap transition-colors duration-150 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={{ color: p.color, border: `1px solid ${p.color}33` }}
          >
            {p.label}
          </button>
        ))}
      </nav>

      <div
        className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 font-mono text-[9px] sm:text-[11px] text-gray-500"
        role="note"
        aria-label="Legend: a circle marks a regular commit, a diamond marks a bugfix commit, a glowing circle marks HEAD"
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap" aria-hidden="true">
          <svg className="w-[9px] h-[9px] sm:w-[11px] sm:h-[11px] shrink-0" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          commit
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap" aria-hidden="true">
          <svg className="w-[9px] h-[9px] sm:w-[11px] sm:h-[11px] shrink-0" viewBox="0 0 10 10">
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
        <span className="flex items-center gap-1.5 whitespace-nowrap" aria-hidden="true">
          <svg className="w-[9px] h-[9px] sm:w-[11px] sm:h-[11px] shrink-0" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="4" fill={PALETTE.head} opacity={0.9} />
          </svg>
          <span style={{ color: PALETTE.head }}>HEAD</span>
        </span>
      </div>
    </div>
  );
}
