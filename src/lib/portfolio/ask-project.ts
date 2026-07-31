/**
 * Real implementation of getAIResponse — calls the serverless endpoint at
 * api/gemini-ask-project.ts (see that file for the routing note). Same
 * signature as ask-project.mock.ts on purpose: AskProject.tsx only needs
 * its import line changed to point here, nothing else.
 */
export async function getAIResponse(projectId: string, question: string): Promise<string> {
  const res = await fetch("/api/gemini-ask-project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, question }),
  });

  if (!res.ok) {
    // Surface the server's own message when it sent one (rate limit,
    // validation, etc.) rather than a generic failure for every case.
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }

  const { answer } = (await res.json()) as { answer: string };
  return answer;
}
