/* eslint-disable prettier/prettier */
import { GoogleGenAI } from "@google/genai";

import { projects, type ProjectKey } from "@/data/portfolio/projects";
import { bugfixes } from "@/data/portfolio/bugfixes";
import {
  mainCommitContent,
  auctasyncCommitContent,
  assetverseCommitContent,
  asynclangaiCommitContent,
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

// Same reasoning as ask-project.ts: client-side key, no server proxy.
// Acceptable for this portfolio widget, not the pattern to copy into
// anything handling real user data or a production budget.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured (VITE_GEMINI_API_KEY).");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: API_KEY });
  }
  return client;
}

/**
 * Fallback chain of free-tier Gemini models, tried in order on any
 * failure (rate limit, transient error, model-specific outage). Ordered
 * strongest-capability-first so quality only degrades when it has to.
 *
 * Kept identical to ask-project.ts's chain on purpose — both widgets
 * share one API key/project, so they share one quota pool and should
 * degrade the same way. If you update one, update the other.
 *
 * As of mid-2026, Google's free tier no longer includes any Pro model
 * (Pro moved to paid-only in April 2026) — the free lineup is the Flash
 * / Flash-Lite family. Re-check
 * https://ai.google.dev/gemini-api/docs/pricing periodically — this
 * list WILL go stale as Google reshuffles the free tier again.
 */
const MODEL_FALLBACK_CHAIN = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

const MAX_QUERY_LENGTH = 200;

// Cap how many matched commits get sent to the model as context — the
// full match list can be long and most of the signal is in the top
// results anyway; this keeps the prompt small and the answer focused on
// what's actually shown first in the UI.
const MAX_CONTEXT_MATCHES = 12;

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
  ...toMatches(asynclangaiCommitContent, "feat/asynclangai", () => "#38bdf8"),
  ...toMatches(careerpilotCommitContent, "feat/careerpilot", () => "#34d399"),
  ...toMatches(auctasyncBugfixCommitContent, "bugfix/auctasync-race-condition", () => "#fb7185"),
  ...toMatches(careerpilotBugfixCommitContent, "bugfix/careerpilot-session-state", () => "#fb7185"),
];

const PROJECT_KEYS: ProjectKey[] = ["auctasync", "assetverse", "asynclangai", "careerpilot"];

function projectKeyForBranch(branch: string): ProjectKey | undefined {
  return PROJECT_KEYS.find(
    (k) =>
      branch === `feat/${k}` ||
      branch === `bugfix/${k}-race-condition` ||
      branch === `bugfix/${k}-session-state`,
  );
}

// Additional searchable surface: project titles, descriptions, tags, and
// bugfix titles feed the same keyword match so a query like "payment" can
// pull the AuctaSync commits even if the word isn't in every message.
function extendedHaystack(c: CommitMatch): string {
  const parts: string[] = [c.hash, c.message, c.branch];
  const key = projectKeyForBranch(c.branch);
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

/** Builds the grounding context Gemini needs to synthesize an answer from
 *  the matched commits — hash, message, branch, and (where the commit
 *  belongs to a project) that project's name/description, so the model
 *  can explain *why* a commit is relevant, not just restate its message. */
function buildSearchContext(query: string, matches: CommitMatch[]): string {
  if (matches.length === 0) {
    return `Query: ${query}\n\nNo commits matched this query.`;
  }
  const lines = matches.slice(0, MAX_CONTEXT_MATCHES).map((m) => {
    const key = projectKeyForBranch(m.branch);
    const projectName = key && projects[key] ? projects[key].name : null;
    return [
      `- ${m.hash} [${m.branch}${projectName ? ` — ${projectName}` : ""}]: ${m.message}`,
    ].join("");
  });
  const omitted = matches.length - Math.min(matches.length, MAX_CONTEXT_MATCHES);
  return [
    `Query: ${query}`,
    `Matching commits (${matches.length} total${omitted > 0 ? `, showing top ${MAX_CONTEXT_MATCHES}` : ""}):`,
    lines.join("\n"),
  ].join("\n\n");
}

function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes("429") || /rate.?limit/i.test(err.message);
}

/** Errors worth falling through to the next model for: rate limits,
 *  5xx-ish transient failures, and "model not found / not available"
 *  cases (a model getting pulled from the free tier without notice).
 *  Errors that would fail identically on every model — a bad API key,
 *  or the caller's own empty/oversized query — are NOT retried here;
 *  those are thrown before this loop even starts. */
function isRetryableAcrossModels(err: unknown): boolean {
  if (!(err instanceof Error)) return true; // unknown shape — safer to try the next model
  if (isRateLimitError(err)) return true;
  return /5\d\d|unavailable|not found|overloaded|internal/i.test(err.message);
}

/** Answers a visitor's search query by synthesizing across the
 *  keyword-matched commits below it, using Gemini grounded in those
 *  commits' real hashes/messages/branches. Same signature the mock
 *  version had — nothing else in GlobalSearch.tsx needs to change.
 *
 *  Split in two on purpose: `getMatches` is synchronous (pure keyword
 *  scoring, no network) so the UI can render the commit list the instant
 *  the user hits enter, instead of waiting on the full round trip below
 *  just to show something that was already known locally.
 *
 *  Tries each model in MODEL_FALLBACK_CHAIN in order, moving to the next
 *  one on any retryable failure (rate limit, transient/server error, or
 *  a model that's been pulled from free access). Only the *last* model's
 *  error is surfaced to the caller. */
export function getMatches(query: string): CommitMatch[] {
  const q = query.trim();
  if (!q) return [];
  if (q.length > MAX_QUERY_LENGTH) return [];
  return keywordMatch(q);
}

export async function getSearchAnswer(query: string, matches: CommitMatch[]): Promise<string> {
  const q = query.trim();
  if (!q) {
    throw new Error("search for something first.");
  }
  if (q.length > MAX_QUERY_LENGTH) {
    throw new Error(`keep it under ${MAX_QUERY_LENGTH} characters.`);
  }

  const ai = getClient();
  const context = buildSearchContext(q, matches);

  const systemInstruction = [
    "You are simulating `git log --all --grep=` search output for a",
    "developer's portfolio site. The user typed a search query; below",
    "are the commits that keyword-matched it, each with hash, branch,",
    "and message.",
    "",
    "Write a short synthesis of what those commits show, in the voice",
    "of the developer explaining their own work — not a chatbot",
    "describing search results. Never sound like an AI assistant: no",
    '"Great question!", no enthusiasm-by-exclamation-point, no hedging',
    "disclaimers, no restating the query back.",
    "",
    "Ground every claim in the commits and project context below.",
    "Never invent commits, hashes, or details not present in it. If no",
    "commits matched, say so plainly in one sentence — don't guess at",
    "what might exist.",
    "",
    "1-3 short sentences. Plain prose only — no markdown, no bullet",
    "points, no headers, no bold, no commit hashes inline (the UI",
    "lists those separately below the answer). Plainspoken and",
    'specific, not resume-speak: avoid "leveraged", "utilized",',
    '"seamless", "robust", "passionate about".',
    "",
    context,
  ].join("\n");

  let lastErr: Error = new Error("request failed. try again.");

  for (let i = 0; i < MODEL_FALLBACK_CHAIN.length; i++) {
    const model = MODEL_FALLBACK_CHAIN[i];
    const isLastModel = i === MODEL_FALLBACK_CHAIN.length - 1;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: q,
        config: {
          systemInstruction,
          maxOutputTokens: 4000,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("no response generated. try rephrasing.");
      }
      return text.trim();
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error("request failed. try again.");

      if (!isRetryableAcrossModels(normalized) || isLastModel) {
        lastErr = normalized;
        break;
      }

      // Not the last model and the failure looks transient/model-specific
      // — log for visibility, then fall through to the next model in the
      // chain instead of surfacing this error to the caller.
      console.warn(`[getSearchAnswer] ${model} failed, falling back:`, normalized.message);
      lastErr = normalized;
    }
  }

  // Friendlier message when every model in the chain was rate limited —
  // same reasoning as ask-project.ts: this widget has no server-side
  // rate limiting of its own.
  if (isRateLimitError(lastErr)) {
    throw new Error("rate limited — try again in a moment.");
  }
  throw new Error(lastErr.message);
}

/** Convenience wrapper for callers that don't need the matches-first,
 *  answer-second split above — kept for parity with the original
 *  single-call shape. Prefer getMatches + getSearchAnswer in new code so
 *  the UI can render matches before the network call resolves. */
export async function getSearchResponse(
  query: string,
): Promise<{ answer: string; matches: CommitMatch[] }> {
  const matches = getMatches(query);
  const answer = await getSearchAnswer(query, matches);
  return { answer, matches };
}
