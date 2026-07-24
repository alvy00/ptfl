/* eslint-disable prettier/prettier */

// Centralized color tokens for the homepage's non-graph sections (Hero,
// StatsPanel, ContributingFooter). The Git graph itself keeps its own
// branch-accent colors in GitGraph.tsx since those are structurally tied
// to specific projects, not general theme colors — this file is for the
// site-wide neutral/accent palette used outside the graph.
export const theme = {
  bg: "#0e0f13",
  text: "#e5e7eb",
  border: "rgba(255,255,255,0.08)",
  borderSubtle: "rgba(255,255,255,0.05)",
  panelBg: "rgba(255,255,255,0.015)",
  green: "#34d399",
  greenHover: "#22c55e",
  purple: "#a78bfa",
  amber: "#f59e0b",
  neutral: "rgba(255,255,255,0.3)",
} as const;

export type ThemeColorKey = "green" | "purple" | "amber" | "neutral";

export const colorVarToHex: Record<ThemeColorKey, string> = {
  green: theme.green,
  purple: theme.purple,
  amber: theme.amber,
  neutral: theme.neutral,
};
