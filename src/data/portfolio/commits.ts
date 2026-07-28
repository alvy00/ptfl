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

export const auctasyncCommitContent: CommitContent[] = [
  { hash: "b1c2d3e", message: "feat(auctasync): scaffold real-time auction platform" },
  { hash: "b4f5g6h", message: "feat(auctasync): implement WebSocket bidding core" },
  { hash: "b7i8j9k", message: "feat(auctasync): integrate SSLCommerz payment gateway" },
  {
    hash: "b0l1m2n",
    message: "feat(auctasync): production deployment and load validation for concurrent bidding",
  },
];

export const assetverseCommitContent: CommitContent[] = [
  {
    hash: "d1e2f3g",
    message: "feat(assetverse): scaffold role-based asset management system",
  },
  {
    hash: "d4g5h6i",
    message: "feat(assetverse): implement RBAC with role hierarchy and permission checks",
  },
  {
    hash: "d7h8i9j",
    message: "feat(assetverse): build audit trail logging every asset state change",
  },
  {
    hash: "d7k8l9m",
    message: "feat(assetverse): milestone — full audit trail across asset lifecycle shipped",
  },
];

export const asynclangaiCommitContent: CommitContent[] = [
  {
    hash: "l1a2n3g",
    message: "feat(asynclangai): scaffold real-time English practice platform",
  },
  {
    hash: "l4a5n6g",
    message: "feat(asynclangai): implement real-time AI conversation engine for spoken practice",
  },
  {
    hash: "l7a8n9g",
    message: "feat(asynclangai): build custom virtual interviews and instant feedback engine",
  },
  {
    hash: "l0a1n2g",
    message: "feat(asynclangai): milestone — live AI conversation + feedback loop shipped",
  },
];

export const careerpilotCommitContent: CommitContent[] = [
  {
    hash: "c1d2e3f",
    message: "feat(careerpilot): scaffold career roadmap generator, define user input flow",
  },
  {
    hash: "c4g5h6i",
    message: "feat(careerpilot): integrate LLM API for personalized roadmap generation",
  },
  {
    hash: "c7h8i9j",
    message: "feat(careerpilot): build voice-based mock interview pipeline",
  },
  {
    hash: "c7j8k9l",
    message: "feat(careerpilot): milestone — end-to-end roadmap + voice interview flow shipped",
  },
];

export const auctasyncBugfixCommitContent: CommitContent[] = [
  {
    hash: "ra1c2d3",
    message:
      "fix(auctasync): [PLACEHOLDER] reproduce and isolate race condition in concurrent bid updates",
  },
  {
    hash: "ra4e5f6",
    message:
      "fix(auctasync): [PLACEHOLDER] resolve race condition with server-authoritative bid ordering",
  },
];

export const careerpilotBugfixCommitContent: CommitContent[] = [
  {
    hash: "sc1d2e3",
    message:
      "fix(careerpilot): [PLACEHOLDER] reproduce and isolate session-state bug in voice interview flow",
  },
  {
    hash: "sc4f5g6",
    message:
      "fix(careerpilot): [PLACEHOLDER] resolve session-state bug with corrected state management",
  },
];
