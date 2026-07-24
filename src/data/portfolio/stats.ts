/* eslint-disable prettier/prettier */

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
  { id: "deployments", eyebrow: "Deployments", value: "3 Projects Shipped" },
  { id: "stability", eyebrow: "Stability", value: "2 Bugs Squashed" },
  {
    id: "algorithms",
    eyebrow: "Algorithms",
    value: "Competitive Programmer",
    href: "https://leetcode.com/u/alvy00/",
    ariaLabel: "Open Alvy's LeetCode profile in a new tab",
  },
];
