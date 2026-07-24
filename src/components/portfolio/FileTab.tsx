/* eslint-disable prettier/prettier */
import { motion } from "framer-motion";

type Props = {
  label: string;
  dotColor: string;
  pulse?: boolean;
  reduceMotion: boolean;
};

/**
 * The small "README.md" / "stats.json" / "CONTRIBUTING.md" file-tab strip
 * used above each panel on the homepage. Was previously copy-pasted three
 * times with near-identical markup; centralized here so the visual pattern
 * can only drift in one place.
 */
export function FileTab({ label, dotColor, pulse = false, reduceMotion }: Props) {
  return (
    <div
      className="mb-0 inline-flex items-center gap-2 rounded-t-md border border-b-0 px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-[13px] uppercase tracking-widest text-gray-500"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
    >
      {pulse && !reduceMotion ? (
        <motion.span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: dotColor }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      ) : (
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: dotColor }} />
      )}
      {label}
    </div>
  );
}
