import { projects, type ProjectKey } from "@/data/portfolio/projects";
import { CONTACT_EMAIL } from "@/lib/portfolio/gitGraphData";

// Recruiter-facing summary — the plain-English counterpart to the git-log
// graph. Same underlying data (projects.ts), presented as a normal
// resume/portfolio reader would expect: no commit hashes, no
// feat()/fix() prefixes, no branch/lane concepts. Built as a pure
// function of `projects` (no new content invented) plus the education/
// skills line pulled from the main-trunk commit copy, since that's the
// one piece of "about me" text that lives outside projects.ts.
const PROJECT_ORDER: ProjectKey[] = Object.values(projects)
  .sort((a, b) => new Date(a.timeframe.start).getTime() - new Date(b.timeframe.start).getTime())
  .map((p) => p.key);

const SUBJECT = "Internship / junior developer role — via portfolio";
const BODY = [
  "Hi Alvy,",
  "",
  "I came across your portfolio and wanted to reach out about an internship / junior developer opportunity.",
  "",
  "",
].join("\n");
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  SUBJECT,
)}&body=${encodeURIComponent(BODY)}`;

export function GitGraphOverview() {
  return (
    <div className="flex flex-col gap-10">
      {/* Executive summary — short, plain-language framing up top, mirroring
          what the graph's main trunk already establishes (Chemical
          Engineering at RUET, self-taught into full-stack/AI) without the
          "enroll:"/"learn:" commit-message framing. */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
          Chemical Engineering student at RUET, self-taught into full-stack development and applied
          AI. Shipped four production full-stack projects, real-time systems, AI voice agents, and
          B2B SaaS while studying independently outside a CS curriculum.
        </p>
      </div>

      {/* One card per project, oldest to newest — same chronological read
          as scrolling the graph top to bottom, just without needing to
          scroll past every intermediate commit to get the substance. */}
      <div className="flex flex-col gap-6">
        {PROJECT_ORDER.map((key) => {
          const p = projects[key];
          const shortName = p.name.split(" — ")[0];
          const tagline = p.name.split(" — ")[1];
          return (
            <div
              key={key}
              className="rounded-xl border p-5 sm:p-6"
              style={{ borderColor: `${p.accent}33`, background: `${p.accent}08` }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg sm:text-xl font-bold" style={{ color: p.accent }}>
                  {shortName}
                </h3>
                <span className="text-[11px] sm:text-[12px] font-mono text-gray-500">
                  {p.timeframe.label}
                </span>
              </div>
              {tagline && <p className="text-sm text-gray-400 mt-0.5">{tagline}</p>}

              <p className="mt-3 text-sm sm:text-[15px] text-gray-300 leading-relaxed">
                {p.description}
              </p>

              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {p.features.slice(0, 4).map((f) => (
                  <li key={f.title} className="text-[13px] sm:text-sm text-gray-400">
                    <span className="font-semibold text-gray-200">{f.title}</span>
                    {" — "}
                    {f.detail}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.stack.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-mono"
                    style={{
                      borderColor: `${p.accent}44`,
                      color: p.accent,
                      background: `${p.accent}0c`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-[13px] font-mono">
                <a
                  href={p.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted hover:text-white"
                  style={{ color: p.accent }}
                >
                  Live Demo →
                </a>
                {p.codeLinks.map((c) => (
                  <a
                    key={c.url}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 underline decoration-dotted hover:text-gray-300"
                  >
                    {c.label} →
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
