/**
 * TODO: Replace this mock function with a real call to a server-side
 * function (e.g. a TanStack server function or Supabase Edge Function)
 * that calls the Gemini API. NEVER call the Gemini API directly from
 * client-side code — this will expose the API key. Keep the same
 * function signature so no other code needs to change when this is
 * wired up for real.
 *
 * Expected real implementation shape:
 *   const res = await fetch("/api/ask-project", {
 *     method: "POST",
 *     body: JSON.stringify({ projectId, question }),
 *   });
 *   const { answer } = await res.json();
 *   return answer;
 */

// PLACEHOLDER — replace with real project detail before launch
const MOCK_RESPONSES: Record<string, string> = {
  auctasync:
    "[PLACEHOLDER] I handled real-time bid synchronization using WebSocket broadcast events, with the countdown timer state kept authoritative on the server to prevent client-side drift. This answer is a placeholder — Alvy hasn't filled in the real technical detail yet.",
  // PLACEHOLDER — replace with real project detail before launch
  assetverse:
    "[PLACEHOLDER] The RBAC layer checks permissions at both the API route level and inside the UI to hide unauthorized actions. This answer is a placeholder — Alvy hasn't filled in the real technical detail yet.",
  // PLACEHOLDER — replace with real project detail before launch
  asynclangai:
    "[PLACEHOLDER] The real-time conversation loop streams the AI agent's audio/text turns as they're generated rather than waiting for a full response, and the feedback pass runs as a separate step after the session ends. This answer is a placeholder — Alvy hasn't filled in the real technical detail yet.",
  // PLACEHOLDER — replace with real project detail before launch
  careerpilot:
    "[PLACEHOLDER] The roadmap generator sends structured user proficiency data to the LLM with a prompt template that constrains output to a consistent step format. This answer is a placeholder — Alvy hasn't filled in the real technical detail yet.",
};

export async function getAIResponse(projectId: string, question: string): Promise<string> {
  // Simulate ~800ms network/AI latency so the loading state is visible.
  await new Promise((r) => setTimeout(r, 800));
  void question;
  return (
    MOCK_RESPONSES[projectId] ?? "[PLACEHOLDER] No mock response configured for this project yet."
  );
}
