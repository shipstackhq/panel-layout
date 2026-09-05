import { useState } from "react";
import { usePanelLayoutContext } from "./panel-layout-context";
import type { LayoutNode } from "./types";

interface ResizerGutterProps {
  dir: "h" | "v";
  siblings: LayoutNode[];
  index: number;
}

export function ResizerGutter({ dir, siblings, index }: ResizerGutterProps) {
  const { rootRef, onResizeEnd, getBounds } = usePanelLayoutContext();
  const [isDragging, setIsDragging] = useState(false);

  const leftNode = siblings[index];
  const varName = `--panel-${leftNode.id}`;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);

    const parentEl = e.currentTarget.parentElement;
    const containerSize = parentEl
      ? (dir === "h" ? parentEl.offsetWidth : parentEl.offsetHeight)
      : 0;
    const { min, max } = getBounds(siblings, index, dir, containerSize);

    let prevPos = dir === "h" ? e.clientX : e.clientY;

    const onMouseMove = (ev: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const pos = dir === "h" ? ev.clientX : ev.clientY;
      const delta = pos - prevPos;
      prevPos = pos;
      const current = parseFloat(root.style.getPropertyValue(varName) || "0");
      const next = Math.min(max, Math.max(min, current + delta));
      root.style.setProperty(varName, `${next}px`);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      const root = rootRef.current;
      if (root) {
        const finalPx = parseFloat(root.style.getPropertyValue(varName) || "0");
        onResizeEnd(leftNode.id, finalPx);
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = dir === "h" ? "col-resize" : "row-resize";
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      data-dragging={isDragging || undefined}
      className={`pl-gutter pl-gutter--${dir}${isDragging ? " pl-gutter--dragging" : ""}`}
    >
      <div className="pl-gutter-line" />
    </div>
  );
}
