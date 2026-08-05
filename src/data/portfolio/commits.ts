/* eslint-disable prettier/prettier */

export type CommitContent = { hash: string; message: string; badges?: string[] };

export const mainCommitContent: CommitContent[] = [
  {
    hash: "a1b2c3d",
    message:
      "init: start Chemical Engineering degree at RUET (building a foundation in complex systems)",
  },
  {
    hash: "e4f5g6h",
    message: "feat(core): dive into full-stack dev with React, TypeScript, Next.js, and Node.js",
  },
  {
    hash: "m1n2o3p",
    message:
      "ship(prod): placed 2nd individually and shipped a Category A project at a private bootcamp",
  },
  {
    hash: "q4r5s6t",
    message: "feat(ui): level up frontend animations and UI polish with GSAP and Framer Motion",
  },
  {
    hash: "u7v8w9x",
    message: "feat(ai): integrate LLM pipelines, semantic RAG architecture, and vector databases",
  },
  {
    hash: "v1e2c3t",
    message: "build: ship real-time web applications and paid client projects",
  },
  { hash: "HEAD", message: "release: open to internship / junior developer roles" },
];

// 3 commits: scaffold -> one feature commit (bugfix branch brackets off this
// commit) -> milestone summarizing everything shipped.
export const auctasyncCommitContent: CommitContent[] = [
  {
    hash: "b1c2d3e",
    message:
      "feat(auctasync): scaffold decoupled real-time auction platform — Next.js frontend, independent WebSocket service",
  },
  {
    hash: "b4f5g6h",
    message:
      "feat(auctasync): implement WebSocket bid broadcasting with Supabase Auth, drag-and-drop lot listings with image uploads, and SSLCommerz checkout",
  },
  {
    hash: "b0l1m2n",
    message:
      "feat(auctasync): milestone — real-time bidding, listings, payments, and live analytics shipped to production",
    badges: ["WebSockets", "Supabase", "SSLCommerz", "Chart.js"],
  },
];

// 5 commits, in the same order as ASSETVERSE_ROWS = [2,3,4,5,6].
export const assetverseCommitContent: CommitContent[] = [
  {
    hash: "d1e2f3g",
    message:
      "feat(assetverse): scaffold multi-tenant model — one employee account, many company affiliations",
  },
  {
    hash: "d4g5h6i",
    message:
      "feat(assetverse): implement self-serve registration, approval-gated affiliation, and role-based access",
  },
  {
    hash: "d7h8i9j",
    message:
      "feat(assetverse): implement full asset lifecycle (inventory → assignment → return) + Stripe-billed subscriptions",
  },
  {
    hash: "d7k8l9m",
    message:
      "feat(assetverse): milestone — Recharts analytics + PDF-exportable reports shipped to production",
    badges: ["Stripe", "Recharts", "PDF Export"],
  },
];

// 5 commits, in the same order as ASYNCLANGAI_ROWS = [19,20,21,22,23].
export const asynclangaiCommitContent: CommitContent[] = [
  {
    hash: "l1a2n3g",
    message: "feat(asynclangai): scaffold real-time English practice platform on Vapi voice AI",
  },
  {
    hash: "l2b3o4g",
    message:
      "feat(asynclangai): implement Firebase Authentication (client + Admin SDK) with Zod-validated, react-hook-form-driven session setup",
  },
  {
    hash: "l4a5n6g",
    message:
      "feat(asynclangai): implement live voice conversation engine with natural back-and-forth dialogue",
  },
  {
    hash: "l0a1n2g",
    message:
      "feat(asynclangai): milestone — live voice practice with non-blocking AI feedback pipeline shipped",
    badges: ["Vapi", "Firebase", "Zod"],
  },
];

// 3 commits: scaffold -> one feature commit (session-state bugfix branch
// brackets off this commit) -> milestone summarizing everything shipped.
export const careerpilotCommitContent: CommitContent[] = [
  {
    hash: "c1d2e3f",
    message:
      "feat(careerpilot): scaffold AI learning platform — Next.js 16, Firebase auth, MongoDB, unified full-stack architecture",
  },
  {
    hash: "c4g5h6i",
    message:
      "feat(careerpilot): implement Gemini roadmap generation, live Vapi voice mock interviews, and AI-generated question bank across technical, academic, and practical tracks",
  },
  {
    hash: "c7j8k9l",
    message:
      "feat(careerpilot): milestone — full learning loop shipped: roadmaps, quizzes, question bank, voice interviews, and progress tracking",
    badges: ["Gemini", "Vapi", "Firebase", "MongoDB"],
  },
];

// Two commits (reproduce + resolve), matching every other branch's shape.
// The modal no longer opens from an individual commit row click — these
// rows are passive display text now, and the whole bugfix box (see
// GitGraphBugfixBox) is the single click target for both commits at once.
export const auctasyncBugfixCommitContent: CommitContent[] = [
  {
    hash: "ra1c2d3",
    message: "fix(auctasync): reproduce and isolate race condition in concurrent bid updates",
  },
  {
    hash: "ra4e5f6",
    message: "fix(auctasync): resolve race condition with server-authoritative bid ordering",
  },
];

export const careerpilotBugfixCommitContent: CommitContent[] = [
  {
    hash: "sc1d2e3",
    message: "fix(careerpilot): reproduce and isolate session-state bug in voice interview flow",
  },
  {
    hash: "sc4f5g6",
    message: "fix(careerpilot): resolve session-state bug with corrected state management",
  },
];
