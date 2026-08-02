import { GoogleGenAI } from "@google/genai";

import { projects, type ProjectKey } from "@/data/portfolio/projects";

/**
 * Direct client-side call to the Gemini API — no edge function / server
 * proxy in front of it. This is a deliberate choice (not an oversight):
 * the API key ships in the client bundle and is visible to anyone who
 * opens devtools. Acceptable here because this is a portfolio widget with
 * no user data and low quota stakes, NOT the default recommendation for
 * anything handling real user data or a production budget — if this
 * pattern gets copied into AuctaSync/AssetVerse/etc., it needs a real
 * server-side proxy instead (see the Supabase Edge Function pattern used
 * for those projects' own Stripe/Firebase Admin calls).
 *
 * VITE_GEMINI_API_KEY assumes a Vite-based build (Lovable's default). If
 * this ever moves to a Next.js app, swap this for
 * `process.env.NEXT_PUBLIC_GEMINI_API_KEY` instead — `NEXT_PUBLIC_`
 * prefix is required there for the value to reach client code at all,
 * same reasoning as Vite's `VITE_` prefix below.
 */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// Constructed lazily (inside getAIResponse) rather than at module scope
// with a thrown error here, so a missing key surfaces as a normal
// [error] message in the widget's own UI (AskProject.tsx already renders
// `err.message` on failure) instead of a blank-page module-load crash.
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
 * As of mid-2026, Google's free tier no longer includes any Pro model
 * (Pro moved to paid-only in April 2026) — the free lineup is the Flash
 * / Flash-Lite family. Kept a couple of generations deep on purpose:
 * 3.x models are newer/cheaper on quota but occasionally get pulled from
 * free access or hit region-specific hiccups, so 2.5 models stay in the
 * chain as a safety net rather than being trusted alone.
 *
 * Re-check https://ai.google.dev/gemini-api/docs/pricing periodically —
 * this list WILL go stale as Google reshuffles the free tier again.
 */
const MODEL_FALLBACK_CHAIN = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

const MAX_QUESTION_LENGTH = 500;

/** Builds the grounding context Gemini needs to answer accurately about
 *  ONE specific project, instead of guessing from the project name alone.
 *  Pulled directly from the same `Project` record the rest of the site
 *  already uses — description, feature list, and stack — so this can
 *  never drift out of sync with what's actually shown elsewhere on the
 *  page for the same project. */
function buildProjectContext(projectKey: ProjectKey): string {
  const project = projects[projectKey];
  const featureLines = project.features.map((f) => `- ${f.title}: ${f.detail}`).join("\n");
  return [
    `Project: ${project.name}`,
    `Description: ${project.description}`,
    `Key features:\n${featureLines}`,
    `Tech stack: ${project.stack.join(", ")}`,
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
 *  or the caller's own empty/oversized question — are NOT retried here;
 *  those are thrown before this loop even starts. */
function isRetryableAcrossModels(err: unknown): boolean {
  if (!(err instanceof Error)) return true; // unknown shape — safer to try the next model
  if (isRateLimitError(err)) return true;
  return /5\d\d|unavailable|not found|overloaded|internal/i.test(err.message);
}

/** Answers a visitor's question about a specific portfolio project using
 *  Gemini, grounded in that project's real description/features/stack.
 *  Same signature the mock version had (`ask-project.mock.ts`) — nothing
 *  else in AskProject.tsx needs to change for this swap.
 *
 *  Tries each model in MODEL_FALLBACK_CHAIN in order, moving to the next
 *  one on any retryable failure (rate limit, transient/server error, or
 *  a model that's been pulled from free access). Only the *last* model's
 *  error is surfaced to the caller, since it's the most informative one
 *  ("everything is currently unavailable" beats "the first model, which
 *  we gave up on three tries ago, was rate limited"). */
export async function getAIResponse(projectKey: ProjectKey, question: string): Promise<string> {
  const q = question.trim();
  if (!q) {
    throw new Error("ask a question first.");
  }
  if (q.length > MAX_QUESTION_LENGTH) {
    throw new Error(`keep it under ${MAX_QUESTION_LENGTH} characters.`);
  }

  const ai = getClient();
  const context = buildProjectContext(projectKey);

  const systemInstruction = [
    "You are the developer of ONE specific software project, answering a",
    "recruiter or hiring manager's question about it directly — in an",
    "interview tone, not a chatbot tone. Never sound like an AI assistant:",
    'no "Great question!", no enthusiasm-by-exclamation-point, no hedging',
    "disclaimers, no restating the question back.",
    "",
    "Ground every claim in the project context below. Never invent facts",
    "not present in it — this includes technical details AND metrics",
    "(user counts, performance numbers, dates) that aren't stated. If",
    "asked something the context doesn't cover, say so plainly in one",
    "sentence rather than guessing.",
    "",
    "If the question isn't about this project, say briefly that you can",
    "only answer questions about this project.",
    "",
    "Structure the answer as: the specific decision or challenge that's",
    "actually hard to fake (not the project's category), the reasoning",
    "behind it, and a concrete outcome — in that order. Lead with",
    "whatever detail in the context is least likely to appear in a",
    "tutorial clone of this idea, not with a generic restatement of what",
    "the project is.",
    "",
    "2-5 short sentences. Plain prose only — no markdown, no bullet",
    "points, no headers, no bold. Plainspoken and specific, not",
    'resume-speak: avoid "leveraged", "utilized", "seamless",',
    '"robust", "passionate about". End on the concrete outcome, not a',
    "trailing caveat or a tech-stack recap.",
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
          maxOutputTokens: 8000,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("no response generated. try rephrasing.");
      }
      return text.trim();
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error("request failed. try again.");

      // "no response generated" isn't a model-availability problem, it's
      // Gemini returning an empty completion (e.g. safety filtering) —
      // retrying on a different model can plausibly help, so let it fall
      // through the same retry path rather than special-casing it out.

      if (!isRetryableAcrossModels(normalized) || isLastModel) {
        lastErr = normalized;
        break;
      }

      // Not the last model and the failure looks transient/model-specific
      // — log for visibility, then fall through to the next model in the
      // chain instead of surfacing this error to the caller.
      console.warn(`[getAIResponse] ${model} failed, falling back:`, normalized.message);
      lastErr = normalized;
    }
  }

  // Friendlier message when every model in the chain was rate limited —
  // this widget has no server-side rate limiting of its own (only the
  // client-side COOLDOWN_MS in AskProject.tsx, which a page refresh
  // trivially bypasses), so this case is expected to happen sometimes.
  if (isRateLimitError(lastErr)) {
    throw new Error("rate limited — try again in a moment.");
  }
  throw new Error(lastErr.message);
}
