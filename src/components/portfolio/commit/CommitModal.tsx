import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import type { ProjectKey } from "@/data/portfolio/projects";
import type { BugfixKey } from "@/data/portfolio/bugfixes";
import { useBodyScrollLock } from "./ModalChrome";
import { BugfixModal } from "./BugfixModal";
import { FeatureModal } from "./FeatureModal";
import { SimplePopover } from "./SimplePopover";

export type CommitSelection =
  | { kind: "feature"; projectKey: ProjectKey }
  | { kind: "main"; hash: string; message: string; anchorX: number; anchorY: number }
  | { kind: "bugfix"; hash: string; message: string; bugfixKey: BugfixKey }
  | {
      kind: "bugfix-first";
      hash: string;
      message: string;
      color: string;
      anchorX: number;
      anchorY: number;
    };

type Props = {
  selection: CommitSelection | null;
  onClose: () => void;
};

export function CommitModal({ selection, onClose }: Props) {
  useBodyScrollLock(Boolean(selection));

  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, onClose]);

  return (
    <AnimatePresence>
      {selection?.kind === "feature" && <FeatureModal selection={selection} onClose={onClose} />}
      {selection?.kind === "main" && (
        <SimplePopover
          hash={selection.hash}
          message={selection.message}
          color="#ffffff"
          label="main"
          anchorX={selection.anchorX}
          anchorY={selection.anchorY}
          onClose={onClose}
        />
      )}
      {selection?.kind === "bugfix" && <BugfixModal selection={selection} onClose={onClose} />}
      {selection?.kind === "bugfix-first" && (
        <SimplePopover
          hash={selection.hash}
          message={selection.message}
          color={selection.color}
          label="bugfix"
          anchorX={selection.anchorX}
          anchorY={selection.anchorY}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
