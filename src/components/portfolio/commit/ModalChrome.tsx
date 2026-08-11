import { useDragControls } from "framer-motion";
import { useEffect } from "react";
import type { ProjectKey } from "@/data/portfolio/projects";
import type { BugfixKey } from "@/data/portfolio/bugfixes";

export function featureNodeLayoutId(projectKey: ProjectKey) {
  return `commit-node-feature-${projectKey}`;
}
export function bugfixNodeLayoutId(bugfixKey: BugfixKey) {
  return `commit-node-bugfix-${bugfixKey}`;
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body } = document;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [active]);
}

export function DragHandle({ dragControls }: { dragControls: ReturnType<typeof useDragControls> }) {
  return (
    <div
      className="flex shrink-0 touch-none cursor-grab justify-center pt-2.5 pb-1 active:cursor-grabbing sm:hidden"
      onPointerDown={(e) => dragControls.start(e)}
      aria-hidden="true"
    >
      <div className="h-1 w-10 rounded-full bg-white/20" />
    </div>
  );
}

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close dialog"
      className="absolute cursor-pointer right-3 top-3.5 sm:right-4 sm:top-4 rounded-md px-2 py-1 text-xs sm:text-sm text-gray-400 transition-all hover:bg-white/5 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 z-20 backdrop-blur-sm sm:backdrop-blur-none"
      style={{ background: "rgba(20,22,30,0.6)" }}
    >
      ✕
    </button>
  );
}

export function surfaceStyle(accent: string) {
  return {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)) , rgba(17, 19, 26, 0.92)",
    backdropFilter: "blur(20px) saturate(150%)",
    WebkitBackdropFilter: "blur(20px) saturate(150%)",
    border: `1px solid ${accent}33`,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${accent}22`,
  } as const;
}
