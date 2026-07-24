/* eslint-disable prettier/prettier */
export interface LanguageMetric {
  id: string;
  label: string;
  bytes: number;
  color: string;
}

export const LANGUAGE_STATS: LanguageMetric[] = [
  { id: "ts-js", label: "TypeScript / JavaScript", bytes: 4200, color: "#34d399" },
  { id: "node", label: "Node.js / Express / NestJS", bytes: 2600, color: "#a78bfa" },
  { id: "db", label: "PostgreSQL / MongoDB", bytes: 2100, color: "#f59e0b" },
  { id: "ui", label: "Tailwind / Motion / UI", bytes: 1500, color: "rgba(255,255,255,0.3)" },
];

export const TOTAL_BYTES = LANGUAGE_STATS.reduce((acc, curr) => acc + curr.bytes, 0);
