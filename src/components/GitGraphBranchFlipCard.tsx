/* eslint-disable prettier/prettier */
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { ProjectKey } from "@/data/portfolio/projects";
import { projects } from "@/data/portfolio/projects";

interface GitGraphBranchFlipCardProps {
  projectKey: ProjectKey;
  accentColor: string;
  timeframeLabel: string;
}

export function GitGraphBranchFlipCard({
  projectKey,
  accentColor,
  timeframeLabel,
}: GitGraphBranchFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;
  const p = projects[projectKey];

  const shortName = p.name.split(" — ")[0];
  const tagline = p.name.split(" — ")[1];

  return (
    <div
      className="relative w-full h-[320px] sm:h-[300px] cursor-pointer perspective-[1200px]"
      onClick={() => setIsFlipped(!isFlipped)}
      role="button"
      tabIndex={0}
      aria-label={`Toggle branch checkout view for ${shortName}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsFlipped(!isFlipped);
        }
      }}
    >
      <motion.div
        className="w-full h-full relative preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={
          reduceMotion
            ? { duration: 0.01 }
            : { duration: 0.5, type: "spring", stiffness: 220, damping: 24 }
        }
        style={{ willChange: "transform" }}
      >
        {/* ================= FRONT FACE ================= */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden rounded-xl border p-5 sm:p-6 flex flex-col justify-between shadow-lg"
          style={{
            borderColor: `${accentColor}44`,
            // Solid dark fallback base combined with the gradient to prevent transparency flashes
            backgroundColor: "#090d16",
            backgroundImage: `linear-gradient(135deg, ${accentColor}12 0%, #090d16 100%)`,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span
                className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded border"
                style={{
                  borderColor: `${accentColor}55`,
                  color: accentColor,
                  background: `${accentColor}15`,
                }}
              >
                git checkout -b {projectKey}
              </span>
              <span className="text-[11px] sm:text-[12px] font-mono text-gray-400">
                {timeframeLabel}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold mt-3" style={{ color: accentColor }}>
              {shortName}
            </h3>
            {tagline && <p className="text-sm text-gray-300 mt-1 line-clamp-1">{tagline}</p>}

            <p className="mt-3 text-xs sm:text-sm text-gray-400 line-clamp-3 leading-relaxed">
              {p.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex flex-wrap gap-1">
              {p.stack.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded px-1.5 py-0.5 text-[10px] font-mono text-gray-300 bg-white/5 border border-white/10"
                >
                  {tag}
                </span>
              ))}
              {p.stack.length > 3 && (
                <span className="text-[10px] font-mono text-gray-500 self-center px-1">
                  +{p.stack.length - 3} more
                </span>
              )}
            </div>
            <span
              className="text-xs font-mono underline decoration-dotted flex items-center gap-1"
              style={{ color: accentColor }}
            >
              Flip to Inspect →
            </span>
          </div>
        </div>

        {/* ================= BACK FACE ================= */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden rounded-xl border p-5 sm:p-6 flex flex-col justify-between shadow-lg rotateY-180 overflow-y-auto"
          style={{
            borderColor: `${accentColor}88`,
            // Solid dark base to completely mask the front layer during rotation
            backgroundColor: "#090d16",
            backgroundImage: `linear-gradient(225deg, #090d16 0%, ${accentColor}18 100%)`,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: accentColor }}
                />
                HEAD detached at {projectKey}
              </span>
              <span className="text-[11px] font-mono text-gray-500">Click to flip back</span>
            </div>

            <h4 className="text-base font-bold text-white mt-3 mb-2">Key Architectural Features</h4>
            <ul className="space-y-1.5">
              {p.features.slice(0, 3).map((f) => (
                <li key={f.title} className="text-xs text-gray-300 leading-normal">
                  <span className="font-semibold text-white">{f.title}:</span> {f.detail}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <a
              href={p.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 rounded font-semibold text-slate-950 transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              Live Demo ↗
            </a>
            <div className="flex gap-2">
              {p.codeLinks.map((c) => (
                <a
                  key={c.url}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-400 hover:text-white underline decoration-dotted text-xs"
                >
                  {c.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
