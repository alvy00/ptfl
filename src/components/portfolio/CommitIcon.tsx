type IconShape = { viewBox: string; path: string };

// Order = priority. A message matching an earlier rule never falls
// through to a later one, even if it also contains a later rule's
// keyword — e.g. "milestone" always wins over "implement" if a message
// somehow contained both, because MILESTONE is checked first below. This
// was previously true only by accident (top-to-bottom if/else), with
// nothing marking it as intentional. It's explicit now: read top to
// bottom, first match wins.
//
// One exception, not encoded in this array's order: matchesFix() below
// runs BEFORE this list is ever consulted, so "fix(...)"/"resolve" always
// wins over every rule here, including MILESTONE — a message can't
// currently match both (no bugfix commit message contains "milestone"),
// but if one ever did, the fix icon would win, not milestone. Worth
// knowing before assuming the array order alone is a complete picture of
// precedence.
//
// To add a keyword: find the matching rule below and push onto its
// `keywords` array. To add a wholly new category, add a new entry to
// this array at the priority position you want it checked.
const ICON_RULES: { keywords: string[]; shape: IconShape }[] = [
  {
    // MILESTONE checked first among these rules, deliberately above
    // scaffold/implement — a milestone commit is the most narratively
    // significant type in this graph (see GitGraphCommitRow's decrypt-
    // reveal gating, which treats milestones as first-class), so it
    // should never lose its icon to an earlier-matching category by
    // accident. Still subordinate to matchesFix() above, per the note
    // there.
    keywords: ["milestone"],
    shape: {
      viewBox: "0 0 24 24",
      path: "M3 21V3m0 2.25h16.5l-2.25 4.5 2.25 4.5H3",
    },
  },
  {
    keywords: ["scaffold"],
    shape: {
      viewBox: "0 0 24 24",
      path: "M12 19v-7m0 0c0-2.5-2-4.5-4.5-4.5S3 9.5 3 12h9zm0 0c0-2.5 2-4.5 4.5-4.5S21 9.5 21 12h-9z",
    },
  },
  {
    // Everything that isn't a scaffold/milestone/fix but still reads as
    // "shipped a piece of work" shares one icon. Add new synonyms here
    // (e.g. "build", "add", "wire up") rather than inventing a new icon
    // per verb — the icon means "feature work landed," not "this exact
    // verb was used."
    keywords: ["implement", "integrate", "polish", "harden", "adopt"],
    shape: {
      viewBox: "0 0 24 24",
      path: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    },
  },
];

function matchesFix(lowerMsg: string): boolean {
  // Two different signals deliberately: `fix(` catches this codebase's
  // own conventional commit prefix, while `resolve` catches the second
  // commit of a bugfix pair (see commits.ts — every bugfix branch's
  // second commit reads "resolve ..." rather than "fix(...)").
  return lowerMsg.startsWith("fix(") || lowerMsg.includes("resolve");
}

const FIX_SHAPE: IconShape = {
  viewBox: "0 0 24 24",
  path: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83m-3.75 3.75a3.75 3.75 0 11-5.304-5.304 3.75 3.75 0 015.304 5.304zm0 0l4.22-4.22m-4.22 4.22l-1.9-1.9",
};

function Icon({ shape, color }: { shape: IconShape; color: string }) {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0 w-3.5 h-3.5 self-center"
      fill="none"
      viewBox={shape.viewBox}
      stroke={color}
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={shape.path} />
    </svg>
  );
}

export function CommitIcon({ message, color }: { message: string; color: string }) {
  const lowerMsg = message.toLowerCase();

  if (matchesFix(lowerMsg)) {
    return <Icon shape={FIX_SHAPE} color={color} />;
  }

  for (const rule of ICON_RULES) {
    if (rule.keywords.some((kw) => lowerMsg.includes(kw))) {
      return <Icon shape={rule.shape} color={color} />;
    }
  }

  return null;
}
