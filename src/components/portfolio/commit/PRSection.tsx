export function PRSection({
  label,
  body,
  tint,
}: {
  label: string;
  body: string;
  tint?: "red" | "green";
}) {
  if (!tint) return <ProseSection label={label} body={body} />;
  return <DiffSection label={label} body={body} tint={tint} />;
}

// Neutral sections (Problem, Root Cause, What I'd Do Differently) stay
// as plain prose — diff styling is reserved for the two sections that
// actually describe a code-level change, so it reads as authentic
// rather than a themed wrapper applied everywhere.
function ProseSection({ label, body }: { label: string; body: string }) {
  return (
    <div className="w-full overflow-hidden">
      <div className="mb-1.5 font-mono text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-400">
        {label}
      </div>
      <div
        className="rounded-md border-l-2 py-2 px-3 sm:py-2.5 sm:pl-4 sm:pr-4 text-gray-300 break-words text-[14px] sm:text-[15.5px]"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
      >
        {body}
      </div>
    </div>
  );
}

// No real line-level diff data exists here (`body` is prose, not a
// patch), so each sentence becomes one diff "line" — enough to read as
// an authentic unified-diff block (gutter marker, tinted line
// background, monospace) without fabricating line numbers or a hunk
// header that would imply a real diff.
function toDiffLines(body: string): string[] {
  return body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function DiffSection({
  label,
  body,
  tint,
}: {
  label: string;
  body: string;
  tint: "red" | "green";
}) {
  const isRemoved = tint === "red";
  const marker = isRemoved ? "-" : "+";
  const markerColor = isRemoved ? "#f87171" : "#4ade80";
  const lineBg = isRemoved ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)";
  const lineBorder = isRemoved ? "rgba(239, 68, 68, 0.16)" : "rgba(34, 197, 94, 0.16)";
  const containerBorder = isRemoved ? "rgba(239, 68, 68, 0.25)" : "rgba(34, 197, 94, 0.25)";
  const lines = toDiffLines(body);

  return (
    <div className="w-full overflow-hidden">
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-400">
        <span
          className="inline-flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-sm font-mono text-[11px] sm:text-[13px] font-bold shrink-0"
          style={{ background: lineBg, color: markerColor, border: `1px solid ${containerBorder}` }}
          aria-hidden="true"
        >
          {marker}
        </span>
        {label}
      </div>
      <div
        className="overflow-hidden rounded-md border font-mono text-[13px] sm:text-[14px] leading-relaxed"
        style={{ borderColor: containerBorder, background: "rgba(10,11,15,0.55)" }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className="flex gap-3 px-3 py-1.5 sm:px-4"
            style={{ background: lineBg, borderTop: i === 0 ? "none" : `1px solid ${lineBorder}` }}
          >
            <span
              className="select-none shrink-0 font-bold"
              style={{ color: markerColor }}
              aria-hidden="true"
            >
              {marker}
            </span>
            <span className="text-gray-200 break-words">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
