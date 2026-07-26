import { useMotionValueEvent, useTransform } from "framer-motion";
import { useRef } from "react";

export function GitGraphAmbientGlow({
  purple,
  amber,
  cyan,
  green,
  reduceMotion,
}: {
  purple: ReturnType<typeof useTransform<number, string>>;
  amber: ReturnType<typeof useTransform<number, string>>;
  cyan: ReturnType<typeof useTransform<number, string>>;
  green: ReturnType<typeof useTransform<number, string>>;
  reduceMotion: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useMotionValueEvent(purple, "change", (v) => {
    ref.current?.style.setProperty("--purple-a", v);
  });
  useMotionValueEvent(amber, "change", (v) => {
    ref.current?.style.setProperty("--amber-a", v);
  });
  useMotionValueEvent(cyan, "change", (v) => {
    ref.current?.style.setProperty("--cyan-a", v);
  });
  useMotionValueEvent(green, "change", (v) => {
    ref.current?.style.setProperty("--green-a", v);
  });

  return (
    <>
      <div
        ref={ref}
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-0 graph-ambient${reduceMotion ? " graph-ambient-static" : ""}`}
        style={{
          ["--purple-a" as string]: "rgba(167,139,250,0.02)",
          ["--amber-a" as string]: "rgba(245,158,11,0.02)",
          ["--cyan-a" as string]: "rgba(56,189,248,0.02)",
          ["--green-a" as string]: "rgba(52,211,153,0.02)",
          willChange: "background-position",
        }}
      />
      <style>{`
        .graph-ambient {
          background-image:
            radial-gradient(circle at 15% 20%, var(--purple-a, rgba(167,139,250,0.02)) 0%, transparent 50%),
            radial-gradient(circle at 85% 55%, var(--amber-a, rgba(245,158,11,0.02)) 0%, transparent 50%),
            radial-gradient(circle at 70% 15%, var(--cyan-a, rgba(56,189,248,0.02)) 0%, transparent 50%),
            radial-gradient(circle at 25% 85%, var(--green-a, rgba(52,211,153,0.02)) 0%, transparent 50%);
          background-size: 160% 160%;
          animation: graph-ambient-drift 24s ease-in-out infinite;
          opacity: 0.85;
        }
        .graph-ambient-static {
          animation: none;
          background-position: 40% 30%;
        }
        @keyframes graph-ambient-drift {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 60%; }
        }
      `}</style>
    </>
  );
}
