/* eslint-disable prettier/prettier */

export type CommitContent = { hash: string; message: string };

export const mainCommitContent: CommitContent[] = [
  { hash: "a1b2c3d", message: "enroll: begin Chemical Engineering at RUET" },
  {
    hash: "e4f5g6h",
    message: "learn: React, HTML, CSS, Tailwind, Node.js, Framer Motion, and Express",
  },
  {
    hash: "m1n2o3p",
    message:
      "achieve: placed 2nd individually and shipped a Category A project at a private bootcamp",
  },
  { hash: "q4r5s6t", message: "learn: Next.js and GSAP" },
  { hash: "u7v8w9x", message: "learn: AI, LLMs, and RAG" },
  { hash: "v1e2c3t", message: "learn: Vector DBs" },
  { hash: "HEAD", message: "open to internship / junior developer roles" },
];

// 7 commits, in the same order as AUCTASYNC_ROWS = [9,10,13,14,15,16,17] —
// commit2 (row10) and commit3 (row13) are where the bugfix branch is
// bracketed from (rows 11-12 sit between them).
export const auctasyncCommitContent: CommitContent[] = [
  {
    hash: "b1c2d3e",
    message:
      "feat(auctasync): scaffold decoupled real-time auction platform — Next.js frontend, independent WebSocket service",
  },
  {
    hash: "b4f5g6h",
    message:
      "feat(auctasync): implement WebSocket bid broadcasting with Supabase Auth + row-level security",
  },
  {
    hash: "b2n3o4p",
    message:
      "feat(auctasync): implement drag-and-drop lot listing management with image uploads and per-lot bid history",
  },
  {
    hash: "b7i8j9k",
    message:
      "feat(auctasync): integrate SSLCommerz checkout with coupon support and Chart.js auction analytics",
  },
  {
    hash: "b0l1m2n",
    message:
      "feat(auctasync): milestone — real-time bidding, listings, payments, and live analytics shipped to production",
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
  },
];

export const careerpilotCommitContent: CommitContent[] = [
  {
    hash: "c1d2e3f",
    message:
      "feat(careerpilot): scaffold AI learning platform — Next.js 16, Firebase auth, MongoDB, unified full-stack architecture",
  },
  {
    hash: "c4g5h6i",
    message:
      "feat(careerpilot): implement Gemini roadmap generation with Zod-validated structured output, generalized beyond tech careers to any skill domain",
  },
  {
    hash: "c7h8i9j",
    message:
      "feat(careerpilot): implement live Vapi voice mock interviews with real-time conversational flow",
  },
  {
    hash: "c5t6u7v",
    message:
      "feat(careerpilot): implement AI-generated interview/assessment question bank, goal-specific across technical, academic, and practical tracks",
  },

  {
    hash: "c8w9x0y",
    message:
      "feat(careerpilot): implement persistent progress tracking — roadmap completion, quiz scores, and interview history in MongoDB",
  },
  {
    hash: "c7j8k9l",
    message:
      "feat(careerpilot): milestone — full learning loop shipped: roadmaps, quizzes, question bank, voice interviews, and progress tracking",
  },
];

// Single commit, not reproduce+resolve — both used to open the exact same
// bugfix detail modal (see bugfixes.ts), so the "reproduce" commit was
// pure visual duplication with no information the modal didn't already
// carry. One commit per bugfix branch now; the modal still tells the full
// problem -> root cause -> fix story regardless.
export const auctasyncBugfixCommitContent: CommitContent[] = [
  {
    hash: "ra4e5f6",
    message: "fix(auctasync): resolve race condition with server-authoritative bid ordering",
  },
];

export const careerpilotBugfixCommitContent: CommitContent[] = [
  {
    hash: "sc4f5g6",
    message: "fix(careerpilot): resolve session-state bug with corrected state management",
  },
];

export const careerpilotDuplicateSubmitBugfixCommitContent: CommitContent[] = [
  {
    hash: "cd4z5a6",
    message:
      "fix(careerpilot): resolve duplicate-submit race with an idempotency guard on generation",
  },
];
