/**
 * TODO: Replace the answer generation with a real call to a server-side
 * function calling the Gemini API. NEVER call the Gemini API directly
 * from client-side code. Keep the same function signature
 * (getSearchResponse) so no other code needs to change when this is
 * wired up for real. The keyword-matching logic for `matches` can stay
 * as-is or be enhanced later — it doesn't require AI.
 *
 * Expected real implementation shape:
 *   const res = await fetch("/api/search", {
 *     method: "POST",
 *     body: JSON.stringify({ query }),
 *   });
 *   const { answer } = await res.json();
 *   return { answer, matches: keywordMatch(query) };
 */

import { projects, type ProjectKey } from "@/data/projects";
import { bugfixes } from "@/data/bugfixes";

export type CommitMatch = {
  hash: string;
  message: string;
  branch: string;
  accent: string;
};

// Mirror of the commit registry rendered by GitGraph. Content is locked,
// so a small duplication here keeps search decoupled from the SVG layout.
const COMMITS: CommitMatch[] = [
  // main
  { hash: "a1b2c3d", message: "enroll: begin Chemical Engineering at RUET", branch: "main", accent: "#ffffff" },
  { hash: "e4f5g6h", message: "learn: start self-teaching full-stack web development", branch: "main", accent: "#ffffff" },
  { hash: "i7j8k9l", message: "apply: first internship application push", branch: "main", accent: "#ffffff" },
  { hash: "HEAD", message: "open to internship / junior developer roles", branch: "main", accent: "#34d399" },
  // feat/auctasync
  { hash: "b1c2d3e", message: "feat(auctasync): scaffold real-time auction platform", branch: "feat/auctasync", accent: "#f59e0b" },
  { hash: "b4f5g6h", message: "feat(auctasync): implement WebSocket bidding core", branch: "feat/auctasync", accent: "#f59e0b" },
  { hash: "b7i8j9k", message: "feat(auctasync): integrate SSLCommerz payment gateway", branch: "feat/auctasync", accent: "#f59e0b" },
  { hash: "b0l1m2n", message: "feat(auctasync): production deployment and load validation for concurrent bidding", branch: "feat/auctasync", accent: "#f59e0b" },
  // feat/assetverse
  { hash: "d1e2f3g", message: "feat(assetverse): scaffold role-based asset management system", branch: "feat/assetverse", accent: "#a78bfa" },
  { hash: "d4g5h6i", message: "feat(assetverse): implement RBAC with role hierarchy and permission checks", branch: "feat/assetverse", accent: "#a78bfa" },
  { hash: "d7h8i9j", message: "feat(assetverse): build audit trail logging every asset state change", branch: "feat/assetverse", accent: "#a78bfa" },
  { hash: "d7k8l9m", message: "feat(assetverse): milestone — full audit trail across asset lifecycle shipped", branch: "feat/assetverse", accent: "#a78bfa" },
  // feat/careerpilot
  { hash: "c1d2e3f", message: "feat(careerpilot): scaffold career roadmap generator, define user input flow", branch: "feat/careerpilot", accent: "#34d399" },
  { hash: "c4g5h6i", message: "feat(careerpilot): integrate LLM API for personalized roadmap generation", branch: "feat/careerpilot", accent: "#34d399" },
  { hash: "c7h8i9j", message: "feat(careerpilot): build voice-based mock interview pipeline", branch: "feat/careerpilot", accent: "#34d399" },
  { hash: "c7j8k9l", message: "feat(careerpilot): milestone — end-to-end roadmap + voice interview flow shipped", branch: "feat/careerpilot", accent: "#34d399" },
  // bugfix branches
  { hash: "ra1c2d3", message: "fix(auctasync): [PLACEHOLDER] reproduce and isolate race condition in concurrent bid updates", branch: "bugfix/auctasync-race-condition", accent: "#f59e0b" },
  { hash: "ra4e5f6", message: "fix(auctasync): [PLACEHOLDER] resolve race condition with server-authoritative bid ordering", branch: "bugfix/auctasync-race-condition", accent: "#f59e0b" },
  { hash: "sc1d2e3", message: "fix(careerpilot): [PLACEHOLDER] reproduce and isolate session-state bug in voice interview flow", branch: "bugfix/careerpilot-session-state", accent: "#34d399" },
  { hash: "sc4f5g6", message: "fix(careerpilot): [PLACEHOLDER] resolve session-state bug with corrected state management", branch: "bugfix/careerpilot-session-state", accent: "#34d399" },
];

// Additional searchable surface: project titles, descriptions, tags, and
// bugfix titles feed the same keyword match so a query like "payment" can
// pull the AuctaSync commits even if the word isn't in every message.
function extendedHaystack(c: CommitMatch): string {
  const parts: string[] = [c.hash, c.message, c.branch];
  const key = (["auctasync", "assetverse", "careerpilot"] as ProjectKey[]).find(
    (k) => c.branch === `feat/${k}` || c.branch === `bugfix/${k}-race-condition` || c.branch === `bugfix/${k}-session-state`,
  );
  if (key && projects[key]) {
    const p = projects[key];
    parts.push(p.title, p.description, ...(p.tags ?? []), ...(p.features ?? []));
  }
  for (const bf of Object.values(bugfixes)) {
    if (bf.branch === c.branch) parts.push(bf.title);
  }
  return parts.join(" ").toLowerCase();
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/git log|--all|--grep=|["']/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

function keywordMatch(query: string): CommitMatch[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const scored = COMMITS.map((c) => {
    const hay = extendedHaystack(c);
    const score = tokens.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0);
    return { c, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.c);
}

export async function getSearchResponse(
  query: string,
): Promise<{ answer: string; matches: CommitMatch[] }> {
  await new Promise((r) => setTimeout(r, 800));
  const matches = keywordMatch(query);
  return {
    answer:
      "[PLACEHOLDER] This is a mock response. Once connected to a real model, this will synthesize an actual answer based on the matched commits below.",
    matches,
  };
}
