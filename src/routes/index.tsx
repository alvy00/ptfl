/* eslint-disable prettier/prettier */
import { createFileRoute } from "@tanstack/react-router";
import { GitGraph } from "@/components/portfolio/GitGraph";
import { GlobalSearch } from "@/components/portfolio/GlobalSearch";
import { Hero } from "@/components/portfolio/Hero";
import { StatsPanel } from "@/components/portfolio/StatsPanel";
import { ContributingFooter } from "@/components/portfolio/ContributingFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alvy — Developer Portfolio" },
      {
        name: "description",
        content:
          "Chemical Engineering student at RUET and self-taught full-stack developer. Career visualized as a Git commit graph.",
      },
      { property: "og:title", content: "Alvy — Developer Portfolio" },
      {
        property: "og:description",
        content:
          "Chemical Engineering student at RUET and self-taught full-stack developer. Career visualized as a Git commit graph.",
      },
    ],
  }),
  component: Index,
});

export function Index() {
  return (
    <main
      className="min-h-screen px-4 sm:px-8 py-12 sm:py-20 font-mono text-sm sm:text-base selection:bg-[#34d39922] selection:text-[#34d399]"
      style={{ backgroundColor: "#0e0f13", color: "#e5e7eb" }}
    >
      <div className="mx-auto max-w-4xl w-full">
        <Hero />

        <div className="space-y-6 sm:space-y-8 overflow-hidden">
          <GlobalSearch />
          <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
            <div className="min-w-[500px] sm:min-w-0">
              <GitGraph />
            </div>
          </div>
        </div>

        <StatsPanel />
        <ContributingFooter />
      </div>
    </main>
  );
}
