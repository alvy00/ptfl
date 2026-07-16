import { createFileRoute } from "@tanstack/react-router";
import { GitGraph } from "@/components/GitGraph";

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

function Index() {
  return (
    <main
      className="min-h-screen px-6 py-16 font-mono text-sm"
      style={{ backgroundColor: "#0b0c10", color: "#e5e7eb" }}
    >
      <div className="mx-auto max-w-3xl">
        <header className="mb-12">
          <h1 className="text-2xl font-semibold tracking-tight">Alvy</h1>
          <p className="mt-2 text-gray-400">
            Chemical Engineering student at RUET — self-taught full-stack developer.
          </p>
        </header>

        <GitGraph />
      </div>
    </main>
  );
}

