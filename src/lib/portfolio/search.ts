/* eslint-disable prettier/prettier */

import { projects, type ProjectKey } from "@/data/portfolio/projects";
import { bugfixes } from "@/data/portfolio/bugfixes";
import {
  mainCommitContent,
  auctasyncCommitContent,
  assetverseCommitContent,
  careerpilotCommitContent,
  auctasyncBugfixCommitContent,
  careerpilotBugfixCommitContent,
  type CommitContent,
} from "@/data/portfolio/commits";

export type CommitMatch = {
  hash: string;
  message: string;
  branch: string;
  accent: string;
};

// Built from the same content registry GitGraph reads from, so search and
// the graph can never drift out of sync on hash/message text.
function toMatches(
  content: CommitContent[],
  branch: string,
  accent: (hash: string) => string,
): CommitMatch[] {
  return content.map((c) => ({ ...c, branch, accent: accent(c.hash) }));
}

const COMMITS: CommitMatch[] = [
  ...toMatches(mainCommitContent, "main", (hash) => (hash === "HEAD" ? "#34d399" : "#ffffff")),
  ...toMatches(auctasyncCommitContent, "feat/auctasync", () => "#f59e0b"),
  ...toMatches(assetverseCommitContent, "feat/assetverse", () => "#a78bfa"),
  ...toMatches(careerpilotCommitContent, "feat/careerpilot", () => "#34d399"),
  ...toMatches(auctasyncBugfixCommitContent, "bugfix/auctasync-race-condition", () => "#f59e0b"),
  ...toMatches(careerpilotBugfixCommitContent, "bugfix/careerpilot-session-state", () => "#34d399"),
];

// Additional searchable surface: project titles, descriptions, tags, and
// bugfix titles feed the same keyword match so a query like "payment" can
// pull the AuctaSync commits even if the word isn't in every message.
function extendedHaystack(c: CommitMatch): string {
  const parts: string[] = [c.hash, c.message, c.branch];
  const key = (["auctasync", "assetverse", "careerpilot"] as ProjectKey[]).find(
    (k) =>
      c.branch === `feat/${k}` ||
      c.branch === `bugfix/${k}-race-condition` ||
      c.branch === `bugfix/${k}-session-state`,
  );
  if (key && projects[key]) {
    const p = projects[key];
    parts.push(p.name, p.description, ...p.stack);
    for (const f of p.features) parts.push(f.title, f.detail);
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
