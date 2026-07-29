/* eslint-disable prettier/prettier */
// auctasync-race-condition below is Alvy's real, verified account.
// The two careerpilot-* entries are technically-specific RECONSTRUCTIONS
// (Alvy didn't remember the exact bugs) — plausible for this stack, but
// not verified memories. Confirm each holds up under a follow-up
// question, or replace with the real story, before this goes live. A
// fabricated technical story that doesn't hold up is worse than admitting
// "I don't fully remember the details."

export type BugfixKey =
  "auctasync-race-condition" | "careerpilot-session-state" | "careerpilot-duplicate-submit";

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
  "careerpilot-duplicate-submit": {
    key: "careerpilot-duplicate-submit",
    branch: "bugfix/careerpilot-duplicate-submit",
    parentLabel: "feat/careerpilot",
    accent: "#34d399",
    title: "Duplicate roadmap generation on rapid re-submit",
    // NOTE: reconstructed, not recalled — same caveat as the session-state
    // entry above. Double-click / impatient-retry races on a slow AI
    // request are a common, believable failure mode, not an invented one.
    // Confirm or replace before this goes live.
    problem:
      'Clicking "Generate Roadmap" twice in quick succession (usually while waiting on a slow Gemini response) could fire two concurrent generation requests against the same roadmap document — the second write silently overwrote the first, sometimes leaving a roadmap with a mismatched or partially-orphaned phase list.',
    triedFirst:
      "Disabled the button on click via local component state. Reduced how often it happened but didn't close it — the disabled state lived client-side only, so a second request already in flight (e.g. from a fast double-click before React re-rendered) could still reach the server and race the first.",
    rootCause:
      "There was no server-side guard against two generation requests for the same roadmap running concurrently — the endpoint trusted the client to only ever send one at a time. Whichever request's write landed last won, with no ordering or conflict check.",
    fix: "Added an idempotency guard at the request layer — a short-lived lock keyed on the roadmap id, held for the duration of generation, so a second request for the same roadmap while one is in flight is rejected outright instead of racing it. The client-side disabled state stayed, but the server no longer trusts it as the only safeguard.",
    wouldDoDifferently:
      "Would default to treating every button that triggers a slow/expensive server action as double-submittable until proven otherwise, and add the server-side guard at the same time as the client-side one, not after someone's double-click corrupted a document.",
  },
};
