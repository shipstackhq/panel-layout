import type { ReactNode } from "react";
import { LayoutPicker } from "./layout-picker";
import type { PanelLayoutHandle } from "./use-panel-layout";

interface PanelLayoutToolbarProps {
  handle: PanelLayoutHandle;
  children?: ReactNode;
  className?: string;
}

export function PanelLayoutToolbar({ handle, children, className }: PanelLayoutToolbarProps) {
  return (
    <div className={`pl-toolbar${className ? ` ${className}` : ""}`}>
      {children}
      <LayoutPicker current={handle.state.template} onChange={handle.setTemplate} />
    </div>
  );
}
