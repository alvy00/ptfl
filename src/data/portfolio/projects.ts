export type ProjectKey = "auctasync" | "assetverse" | "asynclangai" | "careerpilot";

export type CodeLink = { label: string; url: string };

export type Project = {
  key: ProjectKey;
  name: string;
  timeframe: { start: string; end: string; label: string };
  description: string;
  features: { title: string; detail: string }[];
  stack: string[];
  demoUrl: string;
  codeLinks: CodeLink[];
  accent: string; // hex, matches branch color
};

export const projects: Record<ProjectKey, Project> = {
  auctasync: {
    key: "auctasync",
    name: "AuctaSync — Auction Web Platform",
    timeframe: { start: "2024-11-01", end: "2025-08-31", label: "Nov 2024 – Aug 2025" },
    description:
      "Built a full-stack real-time auction platform that replaces the friction of traditional, in-person auctions with an engaging digital experience — enabling users to participate in live, competitive bidding from anywhere with instant updates and secure transactions.",
    features: [
      {
        title: "Live Auctions",
        detail:
          "Time-sensitive sessions with synchronized countdown timers for accurate bid windows.",
      },
      {
        title: "Real-Time Bidding Updates",
        detail:
          "WebSocket-based live bid broadcasting — no stale data or race conditions in high-traffic rooms.",
      },
      {
        title: "Secure Payment Integration",
        detail:
          "SSLCommerz gateway with a coupon discount system for safe, localized transactions.",
      },
    ],
    stack: ["Next.js", "Node.js", "Express.js", "PostgreSQL", "Tailwind CSS", "SSLCommerz"],
    demoUrl: "https://auctasync.vercel.app/",
    codeLinks: [
      { label: "View Code", url: "https://github.com/alvy00/asyncawait-auction-project-v2" },
    ],
    accent: "#f59e0b",
  },
  assetverse: {
    key: "assetverse",
    name: "AssetVerse — Asset Management System",
    timeframe: { start: "2025-10-01", end: "2025-11-30", label: "Oct 2025 – Nov 2025" },
    description:
      "Developed a full-stack organizational asset management platform that replaces scattered spreadsheets and manual tracking with a centralized, role-based system for asset allocation, lifecycle management, and team-wide visibility.",
    features: [
      {
        title: "Employee-Wise Assignment & Tracking",
        detail:
          "Dynamic assignment links assets to employees so HR and admins see ownership and location in real time.",
      },
      {
        title: "Asset Management Workflow",
        detail:
          "Status workflow (Assigned, Available, Under Maintenance) reflects real-time availability and reduces misallocation.",
      },
      {
        title: "History & Usage Logs",
        detail:
          "Audit trail records full lifecycle events for accountability and data-driven insights.",
      },
    ],
    stack: [
      "Next.js",
      "Node.js",
      "Express.js",
      "MongoDB",
      "Firebase",
      "Tailwind CSS",
      "Stripe",
      "TanStack Query",
    ],
    demoUrl: "https://ph-assetverse-client-a11.netlify.app/",
    codeLinks: [
      { label: "Client", url: "https://github.com/alvy00/ph-assetverse-client-a11" },
      { label: "Server", url: "https://github.com/alvy00/ph-assetverse-server-a11" },
    ],
    accent: "#a78bfa",
  },
  asynclangai: {
    key: "asynclangai",
    name: "AsyncLangAI — English Language Practice Platform",
    timeframe: { start: "2025-04-01", end: "2025-06-30", label: "Apr 2025 – Jun 2025" },
    description:
      "Built a full-stack English practice platform that solves the lack of real-time speaking practice by putting an AI conversational agent in the loop — giving learners a live partner to talk to, instant feedback on how they did, and concrete guidance on what to improve next.",
    features: [
      {
        title: "Custom Virtual Interviews",
        detail: "Create tailored mock interviews based on your specific roles and needs.",
      },
      {
        title: "Real-Time AI Conversations",
        detail: "Practice speaking fluidly with an interactive AI agent in real time.",
      },
      {
        title: "Instant Performance Feedback",
        detail: "Review detailed insights and analytics immediately following each session.",
      },
      {
        title: "Targeted Guidance & Advice",
        detail: "Receive actionable tips and recommendations to improve your communication skills.",
      },
    ],
    stack: ["Next.js", "Node.js", "Express.js", "Firebase", "shadcn/ui", "Tailwind CSS"],
    demoUrl: "https://asynclangai.vercel.app/",
    codeLinks: [{ label: "View Code", url: "https://github.com/alvy00/LangAI" }],
    accent: "#38bdf8",
  },
  careerpilot: {
    key: "careerpilot",
    name: "CareerPilot — AI Learning and Roadmap Generator",
    timeframe: { start: "2026-02-01", end: "2026-03-31", label: "Feb 2026 – Mar 2026" },
    description:
      "Engineered a full-stack AI-powered career platform that eliminates tutorial hell and directionless self-learning by analyzing users' requirements and target roles to generate structured, adaptive roadmaps — helping learners focus on what matters and accelerate their path to knowledge.",
    features: [
      {
        title: "AI-Powered Roadmap Generation",
        detail:
          "LLM-driven engine evaluates proficiency and generates personalized, step-by-step learning paths for specific goals.",
      },
      {
        title: "AI Mock Voice Interviews",
        detail:
          "Voice-based interview simulations with real-time AI feedback for role-specific practice.",
      },
      {
        title: "AI Quizzes & Challenges",
        detail:
          "Adaptive system auto-generates role-specific quizzes to reinforce milestones and track progress.",
      },
      {
        title: "Personalized Resource Recommendations",
        detail:
          "Intelligent engine curates tutors and learning materials based on individual progress data.",
      },
    ],
    stack: [
      "Next.js",
      "Node.js",
      "MongoDB",
      "Firebase",
      "Tailwind CSS",
      "Stripe",
      "TanStack Query",
    ],
    demoUrl: "https://careerpilotasync.vercel.app/",
    codeLinks: [{ label: "View Code", url: "https://github.com/alvy00/eg-careerpilot-asyncawait" }],
    accent: "#34d399",
  },
};

export function commitDateFor(
  timeframe: { start: string; end: string },
  index: number,
  total: number,
): Date {
  const s = new Date(timeframe.start).getTime();
  const e = new Date(timeframe.end).getTime();
  const t = total <= 1 ? s : s + ((e - s) * index) / (total - 1);
  return new Date(t);
}

export function relativeTime(d: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - d.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const days = Math.floor(abs / 86400000);
  const fmt = (v: string) => (future ? `in ${v}` : `${v} ago`);
  if (days < 1) return "today";
  if (days < 30) return fmt(`${days} day${days === 1 ? "" : "s"}`);
  const months = Math.floor(days / 30);
  if (months < 12) return fmt(`${months} month${months === 1 ? "" : "s"}`);
  const years = Math.floor(months / 12);
  const rem = months - years * 12;
  if (rem === 0) return fmt(`${years} year${years === 1 ? "" : "s"}`);
  return fmt(`${years}y ${rem}mo`);
}
