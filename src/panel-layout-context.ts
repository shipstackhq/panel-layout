import { createContext, useContext, type RefObject } from "react";
import type { LayoutNode } from "./types";

interface PanelLayoutContextValue {
  rootRef: RefObject<HTMLDivElement | null>;
  onResizeEnd: (nodeId: string, sizePx: number) => void;
  getBounds: (
    siblings: LayoutNode[],
    index: number,
    dir: "h" | "v",
    containerSize: number,
  ) => { min: number; max: number };
}

export const PanelLayoutContext = createContext<PanelLayoutContextValue>(null!);

export const usePanelLayoutContext = () => useContext(PanelLayoutContext);
