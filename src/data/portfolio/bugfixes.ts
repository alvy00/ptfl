// TODO: PLACEHOLDER — replace with the real bug story before this site goes live.
// A fabricated technical story is worse than no story if it doesn't hold up to a
// follow-up question. Every field below (problem, triedFirst, rootCause, fix,
// wouldDoDifferently) is a placeholder until Alvy writes the real recount.

export type BugfixKey = "auctasync-race-condition" | "careerpilot-session-state";

export type Bugfix = {
  key: BugfixKey;
  branch: string;
  parentLabel: string;
  accent: string;
  title: string;
  // TODO: PLACEHOLDER
  problem: string;
  // TODO: PLACEHOLDER
  triedFirst: string;
  // TODO: PLACEHOLDER
  rootCause: string;
  // TODO: PLACEHOLDER
  fix: string;
  // TODO: PLACEHOLDER
  wouldDoDifferently: string;
};

export const bugfixes: Record<BugfixKey, Bugfix> = {
  "auctasync-race-condition": {
    key: "auctasync-race-condition",
    branch: "bugfix/auctasync-race-condition",
    parentLabel: "feat/auctasync",
    accent: "#f59e0b",
    title: "Race condition in concurrent bid updates",
    problem:
      "[PLACEHOLDER — one sentence describing the bug's symptom, e.g. what users saw when two bids landed in the same tick.]",
    triedFirst:
      "[PLACEHOLDER — an approach that didn't fully work, and why. Likely a client-side debounce or optimistic UI patch that masked the issue without fixing ordering.]",
    rootCause:
      "[PLACEHOLDER — the actual underlying cause, e.g. bid ordering was decided client-side, so two sockets could each believe they were the highest bidder.]",
    fix: "[PLACEHOLDER — what actually solved it, e.g. moved bid arbitration to the server with a monotonic sequence and rejected stale writes.]",
    wouldDoDifferently:
      "[PLACEHOLDER — one honest reflection, e.g. would have written the concurrency test before the feature, not after the incident.]",
  },
  "careerpilot-session-state": {
    key: "careerpilot-session-state",
    branch: "bugfix/careerpilot-session-state",
    parentLabel: "feat/careerpilot",
    accent: "#34d399",
    title: "Session-state bug in voice interview flow",
    problem:
      "[PLACEHOLDER — one sentence describing the bug's symptom, e.g. what users experienced when resuming or re-entering a mock interview.]",
    triedFirst:
      "[PLACEHOLDER — an approach that didn't fully work, and why. Likely stuffing more state into React refs or localStorage without a single owner.]",
    rootCause:
      "[PLACEHOLDER — the actual underlying cause, e.g. interview session state was implicit across the audio pipeline and UI, with no single source of truth.]",
    fix: "[PLACEHOLDER — what actually solved it, e.g. modeled the interview as an explicit state machine driven by server events, with the UI as a pure projection.]",
    wouldDoDifferently:
      "[PLACEHOLDER — one honest reflection, e.g. would have designed the state machine on paper before writing the first audio handler.]",
  },
};
