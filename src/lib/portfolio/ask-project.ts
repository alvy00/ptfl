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

// Change this to whatever model your key actually has access to —
// "gemini-2.5-flash" is a safe, broadly-available default (fast, cheap),
// not a claim that it's the only or newest option.
const MODEL = "gemini-3.6-flash";

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

/** Answers a visitor's question about a specific portfolio project using
 *  Gemini, grounded in that project's real description/features/stack.
 *  Same signature the mock version had (`ask-project.mock.ts`) — nothing
 *  else in AskProject.tsx needs to change for this swap. */
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

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: q,
      config: {
        // Loose, not a hard security boundary — a determined person can
        // still route around this. It just keeps "answer questions about
        // this specific project" as the path of least resistance for a
        // widget that's sitting behind an intentionally-exposed key.
        systemInstruction: [
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
        ].join("\n"),
        maxOutputTokens: 8000,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("no response generated. try rephrasing.");
    }
    return text.trim();
  } catch (err) {
    // Re-throw as a plain Error with a message AskProject.tsx can render
    // directly (`[error] ${err.message}`) — the SDK's own error shapes
    // vary (network vs. API-level rejection), so this normalizes them
    // rather than leaking a raw SDK error object into the UI.
    if (err instanceof Error) {
      // Gemini's rate-limit errors surface as 429s in the message text —
      // worth a friendlier message than the raw API error string, since
      // this widget has no server-side rate limiting of its own (only
      // the client-side COOLDOWN_MS in AskProject.tsx, which a page
      // refresh trivially bypasses).
      if (err.message.includes("429") || /rate.?limit/i.test(err.message)) {
        throw new Error("rate limited — try again in a moment.");
      }
      throw new Error(err.message);
    }
    throw new Error("request failed. try again.");
  }
}
