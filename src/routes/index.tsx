import { createFileRoute } from "@tanstack/react-router";

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

const mainBranchCommits = [
  { hash: "a1b2c3d", message: "enroll: begin Chemical Engineering at RUET" },
  { hash: "e4f5g6h", message: "learn: start self-teaching full-stack web development" },
  { hash: "i7j8k9l", message: "apply: first internship application push" },
  { hash: "HEAD", message: "open to internship / junior developer roles" },
];

const featureBranches = [
  {
    name: "feat/auctasync",
    commits: [
      { hash: "b1c2d3e", message: "feat(auctasync): scaffold real-time auction platform" },
      { hash: "b4f5g6h", message: "feat(auctasync): implement WebSocket bidding core" },
      { hash: "b7i8j9k", message: "feat(auctasync): integrate SSLCommerz payment gateway" },
      { hash: "b0l1m2n", message: "feat(auctasync): production deployment and load validation for concurrent bidding" },
    ],
  },
  {
    name: "feat/careerpilot",
    commits: [
      { hash: "c1d2e3f", message: "feat(careerpilot): scaffold career roadmap generator, define user input flow" },
      { hash: "c4g5h6i", message: "feat(careerpilot): integrate LLM API for personalized roadmap generation" },
      { hash: "c7h8i9j", message: "feat(careerpilot): build voice-based mock interview pipeline" },
      { hash: "c7j8k9l", message: "feat(careerpilot): milestone — end-to-end roadmap + voice interview flow shipped" },
    ],
  },
  {
    name: "feat/assetverse",
    commits: [
      { hash: "d1e2f3g", message: "feat(assetverse): scaffold role-based asset management system" },
      { hash: "d4g5h6i", message: "feat(assetverse): implement RBAC with role hierarchy and permission checks" },
      { hash: "d7h8i9j", message: "feat(assetverse): build audit trail logging every asset state change" },
      { hash: "d7k8l9m", message: "feat(assetverse): milestone — full audit trail across asset lifecycle shipped" },
    ],
  },
];

function Index() {
  return (
    <main
      className="min-h-screen px-6 py-16 font-mono text-sm"
      style={{ backgroundColor: "#0b0c10", color: "#e5e7eb" }}
    >
      <div className="mx-auto max-w-2xl">
        <header className="mb-12">
          <h1 className="text-2xl font-semibold tracking-tight">Alvy</h1>
          <p className="mt-2 text-gray-400">
            Chemical Engineering student at RUET — self-taught full-stack developer.
          </p>
        </header>

        <section className="mb-12">
          <h2 className="mb-4 text-xs uppercase tracking-widest text-gray-500">main</h2>
          <ul className="space-y-3">
            {mainBranchCommits.map((commit) => (
              <li key={commit.hash} className="flex gap-4">
                <span className="shrink-0 text-gray-500">{commit.hash}</span>
                <span className={commit.hash === "HEAD" ? "text-emerald-400" : ""}>
                  {commit.message}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {featureBranches.map((branch) => (
          <section key={branch.name} className="mb-12">
            <h2 className="mb-4 text-xs uppercase tracking-widest text-gray-500">{branch.name}</h2>
            <ul className="space-y-3">
              {branch.commits.map((commit) => (
                <li key={commit.hash} className="flex gap-4">
                  <span className="shrink-0 text-gray-500">{commit.hash}</span>
                  <span>
                    {commit.message}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
