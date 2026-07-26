export function CommitIcon({ message, color }: { message: string; color: string }) {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("scaffold")) {
    return (
      <svg
        className="shrink-0 w-3.5 h-3.5 self-center"
        fill="none"
        viewBox="0 0 24 24"
        stroke={color}
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 19v-7m0 0c0-2.5-2-4.5-4.5-4.5S3 9.5 3 12h9zm0 0c0-2.5 2-4.5 4.5-4.5S21 9.5 21 12h-9z"
        />
      </svg>
    );
  }

  if (lowerMsg.includes("implement") || lowerMsg.includes("integrate")) {
    return (
      <svg
        className="shrink-0 w-3.5 h-3.5 self-center"
        fill="none"
        viewBox="0 0 24 24"
        stroke={color}
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    );
  }

  if (lowerMsg.startsWith("fix(") || lowerMsg.includes("resolve")) {
    return (
      <svg
        className="shrink-0 w-3.5 h-3.5 self-center"
        fill="none"
        viewBox="0 0 24 24"
        stroke={color}
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83m-3.75 3.75a3.75 3.75 0 11-5.304-5.304 3.75 3.75 0 015.304 5.304zm0 0l4.22-4.22m-4.22 4.22l-1.9-1.9"
        />
      </svg>
    );
  }

  if (lowerMsg.includes("milestone")) {
    return (
      <svg
        className="shrink-0 w-3.5 h-3.5 self-center"
        fill="none"
        viewBox="0 0 24 24"
        stroke={color}
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 21V3m0 2.25h16.5l-2.25 4.5 2.25 4.5H3"
        />
      </svg>
    );
  }

  return null;
}
