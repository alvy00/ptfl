export type ProjectKey = "auctasync" | "assetverse" | "asynclangai" | "careerpilot";

export type CodeLink = { label: string; url: string };

export type ProjectImage = { id: string; src: string; alt: string };

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
  images?: ProjectImage[]; // screenshots shown in the modal's image rail — no fixed cap
};

export const projects: Record<ProjectKey, Project> = {
  auctasync: {
    key: "auctasync",
    name: "AuctaSync — Real-Time Auction Platform",
    timeframe: { start: "2024-11-01", end: "2025-08-31", label: "Nov 2024 – Aug 2025" },
    description:
      "Full-stack, decoupled auction ecosystem engineered for high-concurrency, live bidding at the speed and reliability luxury marketplaces demand. Architected a WebSocket real-time layer to broadcast bid events to every connected client in a lot with zero page refreshes, backed by Supabase (PostgreSQL) with row-level security and an integrated local payment gateway — solving the core trust and latency problems that make digital auctions feel slower or less secure than in-person ones.",
    features: [
      {
        title: "Real-Time Bid Broadcasting",
        detail:
          "Dedicated WebSocket service pushes live bid updates to every client in a lot instantly, eliminating stale data and race conditions under high-traffic bidding.",
      },
      {
        title: "Secure, Session-Aware Auth",
        detail:
          "Supabase Auth with SSR-aware sessions and row-level security policies enforced at the database layer, not just the API.",
      },
      {
        title: "Integrated Payments & Checkout",
        detail:
          "End-to-end checkout and settlement via the SSLCommerz gateway, with coupon-based discounting built into the payment flow.",
      },
      {
        title: "Decoupled, Scalable Architecture",
        detail:
          "Next.js App Router frontend, a separate API/server-actions layer, and an independent WebSocket service — each scalable and deployable on its own.",
      },
      {
        title: "Live Auction Analytics",
        detail:
          "Real-time charts on active lots and bid activity (Chart.js) plus drag-and-drop listing management with image uploads.",
      },
    ],
    stack: [
      "Next.js 15 (App Router, Turbopack)",
      "TypeScript",
      "React 19",
      "Supabase (PostgreSQL, Auth, RLS)",
      "WebSockets",
      "SSLCommerz",
      "Tailwind CSS 4",
      "Radix UI / shadcn",
      "Framer Motion / GSAP",
      "Chart.js",
    ],
    demoUrl: "https://auctasync.vercel.app/",
    codeLinks: [
      { label: "View Code", url: "https://github.com/alvy00/asyncawait-auction-project-v2" },
    ],
    accent: "#f59e0b",
    images: [
      { id: "1", src: "/auctasync/auctasync-home.png", alt: "AuctaSync home page" },
      { id: "2", src: "/auctasync/auctasync-live.png", alt: "Live auction with real-time bidding" },
      { id: "3", src: "/auctasync/auctasync-featured.png", alt: "Featured auction lots" },
      { id: "4", src: "/auctasync/auctasync-past.png", alt: "Past auctions listing" },
      { id: "5", src: "/auctasync/auctasync-dashboard.png", alt: "User dashboard" },
      { id: "6", src: "/auctasync/auctasync-admin.png", alt: "Admin panel" },
      { id: "7", src: "/auctasync/auctasync-leaderboards.png", alt: "Bidder leaderboards" },
      { id: "8", src: "/auctasync/auctasync-login.png", alt: "Login page" },
      { id: "10", src: "/auctasync/auctasync-types.png", alt: "Auction types overview" },
    ],
  },
  assetverse: {
    key: "assetverse",
    name: "AssetVerse — B2B Asset Management SaaS",
    timeframe: { start: "2024-03-26", end: "2024-05-15", label: "Mar 2024 – May 2024" },
    description:
      "Full-stack, multi-tenant B2B SaaS that replaces spreadsheet-driven asset tracking with a centralized, role-based system for organizations to allocate, monitor, and audit company assets across every employee. Designed a subscription-gated company model where each employee account can independently affiliate with multiple companies simultaneously, with a decoupled Express/MongoDB API powering the whole platform.",
    features: [
      {
        title: "Role-Based Company & Asset Management",
        detail:
          "HR managers register a company (default 5-seat subscription), manage full asset inventory, and assign/reclaim assets with returnable vs. non-returnable tracking.",
      },
      {
        title: "Multi-Company Employee Model",
        detail:
          "Employees register independently and can be affiliated with and request assets from multiple companies at once — a genuinely multi-tenant relationship, not a simple 1:1 org chart.",
      },
      {
        title: "Full Asset Lifecycle Audit Trail",
        detail:
          "Every asset moves through Inventory → Assignment → Return with full status visibility, supporting accountability and loss prevention.",
      },
      {
        title: "Analytics & Exportable Reporting",
        detail:
          "Interactive Recharts dashboards plus print-friendly, PDF-exportable reports (jsPDF) for HR review and audits.",
      },
      {
        title: "Subscriptions & Payments",
        detail:
          "Stripe-backed subscription billing tied to company seat limits, decoupled behind a dedicated Express/MongoDB API with Firebase Admin-verified auth.",
      },
    ],
    stack: [
      "React 19",
      "Vite",
      "Node.js / Express.js",
      "MongoDB",
      "Firebase Auth / Admin SDK",
      "Stripe",
      "TanStack Query",
      "Tailwind CSS + DaisyUI",
      "Recharts",
    ],
    demoUrl: "https://ph-assetverse-client-a11.netlify.app/",
    codeLinks: [
      { label: "Client", url: "https://github.com/alvy00/ph-assetverse-client-a11" },
      { label: "Server", url: "https://github.com/alvy00/ph-assetverse-server-a11" },
    ],
    accent: "#a78bfa",
    images: [
      {
        id: "1",
        src: "/assetverse/assetverse-home.png",
        alt: "AssetVerse home page",
      },
      {
        id: "2",
        src: "/assetverse/assetverse-login.png",
        alt: "Assetverse login page",
      },
      {
        id: "3",
        src: "/assetverse/assetverse-3.png",
        alt: "AssetVerse HR dashboard with company asset overview",
      },
      {
        id: "4",
        src: "/assetverse/assetverse-4.png",
        alt: "Asset inventory list with returnable/non-returnable status",
      },
      {
        id: "5",
        src: "/assetverse/assetverse-5.png",
        alt: "AssetVerse HR dashboard with company asset overview",
      },
      {
        id: "6",
        src: "/assetverse/assetverse-6.png",
        alt: "Asset inventory list with returnable/non-returnable status",
      },
      {
        id: "7",
        src: "/assetverse/assetverse-7.png",
        alt: "AssetVerse HR dashboard with company asset overview",
      },
    ],
  },
  asynclangai: {
    key: "asynclangai",
    name: "AsyncLangAI — AI Voice-Based English Practice Platform",
    timeframe: { start: "2025-04-01", end: "2025-06-30", label: "Apr 2025 – Jun 2025" },
    description:
      "Full-stack conversational practice platform that closes the biggest gap in self-taught language learning — the lack of a real speaking partner — by putting a live AI voice agent (Vapi) in the loop instead of static, text-based drills. Learners run custom mock interviews tailored to their target role, get instant AI-generated performance feedback, and receive concrete next steps, with background scoring/feedback jobs offloaded to a Redis-backed queue so the conversation itself never blocks on analysis.",
    features: [
      {
        title: "Live AI Voice Conversations",
        detail:
          "Real-time, natural spoken practice sessions via the Vapi AI Web SDK — not scripted text chat.",
      },
      {
        title: "Custom Virtual Interviews",
        detail:
          "Users generate mock interviews tailored to specific roles and goals, powered by Google Gemini through the Vercel AI SDK.",
      },
      {
        title: "Asynchronous Feedback Pipeline",
        detail:
          "Redis + Bull job queue processes performance scoring and feedback generation in the background, keeping the live session responsive.",
      },
      {
        title: "Instant, Actionable Feedback",
        detail:
          "Detailed post-session analytics and targeted improvement tips are surfaced immediately after each practice run.",
      },
      {
        title: "Secure Auth & Type-Safe Forms",
        detail:
          "Firebase Authentication (client + Admin SDK) with Zod-validated, react-hook-form-driven inputs throughout.",
      },
    ],
    stack: [
      "Next.js 15",
      "TypeScript",
      "React 19",
      "Vapi AI (voice agent)",
      "Google Gemini / Vercel AI SDK",
      "Firebase Auth / Admin SDK",
      "Redis + Bull (job queue)",
      "Zod",
      "Tailwind CSS / Radix UI",
    ],
    demoUrl: "https://asynclangai.vercel.app/",
    codeLinks: [{ label: "View Code", url: "https://github.com/alvy00/LangAI" }],
    accent: "#38bdf8",
    images: [
      {
        id: "1",
        src: "/langai/langai-home.png",
        alt: "AsyncLangAI home page",
      },
      {
        id: "2",
        src: "/langai/langai-login.png",
        alt: "AsyncLangAI login page",
      },
      {
        id: "3",
        src: "/langai/langai-interview.png",
        alt: "AsyncLangAI interview page",
      },
      {
        id: "4",
        src: "/langai/langai-create.png",
        alt: "AsyncLangAI interview creation page",
      },
    ],
  },
  careerpilot: {
    key: "careerpilot",
    name: "CareerPilot — AI Learning Roadmap & Interview Platform",
    timeframe: { start: "2026-02-01", end: "2026-03-31", label: "Feb 2026 – Mar 2026" },
    description:
      "Full-stack AI learning companion that turns any goal — a tech career, an academic subject, a certification, or a practical skill — into a structured, phase-based roadmap instead of open-ended tutorial hell. Combines generative AI (Gemini) for adaptive roadmap and quiz generation with a live voice AI agent (Vapi) for spoken interview and oral-exam practice, all inside a single unified Next.js application with no separate backend service to deploy.",
    features: [
      {
        title: "AI-Generated, Phase-Based Roadmaps",
        detail:
          "Gemini generates structured Beginner → Advanced learning plans from a goal, experience level, and time commitment, validated end-to-end with Zod schemas.",
      },
      {
        title: "AI Voice Mock Interviews",
        detail:
          "Live, spoken interview and oral-exam simulations via Vapi's voice AI agent — real conversational flow instead of static Q&A forms.",
      },
      {
        title: "Adaptive AI Quizzes",
        detail:
          "On-demand quizzes generated per roadmap phase to validate understanding before a learner advances to the next milestone.",
      },
      {
        title: "Scheduling & Progress Tracking",
        detail:
          "Interactive calendar (Schedule-X) for milestone planning, with persistent tracking of roadmap completion, quiz scores, and interview practice history in MongoDB.",
      },
      {
        title: "Unified Full-Stack Architecture",
        detail:
          "Next.js App Router handles UI, API routes, and server-side Firebase Admin auth verification in one deployable app — no separate backend to maintain.",
      },
    ],
    stack: [
      "Next.js 16 (App Router)",
      "TypeScript",
      "React 19",
      "MongoDB",
      "Google Gemini (AI SDK)",
      "Vapi AI (voice agent)",
      "Firebase Auth / Admin SDK",
      "TanStack Query",
      "Zod",
      "Tailwind CSS v4 + DaisyUI",
      "GSAP / Framer Motion",
    ],
    demoUrl: "https://careerpilotasync.vercel.app/",
    codeLinks: [{ label: "View Code", url: "https://github.com/alvy00/eg-careerpilot-asyncawait" }],
    accent: "#34d399",
    images: [
      { id: "1", src: "/careerpilot/careerpilot-home.png", alt: "CareerPilot home page" },
      {
        id: "2",
        src: "/careerpilot/careerpilot-roadmap.png",
        alt: "AI-generated phase-based learning roadmap",
      },
      { id: "3", src: "/careerpilot/careerpilot-generator.png", alt: "Roadmap generator" },
      {
        id: "4",
        src: "/careerpilot/careerpilot-dashboard.png",
        alt: "Progress tracking dashboard",
      },
      { id: "5", src: "/careerpilot/careerpilot-quiz.png", alt: "Adaptive phase quiz" },

      {
        id: "7",
        src: "/careerpilot/careerpilot-interview (2).png",
        alt: "AI voice mock interview session, results",
      },
      { id: "8", src: "/careerpilot/careerpilot-feedback.png", alt: "Post-interview feedback" },
      { id: "9", src: "/careerpilot/careerpilot-history.png", alt: "Interview and quiz history" },
      { id: "11", src: "/careerpilot/careerpilot-login.png", alt: "Login page" },
    ],
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
