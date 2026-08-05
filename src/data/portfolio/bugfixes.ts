/* eslint-disable prettier/prettier */
// auctasync-race-condition below is Alvy's real, verified account.
// careerpilot-session-state is a technically-specific RECONSTRUCTION
// (Alvy didn't remember the exact bug) — plausible for this stack, but
// not a verified memory. Confirm it holds up under a follow-up
// question, or replace with the real story, before this goes live. A
// fabricated technical story that doesn't hold up is worse than admitting
// "I don't fully remember the details."

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
    problem: `Under concurrent bidding on the same lot, two bids submitted within milliseconds of each other could both appear to succeed client-side, occasionally a lower bid would flash as "current highest" for a moment before snapping back, or a bid would get accepted that was actually below the true current highest.`,
    triedFirst:
      "Client-side debouncing and optimistic UI locking (disabling the bid button briefly after submit) reduced how often it happened but didn't fix it, since the race was happening server-side between two different clients' requests, not within one client's own repeated submits.",
    rootCause: `The "is this the new highest bid" check was a read-then-write: fetch current highest, compare in application code, then write. Two near-simultaneous requests could both read the same "current highest" before either write committed, so both could pass the check.`,
    fix: `Replaced the read-then-write with a single atomic, conditional update at the database layer (UPDATE ... WHERE current_bid < $new) so Postgres itself is the sole arbiter of ordering a bid can only commit if it's still actually the highest at write time, closing the race window entirely.`,
    wouldDoDifferently: `Would have written a concurrency test (simulating two simultaneous bids) before shipping the bidding logic, not after noticing the bug in practice.`,
  },
  "careerpilot-session-state": {
    key: "careerpilot-session-state",
    branch: "bugfix/careerpilot-session-state",
    parentLabel: "feat/careerpilot",
    accent: "#34d399",
    title: "Session-state bug in voice interview flow",
    problem:
      'If a user left the interview page mid-call (browser back button, or the mic-permission prompt reloading the tab) and returned, the interview UI sometimes showed as still "in progress" against a call that Vapi\'s SDK had already torn down or the transcript sent for AI feedback ended up missing turns or containing turns from the wrong session.',
    triedFirst:
      "Added more useEffect cleanup and tried force-resetting local component state on mount, assuming a stale render was the problem. Didn't fix it, because the bug wasn't about what rendered, it was about which session an async SDK event was allowed to write into after the fact.",
    rootCause:
      "Vapi's call lifecycle (call-start, message, call-end) fires from outside React's render cycle, and session state was spread across a useState and a couple of refs with no single owner. If the component remounted mid-call, an in-flight event handler created by the OLD instance could still fire afterward and write into whatever state existed at that moment, not the session it was actually created for. Classic stale-closure race, just surfaced through an SDK callback instead of a fetch.",
    fix: "Modeled the interview as an explicit state machine (idle -> connecting -> active -> ending -> completed) driven by a single reducer with one source of truth, and tagged every session with an id that each Vapi event handler checks against before it's allowed to mutate state. An event from a superseded session is now a no-op instead of a silent overwrite. Also explicitly unregistered Vapi's listeners on unmount instead of relying on handlers to just stop mattering on their own.",
    wouldDoDifferently:
      'Would have sketched the state machine on paper before wiring the first event handler, and written a test for "component remounts mid-call" up front, that race is invisible in normal manual testing and only shows up once someone actually double-navigates during a live session.',
  },
};
