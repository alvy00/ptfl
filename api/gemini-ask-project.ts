import { GoogleGenerativeAI } from "@google/generative-ai";

import { projects, type ProjectKey } from "@/data/portfolio/projects";
import { bugfixes } from "@/data/portfolio/bugfixes";

// -----------------------------------------------------------------------
// This is the real implementation the mock's own doc comment describes —
// keep ask-project.mock.ts in the tree as a fallback (see the client-side
// src/lib/portfolio/ask-project.ts wrapper), don't delete it.
//
// LOCATION: this file lives at /api/gemini-ask-project.ts, a ROOT-level
// directory — that's deliberate, not incidental. Vercel only
// auto-detects serverless functions under root /api; a src/api path
// needs manual vercel.json wiring and isn't worth the extra config for
// one endpoint. The filename here IS the route (Vercel maps
// api/<name>.ts -> /api/<name>) — this resolves to /api/gemini-ask-
// project, which the client wrapper's fetch() call must match. Named
// distinctly from the client-side ask-project.ts on purpose, so the two
// aren't confusable when open side by side in an editor — one is the
// server handler, the other is the fetch() wrapper that calls it.
//
// ENV: requires GEMINI_API_KEY set in Vercel's project environment
// variables (Settings -> Environment Variables), NOT prefixed with
// VITE_/NEXT_PUBLIC_ — this must never reach client-side bundle.
// -----------------------------------------------------------------------

const PROJECT_KEYS: ProjectKey[] = ["auctasync", "assetverse", "asynclangai", "careerpilot"];

function isProjectKey(v: unknown): v is ProjectKey {
  return typeof v === "string" && PROJECT_KEYS.includes(v as ProjectKey);
}

// Every bugfix whose PARENT branch is this project — bugfixes.ts's own
// `branch`/`parentLabel` fields already encode this (parentLabel is
// "feat/{projectKey}"), so no new lookup table needed.
function bugfixesForProject(key: ProjectKey) {
  return Object.values(bugfixes).filter((bf) => bf.parentLabel === `feat/${key}`);
}

function buildSystemPrompt(key: ProjectKey): string {
  const p = projects[key];
  const fixes = bugfixesForProject(key);

  const featureLines = p.features.map((f) => `- ${f.title}: ${f.detail}`).join("\n");
  const fixLines = fixes
    .map(
      (bf) =>
        `### ${bf.title}\n` +
        `Problem: ${bf.problem}\n` +
        `Tried first: ${bf.triedFirst}\n` +
        `Root cause: ${bf.rootCause}\n` +
        `Fix: ${bf.fix}\n` +
        `Would do differently: ${bf.wouldDoDifferently}`,
    )
    .join("\n\n");

  return [
    `You are answering visitor questions about ONE specific project, "${p.name}", on Alvy's developer portfolio site.`,
    `Answer ONLY using the information below. If the question asks about something not covered here, say you don't have that detail rather than inventing one.`,
    `Keep answers conversational and concise — 2-4 sentences, like a developer explaining their own project, not a formal report. No markdown headers or bullet lists in your reply; plain prose.`,
    ``,
    `## Description`,
    p.description,
    ``,
    `## Tech stack`,
    p.stack.join(", "),
    ``,
    `## Features`,
    featureLines,
    fixes.length > 0 ? `\n## Bugs encountered and fixed\n${fixLines}` : "",
  ].join("\n");
}

const MAX_QUESTION_LEN = 500;

// ---- best-effort per-IP rate limit ----------------------------------
// In-memory, so it resets on cold start and isn't shared across
// concurrent serverless instances — good enough to stop a casual abuse
// loop from one visitor, NOT a real distributed limiter. If this
// endpoint gets meaningful traffic, swap this for Upstash Redis (a
// single INCR + EXPIRE per request) so the count is shared across
// instances instead of reset per cold start.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
const hitLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (hitLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  hitLog.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX;
}

function clientIp(req: Request): string {
  // Vercel sets x-forwarded-for; falls back to a constant bucket if
  // absent (e.g. local dev) rather than throwing.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// Edge runtime, not Node — "nodejs" is not a valid value for this config
// (a previous version of this file had that bug, which likely contributed
// to routing/build failures). Edge is also the correct choice for the
// Web-standard Request/Response handler signature below; Node's
// serverless runtime instead expects the older (req, res) callback style,
// which this file doesn't use.
export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests, try again in a minute." }), {
      status: 429,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { projectId, question } = (body ?? {}) as { projectId?: unknown; question?: unknown };

  if (!isProjectKey(projectId)) {
    return new Response(JSON.stringify({ error: "Unknown projectId" }), { status: 400 });
  }
  if (typeof question !== "string" || question.trim().length === 0) {
    return new Response(JSON.stringify({ error: "question is required" }), { status: 400 });
  }
  if (question.length > MAX_QUESTION_LEN) {
    return new Response(
      JSON.stringify({ error: `question must be under ${MAX_QUESTION_LEN} characters` }),
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fails loudly server-side (check your deployment logs) rather than
    // silently returning a confusing answer.
    console.error("GEMINI_API_KEY is not set");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: buildSystemPrompt(projectId),
    });

    const result = await model.generateContent(question.trim());
    const answer = result.response.text().trim();

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Gemini request failed:", err);
    return new Response(JSON.stringify({ error: "AI request failed, try again." }), {
      status: 502,
    });
  }
}
