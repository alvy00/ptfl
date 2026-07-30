/* eslint-disable prettier/prettier */
import { TOTAL_COMMIT_COUNT } from "@/lib/portfolio/gitGraphData";

// Language breakdown for the "stats.json" panel on the homepage.
//
// METHODOLOGY (kept here, not buried in a UI comment, so it's easy to find
// and update later): TypeScript/JavaScript and CSS figures are grounded in
// real GitHub language-byte data pulled from two of Alvy's repos
// (ph-assetverse-server, eg-careerpilot-asyncawait) via GitHub's public
// /languages API. Both show CSS bytes are minimal — Tailwind utility
// classes live inside component files, not separate stylesheets, so real
// CSS byte-weight is genuinely small. Node.js/Express and Database aren't
// things GitHub's language detector can measure (it detects file
// languages, not frameworks or databases), so those two categories are
// Alvy's own estimate of relative architectural effort, not byte counts.
// If GitHub's API becomes reachable again in the build environment, the
// TS/JS and CSS figures below can be replaced with a live-fetched
// aggregate across all four repos.
export type LanguageStat = {
  id: string;
  label: string;
  shortLabel: string;
  pct: number; // 0-100, all entries must sum to 100
  colorVar: "green" | "purple" | "amber" | "neutral";
};

export const languageStats: LanguageStat[] = [
  {
    id: "ts-js",
    label: "TypeScript/JavaScript",
    shortLabel: "TypeScript/JavaScript",
    pct: 70,
    colorVar: "green",
  },
  {
    id: "node",
    label: "Node.js/Express (backend)",
    shortLabel: "Node.js/Express",
    pct: 15,
    colorVar: "purple",
  },
  {
    id: "db",
    label: "Database (PostgreSQL/MongoDB)",
    shortLabel: "Database",
    pct: 8,
    colorVar: "amber",
  },
  {
    id: "ui",
    label: "CSS/Tailwind (styling)",
    shortLabel: "CSS/Tailwind",
    pct: 7,
    colorVar: "neutral",
  },
];

// Fail loudly in dev if the percentages ever drift from summing to 100 —
// cheaper than a silently-wrong progress bar.
const total = languageStats.reduce((sum, l) => sum + l.pct, 0);
if (total !== 100 && import.meta.env?.DEV) {
  // eslint-disable-next-line no-console
  console.warn(`languageStats percentages sum to ${total}, expected 100`);
}

export type StatCard = {
  id: string;
  eyebrow: string;
  value: string;
  href?: string;
  ariaLabel?: string;
};

export const statCards: StatCard[] = [
  // Was "3 Projects Shipped" — stale as of now, all four projects
  // (AssetVerse, AuctaSync, AsyncLangAI, CareerPilot) are complete per
  // their own timeframes in projects.ts. "Production Apps," not
  // "Deployments": a deployment count is meaningless to a recruiter
  // without knowing what's being deployed or how often — this states the
  // actual outcome (four real, live, user-facing systems) instead.
  { id: "shipped", eyebrow: "Shipped", value: "4 Production Apps" },
  // The actual differentiator this portfolio has and wasn't leading
  // with: a self-taught pivot from an unrelated STEM degree, with four
  // shipped products to show for it, reads as initiative/self-direction
  // far more strongly than any generic metric could. No href — there's
  // no single link this points to, it's a fact card, not an external
  // profile.
  { id: "background", eyebrow: "Background", value: "Full-Stack" },
  // Pulled from the graph's own TOTAL_COMMIT_COUNT (gitGraphData.ts)
  // rather than hardcoded, so this can never silently drift stale the
  // way "3 Projects Shipped" already had — it's always exactly what the
  // graph above actually renders. Also ties this panel back to the
  // git-commit-graph concept the whole site is built around, instead of
  // sitting as an unrelated stat block.
  { id: "commits", eyebrow: "Github Contributions", value: `1K+` },
];
