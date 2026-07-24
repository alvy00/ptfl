/* eslint-disable prettier/prettier */
import { useReducedMotion } from "framer-motion";
import { FileTab } from "./FileTab";
import { theme } from "@/lib/portfolio/theme";

export function ContributingFooter() {
  const reduce = useReducedMotion() ?? false;

  return (
    <section className="mt-10 sm:mt-14" aria-labelledby="contributing-heading">
      <FileTab label="CONTRIBUTING.md" dotColor={theme.green} reduceMotion={reduce} />

      <div
        className="rounded-b-md rounded-tr-md border p-5 sm:p-7 backdrop-blur-sm relative overflow-hidden"
        style={{ borderColor: theme.border, background: theme.panelBg }}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        <h2
          id="contributing-heading"
          className="text-lg sm:text-xl font-semibold tracking-tight text-white break-all"
        >
          git checkout -b feature/collaboration
        </h2>

        {/* Sans-serif body copy here too, matching the same rationale as Hero. */}
        <p className="mt-3 text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl font-sans">
          Have an opening, an interesting project framework, or want to spin up a collaborative
          PR? Let's initialize a handshake protocol.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t pt-5 border-white/[0.04]">
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <a
              href="mailto:alvyahmed03@gmail.com"
              aria-label="Email Alvy at alvyahmed03@gmail.com"
              className="inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded transition-all duration-200 bg-[#34d399] text-[#0b0c10] hover:bg-[#22c55e] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Email
            </a>
            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row">
              <a
                href="https://github.com/alvy00"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Alvy's GitHub profile in a new tab"
                className="inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded border transition-all duration-200 text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/alvy00"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Alvy's LinkedIn profile in a new tab"
                className="inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded border transition-all duration-200 text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div className="flex items-center w-full sm:w-auto">
            <a
              href="https://docs.google.com/document/d/1YeXt4lR46hJY9yUgSHyA0Gm0hJzywIyV31WC_9uVH_s/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Alvy's resume document in a new tab"
              className="w-full inline-flex items-center justify-center px-4 py-2.5 font-medium text-xs sm:text-sm rounded border transition-all duration-200 text-gray-300 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Download Resume
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
